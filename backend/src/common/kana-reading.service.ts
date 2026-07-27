// backend/src/common/kana-reading.service.ts

import { Injectable, Logger } from '@nestjs/common';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import { normalizeForSearch } from './kana';

/**
 * 漢字の名前からひらがなの読みを求める。検索のたびに変換すると重いため、
 * 顧客の登録・編集時に1回だけ変換してDBに保存する運用を前提にしている。
 * 辞書の初期化(数百ms)は初回利用時に1度だけ行い、以降は使い回す。
 */
@Injectable()
export class KanaReadingService {
  private readonly logger = new Logger(KanaReadingService.name);
  private initPromise: Promise<Kuroshiro> | null = null;

  private init(): Promise<Kuroshiro> {
    if (!this.initPromise) {
      const kuroshiro = new Kuroshiro();

      this.initPromise = kuroshiro
        .init(new KuromojiAnalyzer())
        .then(() => kuroshiro)
        .catch((e: unknown) => {
          this.logger.warn(`かな読み変換の初期化に失敗しました: ${String(e)}`);
          this.initPromise = null;
          throw e;
        });
    }

    return this.initPromise!;
  }

  /** 変換に失敗しても空文字を返すだけとし、呼び出し元(顧客登録など)を止めない */
  async getReading(text: string | null | undefined): Promise<string> {
    const trimmed = (text ?? '').trim();

    if (!trimmed) return '';

    try {
      const kuroshiro = await this.init();
      const reading = await kuroshiro.convert(trimmed, { to: 'hiragana' });
      return normalizeForSearch(reading);
    } catch {
      return '';
    }
  }
}
