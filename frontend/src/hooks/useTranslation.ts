import { useMemo } from 'react';
import { useLanguageStore } from '../stores/useLanguageStore';

import koMessages from '../locales/ko.json';
import enMessages from '../locales/en.json';
import jaMessages from '../locales/ja.json';
import cnMessages from '../locales/cn.json';

const translations: Record<string, Record<string, string>> = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
  cn: cnMessages,
};

/**
 * 앱 전역 언어 상태(useLanguageStore)를 기반으로 동작하는 i18n 훅.
 * language가 바뀌면 t()가 자동으로 갱신됩니다.
 *
 * @example
 * const { t, language } = useTranslation();
 * t('save')           // → '저장' | 'Save' | ...
 * t('hello', { name: '철수' }) // → '{name} 안녕하세요' 패턴 지원
 */
export function useTranslation() {
  const { language } = useLanguageStore();

  const t = useMemo(
    () =>
      (key: string, params?: Record<string, string>): string => {
        const dict = translations[language] ?? translations['ko'] ?? {};
        let text = dict[key] ?? key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, v);
          });
        }
        return text;
      },
    [language],
  );

  return { t, language };
}
