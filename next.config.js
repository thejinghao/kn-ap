/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server components (default in Next.js 14)
  reactStrictMode: true,
  
  // Allow external packages that need to be transpiled
  transpilePackages: ['@uiw/react-json-view'],
  
  // Webpack configuration for handling certificate files
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow importing .pem files as strings on the server
      config.module.rules.push({
        test: /\.pem$/,
        type: 'asset/source',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
