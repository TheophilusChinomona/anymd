# Self-hosting

anymd's MCP server can run over Streamable HTTP instead of stdio, so it works
as a remote document-processing server: one instance, several agents or
clients, running on your own infrastructure (a VPS, a Dokploy/Coolify host,
a Kubernetes cluster). Documents still never reach a third party — you are
the one hosting it.

## The Docker image

The repository root has a [`Dockerfile`](https://github.com/SylphxAI/anymd/blob/main/Dockerfile)
that installs the published `@sylphx/anymd` npm package (which ships a
prebuilt native binary — no Rust build in the container) and runs it as an
HTTP MCP server:

```bash
docker build -t anymd .
docker run -d \
  -p 8080:8080 \
  -e MCP_API_KEY=$(openssl rand -hex 32) \
  -v anymd_data:/data \
  --name anymd \
  anymd
```

`MCP_API_KEY` is required: anymd refuses to bind a non-loopback host without
one (see [Security](/guide/security)). `/data` is where you mount documents;
`MCP_PDF_ALLOWED_DIRS=/data` is already set in the image so the server can
only read from that mount.

Check it's up:

```bash
curl http://localhost:8080/mcp/health
```

Point an MCP client at `http://your-host:8080/mcp` with an `X-API-Key`
header set to the key you generated.

## Deploying on Dokploy

1. Create an Application, point it at this repository (or a fork), and set
   the build type to **Dockerfile** (the root `Dockerfile` needs no extra
   build args unless you want to pin a different `ANYMD_VERSION`).
2. Add a **volume/mount** for `/data` and put the documents you want anymd
   to read there.
3. Set environment variables:
   - `MCP_API_KEY` — generate one (`openssl rand -hex 32`) and save it as a
     Dokploy secret, not a plain env var.
   - `MCP_PDF_ALLOWED_DIRS=/data` — already the image default; only needed if
     you mount somewhere else.
   - `MCP_CORS_ORIGIN` — only if a browser-based client calls it directly.
4. Expose port `8080` and put Dokploy's built-in Traefik proxy in front of
   it for TLS; do not publish the container port directly to the internet.
5. Deploy, then confirm `https://your-domain/mcp/health` returns
   `{"status":"ok"}` before pointing a client at `/mcp`.

## What you get vs. stdio

Nothing about the tools changes — `read_pdf`, `search_pdf`, and
`pdf_evidence` behave identically over HTTP or stdio (see [MCP tools](/guide/tools)
and the [API reference](https://github.com/SylphxAI/anymd/blob/main/docs/api/index.md)).
The differences are operational:

- One process serves many concurrent MCP sessions instead of one per client.
- You are responsible for the API key, TLS termination, and the volume that
  bounds filesystem access — the stdio setup gets those from the local
  machine and MCP client for free.
- OCR/vision provider adapters (`MCP_PDF_OCR_*`, `MCP_PDF_REGION_ANALYSIS_*`)
  work the same way; if you point one at a remote provider, that provider
  now sees whatever documents you route through it, same as a local install.
