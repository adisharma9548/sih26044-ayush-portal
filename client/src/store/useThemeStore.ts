import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDOM = (resolved: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),
      setTheme: (theme: ThemeMode) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyThemeToDOM(resolved);
        set({ theme, resolvedTheme: resolved });
      },
      toggleTheme: () => {
        const current = get().resolvedTheme;
        const next = current === 'dark' ? 'light' : 'dark';
        applyThemeToDOM(next);
        set({ theme: next, resolvedTheme: next });
      },
    }),
    {
      name: 'nodalconnector-theme-mode',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === 'system' ? getSystemTheme() : state.theme;
          state.resolvedTheme = resolved;
          applyThemeToDOM(resolved);
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      applyThemeToDOM(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  });

  try {
    const raw = localStorage.getItem('nodalconnector-theme-mode');
    const parsed = raw ? JSON.parse(raw) : null;
    const initialTheme: ThemeMode = parsed?.state?.theme || 'system';
    const initialResolved = initialTheme === 'system' ? getSystemTheme() : initialTheme;
    applyThemeToDOM(initialResolved);
  } catch {
    applyThemeToDOM(getSystemTheme());
  }
}
