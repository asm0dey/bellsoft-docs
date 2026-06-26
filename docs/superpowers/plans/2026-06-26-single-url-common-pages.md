# Single-URL Common Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render shared/evergreen docs once at a version-less URL instead of once per product version, while keeping the version picker and per-version sidebar behavior via client-side state.

**Architecture:** Move each `src/partials/*.mdx` fragment into a single content page at a version-less path (`/liberica-jdk/how-to/use-ide/`). On a common page the sidebar renders *all* version groups and client JS shows only the reader's active version (from `localStorage`, default latest); switching the picker toggles the visible group and retargets in-body version-specific links without navigating. Version-specific pages (`install-guide`, `release-notes`) and all of Alpaquita are unchanged. The per-version-duplicate machinery (partials, wrappers, ToC rebuild, pagefind dedup) is deleted.

**Tech Stack:** Astro 7, Starlight 0.41, `starlight-sidebar-topics`, `starlight-links-validator`, Node test runner (unit), Playwright (e2e). Package manager: `bun` (lockfile is `bun.lock`); npm scripts also work.

## Global Constraints

- Site is served under a base path: `base: '/bellsoft-docs'`. Internal absolute hrefs built in code MUST be wrapped with `withBase(...)`. Path logic operates on base-relative paths via `stripBase(...)`.
- Path-versioned products and version order live ONLY in `PRODUCT_VERSIONS` (`src/lib/swapVersion.mjs`). Index 0 = latest. Do not hardcode version slugs elsewhere.
- Version-specific pages that stay per-version: `install-guide`, `release-notes`. Everything currently backed by a partial becomes a single version-less common page.
- Alpaquita is out of scope — do not touch its content, sidebar entries, or behavior.
- `starlight-links-validator` runs during `bun run build` with `errorOnRelativeLinks: false, errorOnLocalLinks: false`. The build must pass it.
- New pure helpers go in `src/lib/swapVersion.mjs` and are unit-tested in `tests/swap-version.test.mjs` (Node test runner). Keep them pure (no DOM, no `import.meta`).

---

## File Structure

- `src/lib/swapVersion.mjs` — add `resolveActiveVersion`, `versionSlugForGroupLabel`, `versionPagePath`; refactor `filterSidebarForVersion` to reuse the matcher; remove `entryPathOf` (Task 6).
- `src/components/VersionLink.astro` — NEW. Renders a version-specific link, defaulting to latest, with `data-vlink`/`data-vproduct` for client retargeting.
- `src/content/docs/liberica-jdk/**`, `src/content/docs/liberica-nik/**` — common pages move to version-less paths; per-version wrappers deleted.
- `src/partials/**` — DELETED.
- `astro.config.mjs` — sidebar config: shared entries become version-less slugs; remove `routeMiddleware` registration; (ToC middleware file deleted).
- `src/toc-partials.ts` — DELETED (both its responsibilities are obsolete).
- `src/components/VersionSwitcher.astro` — server filter gated to version pages; client script gains common-page mode.
- `tsconfig.json` — remove the now-unused `@partials/*` path alias.
- `tests/swap-version.test.mjs` — unit tests for new helpers; drop `entryPathOf` test.
- `tests/version-switcher.spec.ts` — add a common-page switch e2e.

---

### Task 1: Pure version helpers

**Files:**
- Modify: `src/lib/swapVersion.mjs`
- Test: `tests/swap-version.test.mjs`

