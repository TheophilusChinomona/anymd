# Self-hosted playground

This image serves the existing VitePress playground and a WebAssembly build from the same source revision. Documents are processed in the browser; the image has no MCP credentials, uploads, document storage, OCR service, or native media transcription.

Build from the repository root on an amd64 host:

```sh
docker build -f deploy/playground/Dockerfile -t anymd-playground .
docker run --rm -p 8081:80 anymd-playground
```

The Dockerfile-specific ignore file intentionally includes `bun.lock`, unlike the root MCP Dockerfile's ignore file. `wasm-bindgen` must match the pinned crate version. `ANYMD_SITE_URL` is a build argument, defaulting to `https://anymd.sentiolangley.me/`; it controls the VitePress base and canonical URLs without changing the upstream GitHub Pages default.

Dokploy: separate application, branch `deploy/playground`, Dockerfile `deploy/playground/Dockerfile`, context `.`, domain `anymd.sentiolangley.me`, container port **80**. `/` redirects to `/playground`; `/health` checks the static server. Do not alter the existing MCP application or copy its environment into this app.

Verify HTTPS, worker and WASM requests, the sample PDF conversion, and a local-file conversion. Browser network inspection must show no document upload or off-origin resource request. The CSP permits same-origin WASM execution and hashes VitePress inline bootstraps at build time.
