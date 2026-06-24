# BellSoft Liberica Developer Docs (Starlight) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a developer-friendly documentation site (Astro + Starlight) that reproduces BellSoft Liberica docs, with a product switcher (icons), per-Java-version docs for JDK 25 and 21, and a version dropdown that lands on the same page across versions.

**Architecture:** Astro + Starlight provides the docs shell, search, and theming. The `starlight-sidebar-topics` plugin gives the product switcher with icons (Liberica JDK, NIK, Container images, Alpaquita Linux), each product owning its own sidebar. A small custom `VersionSwitcher` component (Starlight `Sidebar` override) renders a `<select>` on version-scoped JDK pages; on change it rewrites the version segment of the current URL via a pure `swapVersion()` function. Only the per-version pages (Installation Guide, Release Notes) are duplicated across JDK 25 and 21 — exactly matching the real site, where shared How-To content is version-agnostic. This keeps the showcase small (two versions) while demonstrating the full mechanism.

**Tech Stack:** Node 18+, Astro, @astrojs/starlight, starlight-sidebar-topics, MDX. Package manager: bun. Test gate: `bun run build` (Astro type-checks + builds all routes) plus a Node-based unit test for `swapVersion()` and a Playwright smoke check for the dropdown.

## Global Constraints

- Node.js **18.17.1+ or 20.3.0+** (Starlight requirement). Copy verbatim into README.
- Package manager: **bun** (use `bun.lock`; do not introduce npm/pnpm/yarn).
- Docs content lives under `src/content/docs/`. Route = file path. Trailing-slash URLs.
- Product slugs (URL roots, fixed — the version dropdown and topics config depend on them):
  `liberica-jdk`, `liberica-nik`, `containers`, `alpaquita`.
