// Checks the prototype's own files for Amber's anti-goals: no rounded corner,
// no hairline but the window outline, no colour that is not a token, and no
// cool grey (docs/product/vision.md, docs/architecture/design-language.md).
import { colorsNamed, converter } from 'culori';
import { parseColour } from './colour.mjs';

const toOklch = converter('oklch');

const NAMES = Object.keys(colorsNamed).sort((a, b) => b.length - a.length);

/** A colour written out: a hex, a colour function, or a CSS named colour. */
const LITERAL = new RegExp(
  `#[0-9a-f]{3,8}\\b|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\([^()]*\\)|(?<![\\w-])(?:${NAMES.join('|')})(?![\\w-])`,
  'gi'
);

/** The colours written out in a value. `var()` and `color-mix` of tokens are not literals. */
export const colourLiterals = value => [ ...value.matchAll(LITERAL) ].map(m => m[0]);

// Warm, for a colour written outside the tokens: an OKLCH hue from 30 to 110,
// or black, which shadows use. (my call)
const WARM = [ 30, 110 ];

// "A hue is not a grey" (design language): at an OKLCH chroma of 0.05 or more a
// colour is a hue, which the ANSI colours may be whatever its angle.
const HUE_CHROMA = 0.05;

/** Whether the colour is a hue and not a grey. */
export const isHue = text => toOklch(parseColour(text)).c >= HUE_CHROMA;

/** Null when the colour is warm or black; otherwise why it is not. */
export function warmthOffence(text) {
  const { l, c, h } = toOklch(parseColour(text));
  if (c < 0.005) {
    return l < 0.01 ? null : `not warm: ${text} (a grey with no hue, my call: warm is ${WARM[0]} to ${WARM[1]})`;
  }
  return h >= WARM[0] && h <= WARM[1]
    ? null
    : `not warm: ${text} (hue ${Math.round(h)}, my call: warm is ${WARM[0]} to ${WARM[1]})`;
}

/** Replaces each comment with the newlines it spans, so line numbers hold. */
const stripComments = (source, pattern) => source.replace(pattern, comment => comment.replace(/[^\n]/g, ''));

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const WINDOW_OUTLINE = 'var(--outline-width) solid var(--outline)';
const BORDER_ALLOWED = [ 'border-radius', 'border-collapse', 'border-spacing' ];

