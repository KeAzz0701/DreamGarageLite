// frontend/components/ocr/OcrPreview.tsx

'use client';

interface Props {
  image?: string;
  loading: boolean;
  confidence?: number;
}

export default function OcrPreview({
  image,
  loading,
  confidence,
}: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          車検証プレビュー
        </h2>

      </div>

      <div className="p-6">

        {!image && !loading && (

          <div className="flex h-[500px] items-center justify-center rounded-xl border-2 border-dashed text-gray-400">

            画像を選択してください

          </div>

        )}

        {loading && (

          <div className="flex h-[500px] flex-col items-center justify-center">

            <div className="h-20 w-20 animate-spin rounded-full border-8 border-blue-200 border-t-blue-600" />

            <div className="mt-6 text-xl font-bold">

              Gemini解析中...

            </div>

          </div>

        )}

        {image && !loading && (

          <img
            src={image}
            className="max-h-[650px] w-full rounded-xl border object-contain"
            alt="車検証"
          />

        )}

      </div>

      {confidence !== undefined && !loading && (

        <div className="border-t p-6">

          <div className="flex justify-between">

            <span className="font-semibold">
              AI信頼度
            </span>

            <span className="font-bold">

              {confidence.toFixed(1)}%

            </span>

          </div>

          <div className="mt-3 h-4 overflow-hidden rounded-full bg-gray-200">

            <div
              className={`h-full transition-all ${
                confidence >= 95
                  ? 'bg-green-600'
                  : confidence >= 85
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{
                width: `${confidence}%`,
              }}
            />

          </div>

        </div>

      )}

    </div>
  );
}