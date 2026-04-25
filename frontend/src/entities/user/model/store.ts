import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfileResponse } from '../api/types';

interface UserState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuth: boolean;
  profile: UserProfileResponse | null;
  setTokens: (access: string, refresh: string) => void;
  setProfile: (profile: UserProfileResponse) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuth: false,
      profile: null,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuth: true }),
      setProfile: (profile) => set({ profile }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, isAuth: false, profile: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);