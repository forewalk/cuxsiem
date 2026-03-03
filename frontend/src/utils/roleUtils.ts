import koMessages from '../locales/ko.json';
import enMessages from '../locales/en.json';
import jaMessages from '../locales/ja.json';
import cnMessages from '../locales/cn.json';

const allTranslations: Record<string, Record<string, string>> = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
  cn: cnMessages,
};

const ROLE_I18N_KEYS: Record<string, string> = {
  'role-1': 'roleDefault1',
  'role-2': 'roleDefault2',
  'role-3': 'roleDefault3',
  'role-4': 'roleDefault4',
};

/**
 * 역할 코드에 대한 표시 이름을 반환합니다.
 * - ko: DB에 저장된 설정값 우선
 * - 그 외 언어: locale 파일의 번역값 우선 (DB 설정값 무시)
 */
export function getRoleName(
  roleCode: string,
  roleNames: Record<string, string>,
  language: string,
): string {
  if (language !== 'ko') {
    const i18nKey = ROLE_I18N_KEYS[roleCode];
    if (i18nKey) {
      return (
        allTranslations[language]?.[i18nKey] ||
        allTranslations['ko']?.[i18nKey] ||
        roleNames[roleCode] ||
        roleCode
      );
    }
  }
  return roleNames[roleCode] || roleCode;
}
