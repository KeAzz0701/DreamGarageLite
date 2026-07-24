import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

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
          '整備内容の相談、見積の考え方、接客、一般的な業務相談に、丁寧で簡潔な日本語で答えてください。' +
          '不確かなことは断定せず、確認を促してください。\n\n' +
          `--- 現在参照できる業務データ ---\n${context}`,
      },
    });

    return response.text ?? '';
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