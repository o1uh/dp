import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from '@/features/auth/LoginForm';
import { useUserStore } from '@/entities/user/model/store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/shared/api/rest', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({
      data: { access_token: 'access123', refresh_token: 'refresh123' }
    }),
  },
}));

vi.mock('@/entities/user/api', () => ({
  userApi: {
    getProfile: vi.fn().mockResolvedValue({
      id: '1', username: 'testuser', email: 'test@mail.com'
    }),
  },
}));

describe('LoginForm', () => {
  it('submits form, updates Zustand state and redirects', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passInput = screen.getByLabelText('Пароль');
    const submitBtn = screen.getByText('Войти');

    fireEvent.change(emailInput, { target: { value: 'test@mail.com' } });
    fireEvent.change(passInput, { target: { value: 'password' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const state = useUserStore.getState();
      expect(state.accessToken).toBe('access123');
      expect(state.isAuth).toBe(true);
      expect(state.profile?.username).toBe('testuser');
    });
  });
});