import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const programHost = env.PROGRAM_HOST;
  if (!programHost && mode !== 'test') {
    console.warn(
      'Warning: PROGRAM_HOST is not set — proxy will not be configured.'
    );
  }

  // PROGRAM_HOST may carry a path, e.g. https://host/VirtualControl/Rooms/<RoomId> for a VC-4 room.
  // Then the proxy targets the origin and maps the app's /cws/appNN/api/... calls onto the room's
  // /cws/api/... API. Without a path (an appliance) requests are forwarded unchanged.
  const programUrl = programHost ? new URL(programHost) : undefined;
  const programPrefix = programUrl?.pathname.replace(/\/+$/, '') ?? '';

  return {
    // Built with relative asset paths so the same build works under /cws/debug/ on an appliance and
    // /VirtualControl/Rooms/<RoomId>/cws/debug/ on VC-4; index.html sets <base> at runtime. The dev
    // server keeps the absolute base it has always used.
    base: command === 'build' ? './' : '/cws/debug/',
    plugins: [
      react(),
      svgr({ include: '**/*.svg', svgrOptions: { exportType: 'named' } }),
    ],
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    server: {
      proxy: programHost
        ? {
            '^/cws/.*/api/.*': {
              target: programUrl?.origin,
              changeOrigin: true,
              secure: false,
              ...(programPrefix && {
                rewrite: (path: string) =>
                  `${programPrefix}${path.replace(/^\/cws\/app\d+\//, '/cws/')}`,
                cookiePathRewrite: { '*': '/' },
              }),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  const referer = proxyReq.getHeader('referer') as
                    string | undefined;
                  if (referer) {
                    const newReferer = referer.replace(
                      /https:\/\/localhost:.*/,
                      programHost
                    );
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