/** Why one declaration breaks an anti-goal, or null. */
function declarationOffence(selector, property, value) {
  const literals = colourLiterals(value);
  if (literals.length) {
    if (property !== '--desktop') {
      return '';
    }
    return literals.map(warmthOffence).find(Boolean) ?? null;
  }
  if (property === 'border-radius') {
    // 50 % is a round widget, a circle by convention (glossary); `browser
    // check` makes sure the element is square.
    return [ '0', '50%' ].includes(value) ? null : '';
  }
  if (property.startsWith('border') && !BORDER_ALLOWED.includes(property)) {
    return [ 'none', '0' ].includes(value) ? null : '';
  }
  if (property.endsWith('box-shadow')) {
    return '';
  }
  if (property.startsWith('outline')) {
    if (value === 'none') {
      return null;
    }
    if (property === 'outline' && value === WINDOW_OUTLINE) {
      return selector === '.window' ? null : ' (only .window has the window outline)';
    }
    return '';
  }
  if (property.startsWith('column-rule') || property.startsWith('text-decoration')) {
    return value === 'none' ? null : '';
  }
  if (property === 'filter' && /drop-shadow\(/.test(value)) {
    return '';
  }
  if ([ 'clip-path', 'shape-outside' ].includes(property) && /\bround\b/.test(value)) {
    return '';
  }
  return null;
}

/**
 * The anti-goal offences of one stylesheet, as `file:line: text`. Rules are
 * read whole, so a declaration split over lines is still seen; an at-rule is
 * not read and is an offence, so nothing hides inside one.
 */
export function cssOffences(file, source) {
  const text = stripComments(source, /\/\*[\s\S]*?\*\//g);
  const offences = [];
  for (const at of text.matchAll(/@[a-z-]+/g)) {
    offences.push({ index: at.index, text: `${at[0]} (at-rules are not read)` });
  }
  for (const rule of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim();
    let offset = rule.index + rule[0].indexOf('{') + 1;
    for (const part of rule[2].split(';')) {
      const declaration = part.match(/^\s*(-?-?[a-z][a-z0-9-]*)\s*:\s*([\s\S]*?)\s*$/i);
      if (declaration) {
        const [ , property, rawValue ] = declaration;
        const value = rawValue.replace(/\s+/g, ' ');
        const why = declarationOffence(selector, property, value);
        if (why !== null) {
          const index = offset + part.search(/\S/);
          const shown = why.startsWith('not warm') ? why : `${property}: ${value}${why}`;
          offences.push({ index, text: shown });
        }
      }
      offset += part.length + 1;
    }
  }
  return offences.sort((a, b) => a.index - b.index).map(o => `${file}:${lineOf(text, o.index)}: ${o.text}`);
}

// A script linked from its own file, which scriptOffences reads (D-48).
const LINKED_SCRIPT = /^<script src="[a-z][a-z0-9-]*\.js" defer><\/script>/;

const FORBIDDEN = [ '<script', '<style', '<hr', '<line', ' rx=', ' ry=' ];

/** An attribute value as a browser reads it as a URL: entities decoded, blanks gone. */
function decodeUrl(value) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&colon;/gi, ':')
    .replace(/&(?:tab|newline);/gi, '')
    .replace(/[\u0000-\u0020]/g, '');
}

/**
 * The anti-goal offences of the page, as `file:line: text`: a script, a style
 * element, a divider or an SVG line or rounded rectangle; a colour in an
 * attribute; a `style` attribute that does more than set custom properties;
 * and a colour set outside a candidate, or a candidate colour that is not
 * warm. Text between tags is not paint, so a caption may name a colour.
 */
