// frontend/app/ai-chat/page.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';

type ChatMessage = {
  id: number;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
};

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<ChatMessage[]>('/chat/messages')
      .then(setMessages)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError('');
    setLoading(true);

    try {
      const result = await api<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        '/chat/messages',
        {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        },
      );

      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
    } catch (e: any) {
      setError(extractErrorMessage(e) || 'AIの応答に失敗しました');
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="sectionhead">
        <h3>🤖 AIチャット</h3>
      </div>

      <p className="note mb-3">
        本日の予約や登録顧客の情報を踏まえて相談できます。整備内容の相談、見積の考え方、タスクの整理のほか、
        「見積の作り方は？」「料金表はどこで編集する？」のようなアプリの使い方もお気軽にお聞きください。
      </p>

      <div className="panel chat-shell">
        <div className="chat-log" ref={logRef}>
          {loadingHistory ? (
            <div className="empty">読み込み中...</div>
          ) : messages.length === 0 ? (
            <div className="empty">
              まだ会話がありません。「今日の予約はありますか？」のように話しかけてみてください。
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`chat-bubble-row ${m.role}`}>
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))
          )}

          {loading && (
            <div className="chat-bubble-row model">
              <div className="chat-bubble pending">考え中...</div>
            </div>
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
          <button onClick={send} disabled={loading || !input.trim()} className="btn btn-primary">
            送信
          </button>
        </div>
      </div>
    </>
  );
}
