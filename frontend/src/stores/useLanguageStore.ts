import { create } from 'zustand';

interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: localStorage.getItem("appLanguage") || "ko",
  setLanguage: (lang: string) => {
    localStorage.setItem("appLanguage", lang);
    set({ language: lang });
  },
}));
