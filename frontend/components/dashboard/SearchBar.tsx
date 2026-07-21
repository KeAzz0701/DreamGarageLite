// frontend/components/dashboard/SearchBar.tsx

'use client';

import { useMemo, useState } from 'react';

interface Props {
  placeholder?: string;
  onSearch: (keyword: string) => void;
}

export default function SearchBar({
  placeholder = '顧客・車両・登録番号・車台番号で検索',
  onSearch,
}: Props) {
  const [keyword, setKeyword] = useState('');

  const count = useMemo(() => keyword.length, [keyword]);

  function clear() {
    setKeyword('');
    onSearch('');
  }

  return (
    <div className="panel">
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder={placeholder}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            onSearch(e.target.value);
          }}
        />

        <button onClick={clear} className="btn btn-ghost">
          クリア
        </button>
      </div>

      <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
        <span>リアルタイム検索</span>
        <span className="mono">{count}文字</span>
      </div>
    </div>
  );
}
