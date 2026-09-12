import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always use prefix for locale
  localePrefix: 'always'
});

export const config = {
  // i18n middleware disabled: app pages live at the root, not under [locale]/
  matcher: []
};