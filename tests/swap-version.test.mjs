import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  swapVersion,
  versionOf,
  productOf,
  defaultVersionOf,
  PRODUCT_VERSIONS,
  filterSidebarForVersion,
} from '../src/lib/swapVersion.mjs';

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
  assert.equal(productOf('/alpaquita/'), null); // not path-versioned
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
  assert.deepEqual(Object.keys(PRODUCT_VERSIONS), ['liberica-jdk', 'liberica-nik']);
  assert.deepEqual(
    PRODUCT_VERSIONS['liberica-jdk'].map((v) => v.slug),
    ['25.0.3b11', '21.0.6b10']
  );
  assert.equal(PRODUCT_VERSIONS['liberica-jdk'][0].label, '25.0.3+11');
});
