import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

/**
 * 社内AIチャット(/ai-chat)がスタッフから「これどうやるの？」と聞かれた時に答えられるよう、
 * アプリの使い方を静的に持たせておく。業務データ(本日の予約等)はChatServiceが動的に付け足す。
 */
const APP_MANUAL = `
--- ガレージ・カルテ 操作ガイド ---
・ホーム: 本日の予約件数、車検満了間近の車両、未読LINEメッセージなどをまとめて表示するダッシュボード。
・顧客一覧(顧客管理): 顧客の新規登録・検索・編集。顧客名はひらがな/カタカナの表記ゆれや、車両の通称名(例:ヤリスクロス)でも検索できる。
・顧客詳細ページ: 顧客情報の編集、LINE連携用QRコードの表示、LINEメッセージのやり取り(スタンダードプラン以上)、所有車両の一覧、車検証OCRへの導線がある。
・車両管理: 登録車両の一覧。車検満了日が近い順・登録が新しい順・車名順で並べ替え可能。
・車検証OCR: 「OCR」メニューから車検証の写真をアップロードすると、AIが車両情報を自動で読み取って登録できる。お客様がLINEで送ってきた車検証は「LINEで届いた車検証」一覧から確認・登録する(送信者本人に紐づけるか、車検証データの氏名で別の人に紐づけるか選べる)。
・予約: カレンダー形式で予約を確認・新規作成。お客様はLINEからも直接予約できる。予約確定・却下の操作もここで行う。
・見積作成(estimates/new): 車両または顧客を選んで見積を作成。車検の場合は登録済みの料金表(設定画面で編集可)から項目を自動入力できる。
・整備履歴: 車両ごとに過去の整備内容・費用を記録する。ポータルへの表示可否も設定できる。
・AIチャット(このアシスタント): 今日の予約や顧客情報を踏まえた相談、整備・見積・接客の相談、アプリの使い方の質問に対応する。
・設定: 会社情報、振込先情報(見積書・請求書に印刷)、料金表(整備項目と単価のカスタマイズ、並べ替え・追加・削除可)、社員用LINE連携(入室ID発行・解除)、料金プランの確認・変更を行う画面。
・料金プラン: FREE(無料、初月のみ全機能)/LITE(月額980円)/STANDARD(月額2,980円、AIチャットやLINE履歴閲覧が使える)/PRO(月額5,980円、Web予約含め全機能)の4段階。
・LINE公式アカウント: お客様・スタッフ共通の窓口。お客様は「予約して」「整備履歴」などの発言やメニューから各機能にアクセスでき、スタッフはLINE連携すると入室IDでログインできる(社長がLINE連携を解除すると即座にログイン不可になる)。
・顧客ポータル: STANDARD以上のプランの店舗に連携している顧客が、LINEから自分の整備履歴・次回整備のおすすめ・タイヤ交換時期などを確認できる画面。個々の顧客への課金ではなく、店舗のプランに含まれる。
`;

