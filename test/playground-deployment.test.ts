import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');

describe('playground deployment', () => {
  it('builds the custom-domain site without Git in the container', () => {
    const result = spawnSync(
      process.execPath,
      ['node_modules/vitepress/bin/vitepress.js', 'build', 'docs'],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: '/nonexistent',
          ANYMD_SITE_URL: 'https://anymd.sentiolangley.me/',
        },
        timeout: 60000,
      }
    );
    expect(result.status).toBe(0);
    const html = readFileSync(path.join(root, 'docs/.vitepress/dist/playground.html'), 'utf8');
    expect(html).toContain('https://anymd.sentiolangley.me/playground');
    expect(html).toContain('href="/logo.svg"');
  }, 60000);

  it('hashes exact inline bootstraps on every page without allowing arbitrary inline scripts', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'anymd-csp-'));
    try {
      const script = 'window.example = "private";';
      writeFileSync(
        path.join(dir, 'index.html'),
        `<script>${script}</script><script src="/app.js"></script>`
      );
      mkdirSync(path.join(dir, 'nested'));
      writeFileSync(path.join(dir, 'nested/page.html'), `<script>${script}</script>`);
      const result = spawnSync(process.execPath, ['deploy/playground/csp.ts', dir], {
        cwd: root,
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      const hash = createHash('sha256').update(script).digest('base64');
      expect(result.stdout).toContain(`'sha256-${hash}'`);
      expect(result.stdout.split(hash)).toHaveLength(2);
      const scriptPolicy = result.stdout.split('script-src ')[1].split(';')[0];
      expect(scriptPolicy).toContain("'wasm-unsafe-eval'");
      expect(scriptPolicy).not.toContain("'unsafe-inline'");
      expect(result.stdout).toContain("connect-src 'self'");
      expect(result.stdout).toContain("frame-ancestors 'none'");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ships WASM and the lockfile without changing the MCP image', () => {
    const dockerfile = readFileSync(path.join(root, 'deploy/playground/Dockerfile'), 'utf8');
    const ignore = readFileSync(
      path.join(root, 'deploy/playground/Dockerfile.dockerignore'),
      'utf8'
    );
    expect(dockerfile).toContain('COPY package.json bun.lock ./');
    expect(ignore.split('\n')).not.toContain('bun.lock');
    expect(dockerfile).toContain('bash scripts/build-wasm.sh');
    expect(dockerfile).toContain('test -s docs/.vitepress/dist/wasm/anymd_wasm_bg.wasm');
    expect(dockerfile).not.toContain('MCP_API_KEY');
    expect(readFileSync(path.join(root, 'Dockerfile'), 'utf8')).toContain('CMD ["mcp"]');
  });
});
