// frontend/app/reservations/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';

type Reservation = {
  id: number;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED';
  category: string | null;
  needsLoanerCar: boolean | null;
  scheduledStart: string;
  scheduledEnd: string;
  staffNote: string | null;
  declineReason: string | null;
  googleEventId: string | null;
  customer: { id: number; customerName: string } | null;
  vehicle: {
    id: number;
    carName: string | null;
    commonModelName: string | null;
    registrationNumber: string | null;
  } | null;
};

type BusinessHour = {
  weekday: number;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
};

type ClosedDate = {
  id: number;
  date: string;
  reason: string | null;
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]}) ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function vehicleLabel(vehicle: Reservation['vehicle']) {
  if (!vehicle) return '';
  return [vehicle.carName, vehicle.commonModelName].filter(Boolean).join(' ');
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    load();
    loadHours();
  }, []);

  async function load() {
    try {
      const json = await api<Reservation[]>('/reservation');
      setReservations(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function loadHours() {
    try {
      const [hoursJson, closedJson] = await Promise.all([
        api<BusinessHour[]>('/business-hours'),
        api<ClosedDate[]>('/business-hours/closed-dates'),
      ]);
      setHours(hoursJson);
      setClosedDates(closedJson);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function confirm(id: number) {
    try {
      await api(`/reservation/${id}/confirm`, { method: 'PATCH', body: JSON.stringify({}) });
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function decline(id: number) {
    const reason = prompt('お断りする理由(お客様への案内に使用します。任意)') ?? '';
    try {
      await api(`/reservation/${id}/decline`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function cancel(id: number) {
    if (!window.confirm('この予約をキャンセルしますか？')) return;
    try {
      await api(`/reservation/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function reschedule(r: Reservation) {
    const current = r.scheduledStart.slice(0, 16);
    const input = prompt('新しい日時を入力してください(YYYY-MM-DDTHH:mm)', current);
    if (!input) return;
    try {
      await api(`/reservation/${r.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledStart: input }),
      });
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  function updateHour(weekday: number, patch: Partial<BusinessHour>) {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)),
    );
  }

  async function saveHours() {
    setSavingHours(true);
    try {
      const json = await api<BusinessHour[]>('/business-hours', {
        method: 'PUT',
        body: JSON.stringify({ rows: hours }),
      });
      setHours(json);
      alert('営業時間を保存しました');
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSavingHours(false);
    }
  }

  async function addClosedDate() {
    if (!newClosedDate) return;
    try {
      await api('/business-hours/closed-dates', {
        method: 'POST',
        body: JSON.stringify({ date: newClosedDate, reason: newClosedReason || undefined }),
      });
      setNewClosedDate('');
      setNewClosedReason('');
      await loadHours();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function removeClosedDate(id: number) {
    await api(`/business-hours/closed-dates/${id}`, { method: 'DELETE' });
    await loadHours();
  }

  const pending = reservations.filter((r) => r.status === 'PENDING');
  const confirmed = reservations.filter((r) => r.status === 'CONFIRMED');
  const history = reservations.filter(
    (r) => r.status === 'DECLINED' || r.status === 'CANCELLED',
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">予約管理</h1>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">予約待ち（{pending.length}）</h2>

        {pending.length === 0 ? (
          <div className="empty">LINEからの予約リクエストはありません。</div>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="mono text-xs text-[var(--muted)]">{fmt(r.scheduledStart)}</span>{' '}
                  {r.category && <span className="expbadge exp-warn mr-2">{r.category}</span>}
                  {r.needsLoanerCar === true && (
                    <span className="expbadge exp-danger mr-2">🚗 代車必要</span>
                  )}
                  <span className="font-semibold">{r.customer?.customerName ?? '不明な顧客'}</span>
                  {r.vehicle && (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {vehicleLabel(r.vehicle)}（{r.vehicle.registrationNumber ?? '登録番号未登録'}）
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => confirm(r.id)} className="btn btn-blue btn-sm">
                    ✅ 確定
                  </button>
                  <button onClick={() => decline(r.id)} className="btn btn-ghost btn-sm">
                    ✕ 却下
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">確定済み（{confirmed.length}）</h2>

        {confirmed.length === 0 ? (
          <div className="empty">確定した予約はまだありません。</div>
        ) : (
          confirmed.map((r) => (
            <div key={r.id} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="mono text-xs text-[var(--muted)]">{fmt(r.scheduledStart)}</span>{' '}
                  {r.category && <span className="expbadge exp-warn mr-2">{r.category}</span>}
                  {r.needsLoanerCar === true && (
                    <span className="expbadge exp-danger mr-2">🚗 代車必要</span>
                  )}
                  <span className="font-semibold">{r.customer?.customerName ?? '不明な顧客'}</span>
                  {r.vehicle && (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {vehicleLabel(r.vehicle)}（{r.vehicle.registrationNumber ?? '登録番号未登録'}）
                    </span>
                  )}
                  {r.googleEventId && (
                    <span className="expbadge exp-warn ml-2">📅 Google同期済</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => reschedule(r)} className="btn btn-ghost btn-sm">
                    🕓 変更
                  </button>
                  <button onClick={() => cancel(r.id)} className="btn btn-ghost btn-sm">
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">履歴（{history.length}）</h2>

        {history.length === 0 ? (
          <div className="empty">却下・キャンセルされた予約はありません。</div>
        ) : (
          history.map((r) => (
            <div key={r.id} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="mono text-xs text-[var(--muted)]">{fmt(r.scheduledStart)}</span>{' '}
                  <span className="font-semibold">{r.customer?.customerName ?? '不明な顧客'}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {r.status === 'DECLINED' ? '却下' : 'キャンセル'}
                    {r.declineReason ? `：${r.declineReason}` : ''}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <h2 className="disp text-xl mb-3">営業時間・定休日</h2>

        <div className="fieldgroup mb-4">
          {hours.map((h) => (
            <div key={h.weekday} className="grid2 mb-2 items-center">
              <label className="field-label">
                <span className="font-semibold">{WEEKDAY_LABELS[h.weekday]}曜日</span>
                <span className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    checked={h.isClosed}
                    onChange={(e) => updateHour(h.weekday, { isClosed: e.target.checked })}
                  />
                  定休日
                </span>
              </label>

              {!h.isClosed && (
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="time"
                    className="input"
                    value={h.startTime ?? ''}
                    onChange={(e) => updateHour(h.weekday, { startTime: e.target.value })}
                  />
                  〜
                  <input
                    type="time"
                    className="input"
                    value={h.endTime ?? ''}
                    onChange={(e) => updateHour(h.weekday, { endTime: e.target.value })}
                  />
                  <span className="text-xs text-[var(--muted)] ml-2">休憩(任意)</span>
                  <input
                    type="time"
                    className="input"
                    value={h.breakStartTime ?? ''}
                    onChange={(e) => updateHour(h.weekday, { breakStartTime: e.target.value || null })}
                  />
                  〜
                  <input
                    type="time"
                    className="input"
                    value={h.breakEndTime ?? ''}
                    onChange={(e) => updateHour(h.weekday, { breakEndTime: e.target.value || null })}
                  />
                </div>
              )}
            </div>
          ))}

          <button onClick={saveHours} disabled={savingHours} className="btn btn-primary btn-sm mt-2">
            {savingHours ? '保存中...' : '💾 営業時間を保存'}
          </button>
        </div>

        <div className="kicker mono text-xs text-[var(--muted)] mb-2">臨時休業日</div>

        {closedDates.map((c) => (
          <div key={c.id} className="flex justify-between items-center mb-1">
            <span className="mono text-sm">
              {c.date.slice(0, 10)}
              {c.reason ? `（${c.reason}）` : ''}
            </span>
            <button onClick={() => removeClosedDate(c.id)} className="btn-icon">
              🗑
            </button>
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <input
            type="date"
            className="input"
            value={newClosedDate}
            onChange={(e) => setNewClosedDate(e.target.value)}
          />
          <input
            className="input flex-1"
            placeholder="理由(任意)"
            value={newClosedReason}
            onChange={(e) => setNewClosedReason(e.target.value)}
          />
          <button onClick={addClosedDate} className="btn btn-blue btn-sm">
            ➕ 追加
          </button>
        </div>
      </div>
    </>
  );
}
