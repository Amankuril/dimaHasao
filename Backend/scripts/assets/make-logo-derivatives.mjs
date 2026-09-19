/**
 * Turn a full-size brand crest into the file the app actually serves.
 *
 * The masters are ~1254x1254 opaque PNGs at around 1.5MB. Two problems with
 * serving those directly:
 *
 *   1. They are drawn at 64-96px. A megabyte and a half per mark, on phones,
 *      on a connection that is not always good, for something the size of a
 *      thumbnail.
 *   2. They have no alpha. The crest is a circle inscribed in a white square,
 *      so on the dark sign-in cards it renders as a white box with a circle
 *      printed on it.
 *
 * This resizes to 384px (retina at the size it is drawn) and cuts a circular
 * alpha mask at the exact inscribed radius, which is where the artwork's own
 * outer ring sits — verified by scanning for the first non-white pixel across
 * the centre row, which lands at x=0 and x=width-1.
 *
 * Lives in Backend because that is where sharp is installed; it writes into
 * Frontend/public.
 *
 *   node scripts/assets/make-logo-derivatives.mjs
 *   node scripts/assets/make-logo-derivatives.mjs driverlogo.png driver
 */
import sharp from 'sharp';
import { existsSync, renameSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = join(HERE, '../../../Frontend/public/assets/logos');
const SIZE = 384;

/** master filename -> served basename, which brandLogo.js points at. */
const DEFAULT_JOBS = [
  ['userlogo.png', 'user'],
  ['restaurantlogo.png', 'restaurant'],
  ['hotallogo.png', 'hotel'],
  // The vehicles artwork for taxi drivers and food delivery. Absent as of
  // 2026-09-19: taxilogo.png and deliverylogo.png are byte-identical copies of
  // the hotel crest, so the real one was never saved. Drop it in and re-run.
  ['driverlogo.png', 'driver'],
];

const circleMask = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );

const build = async (source, name) => {
  const input = join(LOGO_DIR, source);
  if (!existsSync(input)) {
    console.log(`  skip   ${source} — not in ${LOGO_DIR}`);
    return;
  }

  const output = join(LOGO_DIR, `${name}-${SIZE}.png`);
  const temp = `${output}.tmp`;

  await sharp(input)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: circleMask(SIZE), blend: 'dest-in' }])
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toFile(temp);
  renameSync(temp, output);

  const before = statSync(input).size;
  const after = statSync(output).size;
  console.log(
    `  built  ${name}-${SIZE}.png  ${(before / 1024).toFixed(0)}kB -> ${(after / 1024).toFixed(0)}kB` +
      `  (${Math.round((1 - after / before) * 100)}% smaller, transparent corners)`,
  );
};

const run = async () => {
  const [source, name] = process.argv.slice(2);
  const jobs = source && name ? [[source, name]] : DEFAULT_JOBS;
  for (const [src, out] of jobs) await build(src, out);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
