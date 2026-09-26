# syntax=docker/dockerfile:1
#
# Runs the published @sylphx/anymd npm package as a remote MCP server over
# Streamable HTTP (see crates/anymd/src/http_transport.rs and
# docs/guide/self-hosting.md). No Rust toolchain here: npm installs the
# prebuilt native binary for the image's platform (linux-x64-gnu or
# linux-arm64-gnu), so this needs glibc, not musl/Alpine.
FROM node:20-slim

# Bump alongside a release; check the current version with:
#   npm view @sylphx/anymd version
ARG ANYMD_VERSION=8.1.0
RUN npm install -g "@sylphx/anymd@${ANYMD_VERSION}" \
    && npm cache clean --force

ENV MCP_TRANSPORT=http \
    MCP_HTTP_HOST=0.0.0.0 \
    MCP_HTTP_PORT=8080 \
    MCP_PDF_ALLOWED_DIRS=/data

# MCP_API_KEY is required at runtime: anymd refuses to bind a non-loopback
# host without one. Set it as a secret in your host/platform, not here.

EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.MCP_HTTP_PORT+'/mcp/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node
ENTRYPOINT ["anymd"]
CMD ["mcp"]