**Interfaces:**
- Consumes: existing `PRODUCT_VERSIONS`, `versionOf`, `defaultVersionOf`.
- Produces:
  - `versionSlugForGroupLabel(product: string, groupLabel: string): string | null` — slug whose version label matches the sidebar group label (exact or `label + ' '` prefix), else `null`.
  - `resolveActiveVersion(product: string, pathname: string, stored: string | null): string` — `versionOf(pathname)`, else a valid `stored` slug, else `defaultVersionOf(product)`.
  - `versionPagePath(product: string, slug: string, page: string): string` — `/${product}/${slug}/${page}/`.
  - `filterSidebarForVersion` keeps identical behavior, now implemented via `versionSlugForGroupLabel`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/swap-version.test.mjs` (after the existing imports add the three new names to the import list: `versionSlugForGroupLabel, resolveActiveVersion, versionPagePath`):

```javascript
test('versionSlugForGroupLabel matches version group labels at a boundary', () => {
  assert.equal(versionSlugForGroupLabel('liberica-jdk', '25.0.3+11 (LTS)'), '25.0.3b11');
  assert.equal(versionSlugForGroupLabel('liberica-jdk', '21.0.6+10 (LTS)'), '21.0.6b10');
  assert.equal(versionSlugForGroupLabel('liberica-jdk', '25.0.3+11'), '25.0.3b11');
  // Non-version groups and partial-prefix false matches return null.
  assert.equal(versionSlugForGroupLabel('liberica-jdk', 'How To'), null);
  assert.equal(versionSlugForGroupLabel('liberica-jdk', '25.0.3+1'), null);
  assert.equal(versionSlugForGroupLabel('nope', '25.0.3+11 (LTS)'), null);
});

test('resolveActiveVersion prefers URL, then stored, then latest', () => {
  // URL has a version -> use it (ignores stored).
  assert.equal(
    resolveActiveVersion('liberica-jdk', '/liberica-jdk/21.0.6b10/install-guide/', '25.0.3b11'),
    '21.0.6b10'
  );
  // Common page (no version) -> valid stored wins.
  assert.equal(
    resolveActiveVersion('liberica-jdk', '/liberica-jdk/how-to/use-ide/', '21.0.6b10'),
    '21.0.6b10'
  );
  // No/invalid stored -> latest (index 0).
  assert.equal(resolveActiveVersion('liberica-jdk', '/liberica-jdk/how-to/use-ide/', null), '25.0.3b11');
  assert.equal(resolveActiveVersion('liberica-jdk', '/liberica-jdk/how-to/use-ide/', 'bogus'), '25.0.3b11');
});

