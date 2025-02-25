/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }
    if (!isServer) {
      // Don't resolve 'fs', 'net', 'dns' module on the client
      config.resolve.fallback = {
        fs: false,
        net: false,
        dns: false,
        tls: false,
        "mock-aws-s3": false,
        "aws-sdk": false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/websocket',
        destination: '/app/api/websocket',
      },
    ];
  },
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
