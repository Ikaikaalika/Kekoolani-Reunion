import type { Metadata } from 'next';
import { Inter, Noto_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });

export const metadata: Metadata = {
  title: 'Keko\'olani Family Reunion',
  description: 'Celebrate family in Hilo, Hawaii with the Keko\'olani family gathering.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
