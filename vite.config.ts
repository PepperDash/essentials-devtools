import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const programHost = env.PROGRAM_HOST;
  if (!programHost && mode !== 'test') {
    console.warn('Warning: PROGRAM_HOST is not set — proxy will not be configured.');
  }

  return {
    base: '/debug/',
    plugins: [react(), svgr({ include: '**/*.svg', svgrOptions: { exportType: 'named' } })],
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
