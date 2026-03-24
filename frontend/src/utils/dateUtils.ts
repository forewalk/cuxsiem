import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const LOCALE_MAP: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  cn: 'zh-CN',
};

/**
 * UTC ISO 문자열을 한국 시간(Asia/Seoul)으로 변환하여 표시.
 * language가 주어지면 해당 로케일에 맞는 형식으로 출력하고,
 * 생략하면 'YYYY-MM-DD HH:mm:ss' 형태로 출력한다.
 */
export function formatKST(
  dateString: string | null | undefined,
  language?: string,
): string {
  if (!dateString) return '-';
  const normalized = dateString.endsWith('Z') ? dateString : dateString + 'Z';

  if (language) {
    const locale = LOCALE_MAP[language] ?? 'ko-KR';
    return new Date(normalized).toLocaleString(locale, { timeZone: 'Asia/Seoul' });
  }
  return dayjs.utc(dateString).utcOffset(9).format('YYYY-MM-DD HH:mm:ss');
}
