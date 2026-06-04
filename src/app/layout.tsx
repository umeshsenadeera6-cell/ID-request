import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RoleProvider } from '@/context/RoleContext';
import LayoutShell from '@/components/LayoutShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'ID & Visiting Card Tracker',
  description: 'Enterprise ID and Visiting Card printing requests tracker.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        <RoleProvider>
          <LayoutShell>{children}</LayoutShell>
        </RoleProvider>
      </body>
    </html>
  );
}
