// backend/src/common/kana.ts

/**
 * ひらがな/カタカナの表記ゆれ、全角/半角の違いを吸収するための正規化。
 * 検索キーワードと検索対象の文字列の両方にこれを通してから含む判定を行う。
 */
export function normalizeForSearch(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}
