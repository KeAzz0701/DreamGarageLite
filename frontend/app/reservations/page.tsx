// frontend/app/reservations/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

      {pending.length > 0 && (
      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">予約待ち（{pending.length}）</h2>

        {pending.map((r) => (
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
        ))}
      </div>
      )}

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">月間カレンダー（電話予約用）</h2>
        <MonthlyCalendarPanel />
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

type MonthDay = {
  date: string;
  isClosed: boolean;
  reservationCount: number;
  isFull: boolean;
};

type DaySlot = {
  start: string;
  end: string;
  label: string;
  occupied: boolean;
};

type CustomerOption = {
  id: number;
  customerName: string;
  vehicles: {
    id: number;
    carName: string | null;
    commonModelName: string | null;
    registrationNumber: string | null;
  }[];
};

function MonthlyCalendarPanel() {
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customerId');
  const prefillVehicleId = searchParams.get('vehicleId');

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [monthDays, setMonthDays] = useState<MonthDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<DaySlot[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [useManualName, setUseManualName] = useState(false);
  const [manualName, setManualName] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [staffNote, setStaffNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prefillLabel, setPrefillLabel] = useState('');

  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  useEffect(() => {
    api<CustomerOption[]>('/customer')
      .then(setCustomers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!prefillCustomerId) return;

    api<CustomerOption & { customerName: string }>(`/customer/${prefillCustomerId}`)
      .then((c) => {
        setSelectedCustomer(c);
        setPrefillLabel(`${c.customerName}様の予約を登録します`);
        if (prefillVehicleId) setSelectedVehicleId(prefillVehicleId);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCustomerId, prefillVehicleId]);

  async function loadMonth() {
    try {
      const json = await api<MonthDay[]>(
        `/reservation/month-overview?year=${viewYear}&month=${viewMonth}`,
      );
      setMonthDays(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedSlotStart(null);

    try {
      const json = await api<DaySlot[]>(`/reservation/day-slots?date=${dateStr}`);
      setDaySlots(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setDaySlots([]);
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setDaySlots([]);
  }

  const filteredCustomers = customerQuery.trim()
    ? customers.filter((c) => c.customerName.includes(customerQuery.trim()))
    : customers;

  async function submitBooking() {
    if (!selectedSlotStart) return;

    if (!useManualName && !selectedCustomer) {
      alert('顧客を選択するか、お名前を入力してください。');
      return;
    }

    if (useManualName && !manualName.trim()) {
      alert('お名前を入力してください。');
      return;
    }

    setSubmitting(true);

    try {
      await api('/reservation/manual', {
        method: 'POST',
        body: JSON.stringify({
          customerId: useManualName ? undefined : selectedCustomer?.id,
          customerName: useManualName ? manualName.trim() : undefined,
          vehicleId:
            !useManualName && selectedVehicleId ? Number(selectedVehicleId) : undefined,
          scheduledStart: selectedSlotStart,
          durationHours: Number(durationHours) || 1,
          staffNote: staffNote || undefined,
        }),
      });

      alert('予約を登録しました');
      setSelectedSlotStart(null);
      setManualName('');
      setStaffNote('');
      setDurationHours('1');
      await loadMonth();
      if (selectedDate) await selectDate(selectedDate);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  // 月初の曜日に合わせて先頭に空セルを入れ、カレンダーの列を揃える
  const firstDate = monthDays[0] ? new Date(`${monthDays[0].date}T00:00:00`) : null;
  const leadingBlanks = firstDate ? firstDate.getDay() : 0;

  return (
    <div>
      {prefillLabel && <div className="empty mb-2 text-left">👤 {prefillLabel}</div>}

      <div className="flex justify-between items-center mb-2">
        <button onClick={prevMonth} className="btn btn-ghost btn-sm">
          ← 前月
        </button>
        <div className="font-semibold">
          {viewYear}年{viewMonth}月
        </div>
        <button onClick={nextMonth} className="btn btn-ghost btn-sm">
          次月 →
        </button>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}
        className="mb-3"
      >
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-xs text-[var(--muted)]">
            {w}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {monthDays.map((d) => {
          const dayNum = Number(d.date.slice(-2));
          const isSelected = d.date === selectedDate;

          return (
            <button
              key={d.date}
              type="button"
              onClick={() => selectDate(d.date)}
              style={{
                border: isSelected ? '2px solid var(--blue)' : '1px solid #ddd',
                borderRadius: 6,
                padding: '6px 2px',
                background: d.isClosed ? '#f2f2f2' : '#fff',
                opacity: d.isClosed ? 0.6 : 1,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div className="text-sm">{dayNum}</div>
              {d.reservationCount > 0 && (
                <div className="text-xs text-[var(--blue)]">〇{d.reservationCount}</div>
              )}
              {d.isFull && <div className="text-xs text-[var(--danger)]">満</div>}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="veh mb-3">
          <div className="kicker mono text-xs text-[var(--muted)] mb-2">
            {selectedDate}の時間帯
          </div>

          {daySlots.length === 0 ? (
            <div className="empty">この日は営業時間外です。</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  disabled={s.occupied}
                  onClick={() => setSelectedSlotStart(s.start)}
                  className={`btn btn-sm ${selectedSlotStart === s.start ? 'btn-blue' : 'btn-ghost'}`}
                  style={s.occupied ? { opacity: 0.4 } : undefined}
                >
                  {s.label}
                  {s.occupied ? '(満)' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlotStart && (
        <div className="veh">
          <div className="kicker mono text-xs text-[var(--muted)] mb-2">
            {fmt(selectedSlotStart)}〜 の予約を登録
          </div>

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setUseManualName(false)}
              className={`btn btn-sm ${!useManualName ? 'btn-blue' : 'btn-ghost'}`}
            >
              既存顧客から選ぶ
            </button>
            <button
              type="button"
              onClick={() => setUseManualName(true)}
              className={`btn btn-sm ${useManualName ? 'btn-blue' : 'btn-ghost'}`}
            >
              名前を直接入力
            </button>
          </div>

          {useManualName ? (
            <label className="field-label mb-2">
              お客様のお名前
              <input
                className="input"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="例: 山田太郎"
              />
            </label>
          ) : (
            <>
              <label className="field-label mb-2">
                顧客検索
                <input
                  className="input"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="お名前で検索"
                />
              </label>

              <div style={{ maxHeight: 160, overflowY: 'auto' }} className="mb-2">
                {filteredCustomers.slice(0, 30).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setSelectedVehicleId('');
                    }}
                    className="minirow"
                    style={{
                      cursor: 'pointer',
                      background: selectedCustomer?.id === c.id ? '#eef4ff' : undefined,
                    }}
                  >
                    <span className="l">{c.customerName}</span>
                  </div>
                ))}
              </div>

              {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
                <label className="field-label mb-2">
                  車両(任意)
                  <select
                    className="input"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                  >
                    <option value="">未選択</option>
                    {selectedCustomer.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.carName, v.commonModelName].filter(Boolean).join(' ') || '車両'}
                        {v.registrationNumber ? `（${v.registrationNumber}）` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedCustomer && (
                <div className="text-xs text-[var(--muted)] mb-2">
                  選択中: {selectedCustomer.customerName}様
                </div>
              )}
            </>
          )}

          <label className="field-label mb-2">
            作業時間(時間)
            <input
              type="number"
              min="1"
              step="0.5"
              className="input"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
            />
          </label>

          <label className="field-label mb-3">
            メモ(任意)
            <input className="input" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} />
          </label>

          <button onClick={submitBooking} disabled={submitting} className="btn btn-primary">
            {submitting ? '登録中...' : '📅 この枠で予約を登録する'}
          </button>
        </div>
      )}
    </div>
  );
}
