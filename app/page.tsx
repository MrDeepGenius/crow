import { redirect } from 'next/navigation';

export default function RootPage() {
  // Get the preferred locale from headers or default to English
  const locale = 'en'; // Default to English for now
  
  redirect(`/${locale}`);
}