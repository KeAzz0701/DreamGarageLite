// frontend/app/vehicle/[id]/official-documents/bundle/[bundleId]/page.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiBlob, extractErrorMessage } from '@/lib/api';

export default function OfficialDocumentBundlePreviewPage() {
  const params = useParams<{ id: string; bundleId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const label = searchParams.get('label') || '公的書類一式';

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    apiBlob(`/vehicle/${params.id}/official-documents/bundles/${params.bundleId}`)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((e) => setError(extractErrorMessage(e) || 'PDFの読み込みに失敗しました'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [params.id, params.bundleId]);

  function handlePrint() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-2xl">{label}</h1>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn btn-ghost">
            戻る
          </button>
          <button onClick={handlePrint} disabled={!pdfUrl} className="btn btn-primary">
            🖨 印刷する
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {error && <div className="empty p-6">{error}</div>}

        {!error && !pdfUrl && <div className="empty p-6">読み込み中...</div>}

        {pdfUrl && (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={label}
            style={{ width: '100%', height: 'calc(100vh - 220px)', border: 0, minHeight: 500 }}
          />
        )}
      </div>
    </>
  );
}
