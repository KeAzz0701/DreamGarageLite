// frontend/app/ocr/page.tsx

'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { api, upload, extractErrorMessage } from '@/lib/api';

export default function OcrPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  function selectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];

    if (!f) return;

    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function analyze() {
    if (!file) return;

    setLoading(true);

    try {
      const json = await upload('/ocr/upload', file);
      setResult(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);

    try {
      await api('/ocr/register', {
        method: 'POST',
        body: JSON.stringify(result),
      });

      alert('保存しました');
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">車検証OCR</h1>

        <Link href="/" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={selectFile}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.heic"
          className="hidden"
          onChange={selectFile}
        />

        {!preview && (
          <div className="grid2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="btn btn-primary justify-center py-6 text-base"
            >
              📷 カメラで撮影
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-blue justify-center py-6 text-base"
            >
              🖼 写真・ファイルから選ぶ
            </button>
          </div>
        )}

        {!preview && (
          <p className="note mt-3">
            📷 カメラで撮影する場合は、車検証全体が枠内に収まるようにして撮影してください。
          </p>
        )}

        {preview && (
          <>
            <img
              src={preview}
              className="rounded border border-[var(--line)] max-h-[500px]"
            />

            <div className="mt-3">
              <button
                onClick={() => {
                  setFile(null);
                  setPreview('');
                  setResult(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                ✕ 選び直す
              </button>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={analyze}
            disabled={loading || !file}
            className="btn btn-primary"
          >
            {loading ? '解析中...' : 'OCR開始'}
          </button>

          <button
            onClick={save}
            disabled={!result || saving}
            className="btn btn-dark"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {result && (
        <div className="panel mt-4">
          <h2 className="disp text-xl mb-5">OCR確認</h2>

          <div className="grid2">
            {Object.keys(result).map((key) => (
              <label key={key} className="field-label">
                {key}
                <input
                  className="input"
                  value={result[key] ?? ''}
                  onChange={(e) =>
                    setResult({
                      ...result,
                      [key]: e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}