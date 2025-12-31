import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AmplifyProvider } from '@/components/AmplifyProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Next.js Cognito Sample',
  description: 'AWS Cognitoを使用したNext.js認証サンプル',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}



