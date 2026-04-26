import { LoginForm } from '@/features/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">Вход</h1>
      <LoginForm />
      <p className="mt-4 text-sm text-gray-400">
        Нет аккаунта? <Link href="/register" className="text-primary hover:underline">Зарегистрироваться</Link>
      </p>
    </div>
  );
}