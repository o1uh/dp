import './globals.css'; 
import Providers from './providers/query-client';
import WebSocketProvider from './providers/websocket';
import { ToastContainer } from '@/features/notifications/ToastContainer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-background text-white antialiased">
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