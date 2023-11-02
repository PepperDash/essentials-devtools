/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { createProxyMiddleware } = require('http-proxy-middleware');

const env = process.env;
if (!env.PROGRAM_HOST) throw new Error('HOST is required');

const host = env.PROGRAM_HOST; // 'https://{processor-ip}'
// const cws = '/cws'
// const slot = env.PROGRAM_ID; // '/app01'
const apiPath = '/api';

module.exports = function (app) {

  const filter = function (pathname) {
    return pathname.match(`/cws/.*${apiPath}/.*`);
  };

  app.use(
    createProxyMiddleware(filter, {
      target: host,
      changeOrigin: true,
      secure: false,

      onProxyReq: (proxyReq) => onProxyReq(proxyReq, host),
    })
  );
};

function onProxyReq(proxyReq, newHost) {
  const referer = proxyReq.getHeader('referer');
  // rewrite the referer header to match the host
  if (referer) {
    const newReferer = referer.replace(/https:\/\/localhost:.*/, newHost);
    proxyReq.setHeader('referer', newReferer);
  }

}
