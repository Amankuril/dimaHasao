# Deploying the frontend

The build must run **on the VPS**. Vite inlines `VITE_*` at build time, so a
`dist/` built on a laptop freezes that laptop's `.env` — including
`localhost:5000`, which makes the live site call the *visitor's* machine.

```bash
cd ~/dimaHasao && git pull
cd Frontend && npm install
rm -rf dist            # so a failed build cannot masquerade as success
npm run build          # runs scripts/verify-build.mjs; a bad bundle exits non-zero
cp -r dist/* /var/www/dimahasao/
```

`npm run build` now fails if `dist/index.html` depends on a third party for
assets the app cannot render without, or if the Font Awesome webfonts did not
make it into the bundle. Icons used to come from a cdnjs `<link>`: they
appeared while the browser had that stylesheet cached and vanished on the next
refresh, with nothing in the build to show for it.

## One-time nginx change

See `nginx/cache-policy.conf`. Without it nginx sends no `Cache-Control`, and
browsers may serve a stale `index.html` after a deploy — which pins the visitor
to the previous release's bundles.

```bash
nginx -t && systemctl reload nginx
```

## Verifying a deploy

```bash
curl -s https://tourismdimahasao.in/ | grep -c cdnjs          # must be 0
curl -sI https://tourismdimahasao.in/ | grep -i cache-control # no-cache
```
