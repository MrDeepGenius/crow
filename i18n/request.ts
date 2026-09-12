import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'pt', 'ru', 'it', 'zh'];
export const defaultLocale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // Ensure that a valid locale is used
  if (!locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});