- Versions are **full build versions**, slugified for URLs by replacing `+` with `b` (matching bell-sw.com): display `25.0.3+11` → slug `25.0.3b11`; display `21.0.6+10` → slug `21.0.6b10`. Dots are kept.
- Two path-versioned products, each with its own version list, in this scope:
  - **Liberica JDK**: `25.0.3b11`, `21.0.6b10` → `/liberica-jdk/25.0.3b11/...`, `/liberica-jdk/21.0.6b10/...`
  - **Liberica NIK**: `25.0.3b11`, `21.0.6b10` → `/liberica-nik/25.0.3b11/...`, `/liberica-nik/21.0.6b10/...` (ponytail: NIK's real scheme is GraalVM-based; we reuse the bundled-Java full versions so the dropdown is uniform).
  - Containers (Docker tags) and Alpaquita (streams) are NOT path-versioned.
- The single source of truth for versions is the `PRODUCT_VERSIONS` registry in `src/lib/swapVersion.mjs` (Task 3): `{ 'liberica-jdk': [{slug,label}…], 'liberica-nik': [{slug,label}…] }`. The sidebar config, the dropdown, and the content dir names all use these exact slugs.
- **CRITICAL — every versioned content page MUST declare an explicit `slug:` in its frontmatter** matching its full path, e.g. `slug: liberica-jdk/25.0.3b11/install-guide`. Astro strips the dots from auto-generated slugs (`25.0.3b11` → would not match), so without the explicit `slug` the `starlight-sidebar-topics` config fails at build with `The slug "…" does not exist`. This applies to all JDK and NIK install-guide/release-notes pages. Shared (non-versioned) pages do NOT need it.
- Only **Installation Guide** and **Release Notes** are per-version. How-To / Debugging pages are shared and live at `/liberica-jdk/how-to/...`, `/liberica-jdk/debugging/...` (no version segment).
- **Search:** Starlight's built-in Pagefind search is enabled by default and must stay on — do not disable it.
- Real product/package facts (use verbatim, do not invent):
  - JDK Linux package name pattern: `bellsoft-java<major>` (e.g. `bellsoft-java25`, `bellsoft-java21`).
  - JDK download host: `https://download.bell-sw.com/java/<version>/...`; APT repo `https://apt.bell-sw.com/`; GPG key `https://download.bell-sw.com/pki/GPG-KEY-bellsoft`.
  - Container image repo: `bellsoft/liberica-runtime-container`; tag pattern `[jdk type]-[java version]-[crac]-[cds]-[slim]-[libc]` (e.g. `jdk-all-21-glibc`, `jre-21-crac-slim-glibc`).
  - NIK = "Liberica Native Image Kit", GraalVM-based, compiles Java to native executables.
  - Alpaquita Linux = small secure Linux base (musl + glibc) for containers.

---

## File Structure

```
bellsoft-docs/
├── package.json
├── astro.config.mjs              # Starlight + topics plugin + sidebar config
├── tsconfig.json
├── playwright.config.ts          # smoke test only
├── tests/
│   ├── swap-version.test.mjs     # unit test for the URL-rewrite logic
│   └── version-switcher.spec.ts  # Playwright dropdown smoke test
├── src/
│   ├── lib/
│   │   └── swapVersion.mjs        # pure function: rewrite version segment in a path
│   ├── components/
│   │   └── VersionSwitcher.astro  # Sidebar override: dropdown on version pages
│   ├── styles/
│   │   └── custom.css             # brand colors
│   └── content/
│       └── docs/
│           ├── index.mdx                                  # landing / splash
│           ├── liberica-jdk/
│           │   ├── 25.0.3b11/{install-guide.mdx,release-notes.md}  # .mdx: uses <Tabs>
│           │   ├── 21.0.6b10/{install-guide.mdx,release-notes.md}
│           │   ├── how-to/{ide,jvm-memory,crac}.md
│           │   └── debugging/{jfr-mission-control,jcmd}.md   # external links: Security Advisory, Legal (no local files)
│           ├── liberica-nik/
│           │   ├── index.md                                  # shared landing
│           │   ├── 25.0.3b11/{install-guide,release-notes}.md
│           │   ├── 21.0.6b10/{install-guide,release-notes}.md
│           │   └── how-to-spring-boot.md                     # shared
│           ├── containers/{index,tags,usage}.md
│           └── alpaquita/{index,get-started}.md
└── public/                        # (favicon/logo placeholder if added)
```

Each file has one responsibility. The only file with real logic is `src/lib/swapVersion.mjs` (tested in isolation). `astro.config.mjs` is the single source of sidebar/topic structure. Content files are plain MD/MDX.

---

### Task 1: Scaffold Astro + Starlight, dev server runs

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/content/docs/index.mdx`
- Create: `.gitignore`

**Interfaces:**
- Produces: a working Starlight site at `http://localhost:4321/` with default config. Later tasks add the topics plugin and content.

- [ ] **Step 1: Initialize the Starlight project non-interactively**

Run in the project root (`/home/finkel/work_self/bellsoft-docs`):

```bash
bun create astro@latest -- --template starlight --no-install --no-git --yes .
```

If the directory-not-empty prompt blocks (the plan dir exists), scaffold in a temp dir and move:

```bash
bun create astro@latest -- --template starlight --no-install --no-git --yes ./.scaffold \
  && cp -rn ./.scaffold/. . && rm -rf ./.scaffold
```

- [ ] **Step 2: Install dependencies**

```bash
bun install
```

- [ ] **Step 3: Pin Node engines and a clean dev/build script set in `package.json`**

Ensure `package.json` contains (merge, don't clobber Astro's generated deps):

```json
{
  "engines": { "node": ">=18.17.1" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test:unit": "node --test tests/",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 4: Replace the landing page so the build owns a known root**

Overwrite `src/content/docs/index.mdx`:

```mdx
---
title: BellSoft Documentation
description: Developer documentation for Liberica JDK, NIK, container images, and Alpaquita Linux.
template: splash
hero:
  tagline: Liberica JDK, Native Image Kit, container images, and Alpaquita Linux — in one place.
  actions:
    - text: Liberica JDK 25 install
      link: /liberica-jdk/25.0.3b11/install-guide/
      icon: right-arrow
---

Pick a product from the sidebar to get started.
```

- [ ] **Step 5: Run the build to verify the scaffold is valid**

Run: `bun run build`
Expected: exits 0, prints `Complete!` and a list of built pages including `/index.html`.

- [ ] **Step 6: Commit**

```bash
git init -q && git add -A
git commit -m "chore: scaffold Astro + Starlight docs site"
```

---

### Task 2: Product switcher with icons (starlight-sidebar-topics)

**Files:**
- Modify: `astro.config.mjs`
- Create: stub content so every topic link resolves —
  `src/content/docs/liberica-jdk/25.0.3b11/install-guide.mdx`,
  `src/content/docs/liberica-nik/index.md`,
  `src/content/docs/containers/index.md`,
  `src/content/docs/alpaquita/index.md`

**Interfaces:**
- Consumes: working Starlight site from Task 1.
- Produces: four-topic sidebar (icons: JDK, NIK, Containers, Alpaquita), each topic linking to a real page. JDK topic sidebar exposes version groups `25` and `21` plus a shared `How To` group. The exact slugs `liberica-jdk/25.0.3b11/install-guide`, `liberica-jdk/21.0.6b10/install-guide`, `liberica-jdk/25.0.3b11/release-notes`, `liberica-jdk/21.0.6b10/release-notes`, `liberica-jdk/how-to/ide`, `liberica-jdk/how-to/jvm-memory` are fixed here and consumed by Tasks 3–5.

- [ ] **Step 1: Install the topics plugin**

```bash
bun add starlight-sidebar-topics
```

- [ ] **Step 2: Create stub pages so all topic links resolve (build fails otherwise)**

`src/content/docs/liberica-jdk/25.0.3b11/install-guide.mdx` (note `.mdx` — Task 4 adds `<Tabs>`):

```mdx
---
title: "Liberica JDK 25: Installation Guide"
---

Installation content lands in Task 4.
```

`src/content/docs/liberica-nik/index.md`:

```md
---
title: Liberica Native Image Kit
---

NIK content lands in Task 6.
```

`src/content/docs/containers/index.md`:

```md
---
title: Liberica Container Images
---

Container content lands in Task 8.
```

`src/content/docs/alpaquita/index.md`:

```md
---
title: Alpaquita Linux
---

Alpaquita content lands in Task 9.
```

- [ ] **Step 3: Wire the topics plugin into `astro.config.mjs`**

Replace the file with (keep the existing `title`; the `sidebar` key is now owned by the plugin, so remove any top-level `sidebar:`):

```js
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';

export default defineConfig({
  integrations: [
    starlight({
      title: 'BellSoft Docs',
      customCss: ['./src/styles/custom.css'],
      plugins: [
        starlightSidebarTopics([
          {
            label: 'Liberica JDK',
            link: '/liberica-jdk/25.0.3b11/install-guide/',
            icon: 'seti:java',
            items: [
              {
                label: '25.0.3+11 (LTS)',
                items: [
                  'liberica-jdk/25.0.3b11/release-notes',
                  'liberica-jdk/25.0.3b11/install-guide',
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-jdk/21.0.6b10/release-notes',
                  'liberica-jdk/21.0.6b10/install-guide',
                ],
              },
              {
                label: 'How To',
                items: [
                  'liberica-jdk/how-to/ide',
                  'liberica-jdk/how-to/jvm-memory',
                  'liberica-jdk/how-to/crac',
                ],
              },
              {
                label: 'Debugging and Optimization',
                items: [
                  'liberica-jdk/debugging/jfr-mission-control',
                  'liberica-jdk/debugging/jcmd',
                ],
              },
              // Visible external links — hosted on the official site.
              {
                label: 'Security Advisory',
                link: 'https://docs.bell-sw.com/liberica-jdk/latest/general/security-advisory/',
                attrs: { target: '_blank', rel: 'noopener' },
                badge: { text: 'official', variant: 'tip' },
              },
              {
                label: 'Legal',
                items: [
                  {
                    label: 'Liberica JDK EULA',
                    link: 'https://bell-sw.com/liberica_eula/',
                    attrs: { target: '_blank', rel: 'noopener' },
                  },
                  {
                    label: 'EULA (docs)',
                    link: 'https://docs.bell-sw.com/liberica-jdk/latest/legal/eula/',
                    attrs: { target: '_blank', rel: 'noopener' },
                  },
                  {
                    label: 'Third-party licenses (JDK 17)',
                    link: 'https://docs.bell-sw.com/liberica-jdk/latest/legal/license-jdk17/',
                    attrs: { target: '_blank', rel: 'noopener' },
                  },
                ],
              },
            ],
          },
          {
            label: 'Native Image Kit',
            link: '/liberica-nik/',
            icon: 'rocket',
            items: [
              'liberica-nik/index',
              'liberica-nik/install-guide',
              'liberica-nik/release-notes',
              'liberica-nik/how-to-spring-boot',
            ],
          },
          {
            label: 'Container Images',
            link: '/containers/',
            icon: 'seti:docker',
            items: ['containers/index', 'containers/tags', 'containers/usage'],
          },
          {
            label: 'Alpaquita Linux',
            link: '/alpaquita/',
            icon: 'linux',
            items: ['alpaquita/index', 'alpaquita/get-started'],
          },
        ]),
      ],
    }),
  ],
});
```

Note: icon names must be valid Starlight built-ins. `seti:java`, `seti:docker`, `rocket`, `linux` are all in the built-in set. If `bun run build` reports an unknown icon, swap to a valid one from the Starlight icons reference (https://starlight.astro.build/reference/icons/) — do not leave an invalid name.

- [ ] **Step 4: Create the (empty for now) custom CSS referenced above**

`src/styles/custom.css`:

```css
/* Brand tokens filled in Task 10. */
```

- [ ] **Step 5: Build — only the stub pages exist, so expect "missing page" errors for not-yet-created slugs**

Run: `bun run build`
Expected: FAIL. The plugin references slugs (`liberica-jdk/21.0.6b10/...`, `liberica-nik/install-guide`, etc.) that have no file yet, so Starlight errors with `The slug "..." does not exist`. This confirms the config is being read.

- [ ] **Step 6: Create minimal stubs for every remaining referenced slug so the build passes**

Create each of these with a one-line frontmatter `title:` and a "Content in Task N." body:
`liberica-jdk/25.0.3b11/release-notes.md`, `liberica-jdk/21.0.6b10/install-guide.mdx`, `liberica-jdk/21.0.6b10/release-notes.md`, `liberica-jdk/how-to/ide.md`, `liberica-jdk/how-to/jvm-memory.md`, `liberica-jdk/how-to/crac.md`, `liberica-jdk/debugging/jfr-mission-control.md`, `liberica-jdk/debugging/jcmd.md`, `liberica-nik/install-guide.md`, `liberica-nik/release-notes.md`, `liberica-nik/how-to-spring-boot.md`, `containers/tags.md`, `containers/usage.md`, `alpaquita/get-started.md`.

(The Security Advisory and Legal sidebar entries are external links — no local files needed.)

Example (`src/content/docs/liberica-jdk/21.0.6b10/install-guide.mdx`):

```mdx
---
title: "Liberica JDK 21: Installation Guide"
---

Content in Task 5.
```

- [ ] **Step 7: Build to verify all topics resolve**

Run: `bun run build`
Expected: PASS. Output includes all the routes above.

- [ ] **Step 8: Eyeball the switcher**

Run: `bun run dev`, open `http://localhost:4321/liberica-jdk/25.0.3b11/install-guide/`.
Expected: top-of-sidebar shows four product entries with icons; JDK sidebar shows the Version 25 / Version 21 / How To groups. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: product switcher with icons and topic sidebars"
```

---

### Task 3: Version-switcher dropdown (same page across JDK versions)

**Files:**
- Create: `src/lib/swapVersion.mjs`
- Create: `tests/swap-version.test.mjs`
- Create: `src/components/VersionSwitcher.astro`
- Modify: `astro.config.mjs` (register the `Sidebar` component override)

**Interfaces:**
- Consumes: fixed version slugs from Task 2.
- Produces: `swapVersion(pathname: string, version: string): string` — replaces the version segment in `/liberica-jdk/<ver>/...`, returns the path unchanged if it is not a version-scoped JDK path. Used by `VersionSwitcher.astro`.

- [ ] **Step 1: Write the failing unit test**

`tests/swap-version.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  swapVersion,
  versionOf,
  productOf,
  PRODUCT_VERSIONS,
} from '../src/lib/swapVersion.mjs';

