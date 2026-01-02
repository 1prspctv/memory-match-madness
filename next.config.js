/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add empty turbopack config to silence the warning
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    };
    return config;
  },
};

export default nextConfig;