import './globals.css'; 
import Providers from './providers/query-client';
import WebSocketProvider from './providers/websocket';
import { ToastContainer } from '@/features/notifications/ToastContainer';

export const metadata = {
  title: 'AUDIO.AI — AI-декомпозиция аудио на стемы',
  description: 'Профессиональный инструмент декомпозиции аудио. Извлекайте вокал, ударные, бас, гитару и другие инструменты с помощью нейросетей Demucs v4.',
  keywords: ['audio separation', 'stem splitting', 'demucs', 'ai music', 'decomposition'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-white antialiased min-h-screen">
        {/* Subtle noise texture overlay */}
        <div 
          className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }}
        />
        <Providers>
          <WebSocketProvider>
            {children}
            <ToastContainer />
          </WebSocketProvider>
        </Providers>
      </body>
    </html>
  );
}