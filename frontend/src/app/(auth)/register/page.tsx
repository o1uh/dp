import { RegisterForm } from '@/features/auth/RegisterForm';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">Регистрация</h1>
      <RegisterForm />
      <p className="mt-4 text-sm text-gray-400">
        Уже есть аккаунт? <Link href="/login" className="text-primary hover:underline">Войти</Link>
      </p>
    </div>
  );
}