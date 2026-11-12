import assert from 'node:assert/strict';
import { crc32, deflateSync } from 'node:zlib';
import { describe, it } from 'node:test';
import { decodePng, encodePng } from './png.mjs';

const SIGNATURE = Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]);

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([ Buffer.from(type, 'latin1'), data ]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([ length, body, crc ]);
}

/** A PNG built by hand, so that the decoder is not tested against itself. */
function png({ width, height, depth = 8, type = 2, interlace = 0, rows }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(depth, 8);
  header.writeUInt8(type, 9);
  header.writeUInt8(interlace, 12);
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows.map(row => Buffer.from(row))))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const picture = {
  width: 3,
  height: 2,
  pixels: Uint8Array.from([
    21, 20, 19, 255, 37, 34, 31, 255, 209, 176, 114, 255,
    128, 128, 128, 255, 0, 0, 0, 0, 255, 255, 255, 128
  ])
};

describe('png', () => {
  it('decodes what it encodes', () => {
    const back = decodePng(encodePng(picture));
    assert.equal(back.width, 3);
    assert.equal(back.height, 2);
    assert.deepEqual([ ...back.pixels ], [ ...picture.pixels ]);
  });

  it('decodes RGB rows under every filter', () => {
    // Two pixels a row: (10,20,30) then (40,50,60), written with filters 0 to 4.
    // Row 0 has filter 0; rows 1 to 4 use Sub, Up, Average and Paeth against it.
    const raw = [ 10, 20, 30, 40, 50, 60 ];
    const rows = [
      [ 0, ...raw ],
      [ 1, 10, 20, 30, 30, 30, 30 ], // Sub: second pixel minus the first
      [ 2, 0, 0, 0, 0, 0, 0 ], // Up: same as the row above
      [ 3, 5, 10, 15, 15, 15, 15 ], // Average: raw − floor((left + up) / 2)
      [ 4, 0, 0, 0, 0, 0, 0 ] // Paeth: the predictor picks up for both pixels
    ];
    const { width, height, pixels } = decodePng(png({ width: 2, height: 5, rows }));
    assert.equal(width, 2);
    assert.equal(height, 5);
    for (let y = 0; y < 5; y++) {
      assert.deepEqual([ ...pixels.slice(y * 8, y * 8 + 8) ], [ 10, 20, 30, 255, 40, 50, 60, 255 ], `row ${y}`);
    }
  });

  it('refuses a file that is not a PNG', () => {
    assert.throws(() => decodePng(Buffer.from('GIF89a')), /not a PNG/);
  });

  it('refuses a bit depth of 16', () => {
    assert.throws(() => decodePng(png({ width: 1, height: 1, depth: 16, rows: [ [ 0, 0, 0, 0, 0, 0, 0 ] ] })), /bit depth 16/);
  });

  it('refuses a palette picture', () => {
    assert.throws(() => decodePng(png({ width: 1, height: 1, type: 3, rows: [ [ 0, 0 ] ] })), /palette/);
  });

  it('refuses an interlaced picture', () => {
    assert.throws(() => decodePng(png({ width: 1, height: 1, interlace: 1, rows: [ [ 0, 0, 0, 0 ] ] })), /interlaced/);
  });

  it('refuses a broken CRC', () => {
    const file = encodePng(picture);
    file[file.length - 20] ^= 0xff; // a byte inside the IDAT data
    assert.throws(() => decodePng(file), /CRC/);
  });
});
