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
