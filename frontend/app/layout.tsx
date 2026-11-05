import type { Metadata } from 'next';
import '@zakisheriff/liquid-glass/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaDrop — Precision Media Export Engine',
  description: 'Clean, ad-free social media media processing and format conversion web application.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-text-primary min-h-screen antialiased flex flex-col selection:bg-accent/20">
        {children}
      </body>
    </html>
  );
}
