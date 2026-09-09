import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Read the locale from the environment, defaulting to 'en'
  const rawLocale = process.env.NEXT_PUBLIC_APP_LOCALE || 'en';
  const cleanLocale = rawLocale.toLowerCase().replace('_', '-');

  let messages;
  let locale = cleanLocale;

  try {
    messages = (await import(`../../messages/${cleanLocale}.json`)).default;
  } catch {
    try {
      const baseLocale = cleanLocale.split('-')[0];
      messages = (await import(`../../messages/${baseLocale}.json`)).default;
      locale = baseLocale;
    } catch {
      messages = (await import(`../../messages/en.json`)).default;
      locale = 'en';
    }
  }

  return {
    locale,
    messages
  };
});
