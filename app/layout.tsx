import type { Metadata } from 'next';
import './globals.css';
// import PrivyProviderWrapper from '@/components/PrivyProviderWrapper'; // Disabled for Base.dev verification
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Memory Match Madness',
  description: 'Win USDC prizes by matching pairs!',
  other: {
    'base:app_id': '69584622c63ad876c9081e30',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Privy temporarily disabled - was causing Base.dev verification signing loop */}
        {/* Re-enable after Base.dev verification is complete */}
        {/* <PrivyProviderWrapper> */}
          <Providers>
            {children}
          </Providers>
        {/* </PrivyProviderWrapper> */}
      </body>
    </html>
  );
}
