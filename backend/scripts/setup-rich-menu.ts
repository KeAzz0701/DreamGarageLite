// backend/scripts/setup-rich-menu.ts
//
// LINE公式アカウント(全社共有チャンネル)に、常時表示のリッチメニュー
// (整備履歴/予約/お知らせ/オススメメニュー の2x2構成)を登録する、1回限りのスクリプト。
//
// 実行方法:
//   cd backend
//   npx tsx scripts/setup-rich-menu.ts "画像ファイルのフルパス"
//
// 例:
//   npx tsx scripts/setup-rich-menu.ts "C:\Users\user\Downloads\richmenu.png"
//
// 画像サイズはLINE公式の推奨サイズ(2500x1686、2x2の4分割)を前提にしています。
// 別サイズの画像を使う場合は、下の WIDTH / HEIGHT を実際の画像サイズに合わせて書き換えてください。

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { messagingApi } from '@line/bot-sdk';

const WIDTH = 2500;
const HEIGHT = 1686;

const SERVICE_HISTORY_KEYWORD = '整備履歴';
const RESERVATION_KEYWORD = '予約';

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('使い方: npx tsx scripts/setup-rich-menu.ts "画像ファイルのフルパス"');
    process.exit(1);
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN が.envに設定されていません。');
    process.exit(1);
  }

  const client = new messagingApi.MessagingApiClient({ channelAccessToken: accessToken });
  const blobClient = new messagingApi.MessagingApiBlobClient({ channelAccessToken: accessToken });

  const halfW = Math.floor(WIDTH / 2);
  const halfH = Math.floor(HEIGHT / 2);

  console.log('リッチメニューを作成しています...');

  const { richMenuId } = await client.createRichMenu({
    size: { width: WIDTH, height: HEIGHT },
    selected: true,
    name: 'ガレージカルテ メインメニュー',
    chatBarText: 'メニュー',
    areas: [
      {
        // 左上: 整備履歴
        bounds: { x: 0, y: 0, width: halfW, height: halfH },
        action: { type: 'message', label: '整備履歴', text: SERVICE_HISTORY_KEYWORD },
      },
      {
        // 右上: 予約
        bounds: { x: halfW, y: 0, width: WIDTH - halfW, height: halfH },
        action: { type: 'message', label: '予約', text: RESERVATION_KEYWORD },
      },
      {
        // 左下: お知らせ
        bounds: { x: 0, y: halfH, width: halfW, height: HEIGHT - halfH },
        action: { type: 'postback', label: 'お知らせ', data: 'action=announcement_show', displayText: 'お知らせ' },
      },
      {
        // 右下: オススメメニュー
        bounds: { x: halfW, y: halfH, width: WIDTH - halfW, height: HEIGHT - halfH },
        action: { type: 'postback', label: 'オススメメニュー', data: 'action=recommend_show', displayText: 'オススメメニュー' },
      },
    ],
  });

  console.log(`作成しました: richMenuId=${richMenuId}`);

  console.log('画像をアップロードしています...');

  const imageBuffer = readFileSync(imagePath);
  const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const blob = new Blob([imageBuffer], { type: mimeType });

  await blobClient.setRichMenuImage(richMenuId, blob);

  console.log('全員に既定のメニューとして適用しています...');

  await client.setDefaultRichMenu(richMenuId);

  console.log('完了しました。LINEアプリを開き直すと画面下部にメニューが表示されます。');
}

main().catch((err) => {
  console.error('リッチメニューの設定に失敗しました:', err);
  process.exit(1);
});
