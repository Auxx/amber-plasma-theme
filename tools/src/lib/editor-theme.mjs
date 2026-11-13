import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/**
 * Amber's editor theme, the KSyntaxHighlighting file `Amber.theme` that Kate
 * and KWrite read (docs/architecture/platform.md, "Konsole and Kate"). The keys
 * were read on 2026-11-13 from the enums TextStyle and EditorColorRole of
 * libKF6SyntaxHighlighting.so.6.31.0. Every key takes a token from
 * parts/editor-theme/styles.json.
 */

/** The table of keys, read by the generator. */
export const STYLES_FILE = fileURLToPath(new URL('../../../parts/editor-theme/styles.json', import.meta.url));

/** The text styles, in the library's order. */
export const TEXT_STYLES = [
  'Normal', 'Keyword', 'Function', 'Variable', 'ControlFlow', 'Operator', 'BuiltIn', 'Extension', 'Preprocessor',
  'Attribute', 'Char', 'SpecialChar', 'String', 'VerbatimString', 'SpecialString', 'Import', 'DataType', 'DecVal',
  'BaseN', 'Float', 'Constant', 'Comment', 'Documentation', 'Annotation', 'CommentVar', 'RegionMarker',
  'Information', 'Warning', 'Alert', 'Error', 'Others'
];

/** The editor colours, in the library's order. */
export const EDITOR_COLOURS = [
  'BackgroundColor', 'TextSelection', 'CurrentLine', 'SearchHighlight', 'ReplaceHighlight', 'BracketMatching',
  'TabMarker', 'SpellChecking', 'IndentationLine', 'IconBorder', 'CodeFolding', 'LineNumbers', 'CurrentLineNumber',
  'WordWrapMarker', 'ModifiedLines', 'SavedLines', 'Separator', 'MarkBookmark', 'MarkBreakpointActive',
  'MarkBreakpointReached', 'MarkBreakpointDisabled', 'MarkExecution', 'MarkWarning', 'MarkError',
  'TemplateBackground', 'TemplatePlaceholder', 'TemplateFocusedPlaceholder', 'TemplateReadOnlyPlaceholder'
];

/** The lines Kate can draw, each hidden by taking the colour of the key it is drawn on. */
export const HIDDEN = { IndentationLine: 'BackgroundColor', WordWrapMarker: 'BackgroundColor', Separator: 'IconBorder' };

/** The backgrounds a text style is read on. */
const TEXT_BACKGROUNDS = [ 'editor', 'editor-current-line', 'editor-selection', 'editor-search' ];

/** The editor colours drawn in the gutter, as text or as marks. */
const GUTTER_KEYS = EDITOR_COLOURS.filter(key => /^(LineNumbers|CurrentLineNumber|ModifiedLines|SavedLines|Mark)/.test(key));

const GROUPS = { 'text-styles': TEXT_STYLES, 'editor-colors': EDITOR_COLOURS };

const METADATA = {
  copyright: [ "SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov" ],
  license: 'SPDX-License-Identifier: MIT',
  name: 'Amber',
  revision: 1
};

/** Reads the table: `{ 'text-styles': { key: token }, 'editor-colors': { key: token } }`. */
export function loadStyles(file = STYLES_FILE) {
  let styles;
  try {
    styles = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
  if (styles === null || typeof styles !== 'object' || Array.isArray(styles)) {
    throw new Error(`${file}: not an object of groups`);
  }
  return styles;
}

/** The `#rrggbb` of an opaque token, or the reason there is none. */
function hexOf(tokens, name) {
  if (typeof name !== 'string' || name === '') {
    return { problem: 'needs a token name' };
  }
  let rgb;
  try {
    rgb = srgb8(resolveToken(tokens, name).colour);
  } catch (error) {
    return { problem: `${name}: ${error.message}` };
  }
  if (rgb.alpha !== 1) {
    return { problem: `${name} is not opaque` };
  }
  return { hex: `#${[ rgb.r, rgb.g, rgb.b ].map(n => n.toString(16).padStart(2, '0')).join('')}` };
}

/**
 * The file `Amber.theme`, from the table and the tokens: metadata, one text
 * style per key with no bold or italic, one hex per editor colour, and no
 * custom styles. Throws one error listing every problem, one per line, each
 * starting with `<group>.<key>`.
 */
export function formatEditorTheme(styles, tokens) {
  const problems = Object.keys(styles).filter(group => !Object.hasOwn(GROUPS, group)).map(group => `${group}: unknown group`);
  const theme = { metadata: METADATA, 'text-styles': {}, 'editor-colors': {}, 'custom-styles': {} };
  for (const [ group, keys ] of Object.entries(GROUPS)) {
    const table = styles[group] ?? {};
    problems.push(
      ...keys.filter(key => !Object.hasOwn(table, key)).map(key => `${group}.${key}: missing`),
      ...Object.keys(table).filter(key => !keys.includes(key)).map(key => `${group}.${key}: unknown key`)
    );
    for (const key of keys.filter(key => Object.hasOwn(table, key))) {
      const { hex, problem } = hexOf(tokens, table[key]);
      if (problem) {
        problems.push(`${group}.${key}: ${problem}`);
      } else if (group === 'text-styles') {
        theme[group][key] = {
          'text-color': hex,
          'selected-text-color': hex,
          bold: false,
          italic: false,
          underline: false,
          'strike-through': false
        };
      } else {
        theme[group][key] = hex;
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`The editor theme cannot be generated:\n${problems.join('\n')}`);
  }
  return `${JSON.stringify(theme, null, 4)}\n`;
}

/**
 * Each `<group>.<key>: <token> on <background>` of the table whose token has
 * no contrast pair on a background it is drawn on: a text style on the
 * editor, the current line, the text selection and the search highlight; a
 * gutter key on the gutter. Pairs are matched by token name.
 */
export function unpairedStyles(styles, pairs) {
  const paired = new Set(pairs.filter(pair => pair.background.length === 1).map(pair => `${pair.foreground} on ${pair.background[0]}`));
  const missing = (group, key, backgrounds) => {
    const token = styles[group]?.[key];
    return backgrounds.filter(background => !paired.has(`${token} on ${background}`)).map(background => `${group}.${key}: ${token} on ${background}`);
  };
  return [
    ...TEXT_STYLES.flatMap(key => missing('text-styles', key, TEXT_BACKGROUNDS)),
    ...GUTTER_KEYS.flatMap(key => missing('editor-colors', key, [ 'editor-gutter' ]))
  ];
}
