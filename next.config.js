/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['@auth/core']
  }
};

module.exports = nextConfig; 