test('versionPagePath builds a version-specific page path', () => {
  assert.equal(versionPagePath('liberica-jdk', '25.0.3b11', 'install-guide'), '/liberica-jdk/25.0.3b11/install-guide/');
  assert.equal(versionPagePath('liberica-nik', '21.0.6b10', 'release-notes'), '/liberica-nik/21.0.6b10/release-notes/');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:unit`
Expected: FAIL — `versionSlugForGroupLabel is not a function` (and the other two).

- [ ] **Step 3: Implement the helpers**

In `src/lib/swapVersion.mjs`, add (place `versionSlugForGroupLabel` above `filterSidebarForVersion`):

```javascript
// The version slug whose label matches a sidebar group label, or null. A
// version group's config label is `<version label> (LTS)`, so match at a word
// boundary (exact, or label followed by a space) — a plain `includes` would let
// `25.0.3+1` also match `25.0.3+11 (LTS)`.
export function versionSlugForGroupLabel(product, groupLabel) {
  const versions = PRODUCT_VERSIONS[product];
  if (!versions) return null;
  const v = versions.find(
    (ver) => groupLabel === ver.label || groupLabel.startsWith(ver.label + ' ')
  );
  return v ? v.slug : null;
}

// The active version for a page: the URL's version if present, else a valid
// stored choice, else the product's latest. Pure so it is unit-tested.
export function resolveActiveVersion(product, pathname, stored) {
  const fromUrl = versionOf(pathname);
  if (fromUrl) return fromUrl;
  const valid = (PRODUCT_VERSIONS[product] ?? []).some((v) => v.slug === stored);
  return valid ? stored : defaultVersionOf(product);
}

// Path of a version-specific page (e.g. install-guide) for a product+version.
export function versionPagePath(product, slug, page) {
  return `/${product}/${slug}/${page}/`;
}
```

Replace the body of `filterSidebarForVersion` with the DRY version:

```javascript
export function filterSidebarForVersion(sidebar, product, activeSlug) {
  const versions = PRODUCT_VERSIONS[product];
  if (!versions || !activeSlug) return sidebar;
  return sidebar.filter((entry) => {
    if (entry.type !== 'group') return true;
    const groupSlug = versionSlugForGroupLabel(product, entry.label);
    return groupSlug === null || groupSlug === activeSlug;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:unit`
Expected: PASS — all tests, including the pre-existing `filterSidebarForVersion` tests (behavior unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/lib/swapVersion.mjs tests/swap-version.test.mjs
git commit -m "feat(versioning): add active-version + group-label helpers"
```

---

### Task 2: `<VersionLink>` component

**Files:**
- Create: `src/components/VersionLink.astro`

**Interfaces:**
- Consumes: `productOf`, `defaultVersionOf`, `versionPagePath`, `stripBase`, `withBase` from `swapVersion.mjs`.
- Produces: `<VersionLink to="install-guide">text</VersionLink>` → `<a href="<base>/<product>/<latest>/<to>/" data-vlink="<to>" data-vproduct="<product>">text</a>`. Used by common pages for links to version-specific pages. Client JS (Task 5) rewrites `href` to the active version.

- [ ] **Step 1: Create the component**

Create `src/components/VersionLink.astro`:

```astro
---
import { productOf, defaultVersionOf, versionPagePath, stripBase, withBase } from '../lib/swapVersion.mjs';

// `to` is a version-specific page key, e.g. "install-guide" or "release-notes".
const { to } = Astro.props;
const path = stripBase(Astro.url.pathname, import.meta.env.BASE_URL);
const product = productOf(path);
const slug = defaultVersionOf(product);
// Build-time href points at the latest version: valid, no-JS-safe, and the
// links-validator can resolve it. Client JS upgrades it to the active version.
const href = withBase(versionPagePath(product, slug, to), import.meta.env.BASE_URL);
---
<a href={href} data-vlink={to} data-vproduct={product}><slot /></a>
```

- [ ] **Step 2: Commit** (verified by the build in later tasks)

```bash
git add src/components/VersionLink.astro
git commit -m "feat(versioning): add VersionLink component for common pages"
```

---

### Task 3: Migrate partials to version-less common pages

This task inlines every `src/partials/*.mdx` into a single version-less content page, fixes relative component imports, converts cross-version links to `<VersionLink>`, then deletes the partials and all per-version wrappers. It is mechanical; the gate is a clean `bun run build`.

**Files:**
- Create: ~29 pages under `src/content/docs/liberica-jdk/**` and `src/content/docs/liberica-nik/**` at version-less paths.
- Delete: `src/partials/**`; all 57 wrapper pages (every `src/content/docs/**` file importing `@partials/`).
- Modify (by script): the 6 created pages that link to `install-guide`/`release-notes`.

**Interfaces:**
- Consumes: `<VersionLink>` (Task 2).
- Produces: common pages at paths like `liberica-jdk/how-to/use-ide`, `liberica-jdk/containers`, `liberica-jdk/containers/tags`, `liberica-nik/how-to/select-gc`, `liberica-nik/containers`, etc. (slug = wrapper slug minus the version segment). These slugs are referenced by Task 4's sidebar config.

- [ ] **Step 1: Generate the version-less pages from partials**

Run this script from the repo root (`bash scripts/migrate-partials.sh` after creating it, or paste inline):

```bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

for src in src/partials/*.mdx; do
  partial=$(basename "$src" .mdx)
  # Find a wrapper importing exactly this partial; prefer the latest version so
  # the canonical title/description come from it. Exact ".mdx" avoids prefix
  # collisions (nik-containers vs nik-containers-hardened).
  w=$(grep -rl "@partials/${partial}\.mdx" src/content/docs | grep '25.0.3b11' | head -1 || true)
  [ -z "$w" ] && w=$(grep -rl "@partials/${partial}\.mdx" src/content/docs | head -1)
  if [ -z "$w" ]; then echo "WARN: no wrapper for $partial" >&2; continue; fi
  # Target path = wrapper path with the version segment removed.
  target=$(echo "$w" | sed -E 's#/(25\.0\.3b11|21\.0\.6b10)##')
  mkdir -p "$(dirname "$target")"
  # Frontmatter (lines 1-5 of every wrapper) with the version stripped from the
  # slug, a blank line, then the partial body.
  { sed -n '1,5p' "$w" | sed -E '/^slug:/ s#/(25\.0\.3b11|21\.0\.6b10)##'; echo; cat "$src"; } > "$target"
  # Partials referenced TagPicker via a relative path from src/partials/; from
  # src/content/docs/ that path is wrong — use the @components alias.
  sed -i "s#from '\.\./components/#from '@components/#g" "$target"
done
```

- [ ] **Step 2: Convert cross-version links to `<VersionLink>` in the generated pages**

```bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

for t in $(grep -rl '\](\.\./\.\./\(install-guide\|release-notes\)/)' src/content/docs); do
  perl -0pi -e \
    's#\[([^\]]+)\]\(\.\./\.\./install-guide/\)#<VersionLink to="install-guide">$1</VersionLink>#g;
     s#\[([^\]]+)\]\(\.\./\.\./release-notes/\)#<VersionLink to="release-notes">$1</VersionLink>#g' "$t"
  # Add the import once, right after the frontmatter close (line 5).
  if grep -q 'VersionLink' "$t" && ! grep -q 'import VersionLink' "$t"; then
    sed -i "5a import VersionLink from '@components/VersionLink.astro';" "$t"
  fi
done
```

- [ ] **Step 3: Delete partials and all wrappers**

```bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# Delete every remaining file that still imports a partial (the per-version wrappers).
grep -rl '@partials/' src/content/docs | xargs rm -f
rm -rf src/partials
```

- [ ] **Step 4: Verify no stragglers remain**

```bash
# All three must print nothing.
grep -rn '@partials/' src/content/docs || echo "OK: no @partials imports"
grep -rn '\](\.\./\.\./\(install-guide\|release-notes\)/)' src/content/docs || echo "OK: no cross-version md links"
ls src/partials 2>/dev/null && echo "FAIL: partials dir still exists" || echo "OK: partials removed"
```
Expected: `OK:` lines only.

> Note: the build will still FAIL after this task because `astro.config.mjs` sidebar entries and `toc-partials.ts` still point at the old per-version slugs / deleted partials. That is fixed in Tasks 4 and 6. Do not run the full build as the gate for this task; the gate is Step 4 above. Commit now and proceed.

- [ ] **Step 5: Commit**

```bash
git add -A src/content/docs src/partials scripts 2>/dev/null
git commit -m "refactor(docs): inline partials into version-less common pages"
```

---

### Task 4: Rewrite sidebar config to version-less common slugs

**Files:**
- Modify: `astro.config.mjs` (the `starlightSidebarTopics([...])` Liberica JDK and Native Image Kit topics only; Alpaquita untouched).

**Interfaces:**
- Consumes: the version-less page slugs created in Task 3.
- Produces: each version group lists common pages by version-less slug (identical across both groups) and keeps `install-guide`/`release-notes` per-version.

- [ ] **Step 1: Replace the Liberica JDK topic `items`**

In `astro.config.mjs`, replace the two JDK version groups (`'25.0.3+11 (LTS)'` and `'21.0.6+10 (LTS)'`) with:

```javascript
              {
                label: '25.0.3+11 (LTS)',
                items: [
                  'liberica-jdk/25.0.3b11/release-notes',
                  'liberica-jdk/25.0.3b11/install-guide',
                  { label: 'Editions & Concepts', items: [
                    'liberica-jdk/how-to/choosing-flavor',
                    'liberica-jdk/how-to/performance-edition-overview',
                    'liberica-jdk/how-to/perf-getting-started',
                    'liberica-jdk/how-to/release-types',
                  ]},
                  { label: 'Container Images', items: [
                    'liberica-jdk/containers',
                    'liberica-jdk/containers/usage',
                    'liberica-jdk/containers/hardened',
                    'liberica-jdk/containers/tags',
                    'liberica-jdk/containers/distributions',
                  ]},
                  { label: 'How To', items: [
                    'liberica-jdk/how-to/use-ide',
                    'liberica-jdk/how-to/jvm-memory-configuration',
                    'liberica-jdk/how-to/using-cds',
                    'liberica-jdk/how-to/using-buildpacks',
                    'liberica-jdk/how-to/updating-time-zone-data',
                  ]},
                  { label: 'Debugging and Optimization', collapsed: true, items: [
                    { label: 'JDK Flight Recorder', items: [
                      'liberica-jdk/debugging/flight-recorder-mission-control-basics',
                      'liberica-jdk/debugging/flight-recorder-code-hotspots',
                      'liberica-jdk/debugging/flight-recorder-memory-issues',
                      'liberica-jdk/debugging/flight-recorder-help',
                      'liberica-jdk/debugging/flight-recorder-stop',
                    ]},
                    'liberica-jdk/debugging/perf-monitor-java-performance',
                    'liberica-jdk/debugging/use-jcmd',
                  ]},
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-jdk/21.0.6b10/release-notes',
                  'liberica-jdk/21.0.6b10/install-guide',
                  { label: 'Editions & Concepts', items: [
                    'liberica-jdk/how-to/choosing-flavor',
                    'liberica-jdk/how-to/performance-edition-overview',
                    'liberica-jdk/how-to/perf-getting-started',
                    'liberica-jdk/how-to/release-types',
                  ]},
                  { label: 'Container Images', items: [
                    'liberica-jdk/containers',
                    'liberica-jdk/containers/usage',
                    'liberica-jdk/containers/hardened',
                    'liberica-jdk/containers/tags',
                    'liberica-jdk/containers/distributions',
                  ]},
                  { label: 'How To', items: [
                    'liberica-jdk/how-to/use-ide',
                    'liberica-jdk/how-to/jvm-memory-configuration',
                    'liberica-jdk/how-to/using-crac',
                    'liberica-jdk/how-to/using-cds',
                    'liberica-jdk/how-to/using-buildpacks',
                    'liberica-jdk/how-to/updating-time-zone-data',
                  ]},
                  { label: 'Debugging and Optimization', collapsed: true, items: [
                    { label: 'JDK Flight Recorder', items: [
                      'liberica-jdk/debugging/flight-recorder-mission-control-basics',
                      'liberica-jdk/debugging/flight-recorder-code-hotspots',
                      'liberica-jdk/debugging/flight-recorder-memory-issues',
                      'liberica-jdk/debugging/flight-recorder-help',
                      'liberica-jdk/debugging/flight-recorder-stop',
                    ]},
                    'liberica-jdk/debugging/perf-monitor-java-performance',
                    'liberica-jdk/debugging/use-jcmd',
                  ]},
                ],
              },
```

(Leave the JDK external links — Discovery API, Security Advisory, Legal — exactly as they are.)

- [ ] **Step 2: Replace the Native Image Kit topic `items`**

Replace the two NIK version groups with:

```javascript
              {
                label: '25.0.3+11 (LTS)',
                items: [
                  'liberica-nik/25.0.3b11/install-guide',
                  'liberica-nik/25.0.3b11/release-notes',
                  { label: 'Container Images', items: [
                    'liberica-nik/containers',
                    'liberica-nik/containers/hardened',
                  ]},
                  { label: 'How To', items: [
                    'liberica-nik/how-to/build-native-image-from-springboot',
                    'liberica-nik/how-to/containerize-native-images',
                    'liberica-nik/how-to/select-gc',
                    'liberica-nik/how-to/using-nik-with-desktop-applications',
                    'liberica-nik/how-to/javafx-native-image',
                  ]},
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-nik/21.0.6b10/install-guide',
                  'liberica-nik/21.0.6b10/release-notes',
                  { label: 'Container Images', items: [
                    'liberica-nik/containers',
                    'liberica-nik/containers/hardened',
                  ]},
                  { label: 'How To', items: [
                    'liberica-nik/how-to/build-native-image-from-springboot',
                    'liberica-nik/how-to/containerize-native-images',
                    'liberica-nik/how-to/select-gc',
                    'liberica-nik/how-to/using-nik-with-desktop-applications',
                    'liberica-nik/how-to/javafx-native-image',
                  ]},
                ],
              },
```

(Leave the NIK Discovery API external link as-is. Leave the entire Alpaquita topic untouched.)

- [ ] **Step 3: Commit** (build gate is Task 6 after middleware removal)

```bash
git add astro.config.mjs
git commit -m "refactor(docs): point sidebar at version-less common pages"
```

---

### Task 5: VersionSwitcher — gate server filter, add common-page client mode

**Files:**
- Modify: `src/components/VersionSwitcher.astro`

**Interfaces:**
- Consumes: `resolveActiveVersion`, `versionSlugForGroupLabel`, `versionPagePath`, `versionOf`, `swapVersion`, `stripBase`, `withBase`, `defaultVersionOf`.
- Produces: on version pages, unchanged navigation; on common pages, in-place version switching (sidebar group toggle + `<VersionLink>` href rewrite + persisted choice).

- [ ] **Step 1: Gate the server-side sidebar filter to version pages**

In the component frontmatter, replace:

```javascript
const route = Astro.locals.starlightRoute;
if (product && displaySlug) {
  route.sidebar = filterSidebarForVersion(route.sidebar, product, displaySlug);
}
```

with (filter only when the URL carries a real version; common pages render all groups for the client to toggle):

```javascript
const route = Astro.locals.starlightRoute;
if (product && active) {
  route.sidebar = filterSidebarForVersion(route.sidebar, product, active);
}
```

(`active` is already computed above as `versionOf(pathname)`; `displaySlug` is still used for the picker label.)

- [ ] **Step 2: Replace the client `<script>` with version-page + common-page modes**

Replace the entire `<script> ... </script>` block with:

```astro
<script>
  import {
    swapVersion, stripBase, withBase, versionOf, defaultVersionOf,
    resolveActiveVersion, versionSlugForGroupLabel, versionPagePath,
  } from '../lib/swapVersion.mjs';

  const BASE = import.meta.env.BASE_URL;
  const picker = document.querySelector('.version-picker');

  const storeKey = (product) => `bellsoft:v:${product}`;
  const getStored = (product) => {
    try { return localStorage.getItem(storeKey(product)); } catch { return null; }
  };
  const setStored = (product, slug) => {
    try { localStorage.setItem(storeKey(product), slug); } catch {}
  };

  // Point common-page body links (<VersionLink>) at the active version.
  function rewriteVlinks(product, slug) {
    for (const a of document.querySelectorAll('a[data-vlink]')) {
      if (a.dataset.vproduct && a.dataset.vproduct !== product) continue;
      a.setAttribute('href', withBase(versionPagePath(product, slug, a.dataset.vlink), BASE));
    }
  }

  // On a common page the sidebar holds every version group; show only the active.
  function showVersionGroup(product, slug) {
    const groups = document.querySelectorAll('#starlight__sidebar .top-level > li');
    for (const li of groups) {
      const summary = li.querySelector(':scope > details > summary');
      if (!summary) continue;
      const groupSlug = versionSlugForGroupLabel(product, summary.textContent.trim());
      if (!groupSlug) continue; // not a version group — leave visible
      li.hidden = groupSlug !== slug;
    }
  }

  if (picker instanceof HTMLElement) {
    const product = picker.dataset.product ?? '';
    const fromPath = picker.dataset.path ?? stripBase(location.pathname, BASE);
    const onVersionPage = Boolean(versionOf(fromPath));

    const button = picker.querySelector('.version-current');
    const panel = picker.querySelector('.version-panel');
    const search = picker.querySelector('.version-search');
    const list = picker.querySelector('.version-list');
    const empty = picker.querySelector('.version-empty');
    const options = Array.from(picker.querySelectorAll('.version-option'));

    const setOpen = (open) => {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) { search.value = ''; filter(''); search.focus(); }
    };
    const filter = (q) => {
      const needle = q.trim().toLowerCase();
      let shown = 0;
      for (const li of options) {
        const match = li.dataset.label.toLowerCase().includes(needle);
        li.hidden = !match;
        if (match) shown++;
      }
      empty.hidden = shown > 0;
    };

    // Common page: reflect a chosen version without navigating.
    const applyCommonVersion = (slug) => {
      setStored(product, slug);
      showVersionGroup(product, slug);
      rewriteVlinks(product, slug);
      const label = options.find((li) => li.dataset.slug === slug)?.dataset.label ?? '';
      const cur = picker.querySelector('.version-current-label');
      if (cur) cur.textContent = label;
      for (const li of options) {
        const on = li.dataset.slug === slug;
        li.classList.toggle('selected', on);
        li.setAttribute('aria-selected', String(on));
      }
    };

    const navigate = (slug) => {
      if (onVersionPage) {
        location.pathname = withBase(swapVersion(fromPath, slug), BASE);
      } else {
        applyCommonVersion(slug);
        setOpen(false);
      }
    };

    button.addEventListener('click', () => setOpen(panel.hidden));
    search.addEventListener('input', () => filter(search.value));
    list.addEventListener('click', (event) => {
      const li = event.target.closest('.version-option');
      if (li) navigate(li.dataset.slug);
    });
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const first = options.find((li) => !li.hidden);
        if (first) navigate(first.dataset.slug);
      } else if (event.key === 'Escape') {
        setOpen(false); button.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!picker.contains(event.target)) setOpen(false);
    });

    // Initial state: persist the URL's version (version page) or reflect the
    // reader's stored choice (common page).
    if (onVersionPage) {
      setStored(product, versionOf(fromPath));
    } else {
      applyCommonVersion(resolveActiveVersion(product, fromPath, getStored(product)));
    }
  }
</script>
```

(Keep the existing `<style>` block unchanged. Keep the component frontmatter import line; it may still import `swapVersion`/`stripBase` — leave it. `entryPathOf` is removed in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add src/components/VersionSwitcher.astro
git commit -m "feat(versioning): in-place version switching on common pages"
```

---

### Task 6: Remove obsolete machinery and verify full build

**Files:**
- Delete: `src/toc-partials.ts`
- Modify: `astro.config.mjs` (remove `routeMiddleware` line + unused import), `src/lib/swapVersion.mjs` (remove `entryPathOf`), `tests/swap-version.test.mjs` (remove `entryPathOf` test + import), `tsconfig.json` (remove `@partials/*` alias).

**Interfaces:**
- Consumes: nothing new.
- Produces: a clean build with native ToC (real headings) and no duplicate-management code.

- [ ] **Step 1: Remove the ToC/pagefind middleware**

```bash
rm src/toc-partials.ts
```

In `astro.config.mjs`, remove the line:

```javascript
      routeMiddleware: './src/toc-partials.ts',
```

If `astro.config.mjs` has a now-unused top import for the middleware/unified processor *only used by it*, leave the markdown `processor: unified()` block as-is (it is required by the links validator, unrelated to ToC). Only remove `routeMiddleware`.

- [ ] **Step 2: Remove `entryPathOf`**

In `src/lib/swapVersion.mjs`, delete the `entryPathOf` function (and its doc comment).

In `tests/swap-version.test.mjs`, remove `entryPathOf` from the import list and delete the test:

```javascript
test('entryPathOf returns the version entry page (alpaquita lives under /general/)', () => { ... });
```

- [ ] **Step 3: Remove the `@partials` alias**

In `tsconfig.json`, delete the `"@partials/*": ["src/partials/*"],` line from `compilerOptions.paths`.

- [ ] **Step 4: Run unit tests**

Run: `bun run test:unit`
Expected: PASS (no `entryPathOf` reference errors).

- [ ] **Step 5: Full build + links validator**

Run: `bun run build`
Expected: build SUCCEEDS; `starlight-links-validator` reports no broken links. Common pages exist at version-less URLs (e.g. `dist/liberica-jdk/how-to/use-ide/index.html`), and version-less pages no longer exist under `dist/liberica-jdk/25.0.3b11/how-to/`.

Verify:

```bash
test -f dist/liberica-jdk/how-to/use-ide/index.html && echo "OK: common page built"
test ! -d dist/liberica-jdk/25.0.3b11/how-to && echo "OK: per-version how-to gone"
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(docs): drop partial wrappers, ToC rebuild, pagefind dedup, entryPathOf"
```

---

### Task 7: End-to-end test — in-place version switch on a common page

**Files:**
- Modify: `tests/version-switcher.spec.ts` (add a test; reuse existing Playwright setup).

**Interfaces:**
- Consumes: the running preview server (Playwright config drives `bun run preview` or similar — follow the existing `playwright.config.ts`).

- [ ] **Step 1: Inspect the existing e2e setup**

Read `playwright.config.ts` and `tests/version-switcher.spec.ts` to reuse the base URL / web server config and existing selectors (`.version-picker`, `.version-current`, `.version-option`, `[data-slug]`).

- [ ] **Step 2: Add the failing test**

Add to `tests/version-switcher.spec.ts` (adjust `BASE`/path helpers to match the file's existing conventions):

```typescript
test('common page: switching version updates sidebar + VersionLink, stays on page', async ({ page }) => {
  await page.goto('/bellsoft-docs/liberica-jdk/how-to/use-ide/');

  const url = page.url();

  // A VersionLink in the body points at the latest version by default.
  const vlink = page.locator('a[data-vlink="install-guide"]').first();
  await expect(vlink).toHaveAttribute('href', /\/25\.0\.3b11\/install-guide\//);

  // Open the picker and choose 21.0.6+10.
  await page.locator('.version-current').click();
  await page.locator('.version-option[data-slug="21.0.6b10"]').click();

  // Still on the same common page (no navigation).
  expect(page.url()).toBe(url);

  // VersionLink now points at the chosen version.
  await expect(vlink).toHaveAttribute('href', /\/21\.0\.6b10\/install-guide\//);

  // Sidebar shows the 21.x group and hides the 25.x group.
  await expect(page.locator('#starlight__sidebar .top-level > li', { hasText: '21.0.6+10' })).toBeVisible();
  await expect(page.locator('#starlight__sidebar .top-level > li', { hasText: '25.0.3+11' })).toBeHidden();
});
```

- [ ] **Step 3: Run it to verify it passes**

Run: `bun run test:e2e -- -g "switching version updates sidebar"`
Expected: PASS. (If the existing suite needs the site built first, run `bun run build` then the e2e command, per `playwright.config.ts`.)

- [ ] **Step 4: Run the full suites**

Run: `bun run test:unit && bun run test:e2e`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/version-switcher.spec.ts
git commit -m "test(e2e): common-page in-place version switch"
```

---

## Self-Review

**Spec coverage:**
- Single version-less URL → Task 3 (migration) + Task 4 (sidebar slugs). ✓
- Picker still shown → unchanged picker render; `displaySlug` fallback keeps it on common pages (Task 5). ✓
- Shown in every applicable version group → Task 4 lists common slugs in both groups; `using-crac` only in 21. ✓
- Switch updates version-specific sidebar entries, reader stays → Task 5 `showVersionGroup` + no-nav `applyCommonVersion`. ✓
- In-body version-specific links follow active version → Task 2 `<VersionLink>` + Task 5 `rewriteVlinks`. ✓
- Active version client-side (localStorage, default latest, URL on version pages) → Task 1 `resolveActiveVersion` + Task 5 load logic. ✓
- Delete partials/wrappers/ToC-rebuild/pagefind-dedup/entryPathOf → Task 3 + Task 6. ✓
- Alpaquita untouched → no task modifies it. ✓
- Tests (unit pure helpers + one e2e) → Task 1 + Task 7. ✓
- Build passes links validator → Task 6 Step 5. ✓

**Placeholder scan:** none — all steps carry concrete code/commands.

**Type consistency:** helper names (`versionSlugForGroupLabel`, `resolveActiveVersion`, `versionPagePath`) and `data-vlink`/`data-vproduct` attributes match across Tasks 1, 2, 5, 7. `bellsoft:v:<product>` localStorage key used consistently in Task 5.

**Open verification (during execution, not design):**
- Starlight sidebar group DOM is `#starlight__sidebar .top-level > li > details > summary` (confirmed against current `dist/`). If a Starlight upgrade changes this, adjust the `showVersionGroup` selector.
- Confirm the migration script's frontmatter slice (`sed -n '1,5p'`) holds — all 57 wrappers are uniformly `---/title/slug/description/---` (verified). If any wrapper differs, the script's frontmatter copy must be adjusted.
