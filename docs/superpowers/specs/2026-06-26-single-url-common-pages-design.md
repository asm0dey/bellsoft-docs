# Single-URL common pages

## Problem

Shared/evergreen docs (IDE setup, containers, debugging, etc.) are currently
rendered **once per product version**. Each version directory holds a thin
wrapper page that imports a shared partial:

```
src/content/docs/liberica-jdk/25.0.3b11/how-to/use-ide.mdx  -> imports @partials/how-to-use-ide.mdx
src/content/docs/liberica-jdk/21.0.6b10/how-to/use-ide.mdx  -> imports @partials/how-to-use-ide.mdx
```

Source is shared, but each version still produces a distinct URL. That forces
extra machinery to paper over the duplication:

- `toc-partials.ts` rebuilds the "On this page" ToC because partial headings
  don't appear in the wrapper page's own headings.
- `toc-partials.ts` also computes `REDUNDANT_SLUGS` to mark all-but-newest
  copies `pagefind:false` so search isn't full of duplicate hits at stale URLs.

## Goal

A common page should:

1. Live at a **single, version-less URL** (`/liberica-jdk/how-to/use-ide/`).
2. Still show the version picker.
3. Appear in **every applicable version's** sidebar group.
4. On version switch: the sidebar's *version-specific* entries change and
   in-body version-specific links retarget, while the reader **stays on the
   common page** (no navigation away).

Per-version pages with genuinely per-version content (`install-guide`,
`release-notes`) stay version-specific. **Alpaquita is untouched** — it has no
common pages; its sidebar keeps today's server-side version filtering.

## Key constraint

This is a **static** build (`astro build`). The sidebar is baked per page at
build time and cannot read the reader's selected version. So any
"stay on the same URL, change the sidebar/links to the chosen version" behavior
must be **client-side**. The single active-version value is tracked in
`localStorage` (and inferred from the URL on version pages).

## Design

### 1. URL & file layout

- Common pages move to **version-less paths**, keeping their section subpath:
  - `/liberica-jdk/how-to/use-ide/`
  - `/liberica-jdk/containers/tags/`
  - `/liberica-jdk/debugging/use-jcmd/`
  - `/liberica-nik/how-to/select-gc/`
  - …one page per current `src/partials/*.mdx`, 1:1, product-prefixed.
- Partial content is **inlined** into that single page. The partial indirection
  existed only to share across version copies; with one copy it's dead weight.
- Stays version-specific (real per-version content): `install-guide`,
  `release-notes`. Alpaquita: every page unchanged.

### 2. Link conversion

Partial body links fall into two classes, distinguishable by depth:

- `../../install-guide/` and `../../release-notes/` — cross the version
  boundary, target **version-specific** pages. These are the *only* `../../`
  targets (verified: `grep -roE '\]\(\.\./\.\./[^)]*\)' src/partials` returns
  only `install-guide` and `release-notes`). Convert to `<VersionLink>`.
- `../<x>` (`../hardened/`, `../jvm-memory-configuration/`,
  `../containers/tags/`, `../using-nik-with-desktop-applications/`, `../`) —
  sibling **common** pages. Keep as plain relative links; they still resolve
  because common pages keep their section subpath.

### 3. `<VersionLink>` component

A small Astro component for common→version-specific links.

```astro
<VersionLink to="install-guide">the install guide</VersionLink>
```

Renders:

```html
<a href="/liberica-jdk/<latest>/install-guide/" data-vlink="install-guide">the install guide</a>
```

- Build-time `href` points to the **latest** version → valid output, works with
  no JS, passes `starlight-links-validator`.
- Product is inferred from the page's own path (component reads `Astro.url`).
- Client JS rewrites `href` to the active version on load and on switch.
- `to` accepts the version-specific page key (`install-guide`, `release-notes`);
  the full path is built as `/<product>/<activeSlug>/<to>/`.

### 4. Active-version state

```
active(product) = versionOf(path) ?? localStorage["v:" + product] ?? defaultVersionOf(product)
```

- **Version page** (URL has a known version segment): server-side sidebar filter
  to that version (today's `filterSidebarForVersion`, unchanged). JS writes that
  version to `localStorage["v:" + product]` on load so common pages inherit it.
- **Common page** (product known, no version segment): server renders **all**
  version groups (skip the filter). JS resolves `active`, hides non-active
  groups, sets the picker label, rewrites `[data-vlink]` hrefs.

### 5. Sidebar on common pages — show/hide whole groups

A version group's only version-specific links are `install-guide` +
`release-notes`; every other entry is a version-less common path identical in
every group. Therefore each rendered group already carries its own correct
`install-guide`/`release-notes` hrefs, and switching versions is just
**showing the active group and hiding the others** — no per-link sidebar
rewriting.

- Server renders all version groups on common pages.
- JS identifies each version group by its heading label (config label is
  `<version label> (LTS)`; matched with the same boundary rule as
  `filterSidebarForVersion`: exact, or `verLabel + " "` prefix). We own the
  labels via `PRODUCT_VERSIONS`.
- Hide all but the active group. Toggle on switch.

> Implementation note (verify during planning, not a design decision): confirm
> Starlight's sidebar group DOM structure so JS can locate a group element from
> its heading text and toggle the whole group.

### 6. Picker behavior — branch on page type

The picker's `data-path` (base-relative) tells which mode it's in:
`versionOf(data-path)` truthy → version page; null with a product → common page.

- **Version page** → switch navigates `swapVersion(path)` (unchanged).
- **Common page** → switch sets `localStorage`, toggles the visible sidebar
  group, rewrites `[data-vlink]` hrefs. **No navigation.**

`entryPathOf` was only used to jump from a shared page to install-guide on
switch; common pages no longer navigate, so it is expected to become dead →
delete (confirm no other callers during planning).

### 7. Sidebar config

Each common page is referenced by its **version-less path** inside every
applicable version group in `astro.config.mjs`. Per-version inclusion is still
allowed — e.g. `using-crac` stays only in the 21.x group.

### 8. Deletions (payoff)

- `src/partials/` (all files) and all per-version wrapper pages.
- `toc-partials.ts`: the partial-ToC rebuild **and** `REDUNDANT_SLUGS` pagefind
  dedup — both exist solely to manage per-version duplicates, which no longer
  exist. (Keep the file only if it still has unrelated middleware; otherwise
  drop it and its `routeMiddleware` registration.)
- `entryPathOf` in `swapVersion.mjs` (pending callers check).

### 9. Testing

- **Unit** (`swapVersion.mjs` is already unit-tested): active-version resolution
  helper and the version-group label-matching helper (both pure).
- **Playwright e2e** (one): load a common page, switch version in the picker →
  assert URL unchanged, the visible sidebar group swapped, and a `<VersionLink>`
  href updated to the chosen version.

## Known tradeoffs

- Brief picker-label / group flash before JS reads `localStorage` on common
  pages. Mitigable with CSS that default-hides non-latest groups until JS runs.
- No-JS readers see all version groups on common pages and `<VersionLink>`s
  pointing at latest. Acceptable degradation.

## Out of scope

- Alpaquita versioning changes.
- De-duplicating alpaquita's per-version pages (separate effort if desired).