test('swaps the full-version segment on JDK paths, keeping the rest', () => {
  assert.equal(
    swapVersion('/liberica-jdk/25.0.3b11/install-guide/', '21.0.6b10'),
    '/liberica-jdk/21.0.6b10/install-guide/'
  );
  assert.equal(
    swapVersion('/liberica-jdk/21.0.6b10/release-notes/', '25.0.3b11'),
    '/liberica-jdk/25.0.3b11/release-notes/'
  );
});

test('swaps the full-version segment on NIK paths, keeping the product', () => {
  assert.equal(
    swapVersion('/liberica-nik/25.0.3b11/install-guide/', '21.0.6b10'),
    '/liberica-nik/21.0.6b10/install-guide/'
  );
});

test('returns the path unchanged for shared (non-version) pages', () => {
  assert.equal(
    swapVersion('/liberica-jdk/how-to/ide/', '21.0.6b10'),
    '/liberica-jdk/how-to/ide/'
  );
  assert.equal(
    swapVersion('/liberica-nik/how-to-spring-boot/', '21.0.6b10'),
    '/liberica-nik/how-to-spring-boot/'
  );
});

test('returns the path unchanged for unversioned products', () => {
  assert.equal(swapVersion('/containers/tags/', '21.0.6b10'), '/containers/tags/');
  assert.equal(swapVersion('/alpaquita/', '25.0.3b11'), '/alpaquita/');
});

test('versionOf returns the active slug only for a known version of that product', () => {
  assert.equal(versionOf('/liberica-jdk/25.0.3b11/install-guide/'), '25.0.3b11');
  assert.equal(versionOf('/liberica-nik/21.0.6b10/install-guide/'), '21.0.6b10');
  assert.equal(versionOf('/liberica-jdk/how-to/ide/'), null);
  assert.equal(versionOf('/liberica-jdk/9.9.9b9/install-guide/'), null);
  assert.equal(versionOf('/containers/tags/'), null);
});

test('productOf identifies the path-versioned product, or null', () => {
  assert.equal(productOf('/liberica-jdk/25.0.3b11/install-guide/'), 'liberica-jdk');
  assert.equal(productOf('/liberica-nik/21.0.6b10/release-notes/'), 'liberica-nik');
  assert.equal(productOf('/containers/tags/'), null);
});

