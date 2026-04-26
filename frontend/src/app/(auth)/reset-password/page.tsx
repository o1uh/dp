import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">Сброс пароля</h1>
      <ResetPasswordForm />
    </div>
  );
}