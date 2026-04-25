import './globals.css'; 
import Providers from './providers/query-client';

export const metadata = {
  title: 'Audio Platform',
  description: 'AI Audio Decomposition',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-background text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}