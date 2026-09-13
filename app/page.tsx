import { redirect } from 'next/navigation';

export default function RootPage() {
  // Get the preferred locale from headers or default to Spanish
  const locale = 'es';
  
  redirect(`/${locale}`);
}
