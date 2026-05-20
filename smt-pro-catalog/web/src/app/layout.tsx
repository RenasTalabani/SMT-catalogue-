import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import QueryProvider from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title:       'DaralIraq — Admin',
  description: 'DaralIraq enterprise inventory, orders and finance management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </QueryProvider>
      </body>
    </html>
  );
}
