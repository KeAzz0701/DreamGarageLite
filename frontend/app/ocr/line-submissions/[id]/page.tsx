// frontend/app/ocr/line-submissions/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

type VehicleOption = {
  id: number;
  carName: string | null;
  commonModelName: string | null;
  registrationNumber: string | null;
};

type Submission = {
  id: number;
  mimeType: string;
  imageBase64: string;
  extractedData: Record<string, any>;
  customer: { id: number; customerName: string; vehicles: VehicleOption[] };
};

export default function LineOcrSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const json = await api<Submission>(`/ocr/line-submissions/${params.id}`);
      setSubmission(json);
      setResult(json.extractedData);
    } catch {
      setSubmission(null);
    }
  }

  async function save() {
    if (!submission || !result) return;

    setSaving(true);

    try {
      await api('/ocr/register', {
        method: 'POST',
        body: JSON.stringify({
          ...result,
          customerId: submission.customer.id,
          vehicleId: vehicleId || undefined,
          submissionId: submission.id,
        }),
      });

      alert('登録しました');
      router.push('/ocr/line-submissions');
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function dismiss() {
    if (!submission) return;

    setDismissing(true);

    try {
      await api(`/ocr/line-submissions/${submission.id}/dismiss`, { method: 'POST' });
      router.push('/ocr/line-submissions');
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setDismissing(false);
    }
  }

  if (!submission || !result) {
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="disp text-3xl">車検証の確認</h1>
          <Link href="/ocr/line-submissions" className="btn btn-ghost">
            戻る
          </Link>
        </div>
        <div className="empty">読み込み中、または見つかりませんでした。</div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">車検証の確認</h1>

        <Link href="/ocr/line-submissions" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel">
        <div className="kicker mono text-xs text-[var(--muted)] mb-2">
          {submission.customer.customerName}様から届いた画像
        </div>

        <img
          src={`data:${submission.mimeType};base64,${submission.imageBase64}`}
          className="rounded border border-[var(--line)] max-h-[500px]"
        />

        {submission.customer.vehicles.length > 0 && (
          <label className="field-label mt-4 block">
            既存の車両に紐づける(任意。選ばなければ車台番号で自動判定)
            <select
              className="input"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">選択しない(車台番号で自動判定)</option>
              {submission.customer.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.carName, v.commonModelName].filter(Boolean).join(' ') || '車両'}（
                  {v.registrationNumber ?? '登録番号未登録'}）
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? '登録中...' : '登録する'}
          </button>

          <button onClick={dismiss} disabled={dismissing} className="btn btn-ghost">
            {dismissing ? '破棄中...' : '破棄する'}
          </button>
        </div>
      </div>

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
    </>
  );
}
