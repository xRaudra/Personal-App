import type { NextConfig } from 'next'

const config: NextConfig = {
  async redirects() {
    return [{ source: '/personalapp', destination: '/', permanent: false }]
  },
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
}

export default config
