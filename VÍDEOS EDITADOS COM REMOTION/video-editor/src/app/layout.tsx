import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'AI Video Editor',
  description: 'Edição automática de vídeo com IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body className="bg-[#050508] text-white font-sora antialiased">{children}</body>
    </html>
  );
}
