// Reads and writes PNG pictures with node:zlib alone. Only what screenshots
// use is read: 8 bits a channel, RGB or RGBA, not interlaced. Anything else
// is refused by name, never guessed at (tooling rule 7).
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]);
const CHANNELS = { 2: 3, 6: 4 };
const TYPE_NAMES = { 0: 'greyscale', 3: 'palette', 4: 'greyscale with alpha' };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Undoes the filter of each row in place; returns the rows without their filter bytes. */
function unfilter(data, width, height, bpp) {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const row = data.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const at = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[at + x - bpp] : 0;
      const b = y > 0 ? out[at - stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[at - stride + x - bpp] : 0;
      const predictor = [ 0, a, b, (a + b) >> 1, paeth(a, b, c) ][filter];
      if (predictor === undefined) {
        throw new Error(`row ${y} has an unknown filter ${filter}`);
      }
      out[at + x] = (row[x] + predictor) & 0xff;
    }
  }
  return out;
}

/** Decodes a PNG to `{ width, height, pixels }`, pixels RGBA with 4 bytes each. */
export function decodePng(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG');
  }
  let header;
  const data = [];
  for (let at = 8; at < buffer.length;) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString('latin1', at + 4, at + 8);
    const body = buffer.subarray(at + 4, at + 8 + length);
    if (crc32(body) !== buffer.readUInt32BE(at + 8 + length)) {
      throw new Error(`bad CRC in the ${type} chunk`);
    }
    const content = body.subarray(4);
    if (type === 'IHDR') {
      header = {
        width: content.readUInt32BE(0),
        height: content.readUInt32BE(4),
        depth: content[8],
        colourType: content[9],
        interlace: content[12]
      };
    } else if (type === 'IDAT') {
      data.push(content);
    } else if (type === 'IEND') {
      break;
    }
    at += 12 + length;
  }
  if (!header) {
    throw new Error('no IHDR chunk');
  }
  const { width, height, depth, colourType, interlace } = header;
  if (depth !== 8) {
    throw new Error(`bit depth ${depth} is not supported, only 8`);
  }
  const channels = CHANNELS[colourType];
  if (!channels) {
    throw new Error(`colour type ${colourType} (${TYPE_NAMES[colourType] ?? 'unknown'}) is not supported, only RGB and RGBA`);
  }
  if (interlace !== 0) {
    throw new Error('interlaced pictures are not supported');
  }
  const raw = inflateSync(Buffer.concat(data));
  if (raw.length !== (width * channels + 1) * height) {
    throw new Error(`the picture data has ${raw.length} bytes, not ${(width * channels + 1) * height}`);
  }
  const rows = unfilter(raw, width, height, channels);
  if (channels === 4) {
    return { width, height, pixels: rows };
  }
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < rows.length; i += 3, j += 4) {
    pixels[j] = rows[i];
    pixels[j + 1] = rows[i + 1];
    pixels[j + 2] = rows[i + 2];
    pixels[j + 3] = 255;
  }
  return { width, height, pixels };
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([ Buffer.from(type, 'latin1'), data ]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([ length, body, crc ]);
}

/** Encodes `{ width, height, pixels }` (RGBA) as a PNG: 8 bits, filter 0. */
export function encodePng({ width, height, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
