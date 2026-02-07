/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb'
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive'
          }
        ]
      }
    ];
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
