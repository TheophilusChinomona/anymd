# syntax=docker/dockerfile:1
FROM rust:slim AS wasm
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && rustup target add wasm32-unknown-unknown
ARG WASM_BINDGEN_VERSION=0.2.126
RUN curl -fsSL "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/${WASM_BINDGEN_VERSION}/wasm-bindgen-${WASM_BINDGEN_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
    | tar -xz --strip-components=1 -C /usr/local/bin --wildcards '*/wasm-bindgen'
WORKDIR /src
COPY . .
RUN bash scripts/build-wasm.sh

FROM oven/bun:1.4.0 AS site
WORKDIR /src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
COPY --from=wasm /src/docs/public/wasm/ docs/public/wasm/
ARG ANYMD_SITE_URL=https://anymd.sentiolangley.me/
ENV ANYMD_SITE_URL=$ANYMD_SITE_URL
RUN bun run docs:build \
    && test -s docs/.vitepress/dist/wasm/anymd_wasm_bg.wasm \
    && bun deploy/playground/csp.ts docs/.vitepress/dist > /src/playground-csp.conf

FROM nginx:stable-alpine
COPY --from=site /src/docs/.vitepress/dist/ /usr/share/nginx/html/
COPY --from=site /src/playground-csp.conf /etc/nginx/playground-csp.conf
COPY deploy/playground/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
