import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { translations, type TranslationKey } from './translations';

type Locale = 'en' | 'es';
interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ohmy-i18n',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useT(): (key: TranslationKey) => string {
  const locale = useI18nStore((s) => s.locale);
  return (key) => translations[locale][key] ?? translations['en'][key] ?? key;
}

export type { Locale, TranslationKey };
