// frontend/components/settings/UserManagementCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  active: boolean;
}

interface Props {
  companyId: number;
  maxUsers: number;
}

export default function UserManagementCard({
  companyId,
  maxUsers,
}: Props) {
  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      `http://localhost:3001/api/user/company/${companyId}`,
    );

    if (!res.ok) return;

    setUsers(await res.json());
  }

  async function toggle(id: number) {
    setLoading(true);

    await fetch(
      `http://localhost:3001/api/user/${id}/toggle`,
      {
        method: 'PATCH',
      },
    );

    await load();

    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <div>

          <h2 className="text-2xl font-bold">
            ユーザー管理
          </h2>

          <div className="mt-2 text-gray-500">

            {users.length} / {
              maxUsers === 9999
                ? '∞'
                : maxUsers
            } 人利用中

          </div>

        </div>

        <button
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >
          ユーザー追加
        </button>

      </div>

      <div className="divide-y">

        {users.map((user) => (

          <div
            key={user.id}
            className="flex items-center justify-between p-5"
          >

            <div>

              <div className="font-bold">

                {user.name}

              </div>

              <div className="text-sm text-gray-500">

                {user.email}

              </div>

            </div>

            <div className="flex items-center gap-4">

              <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm">

                {user.role}

              </span>

              <button
                disabled={loading}
                onClick={() =>
                  toggle(user.id)
                }
                className={`rounded-lg px-4 py-2 text-white font-bold ${
                  user.active
                    ? 'bg-green-600'
                    : 'bg-red-600'
                }`}
              >
                {user.active
                  ? '有効'
                  : '無効'}
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}