test('PRODUCT_VERSIONS holds the showcase registry', () => {
  assert.deepEqual(Object.keys(PRODUCT_VERSIONS), ['liberica-jdk', 'liberica-nik']);
  assert.deepEqual(
    PRODUCT_VERSIONS['liberica-jdk'].map((v) => v.slug),
    ['25.0.3b11', '21.0.6b10']
  );
  assert.equal(PRODUCT_VERSIONS['liberica-jdk'][0].label, '25.0.3+11');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit`
Expected: FAIL with `Cannot find module '../src/lib/swapVersion.mjs'`.

- [ ] **Step 3: Implement the pure logic**

`src/lib/swapVersion.mjs`:

```js
// Single source of truth for path-versioned products. Order = dropdown order.
// slug = URL segment (bell-sw.com style: `+` -> `b`); label = display string.
// Containers (Docker tags) and Alpaquita (streams) are intentionally absent —
// they are not path-versioned, so the dropdown never appears on them.
export const PRODUCT_VERSIONS = {
  'liberica-jdk': [
    { slug: '25.0.3b11', label: '25.0.3+11' },
    { slug: '21.0.6b10', label: '21.0.6+10' },
  ],
  'liberica-nik': [
    { slug: '25.0.3b11', label: '25.0.3+11' },
    { slug: '21.0.6b10', label: '21.0.6+10' },
  ],
};

// Matches the leading `/<product>/<segment>/` of a path.
// Group 1 = product, 2 = segment, 3 = trailing slash or end.
const PREFIX = /^\/([^/]+)\/([^/]+)(\/|$)/;

// The path-versioned product in a path, or null.
export function productOf(pathname) {
  const m = pathname.match(PREFIX);
  return m && PRODUCT_VERSIONS[m[1]] ? m[1] : null;
}

// The active version slug in a path, or null when the segment is not a known
// version of that product (e.g. a shared page like `/liberica-jdk/how-to/...`).
export function versionOf(pathname) {
  const m = pathname.match(PREFIX);
  if (!m) return null;
  const versions = PRODUCT_VERSIONS[m[1]];
  return versions && versions.some((v) => v.slug === m[2]) ? m[2] : null;
}

// Rewrites the version segment to `slug`, keeping the product and rest of the
// path. Non-version paths are returned untouched.
export function swapVersion(pathname, slug) {
  if (!versionOf(pathname)) return pathname;
  return pathname.replace(PREFIX, `/$1/${slug}$3`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:unit`
Expected: PASS (7 tests, 0 failures).

- [ ] **Step 5: Build the dropdown component**

`src/components/VersionSwitcher.astro`:

```astro
---
import Default from '@astrojs/starlight/components/Sidebar.astro';
import { PRODUCT_VERSIONS, productOf, versionOf } from '../lib/swapVersion.mjs';

const pathname = Astro.url.pathname;
const active = versionOf(pathname);
const product = productOf(pathname);
const versions = active ? PRODUCT_VERSIONS[product] : [];
---

{
  active && (
    <div class="version-switcher">
      <label for="version-select">Version</label>
      <select id="version-select" data-path={pathname}>
        {versions.map((v) => (
          <option value={v.slug} selected={v.slug === active}>
            {v.label}
          </option>
        ))}
      </select>
    </div>
  )
}

<Default><slot /></Default>

<script>
  import { swapVersion } from '../lib/swapVersion.mjs';
  const select = document.getElementById('version-select');
  if (select instanceof HTMLSelectElement) {
    select.addEventListener('change', () => {
      const from = select.dataset.path ?? location.pathname;
      location.pathname = swapVersion(from, select.value);
    });
  }
</script>

<style>
  .version-switcher {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 0;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--sl-color-gray-5);
  }
  .version-switcher label {
    font-size: var(--sl-text-xs);
    color: var(--sl-color-gray-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .version-switcher select {
    padding: 0.4rem 0.5rem;
    border-radius: 0.5rem;
    background: var(--sl-color-black);
    color: var(--sl-color-white);
    border: 1px solid var(--sl-color-gray-5);
    font-size: var(--sl-text-sm);
  }
</style>
```

ponytail: both JDK versions are authored with identical page slugs (install-guide, release-notes), so `swapVersion` always resolves to an existing page — no 404 fallback needed. If the trees ever diverge, add an allow-list check in the `change` handler; the version-home upgrade path is `/liberica-jdk/${select.value}/install-guide/`.

- [ ] **Step 6: Register the override in `astro.config.mjs`**

Inside the `starlight({ ... })` options (sibling of `plugins`), add:

```js
      components: {
        Sidebar: './src/components/VersionSwitcher.astro',
      },
```

- [ ] **Step 7: Build, then verify the dropdown only appears on version pages**

Run: `bun run build`
Expected: PASS.

Run: `bun run dev`, then check:
- `http://localhost:4321/liberica-jdk/25.0.3b11/install-guide/` → dropdown shows "25.0.3+11" selected.
- `http://localhost:4321/liberica-nik/25.0.3b11/install-guide/` → dropdown shows on NIK too (once Task 6 lands; the stub Task 2 created is flat, so the dropdown only appears after Task 6 versions NIK).
- `http://localhost:4321/liberica-jdk/how-to/ide/` → no dropdown.
- `http://localhost:4321/containers/` → no dropdown.
Stop the dev server.

- [ ] **Step 8: Add a Playwright smoke test for the switch behavior**

```bash
bun add -d @playwright/test && bunx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'bun run build && bun run preview',
    url: 'http://localhost:4321/',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://localhost:4321' },
});
```

`tests/version-switcher.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('switching JDK version lands on the same page', async ({ page }) => {
  await page.goto('/liberica-jdk/25.0.3b11/install-guide/');
  await page.selectOption('#version-select', '21.0.6b10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/install-guide\/?$/);
  await expect(page.locator('h1')).toContainText('21'); // URL above proves the exact slug
});

test('no version dropdown on shared how-to pages', async ({ page }) => {
  await page.goto('/liberica-jdk/how-to/ide/');
  await expect(page.locator('#version-select')).toHaveCount(0);
});
```

- [ ] **Step 9: Run the e2e smoke test**

Run: `bun run test:e2e`
Expected: PASS (2 tests). The first relies on the `21.0.6b10/install-guide` page existing with an `<h1>` containing "21" — the stub from Task 2 (after migration to full-version slugs) satisfies this; Task 5 keeps it true. The URL assertion proves the exact full-version slug.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: version-switcher dropdown with same-page mapping"
```

---

### Task 4: Liberica JDK 25 — real Installation Guide + Release Notes

**Files:**
- Modify: `src/content/docs/liberica-jdk/25.0.3b11/install-guide.mdx`
- Modify: `src/content/docs/liberica-jdk/25.0.3b11/release-notes.md`

**Interfaces:**
- Consumes: slugs fixed in Task 2; dropdown from Task 3.
- Produces: full version-25 content. OS choice uses `<Tabs syncKey="os">` and the Linux distro choice uses `<Tabs syncKey="distro">` so a reader's selection persists down the page and across the version dropdown. Headings mirror the real site.

- [ ] **Step 1: Write the Installation Guide with synced tabs**

Overwrite `src/content/docs/liberica-jdk/25.0.3b11/install-guide.mdx` (`.mdx` is required for the `<Tabs>` import):

````mdx
---
title: "Liberica JDK 25: Installation Guide"
slug: liberica-jdk/25.0.3b11/install-guide
description: Download and install Liberica JDK 25 (LTS) on Windows, macOS, and Linux.
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

## Introduction

Liberica JDK 25 is a long-term support (LTS) release. Pick your platform below —
your choice is remembered as you scroll and when you switch Java versions. The
Linux package name is `bellsoft-java25`.

<Tabs syncKey="os">
  <TabItem label="Windows" icon="seti:windows">

Install with the `.msi` installer:

```powershell
msiexec /i bellsoft-jdk25.0.3+11-windows-amd64.msi
```

Silent (unattended) install:

```powershell
msiexec /i bellsoft-jdk25.0.3+11-windows-amd64.msi /qn /quiet /norestart
```

Standalone archive:

```powershell
Invoke-WebRequest "https://download.bell-sw.com/java/25.0.3+11/bellsoft-jdk25.0.3+11-windows-amd64.zip" -OutFile jdk.zip
Expand-Archive jdk.zip -DestinationPath .
```

  </TabItem>
  <TabItem label="macOS" icon="apple">

Download the `.dmg`, mount it, and run `Install Liberica JDK 25.0.3+11.pkg`.

Standalone archive:

```bash
wget https://download.bell-sw.com/java/25.0.3+11/bellsoft-jdk25.0.3+11-macos-amd64.zip
unzip bellsoft-jdk25.0.3+11-macos-amd64.zip
```

  </TabItem>
  <TabItem label="Linux" icon="linux">

Pick your distribution:

<Tabs syncKey="distro">
  <TabItem label="Debian / Ubuntu (APT)">

```bash
wget -qO - https://download.bell-sw.com/pki/GPG-KEY-bellsoft | sudo apt-key add -
echo "deb [arch=amd64] https://apt.bell-sw.com/ stable main" | sudo tee /etc/apt/sources.list.d/bellsoft.list
sudo apt-get update
sudo apt-get install bellsoft-java25
```

  </TabItem>
  <TabItem label="RHEL / CentOS / Fedora (YUM)">

```bash
sudo yum install bellsoft-java25
```

  </TabItem>
  <TabItem label="Alpine (apk)">

```bash
apk add bellsoft-java25
```

  </TabItem>
  <TabItem label="Other (archive)">

```bash
tar -zxvf bellsoft-jdk25.0.3+11-linux-amd64.tar.gz
```

  </TabItem>
</Tabs>

  </TabItem>
</Tabs>

## Verifying your installation

```bash
java -version
```

Expected output:

```
openjdk version "25.0.3" 2026-04-21 LTS
OpenJDK Runtime Environment (build 25.0.3+11-LTS)
```

## Uninstalling Liberica JDK

<Tabs syncKey="os">
  <TabItem label="Windows" icon="seti:windows">Control Panel → Programs and Features → Liberica JDK → Uninstall.</TabItem>
  <TabItem label="macOS" icon="apple">Mount the `.dmg` and run the Uninstall icon.</TabItem>
  <TabItem label="Linux" icon="linux">`sudo apt-get remove bellsoft-java25` or `sudo yum remove bellsoft-java25`.</TabItem>
</Tabs>

## Troubleshooting

If `java -version` reports the wrong version, ensure `JAVA_HOME` points to the
Liberica JDK 25 directory and that its `bin` is first on your `PATH`.
````

- [ ] **Step 2: Write the Release Notes**

Overwrite `src/content/docs/liberica-jdk/25.0.3b11/release-notes.md`:

```md
---
title: "Liberica JDK 25: Release Notes"
slug: liberica-jdk/25.0.3b11/release-notes
description: Release notes for Liberica JDK 25.0.3+11 (LTS).
---

## Version information

- **Build:** 25.0.3+11
- **Base:** OpenJDK 25.0.3
- **Type:** LTS
- **Publish date:** 2026-04-21

## What's New

### Notable changes

- Liberica JDK 25 is the latest LTS line, succeeding JDK 21.
- Ships the standard, Full, and Lite flavors plus CRaC-enabled builds.

### IANA Time Zone data

- Bundled tzdata updated to the latest available at build time.

## Known issues

- None reported for this build.

## Fixed CVEs

| CVE ID | CVSS | Component |
| --- | --- | --- |
| (see security advisory) | — | — |

## Resolved issues

See the upstream OpenJDK 25.0.3 changelog for the full list of backported fixes.
```

- [ ] **Step 3: Build to verify**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: Liberica JDK 25 install guide and release notes"
```

---

### Task 5: Liberica JDK 21 — parallel Installation Guide + Release Notes

**Files:**
- Modify: `src/content/docs/liberica-jdk/21.0.6b10/install-guide.mdx`
- Modify: `src/content/docs/liberica-jdk/21.0.6b10/release-notes.md`

**Interfaces:**
- Consumes: same slug/heading structure and the **same `syncKey` values** (`os`, `distro`) as Task 4 — so a reader's OS/distro choice carries over when the version dropdown switches 25 ⇄ 21. The dropdown depends on identical page slugs across versions; the e2e test depends on the `<h1>` containing "21".
- Produces: full version-21 content with the **same page set and tab structure** as version 25.

- [ ] **Step 1: Write the Installation Guide (same tab structure, version 21 values)**

Overwrite `src/content/docs/liberica-jdk/21.0.6b10/install-guide.mdx`:

````mdx
---
title: "Liberica JDK 21: Installation Guide"
slug: liberica-jdk/21.0.6b10/install-guide
description: Download and install Liberica JDK 21 (LTS) on Windows, macOS, and Linux.
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

## Introduction

Liberica JDK 21 is a long-term support (LTS) release. Pick your platform below —
your choice is remembered as you scroll and when you switch Java versions. The
Linux package name is `bellsoft-java21`.

<Tabs syncKey="os">
  <TabItem label="Windows" icon="seti:windows">

Install with the `.msi` installer:

```powershell
msiexec /i bellsoft-jdk21.0.6+10-windows-amd64.msi
```

Silent (unattended) install:

```powershell
msiexec /i bellsoft-jdk21.0.6+10-windows-amd64.msi /qn /quiet /norestart
```

Standalone archive:

```powershell
Invoke-WebRequest "https://download.bell-sw.com/java/21.0.6+10/bellsoft-jdk21.0.6+10-windows-amd64.zip" -OutFile jdk.zip
Expand-Archive jdk.zip -DestinationPath .
```

  </TabItem>
  <TabItem label="macOS" icon="apple">

Download the `.dmg`, mount it, and run `Install Liberica JDK 21.0.6+10.pkg`.

Standalone archive:

```bash
wget https://download.bell-sw.com/java/21.0.6+10/bellsoft-jdk21.0.6+10-macos-amd64.zip
unzip bellsoft-jdk21.0.6+10-macos-amd64.zip
```

  </TabItem>
  <TabItem label="Linux" icon="linux">

Pick your distribution:

<Tabs syncKey="distro">
  <TabItem label="Debian / Ubuntu (APT)">

```bash
wget -qO - https://download.bell-sw.com/pki/GPG-KEY-bellsoft | sudo apt-key add -
echo "deb [arch=amd64] https://apt.bell-sw.com/ stable main" | sudo tee /etc/apt/sources.list.d/bellsoft.list
sudo apt-get update
sudo apt-get install bellsoft-java21
```

  </TabItem>
  <TabItem label="RHEL / CentOS / Fedora (YUM)">

```bash
sudo yum install bellsoft-java21
```

  </TabItem>
  <TabItem label="Alpine (apk)">

```bash
apk add bellsoft-java21
```

  </TabItem>
  <TabItem label="Other (archive)">

```bash
tar -zxvf bellsoft-jdk21.0.6+10-linux-amd64.tar.gz
```

  </TabItem>
</Tabs>

  </TabItem>
</Tabs>

## Verifying your installation

```bash
java -version
```

Expected output:

```
openjdk version "21.0.6" 2025-01-21 LTS
OpenJDK Runtime Environment (build 21.0.6+10-LTS)
```

## Uninstalling Liberica JDK

<Tabs syncKey="os">
  <TabItem label="Windows" icon="seti:windows">Control Panel → Programs and Features → Liberica JDK → Uninstall.</TabItem>
  <TabItem label="macOS" icon="apple">Mount the `.dmg` and run the Uninstall icon.</TabItem>
  <TabItem label="Linux" icon="linux">`sudo apt-get remove bellsoft-java21` or `sudo yum remove bellsoft-java21`.</TabItem>
</Tabs>

## Troubleshooting

If `java -version` reports the wrong version, ensure `JAVA_HOME` points to the
Liberica JDK 21 directory and that its `bin` is first on your `PATH`.
````

- [ ] **Step 2: Write the Release Notes**

Overwrite `src/content/docs/liberica-jdk/21.0.6b10/release-notes.md`:

```md
---
title: "Liberica JDK 21: Release Notes"
slug: liberica-jdk/21.0.6b10/release-notes
description: Release notes for Liberica JDK 21.0.6+10 (LTS).
---

## Version information

- **Build:** 21.0.6+10
- **Base:** OpenJDK 21.0.6
- **Type:** LTS
- **Publish date:** 2025-01-21

## What's New

### Notable changes

- Quarterly LTS update for the JDK 21 line.
- Available as standard, Full, Lite, and CRaC-enabled builds.

### IANA Time Zone data

- Bundled tzdata updated to the latest available at build time.

## Known issues

- None reported for this build.

## Fixed CVEs

| CVE ID | CVSS | Component |
| --- | --- | --- |
| (see security advisory) | — | — |

## Resolved issues

See the upstream OpenJDK 21.0.6 changelog for the full list of backported fixes.
```

- [ ] **Step 3: Build to verify**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Re-run the e2e smoke test now that both versions are real**

Run: `bun run test:e2e`
Expected: PASS (2 tests). Switching 25 → 21 lands on `/liberica-jdk/21.0.6b10/install-guide/` with an `<h1>` containing "21".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: Liberica JDK 21 install guide and release notes"
```

---

### Task 6: Shared JDK How-To pages + NIK product docs

**Files:**
- Modify: `src/content/docs/liberica-jdk/how-to/ide.md`
- Modify: `src/content/docs/liberica-jdk/how-to/jvm-memory.md`
- Modify: `src/content/docs/liberica-jdk/how-to/crac.md`
- Modify: `src/content/docs/liberica-nik/index.md`, `install-guide.md`, `release-notes.md`, `how-to-spring-boot.md`

**Interfaces:**
- Consumes: slugs from Task 2.
- Produces: real (non-stub) content for the shared How-To group and the NIK topic.

- [ ] **Step 1: Write the shared How-To pages**

`src/content/docs/liberica-jdk/how-to/ide.md`:

```md
---
title: Using Liberica JDK in your IDE
description: Register Liberica JDK as an SDK in IntelliJ IDEA, Eclipse, and VS Code.
---

This page applies to every Liberica JDK version — use the version dropdown only
on version-specific pages (Install Guide, Release Notes).

## IntelliJ IDEA

File → Project Structure → SDKs → **+** → Add JDK → select the Liberica JDK
install directory (e.g. the path printed by `update-alternatives --list java`).

## Eclipse

Preferences → Java → Installed JREs → **Add** → Standard VM → set the JRE home
to the Liberica JDK directory.

## VS Code

Set `java.jdt.ls.java.home` (and optionally `java.configuration.runtimes`) in
`settings.json` to the Liberica JDK path.
```

`src/content/docs/liberica-jdk/how-to/jvm-memory.md`:

```md
---
title: Guide to JVM memory configuration options
description: Control heap and metaspace sizing for Liberica JDK.
---

## Heap size

```bash
java -Xms512m -Xmx2g -jar app.jar
```

- `-Xms` — initial heap.
- `-Xmx` — maximum heap.

## Container-aware sizing

In containers, prefer percentage-based sizing so the JVM respects cgroup limits:

```bash
java -XX:InitialRAMPercentage=50 -XX:MaxRAMPercentage=75 -jar app.jar
```

## Metaspace

```bash
java -XX:MaxMetaspaceSize=256m -jar app.jar
```
```

- [ ] **Step 1b: Write the CRaC how-to**

`src/content/docs/liberica-jdk/how-to/crac.md`:

````md
---
title: Using CRaC with Java applications
description: Snapshot and restore a running JVM for near-instant startup.
---

CRaC (Coordinated Restore at Checkpoint) snapshots a running JVM and restores it
later for near-instant startup. Use a CRaC-enabled Liberica JDK build.

## Take a checkpoint

```bash
java -XX:CRaCCheckpointTo=./cr -jar app.jar
# in another shell, once the app is warm:
jcmd app.jar JDK.checkpoint
```

## Restore

```bash
java -XX:CRaCRestoreFrom=./cr
```

Make resources CRaC-aware by implementing `jdk.crac.Resource` and registering
with `Core.getGlobalContext().register(...)` to close/reopen files and sockets
around the checkpoint.
````

**NIK is path-versioned (25 + 21), like JDK**, so it gets the version dropdown too. Per-version pages are Install Guide + Release Notes; the landing and the Spring Boot how-to are shared (no version segment). ponytail: real NIK versioning follows a GraalVM-based scheme — for the showcase we label NIK builds by their bundled-Java LTS (25, 21) so the dropdown is uniform across products; upgrade path is to use NIK's real version strings if you later mirror them.

- [ ] **Step 2: Restructure the NIK topic to be versioned (astro.config.mjs)**

The NIK topic was a flat list in Task 2. Replace its `items` so it mirrors the JDK topic — version groups + a shared How To group. In `astro.config.mjs`, change the Native Image Kit topic's `items` to:

```js
            items: [
              'liberica-nik',
              {
                label: '25.0.3+11 (LTS)',
                items: [
                  'liberica-nik/25.0.3b11/release-notes',
                  'liberica-nik/25.0.3b11/install-guide',
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-nik/21.0.6b10/release-notes',
                  'liberica-nik/21.0.6b10/install-guide',
                ],
              },
              {
                label: 'How To',
                items: ['liberica-nik/how-to-spring-boot'],
              },
            ],
```

Then delete the two now-obsolete flat stubs from Task 2:

```bash
git rm src/content/docs/liberica-nik/install-guide.md src/content/docs/liberica-nik/release-notes.md
```

- [ ] **Step 3: Write the NIK landing page (shared)**

Overwrite `src/content/docs/liberica-nik/index.md`:

```md
---
title: Liberica Native Image Kit
description: GraalVM-based kit that compiles Java applications into native executables.
---

Liberica Native Image Kit (NIK) is a GraalVM-based tool that transforms Java
applications into fast, lightweight native executables. Ahead-of-time
compilation cuts startup time and memory use — ideal for cloud and containers.

- [Installation Guide (NIK 25)](/liberica-nik/25.0.3b11/install-guide/)
- [Release Notes (NIK 25)](/liberica-nik/25.0.3b11/release-notes/)
- [How To: native image from Spring Boot](/liberica-nik/how-to-spring-boot/)
```

- [ ] **Step 4: Write the per-version NIK install guides**

`src/content/docs/liberica-nik/25.0.3b11/install-guide.md`:

````md
---
title: "Liberica NIK 25: Installation Guide"
slug: liberica-nik/25.0.3b11/install-guide
description: Install Liberica Native Image Kit (bundles Java 25) and build your first native image.
---

## Install

Download the NIK 25 archive for your platform from the BellSoft downloads page,
unpack it, and put its `bin` on your `PATH`:

```bash
tar -zxvf bellsoft-nik-25-linux-amd64.tar.gz
export PATH="$PWD/bellsoft-nik-25/bin:$PATH"
```

## Build a native HelloWorld

```bash
cat > HelloWorld.java <<'EOF'
public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello, native world!");
  }
}
EOF

javac HelloWorld.java
native-image HelloWorld
./helloworld
```
````

`src/content/docs/liberica-nik/21.0.6b10/install-guide.md` (same structure, NIK 21):

````md
---
title: "Liberica NIK 21: Installation Guide"
slug: liberica-nik/21.0.6b10/install-guide
description: Install Liberica Native Image Kit (bundles Java 21) and build your first native image.
---

## Install

Download the NIK 21 archive for your platform from the BellSoft downloads page,
unpack it, and put its `bin` on your `PATH`:

```bash
tar -zxvf bellsoft-nik-21-linux-amd64.tar.gz
export PATH="$PWD/bellsoft-nik-21/bin:$PATH"
```

## Build a native HelloWorld

```bash
cat > HelloWorld.java <<'EOF'
public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello, native world!");
  }
}
EOF

javac HelloWorld.java
native-image HelloWorld
./helloworld
```
````

- [ ] **Step 5a: Write the per-version NIK release notes**

`src/content/docs/liberica-nik/25.0.3b11/release-notes.md`:

```md
---
title: "Liberica NIK 25: Release Notes"
slug: liberica-nik/25.0.3b11/release-notes
description: Release notes for Liberica Native Image Kit bundling Java 25.
---

## Version information

- **Base:** GraalVM Community
- **Bundled Java:** Liberica JDK 25 (LTS).

## What's New

- Native image generation on the Java 25 LTS line.
- CRaC and container-friendly defaults.
```

`src/content/docs/liberica-nik/21.0.6b10/release-notes.md`:

```md
---
title: "Liberica NIK 21: Release Notes"
slug: liberica-nik/21.0.6b10/release-notes
description: Release notes for Liberica Native Image Kit bundling Java 21.
---

## Version information

- **Base:** GraalVM Community
- **Bundled Java:** Liberica JDK 21 (LTS).

## What's New

- Native image generation on the Java 21 LTS line.
- CRaC and container-friendly defaults.
```

- [ ] **Step 5b: Write the shared Spring Boot how-to**

Overwrite `src/content/docs/liberica-nik/how-to-spring-boot.md`:

````md
---
title: Building a native image from a Spring Boot app
description: Use the Spring Boot AOT tooling with Liberica NIK.
---

With Liberica NIK on your `PATH`, build a native Spring Boot app:

```bash
./mvnw -Pnative native:compile
./target/myapp
```

The Spring Boot `native` profile drives GraalVM AOT; NIK provides the
`native-image` toolchain it calls.
````

- [ ] **Step 5: Build to verify**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: shared JDK how-to pages and NIK product docs"
```

---

### Task 7: Debugging & Optimization pages (JFR + jcmd)

**Files:**
- Modify: `src/content/docs/liberica-jdk/debugging/jfr-mission-control.md`
- Modify: `src/content/docs/liberica-jdk/debugging/jcmd.md`

**Interfaces:**
- Consumes: the `Debugging and Optimization` group + slugs added to the JDK topic in Task 2.
- Produces: real (non-stub) content for two representative debugging pages drawn from the current site's "Debugging and Optimization" section (the full set is intentionally not copied).

- [ ] **Step 1: Write the JFR + Mission Control page**

`src/content/docs/liberica-jdk/debugging/jfr-mission-control.md`:

````md
---
title: "JDK Flight Recorder: using JFR with Mission Control"
description: Record JVM events with JFR and analyze them in JDK Mission Control.
---

JDK Flight Recorder (JFR) collects low-overhead runtime events; JDK Mission
Control (JMC) is the GUI for analyzing the recordings.

## Record

Start a time-boxed recording on a running app:

```bash
jcmd <pid> JFR.start name=rec settings=profile duration=60s filename=rec.jfr
```

Or record from launch:

```bash
java -XX:StartFlightRecording=filename=rec.jfr,duration=60s,settings=profile -jar app.jar
```

## Analyze

Open `rec.jfr` in JDK Mission Control: **File → Open File**. The Automated
Analysis page flags hot methods, allocation pressure, and long pauses.
````

- [ ] **Step 2: Write the jcmd page**

`src/content/docs/liberica-jdk/debugging/jcmd.md`:

````md
---
title: "Using jcmd locally, containerized, and remotely"
description: Drive diagnostic commands against a running JVM with jcmd.
---

`jcmd` sends diagnostic commands to a running JVM by PID.

## Locally

```bash
jcmd                         # list JVMs
jcmd <pid> help              # list available commands
jcmd <pid> Thread.print      # thread dump
jcmd <pid> GC.heap_info      # heap summary
```

## In a container

Run `jcmd` from inside the container's PID namespace:

```bash
docker exec <container> jcmd 1 Thread.print
```

## Remotely

`jcmd` is local-only. For remote diagnostics, expose JFR/JMX and connect with
JDK Mission Control, or run `jcmd` over `kubectl exec` / `docker exec`.
````

- [ ] **Step 3: Build to verify**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: debugging and optimization pages (JFR, jcmd)"
```

---

### Task 8: Container Images product docs

**Files:**
- Modify: `src/content/docs/containers/index.md`, `tags.md`, `usage.md`

**Interfaces:**
- Consumes: slugs from Task 2.
- Produces: real content for the Container Images topic, using the verified `bellsoft/liberica-runtime-container` repo and tag pattern.

- [ ] **Step 1: Write the landing page**

Overwrite `src/content/docs/containers/index.md`:

```md
---
title: Liberica Container Images
description: Ready-to-run Liberica JDK/JRE container images built on Alpaquita Linux.
---

BellSoft publishes Liberica JDK and JRE container images optimized for cloud
deployment, built on Alpaquita Linux. They are distributed from the
`bellsoft/liberica-runtime-container` repository on Docker Hub.

Three image types are available:

- **jdk** — Liberica JDK Lite, optimized for cloud.
- **jdk-all** — full JDK with `jlink` for custom runtimes.
- **jre** — runtime only, no development tools.

See [Tags](/containers/tags/) and [Usage](/containers/usage/).
```

- [ ] **Step 2: Write the tags reference**

Overwrite `src/content/docs/containers/tags.md`:

````md
---
title: Container image tags
description: Tag naming scheme for bellsoft/liberica-runtime-container.
---

Tags follow the pattern:

```
[jdk type]-[java version]-[crac]-[cds]-[slim]-[libc type]
```

Images come in **musl** or **glibc** variants, with optional **CRaC** and
**Class Data Sharing (CDS)** builds.

| Example tag | Meaning |
| --- | --- |
| `jdk-all-21-glibc` | Full JDK 21, glibc |
| `jdk-17-glibc` | JDK Lite 17, glibc |
| `jre-21-crac-slim-glibc` | Slim JRE 21 with CRaC, glibc |
| `jre-11-slim-musl` | Slim JRE 11, musl |
````

- [ ] **Step 3: Write the usage page**

Overwrite `src/content/docs/containers/usage.md`:

````md
---
title: Using the container images
description: Pull, run, and build on Liberica container images.
---

## Pull

```bash
docker pull bellsoft/liberica-runtime-container:jdk-all-21-glibc
```

## Run

```bash
docker run --rm bellsoft/liberica-runtime-container:jdk-all-21-glibc java -version
```

## Build your app on top

```dockerfile
FROM bellsoft/liberica-runtime-container:jre-21-slim-glibc
COPY target/app.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```
````

- [ ] **Step 4: Build to verify**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: container images product pages"
```

---

### Task 9: Alpaquita Linux product docs

**Files:**
- Modify: `src/content/docs/alpaquita/index.md`, `get-started.md`

**Interfaces:**
- Consumes: slugs from Task 2.
- Produces: real content for the Alpaquita topic (stub-level depth is acceptable for the showcase; it is a secondary product).

- [ ] **Step 1: Write the landing page**

Overwrite `src/content/docs/alpaquita/index.md`:

```md
---
title: Alpaquita Linux
description: A small, secure Linux base for containers, VMs, and bare metal.
---

Alpaquita Linux is a lightweight, secure Linux distribution optimized for Java
workloads. It ships in two libc flavors — **musl** (smallest footprint) and
**glibc** (broad compatibility) — and is the base for Liberica container images.

See [Get started](/alpaquita/get-started/).
```

- [ ] **Step 2: Write the get-started page**

Overwrite `src/content/docs/alpaquita/get-started.md`:

````md
---
title: Get started with Alpaquita Linux
description: Pull the Alpaquita base image and install a JDK.
---

## Run the base image

```bash
docker run --rm -it bellsoft/alpaquita-linux-base:stream-musl sh
```

## Install Liberica JDK inside it

```bash
apk add bellsoft-java21
java -version
```
````

- [ ] **Step 3: Build to verify**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: Alpaquita Linux product pages"
```

---

### Task 10: Branding, landing polish, and full verification

**Files:**
- Create: `src/assets/bellsoft-logo.svg` (downloaded from the official site)
- Modify: `astro.config.mjs` (real title, `logo` config, fix scaffold social link)
- Modify: `src/styles/custom.css`
- Modify: `src/content/docs/index.mdx` (richer hero with all four products)

**Interfaces:**
- Consumes: everything above.
- Produces: branded, developer-friendly landing (real BellSoft logo in the header) and the final green build + tests.

- [ ] **Step 0: Reuse the real BellSoft logo in the header**

Download the official logo asset and wire it via Starlight's native `logo` option (no component override needed). ponytail: BellSoft's logo is their trademark — fine for this showcase, not for publishing as if official.

```bash
mkdir -p src/assets
# Grab the site's header logo (SVG preferred). Inspect https://bell-sw.com/ for the
# current asset URL; as of writing it is served from their assets path:
curl -fsSL -o src/assets/bellsoft-logo.svg "https://bell-sw.com/assets/images/logo.svg" \
  || curl -fsSL -o src/assets/bellsoft-logo.svg "https://www.bell-sw.com/assets/images/bellsoft-logo.svg"
# Verify it is real SVG, not an HTML error page:
head -c 64 src/assets/bellsoft-logo.svg
```

If neither URL resolves to an SVG, open https://bell-sw.com/ in a browser, copy the header logo's asset URL from devtools, and curl that. If only a PNG is available, save it as `src/assets/bellsoft-logo.png` and reference that path instead.

In `astro.config.mjs`, set the real title and logo inside the `starlight({ ... })` options, and replace the scaffold GitHub social link with the BellSoft site:

```js
      title: 'BellSoft Docs',
      logo: {
        src: './src/assets/bellsoft-logo.svg',
        replacesTitle: false,
        alt: 'BellSoft',
      },
      social: [
        { icon: 'external', label: 'bell-sw.com', href: 'https://bell-sw.com/' },
      ],
```

Build to confirm the asset resolves (`bun run build` — Astro errors if the `logo.src` path is missing).

- [ ] **Step 1: Add brand color tokens**

Overwrite `src/styles/custom.css` (BellSoft red accent):

```css
:root {
  --sl-color-accent-low: #3a0c0c;
  --sl-color-accent: #c8202f;
  --sl-color-accent-high: #f1a7ad;
}
:root[data-theme='light'] {
  --sl-color-accent-low: #f7d4d7;
  --sl-color-accent: #b81c2a;
  --sl-color-accent-high: #5a0d14;
}
.version-switcher select:hover {
  border-color: var(--sl-color-accent);
}
```

- [ ] **Step 2: Expand the landing hero with all four products**

Overwrite `src/content/docs/index.mdx`:

```mdx
---
title: BellSoft Documentation
description: Developer documentation for Liberica JDK, NIK, container images, and Alpaquita Linux.
template: splash
hero:
  tagline: Everything you need to download, install, and run BellSoft's Java runtimes.
  actions:
    - text: Install Liberica JDK 25
      link: /liberica-jdk/25.0.3b11/install-guide/
      icon: right-arrow
      variant: primary
    - text: Native Image Kit
      link: /liberica-nik/
      icon: rocket
      variant: minimal
---

import { Card, CardGrid } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Liberica JDK" icon="seti:java">
    Per-version docs for JDK 25 and 21. Switch versions on any page with the
    sidebar dropdown.
  </Card>
  <Card title="Native Image Kit" icon="rocket">
    Compile Java apps into fast, lightweight native executables.
  </Card>
  <Card title="Container Images" icon="seti:docker">
    Ready-to-run JDK/JRE images built on Alpaquita Linux.
  </Card>
  <Card title="Alpaquita Linux" icon="linux">
    A small, secure Linux base for Java workloads.
  </Card>
</CardGrid>
```

- [ ] **Step 3: Full build**

Run: `bun run build`
Expected: PASS, all product/version routes emitted.

- [ ] **Step 4: Run all tests (unit + e2e)**

Run: `bun run test:unit && bun run test:e2e`
Expected: unit 5 PASS; e2e 2 PASS.

- [ ] **Step 5: Manual developer-experience pass**

Run: `bun run dev` and verify:
- Sidebar shows four product icons; clicking each swaps the sidebar.
- On `/liberica-jdk/25.0.3b11/install-guide/`, the version dropdown switches to 21 and stays on the install guide.
- On the install guide, picking the **Linux → Alpine (apk)** tab, then switching to JDK 21 via the dropdown, keeps Linux/Alpine selected (synced tabs).
- The JDK sidebar shows a visible **Security Advisory** link (opens docs.bell-sw.com) and a **Legal** group (EULA + third-party licenses).
- Search (top of page) finds "native-image" and "bellsoft-java21".
- Light/dark toggle keeps the red accent readable.
Stop the dev server.

- [ ] **Step 6: Write a short README**

Create `README.md`:

````md
# BellSoft Liberica Developer Docs

Astro + Starlight documentation showcase.

## Requirements

Node.js 18.17.1+ (or 20.3.0+) and Bun 1.1+.

## Develop

```bash
bun install
bun run dev      # http://localhost:4321
bun run build    # production build (also the CI gate)
bun run test:unit
bun run test:e2e
```

## Structure

- Products are sidebar "topics" (`starlight-sidebar-topics`) with icons.
- Liberica JDK and NIK have per-version pages (full versions, e.g. `25.0.3b11`);
  the sidebar version dropdown (`src/components/VersionSwitcher.astro`) keeps you
  on the same page across versions via `src/lib/swapVersion.mjs`.
- Add a version: create `src/content/docs/<product>/<version-slug>/{install-guide,release-notes}.md`
  (slug = full version with `+`→`b`, e.g. `25.0.4b7`), add `{slug,label}` to that
  product's array in `PRODUCT_VERSIONS` in `src/lib/swapVersion.mjs`, and add a
  group to the product's topic in `astro.config.mjs`.
````

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: branding, landing cards, README, and final verification"
```

---

### Task 11: Internal link validation (build-time)

**Files:**
- Modify: `astro.config.mjs` (add `starlight-links-validator` to `plugins`)

**Interfaces:**
- Consumes: the full content tree and topics config from all prior tasks.
- Produces: `bun run build` now fails on any broken **internal** link (dead `/path/` references, missing heading anchors), so the build gate also guards link integrity. External links (bell-sw.com, docs.bell-sw.com) are not checked by default — correct, since they live off-site.

- [ ] **Step 1: Install the plugin**

```bash
bun add -d starlight-links-validator
```

- [ ] **Step 2: Register it as the FIRST Starlight plugin**

In `astro.config.mjs`, import and add it ahead of the topics plugin so it sees the resolved routes:

```js
import starlightLinksValidator from 'starlight-links-validator';
```

```js
      plugins: [
        starlightLinksValidator(),
        starlightSidebarTopics([
          // ...unchanged...
        ]),
      ],
```

- [ ] **Step 3: Build to prove it runs and passes on the current (correct) tree**

Run: `bun run build`
Expected: PASS, with a links-validator pass line in the output (e.g. "All internal links are valid"). Internal cross-links authored in Tasks 6–9 (e.g. the NIK landing's links to `/liberica-nik/install-guide/`) are validated here.

- [ ] **Step 4: Prove it actually catches a broken link (sanity check, then revert)**

Temporarily add a bad link to `src/content/docs/index.mdx` (e.g. `[broken](/liberica-jdk/99/install-guide/)`), run `bun run build`, confirm it FAILS naming that link, then remove the bad link and rebuild to green. Do not commit the bad link.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "build: validate internal links via starlight-links-validator"
```

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Real developer docs with Starlight | Task 1 |
| Java docs structured by version | Tasks 2, 4, 5 |
| Downloading / installation / verify / uninstall | Tasks 4, 5 |
| Switch between Java versions, see the same page | Task 3 (dropdown + `swapVersion`) |
| Product icons in the sidebar | Task 2 (`starlight-sidebar-topics`) |
| Release notes | Tasks 4, 5 (JDK), 6 (NIK) |
| Container images + NIK (user follow-up) | Tasks 6, 8 |
| Security Advisory links, visible (user follow-up) | Task 2 (sidebar external link + badge) |
| Legal links, visible (user follow-up) | Task 2 (sidebar Legal group: EULA + third-party licenses) |
| How-To + Debugging/Optimization, not all copied (user follow-up) | Task 6 (How-To: ide, jvm-memory, crac), Task 7 (Debugging: JFR, jcmd) |
| Distro-dependent install tabs (user follow-up) | Tasks 4, 5 (`<Tabs syncKey="os">` + `syncKey="distro">`) |
| A couple of versions to showcase, not all pages | JDK 25 + 21 only; shared How-To/Debugging not duplicated |
| Developer-friendly | Real commands, synced OS/distro tabs, search, copy-paste blocks, landing cards |

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code/content step shows full content. The Task 2 stubs are an intentional, explicitly-labeled bootstrap (the plugin needs all referenced slugs to exist before the build passes) and every stub is replaced with real content in Tasks 4–9.

**3. Type consistency:** `swapVersion(pathname, slug)`, `versionOf(pathname)`, `productOf(pathname)`, and the `PRODUCT_VERSIONS` registry are defined in Task 3 and used identically in the component, tests, and README. Full-version slugs (`liberica-jdk/25.0.3b11/install-guide`, `liberica-nik/21.0.6b10/release-notes`, etc.) come from `PRODUCT_VERSIONS` and are reused verbatim in the topics config and content dir names. Icon names (`seti:java`, `rocket`, `seti:docker`, `linux`) are consistent between the topics config (Task 2) and the landing cards (Task 9).

---

## Notes / deliberate simplifications (ponytail)

- **Version dropdown over `starlight-versions` plugin:** ~40 lines, no archival snapshots, exact "same page" control. Upgrade path: adopt `starlight-versions` only if you later need frozen historical doc sets.
- **Both JDK trees share an identical page set**, so `swapVersion` never 404s and needs no fallback. If the trees diverge, add an allow-list guard in the component's `change` handler.
- **Shared How-To pages are version-agnostic** (single copy), matching the real site and avoiding duplication. The dropdown intentionally does not render there.
- **Alpaquita depth is shallow** — it is a secondary product here; deepen only if it becomes a focus.
- **Icons are Starlight built-ins**, not real product logos. Upgrade path: register custom SVG logos and reference them once Starlight custom-icon support is wired (or via a `Sidebar`/`SiteTitle` override).
