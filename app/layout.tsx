import type { Metadata } from 'next';
import './globals.css';
import PrivyProviderWrapper from '@/components/PrivyProviderWrapper';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Memory Match Madness',
  description: 'Win USDC prizes by matching pairs!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PrivyProviderWrapper>
          <Providers>
            {children}
          </Providers>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
