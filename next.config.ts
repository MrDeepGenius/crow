import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'https://3000-' + (process.env.BASE44_PUBLIC_HOST_SUFFIX || ''),
    '3000-' + (process.env.BASE44_PUBLIC_HOST_SUFFIX || ''),
  ].filter(Boolean),
};

export default nextConfig;
