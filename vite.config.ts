import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import net from 'node:net';
import tls from 'node:tls';
import { defineConfig, loadEnv, Plugin } from 'vite';
import svgr from 'vite-plugin-svgr';

/**
 * Vite-only plugin that creates a dynamic WebSocket reverse-proxy for the
 * debug session endpoint. Because the backend picks a random port in the
 * range 65435-65535 for each session, a static proxy target is not possible.
 *
 * Flow (dev only):
 *   1. Browser calls POST /debug/ws-register with the wss:// URL returned by
 *      the debugSession API, telling the plugin which host:port to tunnel to.
 *   2. Browser dials ws://localhost:<vite-port>/debug/join (same origin, no
 *      cert issues).
 *   3. This plugin intercepts the WebSocket upgrade, opens a TLS tunnel to
 *      the registered target, and splices the two sockets together.
 */
function dynamicWsProxyPlugin(): Plugin {
  let registeredTarget: URL | null = null;

  return {
    name: 'dynamic-ws-proxy',
    configureServer(server) {
      // ── Registration endpoint ─────────────────────────────────────────────
      server.middlewares.use('/debug/ws-register', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        req.on('end', () => {
          try {
            const { url } = JSON.parse(body) as { url: string };
            registeredTarget = new URL(url);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid request body' }));
          }
        });
      });

      // ── Dynamic WebSocket tunnel ──────────────────────────────────────────
      server.httpServer?.prependListener(
        'upgrade',
        (req: IncomingMessage, socket: any, head: Buffer) => {
          if (!req.url?.startsWith('/debug/join') || !registeredTarget) return;

          const target = registeredTarget;
          const useSecure =
            target.protocol === 'wss:' || target.protocol === 'https:';
          const port = target.port
            ? parseInt(target.port, 10)
            : useSecure ? 443 : 80;

          const upstream: net.Socket = useSecure
            ? tls.connect({ host: target.hostname, port, rejectUnauthorized: false })
            : net.createConnection({ host: target.hostname, port });

          upstream.once(useSecure ? 'secureConnect' : 'connect', () => {
            // Re-emit the full HTTP Upgrade request to the upstream server
            const headerLines = [
              `GET ${req.url} HTTP/1.1`,
              `Host: ${target.host}`,
              ...Object.entries(req.headers)
                .filter(([k]) => k !== 'host')
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (v ?? '')}` ),
              '',
              '',
            ];
            upstream.write(headerLines.join('\r\n'));
            if (head?.length) upstream.write(head);

            socket.pipe(upstream);
            upstream.pipe(socket);
          });

          upstream.on('error', (err: Error) => {
            console.error('[dynamic-ws-proxy] upstream error:', err.message);
            socket.destroy();
          });
          socket.on('error', () => upstream.destroy());
          socket.on('close', () => upstream.destroy());
          upstream.on('close', () => socket.destroy());
        },
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const programHost = env.PROGRAM_HOST;
  if (!programHost && mode !== 'test') {
    console.warn('Warning: PROGRAM_HOST is not set — proxy will not be configured.');
  }

  return {
    base: '/debug/',
    plugins: [react(), svgr({ include: '**/*.svg', svgrOptions: { exportType: 'named' } }), dynamicWsProxyPlugin()],
    server: {
      proxy: programHost
        ? {
            '^/cws/.*/api/.*': {
              target: programHost,
              changeOrigin: true,
              secure: false,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  const referer = proxyReq.getHeader('referer') as string | undefined;
                  if (referer) {
                    const newReferer = referer.replace(/https:\/\/localhost:.*/, programHost);
                    proxyReq.setHeader('referer', newReferer);
                  }
                });
              },
            },
          }
        : undefined,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
});
