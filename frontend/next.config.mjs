/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'minio',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://127.0.0.1/ws/:path*',
      },
    ];
  },
};

export default nextConfig;