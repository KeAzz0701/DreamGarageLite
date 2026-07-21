// frontend/hooks/useCompany.ts

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Company {
  id: number;
  companyName: string;

  license: {
    id: number;
    plan: 'FREE' | 'LITE' | 'STANDARD' | 'PRO';
    status: string;
    usedOcr: number;
    maxOcrPerMonth: number;
    maxUsers: number;
  };

  settings: {
    apiUrl: string;
    autoUpdate: boolean;
    backupEnabled: boolean;
    theme: string;
  };
}

export function useCompany() {
  const [company, setCompany] =
    useState<Company | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function reload() {
    try {
      setLoading(true);

      const data =
        await api<Company>('/company');

      setCompany(data);

      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return {
    company,
    loading,
    error,
    reload,
  };
}