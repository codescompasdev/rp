import './globals.css';
import PwaRegister from '../components/PwaRegister';
import AppShellClient from '../components/Layout/AppShellClient';
import { Sora, JetBrains_Mono } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata = {
  title: 'Compas Codes | MILKUS ERP',
  description: 'Sistem za upravljanje poduzećem Milkus',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bs" className={`${sora.className} ${jetbrainsMono.variable}`}>
      <body className="app-root-body">
        <PwaRegister />
        <AppShellClient>{children}</AppShellClient>
      </body>
    </html>
  );
}
