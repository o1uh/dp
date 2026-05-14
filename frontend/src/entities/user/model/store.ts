import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfileResponse } from '../api/types';

interface UserState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuth: boolean;
  profile: UserProfileResponse | null;
  _hasHydrated: boolean;
  setTokens: (access: string, refresh: string) => void;
  setProfile: (profile: UserProfileResponse) => void;
  setHasHydrated: (state: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuth: false,
      profile: null,
      _hasHydrated: false,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuth: true }),
      setProfile: (profile) => set({ profile }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, isAuth: false, profile: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);