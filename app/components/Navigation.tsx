'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}`, label: t('common.home'), icon: '🏠' },
    { href: `/${locale}/marketplace`, label: t('navigation.marketplace'), icon: '🛒' },
    { href: `/${locale}/affiliates`, label: t('navigation.affiliates'), icon: '👥' },
    { href: `/${locale}/creator-dashboard`, label: t('navigation.creator'), icon: '🎨' },
    { href: `/${locale}/my-products`, label: t('navigation.products'), icon: '📦' },
    { href: `/${locale}/account`, label: t('common.account'), icon: '👤' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== `/${locale}` && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium
                    ${isActive 
                      ? 'border-indigo-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    transition-colors duration-200
                  `}
                >
                  <span className="mr-2">{item.icon}</span>
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}