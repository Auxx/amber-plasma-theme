#!/usr/bin/env node
// Ported from front-burner tools/ai-tools (MIT, same author).
import { main, print, table, UsageError } from '../lib/cli.mjs';
import { CLOSE_MARGIN, describeColour } from '../lib/colour.mjs';
import { checkPairs, describePair, loadPairs, loadTokens, parseOverrides, resolveToken } from '../lib/tokens.mjs';

const OVERRIDE_HELP = `--set token=value (repeatable) changes a token before measuring. The value is
var(--other-token) or a CSS colour. An unknown name adds a new token.`;

const NAME_HELP = `A token is named with or without its leading --; a name written with it goes
after a -- separator, as in: resolve --json -- --tone-2.`;

/** Parses overrides; a malformed one is a wrong command line. */
function overrides(list) {
  try {
    return parseOverrides(list);
  } catch (error) {
    throw error.code === 'NOT_AN_OVERRIDE' ? new UsageError(error.message) : error;
  }
}

const status = r =>
  r.status === 'missing' ? `MISSING: ${r.error}` : r.status === 'fail' ? 'FAIL' : r.close ? 'pass (close)' : 'pass';

const ratio = r => (r.ratio === undefined ? '-' : r.ratio.toFixed(2));

const jsonPair = r => ({ ...r, pair: describePair(r.pair), minimum: r.pair.minimum });

const CLOSE_NOTE = `"close" passes by less than ${CLOSE_MARGIN * 100} %: a small change to either colour may fail it.`;

const showValue = value => (value.ref ? `var(--${value.ref})` : describeColour(value.colour).hex);

main({
  name: 'tokens',
  summary: "Reads Amber's tokens and checks their contrast pairs, from prototype/.",
  commands: {
    list: {
      usage: '[filter] [--json]',
      summary: 'Lists the tokens whose name contains the filter, with their values.',
      options: { json: { type: 'boolean' } },
      run(options, [ filter = '' ]) {
        const rows = [ ...loadTokens() ]
          .filter(([ name ]) => name.includes(filter))
          .map(([ name, value ]) => ({ name, value: showValue(value) }));
        print(options.json, rows, () => table([ [ 'token', 'value' ], ...rows.map(r => [ r.name, r.value ]) ]));
      }
    },
    resolve: {
      usage: '<token...> [--set token=value] [--json]',
      summary: 'Follows each token to its final colour, through var().',
      help: `${NAME_HELP}\n\n${OVERRIDE_HELP}`,
      options: { set: { type: 'string', multiple: true }, json: { type: 'boolean' } },
      run(options, names) {
        if (!names.length) {
          throw new UsageError('Give at least one token');
        }
        const tokens = loadTokens({ overrides: overrides(options.set) });
        const results = names.map(name => {
          const { colour, chain } = resolveToken(tokens, name);
          return { token: chain[0], chain, alpha: colour.alpha ?? 1, ...describeColour(colour) };
        });
        print(options.json, results, () =>
          table([
            [ 'token', 'via', 'oklch', 'hex' ],
            ...results.map(r => [ r.token, r.chain.slice(1).join(' → ') || '-', r.oklch, r.hex ])
          ]));
      }
    },
    pairs: {
      usage: '[filter] [--failing] [--close] [--set token=value] [--json]',
      summary: 'Measures every contrast pair of prototype/contrast-pairs.json; exits with 1 when one fails.',
      help: `The filter keeps pairs whose description contains it, such as "text-dim" or
"on tone-4". --failing shows only failing pairs, --close only close ones.

${OVERRIDE_HELP}`,
      options: {
        failing: { type: 'boolean' },
        close: { type: 'boolean' },
        set: { type: 'string', multiple: true },
        json: { type: 'boolean' }
      },
      run(options, [ filter = '' ]) {
        const all = checkPairs(loadTokens({ overrides: overrides(options.set) }), loadPairs());
        const shown = all
          .filter(r => describePair(r.pair).includes(filter))
          .filter(r => !options.failing || r.status !== 'pass')
          .filter(r => !options.close || r.close);
        const failing = all.filter(r => r.status !== 'pass').length;
        const close = all.filter(r => r.close).length;
        print(options.json, { total: all.length, failing, close, pairs: shown.map(jsonPair) }, () =>
          [
            shown.length
              ? table([
                [ 'pair', 'min', 'ratio', 'status' ],
                ...shown.map(r => [ describePair(r.pair), r.pair.minimum, ratio(r), status(r) ])
              ])
              : 'No pairs shown.',
            '',
            `${all.length} pairs, ${failing} failing, ${close} close.`,
            ...(close ? [ CLOSE_NOTE ] : [])
          ].join('\n'));
        return failing ? 1 : 0;
      }
    },
    try: {
      usage: '<token=value...> [--json]',
      summary: 'Shows how changing tokens would change the contrast pairs, before and after; exits with 1 when one fails.',
      help: OVERRIDE_HELP.replace('--set token=value (repeatable)', 'Each token=value'),
      options: { json: { type: 'boolean' } },
      run(options, sets) {
        if (!sets.length) {
          throw new UsageError('Give at least one token=value');
        }
        const changes = overrides(sets);
        const pairs = loadPairs();
        const before = checkPairs(loadTokens(), pairs);
        const after = checkPairs(loadTokens({ overrides: changes }), pairs);
        const changed = after
          .map((r, i) => ({ before: before[i], after: r }))
          .filter(({ before: b, after: a }) => b.ratio !== a.ratio || b.status !== a.status);
        const failing = after.filter(r => r.status !== 'pass').length;
        print(
          options.json,
          { changed: changed.map(c => ({ before: jsonPair(c.before), after: jsonPair(c.after) })), failing },
          () =>
            [
              changed.length
                ? table([
                  [ 'pair', 'min', 'before', 'after', 'status' ],
                  ...changed.map(({ before: b, after: a }) => [
                    describePair(a.pair),
                    a.pair.minimum,
                    ratio(b),
                    ratio(a),
                    status(a)
                  ])
                ])
                : 'No pair changes.',
              '',
              `${changed.length} pairs changed, ${failing} failing after the change.`,
              ...(changed.some(c => c.after.close) ? [ CLOSE_NOTE ] : [])
            ].join('\n')
        );
        return failing ? 1 : 0;
      }
    }
  }
});
