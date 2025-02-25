/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.externals.push({
      bufferutil: 'bufferutil',
      'utf-8-validate': 'utf-8-validate',
    });
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/websocket',
        destination: '/app/api/websocket',
      },
    ];
  }
};

export default nextConfig;