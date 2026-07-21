// frontend/app/customer/[id]/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

const LINE_BASIC_ID = process.env.NEXT_PUBLIC_LINE_BASIC_ID;

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lineToken, setLineToken] = useState('');
  const [checking, setChecking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerAddress: '',
    phone: '',
  });

  useEffect(() => {
    loadCustomer();
  }, []);

  useEffect(() => {
    if (!customer || customer.lineUserId) return;

    // LINEでの操作後、手動でブラウザに戻ってきたときに自動で連携状態を反映する
    const interval = setInterval(() => {
      checkLineStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [customer]);

  async function loadCustomer() {
    const json = await api<any>(`/customer/${params.id}`);
    setCustomer(json);
    setForm({
      customerName: json.customerName ?? '',
      customerAddress: json.customerAddress ?? '',
      phone: json.phone ?? '',
    });

    if (!json.lineUserId) {
      const { token } = await api<{ token: string }>(
        `/customer/${params.id}/line-link`,
      );
      setLineToken(token);
    }
  }

  async function saveCustomer() {
    setSaving(true);

    try {
      await api(`/customer/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });

      setEditing(false);
      await loadCustomer();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function checkLineStatus() {
    setChecking(true);

    try {
      const json = await api<any>(`/customer/${params.id}`);
      setCustomer(json);
    } finally {
      setChecking(false);
    }
  }

  async function removeCustomer() {
    await api(`/customer/${params.id}`, { method: 'DELETE' });
    router.replace('/customers');
  }

  async function unlinkLine() {
    await api(`/customer/${params.id}/line-link`, { method: 'DELETE' });
    setConfirmUnlink(false);
    await loadCustomer();
  }

  if (!customer) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">顧客詳細</h1>

        <Link href="/customers" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel mb-4">
        {editing ? (
          <div className="grid2">
            <label className="field-label">
              顧客名
              <input
                className="input"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
            </label>

            <label className="field-label">
              電話番号
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>

            <label className="field-label col-span-2">
              住所
              <input
                className="input"
                value={form.customerAddress}
                onChange={(e) =>
                  setForm({ ...form, customerAddress: e.target.value })
                }
              />
            </label>
          </div>
        ) : (
          <div className="grid2">
            <div>
              <div className="text-xs text-[var(--muted)]">顧客名</div>
              <div className="cname disp text-xl">{customer.customerName}</div>
            </div>

            <div>
              <div className="text-xs text-[var(--muted)]">電話番号</div>
              <div>{customer.phone || '-'}</div>
            </div>

            <div className="col-span-2">
              <div className="text-xs text-[var(--muted)]">住所</div>
              <div>{customer.customerAddress}</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {editing ? (
            <>
              <button
                onClick={saveCustomer}
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving ? '保存中...' : '💾 保存する'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm({
                    customerName: customer.customerName ?? '',
                    customerAddress: customer.customerAddress ?? '',
                    phone: customer.phone ?? '',
                  });
                }}
                className="btn btn-ghost btn-sm"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="btn btn-blue btn-sm"
            >
              ✏️ 編集する
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-3">
          {confirmDelete ? (
            <>
              <span className="text-sm text-[var(--danger)] self-center">
                この顧客と紐づく個人情報を削除します（所有車両{customer.vehicles?.length ?? 0}台は残ります）。よろしいですか？
              </span>
              <button onClick={removeCustomer} className="btn btn-danger btn-sm">
                削除する
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost btn-sm"
              >
                やめる
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-ghost btn-sm"
            >
              🗑 この顧客(個人情報)を削除
            </button>
          )}
        </div>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">LINE連携</h2>

        {customer.lineUserId ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="badge-ok">✅ LINEと連携済みです。車検満了などの通知が届きます。</div>

            {confirmUnlink ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--danger)]">解除しますか？</span>
                <button onClick={unlinkLine} className="btn btn-danger btn-sm">
                  解除する
                </button>
                <button
                  onClick={() => setConfirmUnlink(false)}
                  className="btn btn-ghost btn-sm"
                >
                  やめる
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmUnlink(true)}
                className="btn btn-ghost btn-sm"
              >
                🔌 LINE連携を解除
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="note mb-3">
              下のQRコードをお客様のLINEで読み取っていただくと、友だち追加と連携コードの送信画面が開きます。あとは送信ボタンを押すだけで連携完了です。
            </p>

            {LINE_BASIC_ID ? (
              <div className="text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `https://line.me/R/oaMessage/${LINE_BASIC_ID}/?${lineToken}`,
                  )}`}
                  alt="LINE連携QRコード"
                  className="mx-auto"
                  style={{ width: 180, height: 180 }}
                />
                <div className="mono mt-2 text-sm">{lineToken}</div>
              </div>
            ) : (
              <div className="text-sm">
                連携コード：<span className="mono font-bold">{lineToken}</span>
                <p className="note mt-1">
                  （LINE公式アカウントのベーシックIDが未設定のため、QRコードは表示できません）
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={checkLineStatus}
                disabled={checking}
                className="btn btn-ghost btn-sm"
              >
                {checking ? '確認中...' : '🔄 今すぐ確認する'}
              </button>
              <span className="note">
                LINEで送信後、ブラウザに戻ると自動でも反映されます。
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="flex justify-between mb-5">
          <h2 className="disp text-xl">所有車両</h2>

          <Link href="/ocr" className="btn btn-blue">
            車検証OCR
          </Link>
        </div>

        <div>
          {customer.vehicles?.map((vehicle: any) => (
            <Link key={vehicle.id} href={`/vehicle/${vehicle.id}`} className="veh block mb-3">
              <div className="font-bold text-lg">
                {vehicle.carName || '-'}
                {vehicle.commonModelName && (
                  <span className="ml-2 text-[var(--blue)]">
                    {vehicle.commonModelName}
                  </span>
                )}
              </div>
              <div>{vehicle.registrationNumber}</div>
              <div className="text-sm mono text-[var(--muted)]">{vehicle.vin}</div>
              <div className="mt-2 text-sm">
                車検満了日：
                <span className="font-semibold">
                  {vehicle.expirationDate || '-'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}