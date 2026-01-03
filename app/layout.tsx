import type { Metadata } from 'next';
import './globals.css';
// import PrivyProviderWrapper from '@/components/PrivyProviderWrapper'; // Disabled for Base.dev verification
import Providers from '@/components/Providers';
import { minikitConfig } from '@/minikit.config';

const miniappEmbed = {
  version: minikitConfig.miniapp.version,
  name: minikitConfig.miniapp.name,
  iconUrl: minikitConfig.miniapp.iconUrl,
  splashImageUrl: minikitConfig.miniapp.splashImageUrl,
  splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
};

export const metadata: Metadata = {
  title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
  description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
  openGraph: {
    title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
    images: [minikitConfig.miniapp.ogImageUrl],
  },
  other: {
    'base:app_id': '69584622c63ad876c9081e30',
    'fc:miniapp': JSON.stringify(miniappEmbed),
    'fc:frame': JSON.stringify(miniappEmbed), // Backward compatibility
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
