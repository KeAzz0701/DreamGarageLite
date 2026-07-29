// frontend/lib/japaneseDate.ts

const ERA_BASE_YEAR: Record<string, number> = {
  令和: 2018,
  平成: 1988,
  昭和: 1925,
  大正: 1911,
  明治: 1867,
};

/**
 * 「令和10年5月26日」「平成27年5月」「2027年3月15日」等、
 * 車検証OCRで取得しがちな和暦・西暦の日付表記をDateに変換する。
 */
export function parseFlexibleDate(str: string | null | undefined): Date | null {
  if (!str) return null;

  for (const [era, base] of Object.entries(ERA_BASE_YEAR)) {
    const m = str.match(
      new RegExp(`${era}(\\d{1,2})年(\\d{1,2})月(?:(\\d{1,2})日)?`),
    );

    if (m) {
      const year = base + Number(m[1]);
      const month = Number(m[2]);
      const day = m[3] ? Number(m[3]) : 1;
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const m = str.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);

  if (!m) return null;

  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  return isNaN(d.getTime()) ? null : d;
}

/**
 * 車検証OCRの結果には「令和8年8月20日」「2026-09-10」など和暦・西暦が混在するため、
 * 表示前に "YYYY-MM-DD" へ揃える。解釈できない文字列はそのまま返す
 */
export function formatFlexibleDate(str: string | null | undefined): string {
  if (!str) return '';

  const d = parseFlexibleDate(str);
  if (!d) return str;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
