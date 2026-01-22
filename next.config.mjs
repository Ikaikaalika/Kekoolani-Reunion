/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb'
    }
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'kekoolanireunion.com'
          }
        ],
        destination: 'https://www.kekoolanireunion.com/:path*',
        permanent: true
      }
    ];
  }
};

export default nextConfig;
