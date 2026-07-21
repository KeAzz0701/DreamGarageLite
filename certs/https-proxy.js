// certs/https-proxy.js
//
// スマホ/タブレット向けのHTTPS終端プロキシ。
// PC自身は今まで通り http://localhost:3000 / :3001 を使い続けられるよう、
// このプロキシは別ポート(3443/3444)でTLSを終端し、既存のHTTP開発サーバーへ転送するだけ。

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const CERT_DIR = __dirname;

const options = {
  key: fs.readFileSync(path.join(CERT_DIR, 'lan-key.pem')),
  cert: fs.readFileSync(path.join(CERT_DIR, 'lan-cert.pem')),
};

function createProxy(httpsPort, targetPort, label) {
  const server = https.createServer(options, (req, res) => {
    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    });

    req.pipe(proxyReq);
  });

  server.on('upgrade', (req, socket, head) => {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    });

    proxyReq.end();

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
          Object.entries(proxyRes.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\r\n') +
          '\r\n\r\n',
      );

      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', () => socket.end());
  });

  server.listen(httpsPort, '0.0.0.0', () => {
    console.log(`[https-proxy] ${label}: https://0.0.0.0:${httpsPort} -> http://127.0.0.1:${targetPort}`);
  });
}

createProxy(3443, 3000, 'frontend');
createProxy(3444, 3001, 'backend');