export function pageOffences(file, source) {
  const text = stripComments(source, /<!--[\s\S]*?-->/g);
  // Tags are found in any case; a linked script must be written as LINKED_SCRIPT.
  const lower = text.toLowerCase();
  const offences = [];
  for (const word of FORBIDDEN) {
    for (let index = lower.indexOf(word); index >= 0; index = lower.indexOf(word, index + 1)) {
      if (word === '<script' && LINKED_SCRIPT.test(text.slice(index))) {
        continue;
      }
      offences.push({ index: index + (word.startsWith(' ') ? 1 : 0), text: word.trim() });
    }
  }
  for (const tag of text.matchAll(/<[a-z][^>]*>/gi)) {
    const isCandidate = /^<figure class="candidate"/.test(tag[0]);
    for (const attribute of tag[0].matchAll(/\s([\w:-]+)=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      const [ raw, name, double, single, bare ] = attribute;
      const value = double ?? single ?? bare;
      const index = tag.index + attribute.index + 1;
      if (/^on/i.test(name)) {
        offences.push({ index, text: name });
        continue;
      }
      if (/^javascript:/i.test(decodeUrl(value))) {
        offences.push({ index, text: raw.trim() });
        continue;
      }
      if (name !== 'style') {
        if (colourLiterals(value).length) {
          offences.push({ index, text: `${name}="${value}"` });
        }
        continue;
      }
      for (const declaration of value.split(';').map(d => d.trim()).filter(Boolean)) {
        if (!declaration.startsWith('--')) {
          offences.push({ index, text: `style: ${declaration}` });
          continue;
        }
        const literals = colourLiterals(declaration);
        if (literals.length && !isCandidate) {
          offences.push({ index, text: `colour outside a candidate: ${declaration}` });
        }
        if (isCandidate) {
          // An ANSI colour may be a hue that is not warm, as long as it is a hue.
          const judge = declaration.startsWith('--ansi-') ? text => (isHue(text) ? null : warmthOffence(text)) : warmthOffence;
          for (const why of literals.map(judge).filter(Boolean)) {
            offences.push({ index, text: why });
          }
        }
      }
    }
  }
  return offences.sort((a, b) => a.index - b.index).map(o => `${file}:${lineOf(text, o.index)}: ${o.text}`);
}

// The only names a script may use (D-48): what copying a slider's position
// into --value needs. Any other name, such as one that changes a class, an
// attribute, state, markup or a style sheet, or reaches the network, is an
// offence, as is a name the script does not declare itself.
const SCRIPT_NAMES = new Set([
  'const',
  'let',
  'for',
  'of',
  'if',
  'else',
  'return',
  'document',
  'window',
  'querySelector',
  'querySelectorAll',
  'addEventListener',
  'forEach',
  'style',
  'setProperty',
  'value',
  'min',
  'max',
  'Number'
]);

// The one use of the style object a script may make (D-48).
const ALLOWED_STYLE = ".style.setProperty('--value'";

// A string literal or a comment: `//` inside a string does not start one.
const STRING_OR_COMMENT = /('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

const blank = text => text.replace(/[^\n]/g, ' ');

/** The names a script declares: constants, variables, functions and arrow parameters. */
function declaredNames(code) {
  const names = new Set();
  for (const [ , name ] of code.matchAll(/\b(?:const|let|function)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(name);
  }
  for (const [ , name ] of code.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) {
    names.add(name);
  }
  for (const [ , list ] of code.matchAll(/\(([^()]*)\)\s*=>/g)) {
    for (const name of list.split(',').map(part => part.trim()).filter(Boolean)) {
      names.add(name);
    }
  }
  return names;
}

/**
 * The offences of a prototype script, as `file:line: text`. A script may only
 * copy a value into `--value` (D-48), so it may use only SCRIPT_NAMES and the
 * names it declares, no bracket access, no colour and no `var()`, and the
 * style object only through `.style.setProperty('--value'`. Comments are not
 * read; strings are read for colours and styles, not for names.
 */
export function scriptOffences(file, source) {
  // `text` keeps strings and blanks comments; `code` also blanks what strings
  // hold, keeping the expressions of a template.
  const text = source.replace(STRING_OR_COMMENT, (match, string) => string ?? blank(match));
  const code = source.replace(STRING_OR_COMMENT, (match, string) => {
    if (!string) {
      return blank(match);
    }
    if (!string.startsWith('`')) {
      return string[0] + blank(string.slice(1, -1)) + string.at(-1);
    }
    return string.replace(/\$\{([^}]*)\}|[^\n`]/g, (part, expression) => (expression === undefined ? ' ' : `  ${expression} `));
  });
  const offences = [];
  const declared = declaredNames(code);
  for (const name of code.matchAll(/(?<![\w$])[A-Za-z_$][\w$]*/g)) {
    if (!SCRIPT_NAMES.has(name[0]) && !declared.has(name[0])) {
      offences.push({ index: name.index, text: name[0] });
    }
  }
  for (const bracket of code.matchAll(/\[/g)) {
    offences.push({ index: bracket.index, text: '[' });
  }
  for (let index = text.indexOf('var('); index >= 0; index = text.indexOf('var(', index + 1)) {
    offences.push({ index, text: 'var(' });
  }
  for (const style of text.matchAll(/\.?\bstyle\b[.[]?/g)) {
    if (!text.startsWith(ALLOWED_STYLE, style.index)) {
      offences.push({ index: style.index, text: style[0] });
    }
  }
  for (const literal of text.matchAll(LITERAL)) {
    offences.push({ index: literal.index, text: literal[0] });
  }
  return offences.sort((a, b) => a.index - b.index).map(o => `${file}:${lineOf(text, o.index)}: ${o.text}`);
}
