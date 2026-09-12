/**
 * Builds public/favicon.ico from public/favicon-source.png (the Paprivo app tile).
 * ICO container with PNG-compressed entries (supported by all modern browsers).
 *
 * Usage: node scripts/make-favicon.mjs
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "public/favicon-source.png";
const OUT = "public/favicon.ico";
const SIZES = [16, 32, 48];

const pngs = await Promise.all(
  SIZES.map((s) =>
    sharp(SRC)
      .resize(s, s, { fit: "contain", background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toBuffer()
  )
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(SIZES.length, 4);

const entries = [];
let offset = 6 + 16 * SIZES.length;
SIZES.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); // width
  e.writeUInt8(s, 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bpp
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
});

const ico = Buffer.concat([header, ...entries, ...pngs]);
await writeFile(OUT, ico);
console.log(`Wrote ${OUT} (${ico.length} bytes, ${SIZES.join("/")})`);
