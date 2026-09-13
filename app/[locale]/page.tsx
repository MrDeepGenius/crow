import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('common.home')} - Crow Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {t('marketplace.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href={`/${locale}/marketplace`}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              {t('navigation.marketplace')}
            </Link>
            <Link 
              href={`/${locale}/affiliates`}
              className="bg-white text-indigo-600 border border-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              {t('navigation.affiliates')}
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2">{t('navigation.marketplace')}</h3>
            <p className="text-gray-600">{t('marketplace.description')}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">{t('navigation.affiliates')}</h3>
            <p className="text-gray-600">{t('affiliates.title')}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold mb-2">{t('navigation.rewards')}</h3>
            <p className="text-gray-600">{t('affiliates.earnings')}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t('common.dashboard')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href={`/${locale}/account`}
              className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="font-medium">{t('common.account')}</div>
            </Link>
            
            <Link 
              href={`/${locale}/my-products`}
              className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-medium">{t('navigation.products')}</div>
            </Link>
            
            <Link 
              href={`/${locale}/creator-dashboard`}
              className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">🎨</div>
              <div className="font-medium">{t('navigation.creator')}</div>
            </Link>
            
            <Link 
              href={`/${locale}/admin`}
              className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-medium">{t('navigation.admin')}</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}