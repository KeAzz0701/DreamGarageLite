// frontend/app/ocr/line-submissions/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';
import { normalizeForSearch } from '@/lib/kana';

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
  const [linkMode, setLinkMode] = useState<'submitter' | 'document'>('submitter');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const json = await api<Submission>(`/ocr/line-submissions/${params.id}`);
      setSubmission(json);
      setResult(json.extractedData);

      // 車検証データの氏名(所有者・使用者)が送信者本人の名前と食い違う場合は、
      // 誤って別人(家族・知人の車など)の車両を送信者に紐づけてしまわないよう、
      // 既定を「車検証データで紐づける」側にしておく
      const documentName = String(
        json.extractedData?.userName || json.extractedData?.ownerName || '',
      );
      const senderName = normalizeForSearch(json.customer.customerName);
      const matchesSender =
        !documentName || (senderName && normalizeForSearch(documentName).includes(senderName));

      setLinkMode(matchesSender ? 'submitter' : 'document');
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
          // 「車検証データで紐づける」を選んだ場合はcustomerIdを送らず、
          // 車検証の氏名・住所から顧客を検索/新規作成させる(送信者本人に強制紐づけしない)
          customerId: linkMode === 'submitter' ? submission.customer.id : undefined,
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

        <div className="field-label mt-4 block">
          この車両を誰に紐づけますか？
          <div className="mt-2 space-y-2">
            <label className="flex items-start gap-2 text-sm text-[var(--ink)]">
              <input
                type="radio"
                className="mt-1"
                checked={linkMode === 'submitter'}
                onChange={() => setLinkMode('submitter')}
              />
              <span>
                送信者本人に紐づける
                <span className="block text-xs text-[var(--muted)]">
                  {submission.customer.customerName} 様(この画像を送ってきたLINEアカウント)
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-[var(--ink)]">
              <input
                type="radio"
                className="mt-1"
                checked={linkMode === 'document'}
                onChange={() => {
                  setLinkMode('document');
                  setVehicleId('');
                }}
              />
              <span>
                車検証データの氏名に紐づける
                <span className="block text-xs text-[var(--muted)]">
                  {result.userName || result.ownerName || '(氏名未読み取り)'}
                  ／一致する既存顧客がいなければ新規に顧客登録されます
                </span>
              </span>
            </label>
          </div>

          {linkMode === 'document' && (
            <div className="note mt-2 text-xs text-[var(--danger)]">
              ⚠️ 車検証の氏名が送信者本人と異なるようです。ご家族・お知り合いの車両などの可能性があります。
            </div>
          )}
        </div>

        {linkMode === 'submitter' && submission.customer.vehicles.length > 0 && (
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
