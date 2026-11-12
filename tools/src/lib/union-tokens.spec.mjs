import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadTokens, parseOverrides, parseTokens } from './tokens.mjs';
import { UNION_TOKENS, formatUnionTokens } from './union-tokens.mjs';

/**
 * The Union style's tokens (roadmap P3.2): every token a widget uses, written
 * as custom properties of the same names into
 * parts/union-style/amber/contents/css/tokens.css (D-97).
 */

const declared = text => [ ...text.matchAll(/^\s*--([a-z0-9-]+):/gm) ].map(m => m[1]);

describe('formatUnionTokens', () => {
  const text = formatUnionTokens(loadTokens());

  it('declares exactly the tokens of UNION_TOKENS, in order', () => {
    assert.deepEqual(declared(text), UNION_TOKENS);
  });

  it('writes each value resolved, keeping a reference as a comment', () => {
    assert.match(text, /^ {4}--tone-3: #312e29;$/m);
    assert.match(text, /^ {4}--well: #151413; \/\* var\(--tone-0\) \*\/$/m);
    assert.match(text, /^ {4}--marker-width: 3px;$/m);
    assert.match(text, /^ {4}--raised-focus: #695c45;$/m);
  });

  it('starts with the licence and says it is generated', () => {
    assert.match(text, /^\/\*\n \* SPDX-License-Identifier: BSD-2-Clause\n \* SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov\n/);
    assert.match(text, /Generated from prototype\/tokens\.css by `generate union-style-tokens`\./);
  });

  it('follows an override through every token that refers to it', () => {
    const changed = formatUnionTokens(loadTokens({ overrides: parseOverrides([ 'tone-0=#000000' ]) }));
    assert.match(changed, /--tone-0: #000000;/);
    assert.match(changed, /--well: #000000; \/\* var\(--tone-0\) \*\//);
  });

  it('names a token of UNION_TOKENS that the tokens file lacks', () => {
    const tokens = parseTokens(':root {\n  --tone-0: #151413;\n}\n');
    assert.throws(() => formatUnionTokens(tokens), /tone-1/);
  });
});
