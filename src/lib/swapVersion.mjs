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
