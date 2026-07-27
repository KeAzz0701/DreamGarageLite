import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  allowedDevOrigins: [
    '192.168.3.6',
    'localhost',
    '127.0.0.1',
    'app.dreamgaragelite.com',
  ],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;