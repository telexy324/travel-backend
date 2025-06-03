import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: '旅游地图',
  description: '记录您的旅行足迹',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
