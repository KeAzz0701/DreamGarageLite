// frontend/app/ocr/page.tsx

'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { api, upload, extractErrorMessage } from '@/lib/api';

type CompetitorMatch = {
  vehicleId: number;
  customerId: number;
  customerName: string;
  vehicleLabel: string;
  registrationNumber: string | null;
};

type CompetitorLookup = {
  extracted: {
    documentType?: 'estimate' | 'shaken_certificate' | 'other';
    shopName?: string;
    estimateDate?: string;
    registrationNumber?: string;
    items?: {
      name: string;
      cost: number;
      category: string;
      quantity?: number | null;
      unitPrice?: number | null;
      laborCost?: number | null;
      oilGrade?: string | null;
    }[];
    totalAmount?: number;
  };
  matches: CompetitorMatch[];
};

export default function OcrPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const estimateCameraInputRef = useRef<HTMLInputElement>(null);
  const estimateFileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [estimateFile, setEstimateFile] = useState<File | null>(null);
  const [estimatePreview, setEstimatePreview] = useState('');
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateSaving, setEstimateSaving] = useState(false);
  const [estimateLookup, setEstimateLookup] = useState<CompetitorLookup | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  function resetEstimate() {
    setEstimateFile(null);
    setEstimatePreview('');
    setEstimateLookup(null);
    setSelectedVehicleId(null);
  }

  function selectEstimateFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];

    if (!f) return;

    resetEstimate();
    setEstimateFile(f);
    setEstimatePreview(URL.createObjectURL(f));
  }

  async function analyzeEstimate() {
    if (!estimateFile) return;

    setEstimateLoading(true);

    try {
      const json: CompetitorLookup = await upload('/ocr/competitor-estimate-lookup', estimateFile);
      setEstimateLookup(json);
      setSelectedVehicleId(json.matches.length === 1 ? json.matches[0].vehicleId : null);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setEstimateLoading(false);
    }
  }

  async function saveEstimate() {
    if (!estimateFile || !estimateLookup || !selectedVehicleId) return;

    setEstimateSaving(true);

    try {
      await upload('/ocr/competitor-estimate-save', estimateFile, {
        vehicleId: String(selectedVehicleId),
        extracted: JSON.stringify(estimateLookup.extracted),
      });

      alert('保存しました');
      resetEstimate();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setEstimateSaving(false);
    }
  }

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
    <div className="ocr-shell">
      <div className="ocr-header flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">車検証OCR</h1>

        <div className="flex gap-2">
          <Link href="/ocr/line-submissions" className="btn btn-blue">
            📩 LINEで届いた車検証
          </Link>
          <Link href="/" className="btn btn-ghost">
            戻る
          </Link>
        </div>
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

      <div className="ocr-header mt-6 mb-3">
        <h2 className="disp text-xl">見積書OCR</h2>
        <p className="note mt-1">
          他店舗の見積書を撮影・アップロードすると、記載のナンバーから車両を自動検索して紐付けます。
        </p>
      </div>

      <div className="panel">
        <input
          ref={estimateCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={selectEstimateFile}
        />

        <input
          ref={estimateFileInputRef}
          type="file"
          accept="image/*,.pdf,.heic"
          className="hidden"
          onChange={selectEstimateFile}
        />

        {!estimatePreview && (
          <div className="grid2">
            <button
              onClick={() => estimateCameraInputRef.current?.click()}
              className="btn btn-primary justify-center py-6 text-base"
            >
              📷 カメラで撮影
            </button>

            <button
              onClick={() => estimateFileInputRef.current?.click()}
              className="btn btn-blue justify-center py-6 text-base"
            >
              🖼 写真・ファイルから選ぶ
            </button>
          </div>
        )}

        {estimatePreview && (
          <>
            <img
              src={estimatePreview}
              className="rounded border border-[var(--line)] max-h-[500px]"
            />

            <div className="mt-3">
              <button onClick={resetEstimate} className="btn btn-ghost btn-sm">
                ✕ 選び直す
              </button>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={analyzeEstimate}
            disabled={estimateLoading || !estimateFile}
            className="btn btn-primary"
          >
            {estimateLoading ? '解析中...' : 'OCR開始'}
          </button>

          <button
            onClick={saveEstimate}
            disabled={
              !estimateLookup ||
              !selectedVehicleId ||
              estimateSaving ||
              (estimateLookup.extracted.documentType != null &&
                estimateLookup.extracted.documentType !== 'estimate')
            }
            className="btn btn-dark"
          >
            {estimateSaving ? '保存中...' : 'この車両に紐付けて保存'}
          </button>
        </div>
      </div>

      {estimateLookup && estimateLookup.extracted.documentType === 'shaken_certificate' && (
        <div className="panel mt-4">
          <div className="empty">
            この画像は見積書ではなく車検証のようです。上の「車検証OCR」をご利用ください。
          </div>
        </div>
      )}

      {estimateLookup && estimateLookup.extracted.documentType === 'other' && (
        <div className="panel mt-4">
          <div className="empty">見積書として読み取れませんでした。別の画像をお試しください。</div>
        </div>
      )}

      {estimateLookup &&
        (!estimateLookup.extracted.documentType || estimateLookup.extracted.documentType === 'estimate') && (
        <div className="panel mt-4">
          <h2 className="disp text-xl mb-3">解析結果</h2>

          <div className="text-sm space-y-1 mb-4">
            <div>店舗名: {estimateLookup.extracted.shopName || '(不明)'}</div>
            <div>見積日: {estimateLookup.extracted.estimateDate || '(不明)'}</div>
            <div>
              ナンバー:{' '}
              {estimateLookup.extracted.registrationNumber || '(読み取れませんでした)'}
            </div>
            <div>合計: ¥{(estimateLookup.extracted.totalAmount ?? 0).toLocaleString()}</div>
          </div>

          {(estimateLookup.extracted.items ?? []).length > 0 && (
            <div className="mb-4 space-y-1">
              {estimateLookup.extracted.items!.map((it, i) => (
                <div key={i} className="flex justify-between text-xs bg-[var(--paper-dim)] rounded px-2 py-1.5">
                  <span>
                    {it.name}
                    <span className="ml-2 text-[var(--muted)]">{it.category}</span>
                    {it.oilGrade && <span className="ml-2 text-[var(--muted)]">{it.oilGrade}</span>}
                    {it.quantity != null && <span className="ml-2 text-[var(--muted)]">{it.quantity}L</span>}
                    {it.unitPrice != null && (
                      <span className="ml-2 text-[var(--muted)]">単価¥{Number(it.unitPrice).toLocaleString()}/L</span>
                    )}
                    {it.laborCost != null && (
                      <span className="ml-2 text-[var(--muted)]">工賃¥{Number(it.laborCost).toLocaleString()}</span>
                    )}
                  </span>
                  <span className="mono font-semibold">¥{Number(it.cost).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {estimateLookup.matches.length === 0 ? (
            <div className="empty">
              一致する車両が見つかりませんでした。対象の車両ページから直接「他店舗見積」としてアップロードしてください。
            </div>
          ) : (
            <div>
              <div className="field-label mb-2">紐付ける車両を選択</div>
              <div className="space-y-2">
                {estimateLookup.matches.map((m) => (
                  <label
                    key={m.vehicleId}
                    className="veh flex items-center gap-2"
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="radio"
                      name="competitor-match"
                      checked={selectedVehicleId === m.vehicleId}
                      onChange={() => setSelectedVehicleId(m.vehicleId)}
                    />
                    <span>
                      <span className="font-semibold">{m.customerName}</span>
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {m.vehicleLabel}（{m.registrationNumber}）
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}