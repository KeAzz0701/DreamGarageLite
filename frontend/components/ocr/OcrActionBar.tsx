// frontend/components/ocr/OcrActionBar.tsx

'use client';

interface Props {
  loading: boolean;
  hasResult: boolean;
  onAnalyze: () => void;
  onSave: () => void;
  onClear: () => void;
  onPdf?: () => void;
}

export default function OcrActionBar({
  loading,
  hasResult,
  onAnalyze,
  onSave,
  onClear,
  onPdf,
}: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="grid grid-cols-4 gap-4 p-6">

        <button
          disabled={loading}
          onClick={onAnalyze}
          className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Gemini解析中...' : 'OCR開始'}
        </button>

        <button
          disabled={!hasResult || loading}
          onClick={onSave}
          className="rounded-xl bg-green-600 p-4 font-bold text-white transition hover:bg-green-700 disabled:bg-gray-400"
        >
          保存
        </button>

        <button
          disabled={!hasResult}
          onClick={onPdf}
          className="rounded-xl bg-orange-500 p-4 font-bold text-white transition hover:bg-orange-600 disabled:bg-gray-400"
        >
          PDF出力
        </button>

        <button
          onClick={onClear}
          className="rounded-xl bg-gray-700 p-4 font-bold text-white transition hover:bg-gray-800"
        >
          リセット
        </button>

      </div>

    </div>
  );
}