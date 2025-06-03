/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['@auth/core']
  },
  images: {
    domains: ['example.com'], // 添加允许的图片域名
  },
};

module.exports = nextConfig; 