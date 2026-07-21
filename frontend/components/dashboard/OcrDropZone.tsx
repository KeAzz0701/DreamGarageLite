// frontend/components/dashboard/OcrDropZone.tsx

'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onSelect(file: File): void;
}

export default function OcrDropZone({
  onSelect,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [drag, setDrag] =
    useState(false);

  const [fileName, setFileName] =
    useState('');

  const open = () => {
    inputRef.current?.click();
  };

  const select = useCallback(
    (file: File) => {
      setFileName(file.name);
      onSelect(file);
    },
    [onSelect],
  );

  return (
    <div>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*,.pdf,.heic"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          select(file);
        }}
      />

      <button
        onClick={open}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files[0];
          if (!file) return;
          select(file);
        }}
        className={`dropzone w-full ${drag ? 'drag' : ''}`}
      >
        <span className="biguploadicon">📄</span>
        <span className="disp text-xl">車検証をここへドラッグ</span>
        <span className="text-[var(--muted)]">またはクリックして選択</span>
        <span className="text-xs text-[var(--muted)]">
          JPG / PNG / PDF / HEIC対応
        </span>

        {fileName && (
          <div className="mt-4 rounded bg-[var(--paper-dim)] px-4 py-2 font-semibold text-[var(--ok)]">
            {fileName}
          </div>
        )}
      </button>
    </div>
  );
}
