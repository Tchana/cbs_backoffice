import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "favicon.ico");

// Minimal 16x16 32bpp ICO: header (6) + directory (16) + BMP DIB (40) + pixels (16*16*4)
const header = Buffer.from([0, 0, 1, 0, 1, 0]);
const dir = Buffer.alloc(16);
dir[0] = 16;  // width
dir[1] = 16;  // height
dir[4] = 0;   // no palette
dir[5] = 32;  // 32 bpp
const dibSize = 40 + 16 * 16 * 4;
dir.writeUInt32LE(dibSize, 8);   // image size
dir.writeUInt32LE(22, 12);       // offset to image (6+16)

const dib = Buffer.alloc(40);
dib.writeUInt32LE(40, 0);        // DIB header size
dib.writeInt32LE(16, 4);         // width
dib.writeInt32LE(-16, 8);        // height (negative = top-down)
dib.writeUInt16LE(1, 12);        // planes
dib.writeUInt16LE(32, 14);       // bpp
dib.writeUInt32LE(0, 16);        // compression

const pixels = Buffer.alloc(16 * 16 * 4, 0); // transparent
const ico = Buffer.concat([header, dir, dib, pixels]);
writeFileSync(out, ico);
console.log("Created public/favicon.ico");
