import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The decisions document gives every decision and open question an ID of
 * its own, so that a reference such as "D-126" names one row (P5.2: two
 * rows once shared D-127).
 */

const DECISIONS = fileURLToPath(new URL('../../../docs/architecture/decisions.md', import.meta.url));

describe('decisions', () => {
  it('gives every decision its own ID', () => {
    const ids = [ ...readFileSync(DECISIONS, 'utf8').matchAll(/^\| ([DO]-\d+) \|/gm) ].map(([ , id ]) => id);
    assert.ok(ids.length > 100, `${ids.length} rows`);
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(repeated, []);
  });
});
