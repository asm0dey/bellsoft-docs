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
