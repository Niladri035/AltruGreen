import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AltruGreen — Play Golf. Win Big. Change Lives.',
  description:
    'A subscription-based golf platform where monthly draws reward you while supporting your chosen charity.',
  keywords: 'golf, charity, subscription, draw, Stableford, prizes',
  openGraph: {
    title: 'AltruGreen',
    description: 'Play Golf. Win Big. Change Lives.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
