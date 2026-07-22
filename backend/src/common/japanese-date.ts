// backend/src/common/japanese-date.ts

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

export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * サーバーのタイムゾーンに関わらず、JST壁時計表記の"YYYY-MM-DDTHH:mm"を返す。
 * LINEのdatetimepickerのmin/maxに渡す文字列の生成に使う。
 */
export function toJstDatetimeLocal(date: Date): string {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return shifted.toISOString().slice(0, 16);
}

/** JST壁時計表記の"YYYY-MM-DD"を返す(datetimepickerのmode="date"用) */
export function toJstDateOnly(date: Date): string {
  return toJstDatetimeLocal(date).slice(0, 10);
}

/** LINEのdatetimepickerが返す"YYYY-MM-DDTHH:mm"(JST壁時計)を絶対時刻のDateに変換する */
export function parseJstDatetimeLocal(value: string): Date {
  return new Date(`${value}:00+09:00`);
}