@Injectable()
export class GeminiService {
  async analyzeImage(base64: string, mimeType: string, apiKey?: string) {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GOOGLE_API_KEY!,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType,
          },
        },
        {
          text: `
あなたは日本の車検証OCR専用AIです。

必ずJSONのみ返してください。

不明な項目は "" を返してください。

commonModelName には、carName（車名/メーカー名）と model（型式）から、あなたの知識をもとに一般的に知られている車種名（例:プリウス、ノア、フィット、セレナ）を日本語で推測して入れてください。自信が持てない場合は "" にしてください。

{
  "registrationNumber":"",
  "vin":"",
  "ownerName":"",
  "ownerAddress":"",
  "userName":"",
  "userAddress":"",
  "usageBase":"",
  "carName":"",
  "commonModelName":"",
  "model":"",
  "engineModel":"",
  "modelCode":"",
  "classificationCode":"",
  "firstRegistration":"",
  "expirationDate":"",
  "vehicleWeight":"",
  "grossWeight":"",
  "seatingCapacity":"",
  "maxLoad":"",
  "length":"",
  "width":"",
  "height":"",
  "displacement":"",
  "fuel":"",
  "usage":"",
  "privateBusiness":"",
  "bodyType":"",
  "phone":"",
  "remarks":"",
  "confidence":100
}
          `,
        },
      ],
    });

    return this.extractJsonText(response.text ?? '');
  }

  /** 車両情報をもとに、車検にかかる法定費用(概算)をAIに算出させる */
  async estimateLegalFees(
    vehicle: {
      vehicleWeight?: string | null;
      usage?: string | null;
      bodyType?: string | null;
      fuel?: string | null;
      firstRegistration?: string | null;
      privateBusiness?: string | null;
    },
    apiKey?: string,
  ) {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GOOGLE_API_KEY!,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: `
あなたは日本の車検(自動車検査登録制度)における法定費用の見積もりに詳しいアシスタントです。

以下の車両情報から、この車両の車検時にかかる法定費用の概算を算出してください。
- 自動車重量税(継続検査、エコカー減税等の特例は考慮できる範囲で反映。不明な場合は一般的な自家用乗用車の相場で概算)
- 自賠責保険料(継続検査でよく使われる24ヶ月分)
- 印紙代(自動車検査手数料などの法定手数料の合計、一般的な相場)

車両情報:
車両重量: ${vehicle.vehicleWeight ?? '不明'}
用途: ${vehicle.usage ?? '不明'}
自家用・事業用: ${vehicle.privateBusiness ?? '不明'}
車体の形状: ${vehicle.bodyType ?? '不明'}
燃料の種類: ${vehicle.fuel ?? '不明'}
初度登録年月: ${vehicle.firstRegistration ?? '不明'}

必ずJSON形式のみで、以下の形で回答してください。金額は円単位の数値(税込目安)。あくまで概算であることを前提に、最も一般的なケースを想定してください。

{
  "weightTax": 0,
  "insuranceFee": 0,
  "stampFee": 0,
  "note": ""
}
          `,
        },
      ],
    });

    const json = JSON.parse(this.extractJsonText(response.text ?? ''));

    return {
      weightTax: Number(json.weightTax) || 0,
      insuranceFee: Number(json.insuranceFee) || 0,
      stampFee: Number(json.stampFee) || 0,
      note: json.note ?? '',
    };
  }

  /** 他店舗が発行した整備・修理の見積書の写真から、金額・項目をOCR抽出する */
  async analyzeCompetitorEstimate(base64: string, mimeType: string, apiKey?: string) {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GOOGLE_API_KEY!,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType,
          },
        },
        {
          text: `
あなたは自動車整備・修理の見積書を読み取るOCR AIです。

必ずJSONのみ返してください。不明な項目は null にしてください。

{
  "shopName": null,
  "estimateDate": null,
  "items": [{"name": "", "cost": 0}],
  "totalAmount": null
}
          `,
        },
      ],
    });

    return this.extractJsonText(response.text ?? '');
  }

  /** 会話履歴とコンテキスト(当日の予約・顧客情報等)を踏まえたチャット応答を生成する */
  async chat(
    history: { role: 'user' | 'model'; content: string }[],
    message: string,
    context: string,
    apiKey?: string,
  ): Promise<string> {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GOOGLE_API_KEY!,
    });

    const contents = [
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction:
          'あなたは日本の自動車整備工場向け業務アプリ「ガレージ・カルテ」に組み込まれたAIアシスタントです。' +
          '整備内容の相談、見積の考え方、接客、一般的な業務相談に加えて、このアプリ自体の使い方を聞かれた場合は' +
          '下記の操作ガイドをもとに答えてください。丁寧で簡潔な日本語で、' +
          '不確かなことは断定せず、確認を促してください。\n' +
          APP_MANUAL +
          `\n--- 現在参照できる業務データ ---\n${context}`,
      },
    });

    return response.text ?? '';
  }

  /** スタッフの自由文(例:「それ終わってる」)が、車検リマインド候補のどの車両を指しているか判定する */
  async matchDismissedVehicle(
    candidates: { vehicleId: number; customerName: string; vehicleLabel: string }[],
    message: string,
    apiKey?: string,
  ): Promise<number | null> {
    if (candidates.length === 0) return null;

    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GOOGLE_API_KEY!,
    });

    const list = candidates
      .map((c) => `- vehicleId=${c.vehicleId}: ${c.customerName}様 ${c.vehicleLabel}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: `
あなたは自動車整備工場の車検リマインド管理を手伝うアシスタントです。
スタッフから「それ終わってる」のように、リマインド対象の中の1件が対応済みだと伝えるメッセージが届きます。
以下の候補リストと、スタッフのメッセージを照らし合わせて、該当する車両のvehicleIdを1つだけ判定してください。
名前や車種名が明示されていなくても、直前の文脈上1件しか該当しないと考えられる場合は、その1件を選んでください。
複数該当しうる場合や、どれにも該当しないと判断した場合はnullにしてください。

候補リスト:
${list}

スタッフのメッセージ: 「${message}」

必ずJSONのみで回答してください。
{
  "vehicleId": 0
}
          `,
        },
      ],
    });

    const json = JSON.parse(this.extractJsonText(response.text ?? '{}'));
    const vehicleId = Number(json.vehicleId);

    if (!vehicleId) return null;

    return candidates.some((c) => c.vehicleId === vehicleId) ? vehicleId : null;
  }

  private extractJsonText(text: string) {
    text = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start >= 0 && end >= 0) {
      text = text.substring(start, end + 1);
    }

    return text;
  }
}