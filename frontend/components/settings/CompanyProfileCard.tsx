// frontend/components/settings/CompanyProfileCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface Company {
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
}

interface Props {
  companyId: number;
}

export default function CompanyProfileCard({
  companyId,
}: Props) {
  const [company, setCompany] =
    useState<Company>({
      companyName: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
    });

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      `http://localhost:3001/api/company/${companyId}`,
    );

    if (!res.ok) return;

    setCompany(await res.json());
  }

  async function save() {
    setLoading(true);

    await fetch(
      `http://localhost:3001/api/company/${companyId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(company),
      },
    );

    setLoading(false);

    alert('会社情報を保存しました');
  }

  function update(
    key: keyof Company,
    value: string,
  ) {
    setCompany({
      ...company,
      [key]: value,
    });
  }

  return (
    <div className="panel">
      <h2 className="disp text-xl">会社情報</h2>

      <div className="mt-5 space-y-4">
        <label className="field-label">
          会社名
          <input
            className="input"
            value={company.companyName}
            onChange={(e) => update('companyName', e.target.value)}
          />
        </label>

        <label className="field-label">
          代表者
          <input
            className="input"
            value={company.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
          />
        </label>

        <div className="grid2">
          <label className="field-label">
            電話番号
            <input
              className="input"
              value={company.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </label>

          <label className="field-label">
            メール
            <input
              className="input"
              value={company.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </label>
        </div>

        <label className="field-label">
          住所
          <textarea
            rows={3}
            className="input"
            value={company.address}
            onChange={(e) => update('address', e.target.value)}
          />
        </label>

        <button disabled={loading} onClick={save} className="btn btn-primary w-full justify-center">
          {loading ? '保存中...' : '会社情報を保存'}
        </button>
      </div>
    </div>
  );
}
