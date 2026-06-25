import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  swapVersion,
  versionOf,
  productOf,
  defaultVersionOf,
  PRODUCT_VERSIONS,
  filterSidebarForVersion,
  stripBase,
  withBase,
  entryPathOf,
} from '../src/lib/swapVersion.mjs';

test('entryPathOf returns the version entry page (alpaquita lives under /general/)', () => {
  assert.equal(entryPathOf('liberica-jdk', '25.0.3b11'), '/liberica-jdk/25.0.3b11/install-guide/');
  assert.equal(entryPathOf('liberica-nik', '21.0.6b10'), '/liberica-nik/21.0.6b10/install-guide/');
  assert.equal(entryPathOf('alpaquita', '25-lts'), '/alpaquita/25-lts/general/install-guide/');
});

test('stripBase / withBase round-trip and handle base with or without trailing slash', () => {
  for (const base of ['/bellsoft-docs', '/bellsoft-docs/']) {
    assert.equal(stripBase('/bellsoft-docs/liberica-jdk/x/', base), '/liberica-jdk/x/');
    assert.equal(withBase('/liberica-jdk/x/', base), '/bellsoft-docs/liberica-jdk/x/');
    assert.equal(stripBase('/bellsoft-docs', base), '/');
  }
  // Root base is a no-op.
  assert.equal(stripBase('/liberica-jdk/x/', '/'), '/liberica-jdk/x/');
  assert.equal(withBase('/liberica-jdk/x/', '/'), '/liberica-jdk/x/');
});

// A sidebar shaped like Starlight's: two version groups + a shared group + a link.
const SIDEBAR = [
  { type: 'group', label: '25.0.3+11 (LTS)', entries: [] },
  { type: 'group', label: '21.0.6+10 (LTS)', entries: [] },
  { type: 'group', label: 'How To', entries: [] },
  { type: 'link', label: 'Security Advisory', href: 'https://x' },
];

test('filterSidebarForVersion keeps only the active version group + shared entries', () => {
  const out = filterSidebarForVersion(SIDEBAR, 'liberica-jdk', '25.0.3b11');
  assert.deepEqual(
    out.map((e) => e.label),
    ['25.0.3+11 (LTS)', 'How To', 'Security Advisory']
  );
});

test('filterSidebarForVersion switches which version group survives', () => {
  const out = filterSidebarForVersion(SIDEBAR, 'liberica-jdk', '21.0.6b10');
  assert.deepEqual(
    out.map((e) => e.label),
    ['21.0.6+10 (LTS)', 'How To', 'Security Advisory']
  );
});

test('filterSidebarForVersion is a no-op for unknown product or slug', () => {
  assert.equal(filterSidebarForVersion(SIDEBAR, 'containers', '25.0.3b11'), SIDEBAR);
  assert.equal(filterSidebarForVersion(SIDEBAR, 'liberica-jdk', null), SIDEBAR);
});

test('filterSidebarForVersion matches labels at a boundary, not by substring', () => {
  // One label is a prefix of the other (25.0.3+1 vs 25.0.3+11); a naive
  // `includes` check would keep both groups. Boundary matching must not.
  PRODUCT_VERSIONS.__test = [
    { slug: 'a', label: '25.0.3+1' },
    { slug: 'b', label: '25.0.3+11' },
  ];
  try {
    const sidebar = [
      { type: 'group', label: '25.0.3+1 (LTS)', entries: [] },
      { type: 'group', label: '25.0.3+11 (LTS)', entries: [] },
    ];
    const out = filterSidebarForVersion(sidebar, '__test', 'a'); // active 25.0.3+1
    assert.deepEqual(out.map((e) => e.label), ['25.0.3+1 (LTS)']);
  } finally {
    delete PRODUCT_VERSIONS.__test;
  }
});

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

test('productOf also matches shared and landing pages of a versioned product', () => {
  assert.equal(productOf('/liberica-nik/'), 'liberica-nik'); // landing
  assert.equal(productOf('/liberica-jdk/how-to/ide/'), 'liberica-jdk'); // shared
  assert.equal(productOf('/liberica-jdk/debugging/jcmd/'), 'liberica-jdk');
  assert.equal(productOf('/alpaquita/'), 'alpaquita'); // versioned product, landing page
});

test('defaultVersionOf returns the latest (first) version slug', () => {
  assert.equal(defaultVersionOf('liberica-jdk'), '25.0.3b11');
  assert.equal(defaultVersionOf('liberica-nik'), '25.0.3b11');
  assert.equal(defaultVersionOf('containers'), null);
});

test('filterSidebarForVersion with a default slug keeps the latest version on shared pages', () => {
  const out = filterSidebarForVersion(SIDEBAR, 'liberica-jdk', defaultVersionOf('liberica-jdk'));
  assert.deepEqual(
    out.map((e) => e.label),
    ['25.0.3+11 (LTS)', 'How To', 'Security Advisory']
  );
});

test('PRODUCT_VERSIONS holds the showcase registry', () => {
  assert.deepEqual(Object.keys(PRODUCT_VERSIONS), ['liberica-jdk', 'liberica-nik', 'alpaquita']);
  assert.deepEqual(
    PRODUCT_VERSIONS['liberica-jdk'].map((v) => v.slug),
    ['25.0.3b11', '21.0.6b10']
  );
  assert.equal(PRODUCT_VERSIONS['liberica-jdk'][0].label, '25.0.3+11');
});
