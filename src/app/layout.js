import './globals.css';
import PwaRegister from '../components/PwaRegister';
import AppShellClient from '../components/Layout/AppShellClient';
import { Sora, JetBrains_Mono } from 'next/font/google';

const sora = Sora({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sora',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata = {
  title: 'Compas Codes | MILKUS ERP',
  description: 'Sistem za upravljanje poduzećem Milkus',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#f4f7fb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bs" className={`${sora.variable} ${jetbrainsMono.variable}`}>
      <body className="app-root-body">
        <PwaRegister />
        <AppShellClient>{children}</AppShellClient>
      </body>
    </html>
  );
}
