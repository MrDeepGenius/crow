const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'https://3000-' + (process.env.BASE44_PUBLIC_HOST_SUFFIX || ''),
    '3000-' + (process.env.BASE44_PUBLIC_HOST_SUFFIX || ''),
  ].filter(Boolean),
};

module.exports = withNextIntl(nextConfig);