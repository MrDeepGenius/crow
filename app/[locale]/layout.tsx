import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import LanguageSelector from '../components/LanguageSelector';
import Navigation from '../components/Navigation';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const locales = ['en', 'es', 'pt', 'ru', 'it', 'zh'];

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

async function getMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  const messages = await getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* Header with Language Selector */}
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    🐦 Crow
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <LanguageSelector />
                </div>
              </div>
            </div>
          </header>
          
          {/* Navigation */}
          <Navigation />
          
          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}