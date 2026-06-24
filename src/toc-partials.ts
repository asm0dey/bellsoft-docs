import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

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

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (!route?.toc) return; // splash pages etc. have no ToC

  const slug = (route.entry as { slug?: string })?.slug ?? route.id;
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
