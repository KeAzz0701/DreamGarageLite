// frontend/app/customers/[id]/line/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';
import { usePlanLimits } from '@/lib/usePlanLimits';

type Customer = {
  id: number;
  customerName: string;
  lineUserId: string | null;
};

type LineMessage = {
  id: number;
  direction: 'IN' | 'OUT';
  text: string;
  createdAt: string;
  lineOcrSubmissionId: number | null;
};

const POLL_INTERVAL_MS = 5000;

function OcrImageBubble({ submissionId }: { submissionId: number }) {
  const [image, setImage] = useState<{ imageBase64: string; mimeType: string } | null>(null);

  useEffect(() => {
    api<{ imageBase64: string; mimeType: string }>(`/ocr/line-submissions/${submissionId}`)
      .then(setImage)
      .catch(() => {});
  }, [submissionId]);

  if (!image) {
    return <div className="chat-bubble">[画像: 車検証OCR]</div>;
  }

  return (
    <img
      src={`data:${image.mimeType};base64,${image.imageBase64}`}
      className="rounded border border-[var(--line)]"
      style={{ maxWidth: 220, maxHeight: 220 }}
    />
  );
}

export default function CustomerLinePage() {
  const params = useParams();
  const customerId = params.id as string;
  const { limits, loaded } = usePlanLimits();
  const lineHistoryAllowed = limits ? limits.lineHistoryView : true;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<LineMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Customer>(`/customer/${customerId}`).then(setCustomer).catch(() => {});

    if (!loaded || !lineHistoryAllowed) return;

    loadMessages();
    api(`/customer/${customerId}/line-messages/mark-read`, { method: 'POST' }).catch(() => {});

    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [customerId, loaded, lineHistoryAllowed]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function loadMessages() {
    try {
      const data = await api<LineMessage[]>(`/customer/${customerId}/line-messages`);
      setMessages(data);
    } catch {
      // ポーリング失敗は静かに無視(次回リトライ)
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError('');

    try {
      await api(`/customer/${customerId}/line-message`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      setInput('');
      await loadMessages();
    } catch (e: any) {
      setError(extractErrorMessage(e) || '送信に失敗しました');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">
          💬 {customer?.customerName ?? ''}様とのLINEやり取り
        </h1>

        <Link href={`/customers/${customerId}`} className="btn btn-ghost">
          戻る
        </Link>
      </div>

      {loaded && !lineHistoryAllowed ? (
        <div className="panel">
          <div className="empty">
            LINEメッセージ履歴の閲覧はスタンダードプラン以上でご利用いただけます。
            <br />
            <Link href="/settings" className="btn btn-blue btn-sm mt-3 inline-flex">
              プランを確認する
            </Link>
          </div>
        </div>
      ) : customer && !customer.lineUserId ? (
        <div className="panel">
          <div className="empty">
            この顧客はまだLINE連携されていません。
            <br />
            <Link href={`/customers/${customerId}`} className="btn btn-blue btn-sm mt-3 inline-flex">
              連携用QRコードを表示する
            </Link>
          </div>
        </div>
      ) : (
        <div className="panel chat-shell">
          <div className="chat-log" ref={logRef}>
            {messages.length === 0 ? (
              <div className="empty">まだメッセージのやり取りがありません。</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`chat-bubble-row ${m.direction === 'OUT' ? 'user' : 'model'}`}
                >
                  {m.lineOcrSubmissionId ? (
                    <OcrImageBubble submissionId={m.lineOcrSubmissionId} />
                  ) : (
                    <div className="chat-bubble">{m.text}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {error && <div className="note mb-2" style={{ color: 'var(--red, #c0392b)' }}>{error}</div>}

          <div className="chat-input-bar">
            <textarea
              rows={1}
              placeholder="メッセージを入力..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button onClick={send} disabled={sending || !input.trim()} className="btn btn-primary">
              送信
            </button>
          </div>
        </div>
      )}
    </>
  );
}
