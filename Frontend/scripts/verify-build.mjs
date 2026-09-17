/*
 * Post-build guard: refuse to ship a bundle whose icons live on someone
 * else's server.
 *
 * Every icon in the app is a Font Awesome <i> — the whole /app bottom nav and
 * every back button included. index.html used to pull Font Awesome from
 * cdnjs, so the icons were not really part of the build: they showed up when
 * the browser had the CDN stylesheet cached and vanished on the next refresh,
 * when revalidation failed. Nothing in the build broke, so nothing complained.
 *
 * The same shape as the earlier localhost:5000 bug: dist looked fine, and only
 * the visitor found out. So the build now checks its own output.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const failures = []

if (!existsSync(join(dist, 'index.html'))) {
  console.error('verify-build: dist/index.html is missing — the build did not produce a site.')
  process.exit(1)
}

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const assets = existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')) : []

// 1. No third-party stylesheet or script may be required to render the page.
//    Google Fonts is the deliberate exception: text falls back to a real font
//    stack when it fails, so a missed request degrades instead of breaking.
const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']
const externals = [...html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)]
  .map((m) => m[1])
  .filter((url) => !ALLOWED_HOSTS.some((host) => url.includes(host)))

if (externals.length) {
  failures.push(
    'index.html asks a third party for assets the app cannot render without:\n' +
      externals.map((u) => `      ${u}`).join('\n') +
      '\n    Import it in src/index.jsx instead so it ships with the bundle.'
  )
}

// 2. Font Awesome must actually be in the bundle, not merely imported.
const cssFiles = assets.filter((f) => f.endsWith('.css'))
const faCss = cssFiles.find((f) =>
  readFileSync(join(dist, 'assets', f), 'utf8').includes('Font Awesome 6 Free')
)
if (!faCss) {
  failures.push('no built stylesheet declares the Font Awesome face — every icon would render blank.')
} else if (!html.includes(faCss)) {
  // Found, but in a lazy chunk: icons would pop in late, or not at all on
  // routes that never load that chunk.
  failures.push(`Font Awesome landed in ${faCss}, which index.html does not load eagerly.`)
}

// 3. The webfonts the stylesheet points at must have been emitted.
for (const face of ['fa-solid-900', 'fa-regular-400']) {
  if (!assets.some((f) => f.startsWith(face) && f.endsWith('.woff2'))) {
    failures.push(`${face}.woff2 was not emitted — icons using it would render blank.`)
  }
}

if (failures.length) {
  console.error('\nverify-build failed:\n')
  failures.forEach((f) => console.error(`  ✗ ${f}\n`))
  process.exit(1)
}

console.log(`verify-build: icons ship with the bundle (${faCss}); no third-party render dependencies.`)
