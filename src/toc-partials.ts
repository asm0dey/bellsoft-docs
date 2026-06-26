import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { PRODUCT_VERSIONS } from './lib/swapVersion.mjs';

type Heading = { depth: number; slug: string; text: string };
type TocItem = Heading & { children: TocItem[] };

// Inlined from Starlight's internal generateToC (not a public export): turn a
// flat heading list into the nested tree the ToC component expects.
function injectChild(items: TocItem[], item: TocItem): void {
  const last = items.at(-1);
  if (!last || last.depth >= item.depth) items.push(item);
  else injectChild(last.children, item);
}
function generateToC(
  headings: Heading[],
  opts: { minHeadingLevel: number; maxHeadingLevel: number; title: string }
): TocItem[] {
  const filtered = headings.filter(
    ({ depth }) => depth >= opts.minHeadingLevel && depth <= opts.maxHeadingLevel
  );
  const toc: TocItem[] = [{ depth: 2, slug: '_top', text: opts.title, children: [] }];
  for (const h of filtered) injectChild(toc, { ...h, children: [] });
  return toc;
}

// Pages that share evergreen content render it through an imported `<Body />`
// partial (src/partials/*.mdx). Starlight builds "On this page" from the page
// file's OWN headings, which never include headings inside an imported
// component — so those pages got an empty ToC. This middleware looks up the
// backing partial by slug convention, reads its headings, and rebuilds the ToC.

// Eagerly import every partial so we can call its `getHeadings()` at build time.
const partials = import.meta.glob('./partials/*.mdx', { eager: true }) as Record<
  string,
  { getHeadings?: () => { depth: number; slug: string; text: string }[] }
>;

// slug -> partial basename. Mirrors how the wrappers import their partial:
//   liberica-jdk/<v>/how-to/<t>      -> how-to-<t>
//   liberica-jdk/<v>/debugging/<t>   -> debugging-<t>
//   liberica-jdk/<v>/containers      -> containers-index
//   liberica-jdk/<v>/containers/<t>  -> containers-<t>
//   liberica-nik/<v>/how-to/<t>      -> nik-<t>   (section dropped, matches files)
function partialBasename(slug: string): string | null {
  const parts = slug.replace(/^\/+|\/+$/g, '').split('/');
  const [product, , section, ...rest] = parts;
  if (!section) return null;
  const tail = rest.join('-');
  if (product === 'liberica-nik') {
    // how-to pages map to nik-<tail> (section dropped); other sections keep it
    // (containers -> nik-containers, containers/hardened -> nik-containers-hardened).
    const segs = [section, ...rest].filter((s) => s !== 'how-to');
    return 'nik-' + segs.join('-');
  }
  if (section === 'containers') return tail ? `containers-${tail}` : 'containers-index';
  return tail ? `${section}-${tail}` : null;
}

// Pagefind indexes every rendered page, so a partial shared across versions
// gets indexed once per version — duplicate search hits all pointing at stale
// URLs. Dedup by partial: keep only the NEWEST version that renders each
// partial (registry order, index 0 = latest) and mark the rest pagefind:false.
// Pages unique to an older version (no newer wrapper for that partial) stay
// indexed. Non-partial pages (install-guide, release-notes, all of alpaquita)
// are real per-version content and untouched.
const REDUNDANT_SLUGS: Set<string> = (() => {
  const keys = Object.keys(
    import.meta.glob('./content/docs/**/*.{md,mdx}', { eager: false })
  );
  // group key `${product}::${basename}` -> [{ slug, rank }]
  const groups = new Map<string, { slug: string; rank: number }[]>();
  for (const key of keys) {
    const slug = key.replace('./content/docs/', '').replace(/\.mdx?$/, '');
    const [product, version] = slug.split('/');
    const versions = PRODUCT_VERSIONS[product];
    if (!versions) continue;
    const rank = versions.findIndex((v) => v.slug === version);
    if (rank < 0) continue; // not a version page (shared/landing)
    const base = partialBasename(slug);
    if (!base || !partials[`./partials/${base}.mdx`]) continue; // not partial-backed
    const gkey = `${product}::${base}`;
    (groups.get(gkey) ?? groups.set(gkey, []).get(gkey)!).push({ slug, rank });
  }
  const redundant = new Set<string>();
  for (const entries of groups.values()) {
    const newest = Math.min(...entries.map((e) => e.rank));
    for (const e of entries) if (e.rank > newest) redundant.add(e.slug);
  }
  return redundant;
})();

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (!route?.toc) return; // splash pages etc. have no ToC

  const slug = (route.entry as { slug?: string })?.slug ?? route.id;

  // Drop redundant older-version copies of shared partials from the search index.
  if (REDUNDANT_SLUGS.has(slug)) {
    (route.entry.data as { pagefind?: boolean }).pagefind = false;
  }

  const base = partialBasename(slug);
  if (!base) return;

  const mod = partials[`./partials/${base}.mdx`];
  const partialHeadings = mod?.getHeadings?.();
  if (!partialHeadings?.length) return;

  // Page's own headings (usually none) come first, then the partial's.
  const headings = [...route.headings, ...partialHeadings];
  route.headings = headings;
  route.toc.items = generateToC(headings, {
    minHeadingLevel: route.toc.minHeadingLevel,
    maxHeadingLevel: route.toc.maxHeadingLevel,
    title: route.toc.items[0]?.text ?? 'Overview',
  });
});
