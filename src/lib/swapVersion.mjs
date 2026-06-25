// --- Base-path helpers (the site is served under a base, e.g. /bellsoft-docs) ---
// Strip the configured base off a full pathname so the version logic below can
// reason about base-relative paths; add it back when navigating.
export function stripBase(pathname, base = '/') {
  if (!base || base === '/') return pathname;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  if (pathname === b) return '/';
  if (pathname.startsWith(b + '/')) return pathname.slice(b.length);
  return pathname;
}
export function withBase(pathname, base = '/') {
  if (!base || base === '/') return pathname;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return b + pathname;
}

// Single source of truth for path-versioned products. Order = dropdown order.
// slug = URL segment (bell-sw.com style: `+` -> `b`); label = display string.
// Containers (Docker tags) are intentionally absent — they are not
// path-versioned, so the dropdown never appears on them. Alpaquita is versioned
// by release stream (`stream`, `25-lts`); its landing page (`/alpaquita/`) is
// shared and shows no dropdown.
export const PRODUCT_VERSIONS = {
  'liberica-jdk': [
    { slug: '25.0.3b11', label: '25.0.3+11' },
    { slug: '21.0.6b10', label: '21.0.6+10' },
  ],
  'liberica-nik': [
    { slug: '25.0.3b11', label: '25.0.3+11' },
    { slug: '21.0.6b10', label: '21.0.6+10' },
  ],
  'alpaquita': [
    { slug: 'stream', label: 'Stream' },
    { slug: '25-lts', label: '25 (LTS)' },
  ],
};

// Matches the leading `/<product>/<segment>/` of a path.
// Group 1 = product, 2 = segment, 3 = trailing slash or end.
const PREFIX = /^\/([^/]+)\/([^/]+)(\/|$)/;

// Matches just the leading `/<product>` segment (covers the landing path too).
const PRODUCT = /^\/([^/]+)/;

// The path-versioned product in a path, or null. Matches both versioned and
// shared pages of the product, including the bare landing (e.g. `/liberica-nik/`).
export function productOf(pathname) {
  const m = pathname.match(PRODUCT);
  return m && PRODUCT_VERSIONS[m[1]] ? m[1] : null;
}

// The default (latest) version slug for a product — first in the registry.
export function defaultVersionOf(product) {
  return PRODUCT_VERSIONS[product]?.[0]?.slug ?? null;
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

// The first content page of a product version — where the version dropdown
// navigates when switched from a shared/landing page (which has no version
// segment to swap). Alpaquita's install guide lives under `/general/`; JDK and
// NIK have it at the version root.
export function entryPathOf(product, slug) {
  if (product === 'alpaquita') return `/alpaquita/${slug}/general/install-guide/`;
  return `/${product}/${slug}/install-guide/`;
}

// Given a Starlight sidebar entry array, keep only the ACTIVE version's group
// (plus all shared groups and links), dropping the other versions' groups — so
// the sidebar shows one version at a time and the dropdown switches between
// them. A "version group" is a group whose label contains one of the product's
// version labels (e.g. "25.0.3+11 (LTS)"). Pure, so it is unit-tested.
export function filterSidebarForVersion(sidebar, product, activeSlug) {
  const versions = PRODUCT_VERSIONS[product];
  if (!versions || !activeSlug) return sidebar;
  const labels = versions.map((v) => v.label);
  const activeLabel = versions.find((v) => v.slug === activeSlug)?.label;
  if (!activeLabel) return sidebar;
  // A version group's config label is `<version label> (LTS)`, so match the
  // label at a word boundary (exact, or version-label followed by a space) —
  // a plain `includes` would let `25.0.3+1` also match `25.0.3+11 (LTS)`.
  const isLabel = (groupLabel, verLabel) =>
    groupLabel === verLabel || groupLabel.startsWith(verLabel + ' ');
  return sidebar.filter((entry) => {
    if (entry.type !== 'group') return true;
    const isVersionGroup = labels.some((l) => isLabel(entry.label, l));
    return !isVersionGroup || isLabel(entry.label, activeLabel);
  });
}
