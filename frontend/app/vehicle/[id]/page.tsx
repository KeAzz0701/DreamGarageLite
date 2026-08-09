// frontend/app/vehicle/[id]/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, apiBaseUrl, extractErrorMessage, upload } from '@/lib/api';
import {
  EstimateItemRow,
  emptyEstimateItem,
  laborEstimateItem,
  type EstimateItemDraft,
} from '@/components/estimate/EstimateItemRow';
import { inferVehicleCategory } from '@/lib/vehicleCategory';

type EstimateCategory = 'GENERAL' | 'SHAKEN' | 'INSPECTION_12M' | 'INSPECTION_6M' | 'WARRANTY';

const ESTIMATE_CATEGORY_OPTIONS: { value: EstimateCategory; label: string }[] = [
  { value: 'GENERAL', label: '一般整備' },
  { value: 'SHAKEN', label: '車検整備' },
  { value: 'INSPECTION_12M', label: '12ヶ月点検' },
  { value: 'INSPECTION_6M', label: '6ヶ月点検' },
  { value: 'WARRANTY', label: '保証整備' },
];

const ESTIMATE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ESTIMATE_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

const DOCUMENT_TYPES = [
  {
    key: 'continuation',
    label: '継続検査申請書(車検)',
    icon: '🔧',
    fields: ['registrationNumber', 'vin', 'carName', 'commonModelName', 'ownerName', 'ownerAddress', 'expirationDate'],
  },
  {
    key: 'transfer',
    label: '名義変更(移転登録)',
    icon: '📝',
    fields: ['registrationNumber', 'vin', 'ownerName', 'ownerAddress', 'userName', 'userAddress'],
  },
  {
    key: 'used-new',
    label: '中古新規登録',
    icon: '🚗',
    fields: ['vin', 'carName', 'commonModelName', 'model', 'engineModel', 'ownerName', 'ownerAddress', 'usageBase'],
  },
  {
    key: 'deregistration',
    label: '抹消登録',
    icon: '🗑',
    fields: ['registrationNumber', 'vin', 'ownerName', 'ownerAddress'],
  },
] as const;

const FIELD_LABELS: Record<string, string> = {
  registrationNumber: '登録番号',
  vin: '車台番号',
  carName: '車名',
  commonModelName: '車種名',
  model: '型式',
  engineModel: '原動機の型式',
  ownerName: '所有者',
  ownerAddress: '所有者住所',
  userName: '使用者',
  userAddress: '使用者住所',
  usageBase: '使用の本拠の位置',
  expirationDate: '車検有効期限',
};

const FIELD_GROUPS = [
  {
    title: '基本情報',
    fields: [
      ['registrationNumber', '登録番号'],
      ['vin', '車台番号'],
      ['carName', '車名'],
      ['commonModelName', '車種名'],
      ['model', '型式'],
      ['engineModel', '原動機の型式'],
      ['modelCode', '型式指定番号'],
      ['classificationCode', '類別区分番号'],
    ],
  },
  {
    title: '所有者・使用者',
    fields: [
      ['ownerName', '所有者'],
      ['ownerAddress', '所有者住所'],
      ['userName', '使用者'],
      ['userAddress', '使用者住所'],
      ['usageBase', '使用の本拠の位置'],
    ],
  },
  {
    title: '登録・有効期限',
    fields: [
      ['firstRegistration', '初度登録年月'],
      ['expirationDate', '車検有効期限'],
    ],
  },
  {
    title: '諸元',
    fields: [
      ['vehicleWeight', '車両重量'],
      ['grossWeight', '車両総重量'],
      ['seatingCapacity', '乗車定員'],
      ['maxLoad', '最大積載量'],
      ['length', '長さ(mm)'],
      ['width', '幅(mm)'],
      ['height', '高さ(mm)'],
      ['displacement', '総排気量'],
      ['fuel', '燃料の種類'],
    ],
  },
  {
    title: 'その他',
    fields: [
      ['usage', '用途'],
      ['privateBusiness', '自家用・事業用'],
      ['bodyType', '車体の形状'],
      ['remarks', '備考'],
    ],
  },
] as const;

const emptyItem = () => ({ name: '', cost: '' });

const TIRE_POSITIONS = [
  ['FL', '左前'],
  ['FR', '右前'],
  ['RL', '左後'],
  ['RR', '右後'],
  ['ALL', '4本一括'],
] as const;

const TIRE_TYPES = [
  ['SUMMER', '夏タイヤ'],
  ['WINTER', '冬タイヤ'],
] as const;

function tireTypeLabel(value: string): string {
  return TIRE_TYPES.find(([v]) => v === value)?.[1] ?? value;
}

function tireEstimateLabel(estimate: any): string {
  if (!estimate) return '';

  if (estimate.status === 'insufficient_data') {
    return `データ不足(現在 ${estimate.latestDepthMm}mm)`;
  }

  if (estimate.status === 'stable') {
    return `摩耗ほぼなし(現在 ${estimate.latestDepthMm}mm)`;
  }

  if (estimate.dangerNow) {
    return `⚠️ 交換時期です(現在 ${estimate.latestDepthMm}mm)`;
  }

  const unit = estimate.axis === 'mileage' ? 'km' : '日';
  return `推定交換時期まであと約${estimate.remainingToRecommended.toLocaleString()}${unit}(現在 ${estimate.latestDepthMm}mm)`;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [estimates, setEstimates] = useState<any[]>([]);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceMileage, setServiceMileage] = useState('');
  const [serviceCategory, setServiceCategory] = useState<string[]>([]);
  const [serviceItems, setServiceItems] = useState([emptyItem()]);

  const [correctingId, setCorrectingId] = useState<number | null>(null);
  const [correctionTitle, setCorrectionTitle] = useState('');
  const [correctionItems, setCorrectionItems] = useState<EstimateItemDraft[]>([]);
  const [correctionVisibleInPortal, setCorrectionVisibleInPortal] = useState(true);
  const [correcting, setCorrecting] = useState(false);

  const [tireData, setTireData] = useState<{ measurements: any[]; estimates: any[] }>({
    measurements: [],
    estimates: [],
  });
  const [showTireForm, setShowTireForm] = useState(false);
  const [editingTireId, setEditingTireId] = useState<number | null>(null);
  const [tireDate, setTireDate] = useState('');
  const [tirePosition, setTirePosition] = useState('FL');
  const [tireType, setTireType] = useState('SUMMER');
  const [tireIsNew, setTireIsNew] = useState(false);
  const [tireDepth, setTireDepth] = useState('');
  const [tireMileage, setTireMileage] = useState('');
  const [tireNote, setTireNote] = useState('');

  const [competitorEstimates, setCompetitorEstimates] = useState<any[]>([]);
  const [uploadingCompetitor, setUploadingCompetitor] = useState(false);

  const [officialDocCategories, setOfficialDocCategories] = useState<
    { category: string; documents: { id: string; label: string; description: string; hasAutofill: boolean }[] }[]
  >([]);
  const [officialDocBundles, setOfficialDocBundles] = useState<
    { id: string; label: string; description: string; documents: { id: string; label: string; hasAutofill: boolean }[] }[]
  >([]);
  const [openOfficialDocCategories, setOfficialDocCategoriesOpen] = useState<Set<string>>(new Set());

  const [selectedDocType, setSelectedDocType] = useState<(typeof DOCUMENT_TYPES)[number]['key'] | null>(null);

  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [estimateTitle, setEstimateTitle] = useState('');
  const [estimateItems, setEstimateItems] = useState<EstimateItemDraft[]>([
    emptyEstimateItem(),
  ]);
  const [estimateCategory, setEstimateCategory] = useState<EstimateCategory>('GENERAL');
  const [estimateStaffName, setEstimateStaffName] = useState('');
  const [estimateVehicleCategory, setEstimateVehicleCategory] = useState('REGULAR');
  const [suggesting, setSuggesting] = useState(false);
  const [laborRatePerHour, setLaborRatePerHour] = useState<number | null>(null);

  useEffect(() => {
    load();
    loadEstimates();
    loadLaborRate();
    loadTireData();
    loadCompetitorEstimates();
    loadOfficialDocuments();
  }, []);

  async function loadOfficialDocuments() {
    try {
      const [categories, bundles] = await Promise.all([
        api<typeof officialDocCategories>('/official-documents'),
        api<typeof officialDocBundles>('/official-documents/bundles'),
      ]);
      setOfficialDocCategories(categories);
      setOfficialDocBundles(bundles);
    } catch (e: any) {
      // 公的書類は補助機能のため、失敗しても他の画面利用を妨げない
      console.warn('公的書類一覧の取得に失敗しました', e);
    }
  }

  function toggleOfficialDocCategory(category: string) {
    setOfficialDocCategoriesOpen((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function openOfficialDocument(documentId: string, hasAutofill: boolean, label: string) {
    if (!hasAutofill) {
      // 自動入力対応の無い書類は、確認するまでもない白紙PDFなのでそのままダウンロードさせる
      window.open(`${apiBaseUrl()}/official-documents/${documentId}/blank`, '_blank');
      return;
    }

    router.push(
      `/vehicle/${params.id}/official-documents/${documentId}?autofill=1&label=${encodeURIComponent(label)}`,
    );
  }

  function openOfficialDocumentBundle(bundleId: string, label: string) {
    router.push(
      `/vehicle/${params.id}/official-documents/bundle/${bundleId}?label=${encodeURIComponent(label)}`,
    );
  }

  async function loadLaborRate() {
    try {
      const company = await api<any>('/company');
      if (!company) return;
      const settings = await api<any>(`/settings/${company.id}`);
      setLaborRatePerHour(settings?.laborRatePerHour ?? null);
    } catch {}
  }

  async function load() {
    try {
      const json = await api<any>(`/vehicle/${params.id}`);

      if (!json) {
        setNotFound(true);
        return;
      }

      setVehicle(json);
    } catch {
      setNotFound(true);
    }
  }

  async function loadEstimates() {
    try {
      const json = await api<any[]>(`/vehicle/${params.id}/estimates`);
      setEstimates(json);
    } catch {}
  }

  async function saveServiceHistory() {
    try {
      await api(`/vehicle/${params.id}/service-history`, {
        method: 'POST',
        body: JSON.stringify({
          date: serviceDate || new Date().toISOString().slice(0, 10),
          title: serviceTitle,
          mileage: serviceMileage ? Number(serviceMileage) : undefined,
          category: serviceCategory,
          items: serviceItems.filter((i) => i.name.trim()),
        }),
      });

      setShowServiceForm(false);
      setServiceDate('');
      setServiceTitle('');
      setServiceMileage('');
      setServiceCategory([]);
      setServiceItems([emptyItem()]);
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function deleteServiceHistory(id: number) {
    await api(`/service-history/${id}`, { method: 'DELETE' });
    await load();
  }

  async function loadTireData() {
    try {
      const json = await api<{ measurements: any[]; estimates: any[] }>(
        `/vehicle/${params.id}/tire-measurement`,
      );
      setTireData(json);
    } catch {}
  }

  function openTireCorrection(m: any) {
    setEditingTireId(m.id);
    setTireDate(m.date.slice(0, 10));
    setTirePosition(m.position);
    setTireType(m.tireType ?? 'SUMMER');
    setTireIsNew(!!m.isNewTire);
    setTireDepth(String(m.treadDepthMm));
    setTireMileage(m.mileage != null ? String(m.mileage) : '');
    setTireNote(m.note ?? '');
    setShowTireForm(true);
  }

  function closeTireForm() {
    setShowTireForm(false);
    setEditingTireId(null);
    setTireDate('');
    setTirePosition('FL');
    setTireType('SUMMER');
    setTireIsNew(false);
    setTireDepth('');
    setTireMileage('');
    setTireNote('');
  }

  async function saveTireMeasurement() {
    if (!tireDate || !tireDepth) return;

    try {
      const body = JSON.stringify({
        date: tireDate,
        position: tirePosition,
        tireType,
        isNewTire: tireIsNew,
        treadDepthMm: Number(tireDepth),
        mileage: tireMileage ? Number(tireMileage) : undefined,
        note: tireNote || undefined,
      });

      if (editingTireId) {
        await api(`/tire-measurement/${editingTireId}`, { method: 'PATCH', body });
      } else {
        await api(`/vehicle/${params.id}/tire-measurement`, { method: 'POST', body });
      }

      closeTireForm();
      await loadTireData();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function deleteTireMeasurement(id: number) {
    await api(`/tire-measurement/${id}`, { method: 'DELETE' });
    await loadTireData();
  }

  async function loadCompetitorEstimates() {
    try {
      const json = await api<any[]>(`/vehicle/${params.id}/competitor-estimate`);
      setCompetitorEstimates(json);
    } catch {}
  }

  async function uploadCompetitorEstimate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingCompetitor(true);

    try {
      await upload(`/vehicle/${params.id}/competitor-estimate`, file);
      await loadCompetitorEstimates();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setUploadingCompetitor(false);
    }
  }

  async function deleteCompetitorEstimate(id: number) {
    await api(`/competitor-estimate/${id}`, { method: 'DELETE' });
    await loadCompetitorEstimates();
  }

  function openCorrection(sh: any) {
    setCorrectingId(sh.id);
    setCorrectionTitle(sh.title);
    setCorrectionItems(
      sh.items.map((it: any) => ({
        name: it.name,
        quantity: String(it.quantity ?? 1),
        unitPrice: String(it.unitPrice ?? it.cost ?? 0),
        laborCost: it.laborCost ? String(it.laborCost) : '',
        isFee: !!it.isFee,
      })),
    );
    setCorrectionVisibleInPortal(true);
  }

  function updateCorrectionItem(index: number, patch: Partial<EstimateItemDraft>) {
    setCorrectionItems((items) =>
      items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  async function saveCorrection() {
    if (!correctingId) return;

    setCorrecting(true);

    try {
      await api(`/service-history/${correctingId}/correct`, {
        method: 'POST',
        body: JSON.stringify({
          title: correctionTitle,
          items: correctionItems
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name,
              quantity: Number(i.quantity) || 1,
              unitPrice: Number(i.unitPrice) || 0,
              laborCost: Number(i.laborCost) || 0,
              isFee: i.isFee,
            })),
          visibleInPortal: correctionVisibleInPortal,
        }),
      });

      setCorrectingId(null);
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setCorrecting(false);
    }
  }

  async function saveEstimate() {
    try {
      await api(`/vehicle/${params.id}/estimates`, {
        method: 'POST',
        body: JSON.stringify({
          title: estimateTitle,
          category: estimateCategory,
          staffName: estimateStaffName,
          items: estimateItems
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name,
              quantity: Number(i.quantity) || 1,
              unitPrice: Number(i.unitPrice) || 0,
              laborCost: Number(i.laborCost) || 0,
              isFee: i.isFee,
            })),
        }),
      });

      setShowEstimateForm(false);
      setEstimateTitle('');
      setEstimateStaffName('');
      setEstimateCategory('GENERAL');
      setEstimateItems([emptyEstimateItem()]);
      await loadEstimates();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function suggestShakenItems() {
    setSuggesting(true);

    try {
      const result = await api<{ items: any[]; note: string }>(
        `/vehicle/${params.id}/estimates/suggest-shaken-items`,
        {
          method: 'POST',
          body: JSON.stringify({ vehicleCategory: estimateVehicleCategory }),
        },
      );

      setEstimateItems(
        result.items.map((i) => ({
          name: i.name,
          quantity: String(i.quantity ?? 1),
          unitPrice: i.unitPrice ? String(i.unitPrice) : '',
          laborCost: i.laborCost ? String(i.laborCost) : '',
          isFee: i.isFee ?? true,
        })),
      );

      if (!estimateTitle) setEstimateTitle('車検見積');

      if (result.note) {
        alert(`AIによる概算メモ:\n${result.note}`);
      }
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function deleteEstimate(id: number) {
    await api(`/estimates/${id}`, { method: 'DELETE' });
    await loadEstimates();
  }

  async function convertEstimate(id: number) {
    await api(`/estimates/${id}/convert-to-service-history`, {
      method: 'POST',
    });

    alert('整備履歴に登録しました');
    await load();
    await loadEstimates();
  }

  async function convertAndPrint(id: number) {
    // ポップアップブロック対策のため、クリック直後(await前)に同期的に空タブを開いておく。
    // 変換すると見積は削除されるため、見積側の印刷ページを開くと削除と競合して
    // 読み込みが止まってしまう。変換後にできる整備履歴(納品書・請求書)の方へ
    // 後から遷移させる。
    const win = window.open('', '_blank');

    try {
      const serviceHistory = await api<{ id: number }>(
        `/estimates/${id}/convert-to-service-history`,
        { method: 'POST' },
      );

      await load();
      await loadEstimates();

      if (win) {
        win.location.href = `/vehicle/${params.id}/print?tab=invoice&historyId=${serviceHistory.id}`;
      }
    } catch (e: any) {
      win?.close();
      alert(extractErrorMessage(e));
    }
  }

  function updateServiceItem(index: number, field: 'name' | 'cost', value: string) {
    setServiceItems((items) =>
      items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }

  function updateEstimateItem(index: number, patch: Partial<EstimateItemDraft>) {
    setEstimateItems((items) =>
      items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function update(key: string, value: string) {
    setVehicle((prev: any) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);

    try {
      await api(`/vehicle/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(vehicle),
      });

      await load();
      alert('車両情報を保存しました');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api(`/vehicle/${params.id}`, { method: 'DELETE' });
    router.replace('/vehicle');
  }

  if (notFound) {
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="disp text-3xl">車両詳細</h1>
          <Link href="/vehicle" className="btn btn-ghost">
            戻る
          </Link>
        </div>
        <div className="empty">この車両は見つかりませんでした。</div>
      </>
    );
  }

  if (!vehicle) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  return (
    <div className="vehicle-detail-shell">
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">車両詳細</h1>

        <div className="flex gap-2">
          {vehicle.customer && (
            <Link
              href={`/reservations?customerId=${vehicle.customer.id}&vehicleId=${params.id}`}
              className="btn btn-blue"
            >
              📅 予約する
            </Link>
          )}
          <Link href="/vehicle" className="btn btn-ghost">
            戻る
          </Link>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="text-xs text-[var(--muted)]">所有者</div>
        {vehicle.customer ? (
          <Link
            href={`/customers/${vehicle.customer.id}`}
            className="cname disp text-xl text-[var(--blue)]"
          >
            {vehicle.customer.customerName}
          </Link>
        ) : (
          <div className="cname disp text-xl">未登録</div>
        )}
      </div>

      <div className="panel">
        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="fieldgroup mb-5">
            <div className="grouptitle text-xs font-semibold border-b border-[var(--line)] pb-1 mb-3">
              {group.title}
            </div>

            <div className="grid2 vehicle-fields-grid">
              {group.fields.map(([key, label]) => (
                <label key={key} className="field-label">
                  {label}
                  <input
                    className="input"
                    value={vehicle[key] ?? ''}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? '保存中...' : '💾 保存する'}
          </button>

          {confirmDelete ? (
            <>
              <button onClick={remove} className="btn btn-danger">
                削除する
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost"
              >
                やめる
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-ghost"
            >
              🗑 削除
            </button>
          )}
        </div>
      </div>

      <div className="panel mt-4">
        <h2 className="disp text-xl mb-1">📋 公的書類作成</h2>
        <p className="note mb-3 text-xs text-[var(--muted)]">
          プレビュー版です。実際の様式(国交省・地域の運輸支局等の最新テンプレート)はまだ組み込んでおらず、
          どの車両データを転記する想定かを確認いただくための画面です。
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {DOCUMENT_TYPES.map((doc) => (
            <button
              key={doc.key}
              onClick={() => setSelectedDocType(doc.key === selectedDocType ? null : doc.key)}
              className={`btn btn-sm ${selectedDocType === doc.key ? 'btn-blue' : 'btn-ghost'}`}
            >
              {doc.icon} {doc.label}
            </button>
          ))}
        </div>

        {selectedDocType && (() => {
          const doc = DOCUMENT_TYPES.find((d) => d.key === selectedDocType)!;

          return (
            <div className="veh">
              <div className="font-semibold mb-2">{doc.icon} {doc.label} に転記予定のデータ</div>
              <div className="text-sm space-y-1">
                {doc.fields.map((field) => (
                  <div key={field} className="flex justify-between">
                    <span className="text-[var(--muted)]">{FIELD_LABELS[field] ?? field}</span>
                    <span className="mono">{vehicle[field] || '(未入力)'}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="panel mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="disp text-xl">整備履歴</h2>
          <div className="flex gap-2">
            <Link href={`/vehicle/${params.id}/print`} className="btn btn-primary btn-sm">
              🧾 売上表・納品書/請求書を印刷
            </Link>
            {!showServiceForm && (
              <button
                onClick={() => setShowServiceForm(true)}
                className="btn btn-blue btn-sm"
              >
                ➕ 記録を追加
              </button>
            )}
          </div>
        </div>

        {showServiceForm && (
          <div className="veh mb-3">
            <div className="grid2">
              <label className="field-label">
                日付
                <input
                  type="date"
                  className="input"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </label>
              <label className="field-label">
                作業内容
                <input
                  className="input"
                  placeholder="例: 車検、オイル交換"
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                />
              </label>
              <label className="field-label">
                走行距離(km・任意)
                <input
                  type="number"
                  className="input"
                  placeholder="例: 45000"
                  value={serviceMileage}
                  onChange={(e) => setServiceMileage(e.target.value)}
                />
              </label>
              <div className="field-label">
                分類(任意・複数選択可・リマインド判定に使用)
                <div className="flex gap-3 flex-wrap mt-1">
                  {['オイル交換', 'タイヤ交換', '車検', '一般整備'].map((c) => (
                    <label key={c} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={serviceCategory.includes(c)}
                        onChange={(e) =>
                          setServiceCategory((prev) =>
                            e.target.checked
                              ? [...prev, c]
                              : prev.filter((x) => x !== c),
                          )
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="kicker mono mt-3 text-xs text-[var(--muted)]">項目</div>
            {serviceItems.map((item, i) => (
              <div key={i} className="shitemrow">
                <input
                  className="input"
                  placeholder="項目名"
                  value={item.name}
                  onChange={(e) => updateServiceItem(i, 'name', e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="費用(円)"
                  value={item.cost}
                  onChange={(e) => updateServiceItem(i, 'cost', e.target.value)}
                />
                <button
                  className="btn-icon"
                  onClick={() =>
                    setServiceItems((items) => items.filter((_, idx) => idx !== i))
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => setServiceItems((items) => [...items, emptyItem()])}
              className="btn-dashed"
            >
              ➕ 項目を追加
            </button>

            <div className="btnrow flex gap-2 mt-3">
              <button onClick={saveServiceHistory} className="btn btn-blue btn-sm">
                記録する
              </button>
              <button
                onClick={() => setShowServiceForm(false)}
                className="btn btn-ghost btn-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {(vehicle.serviceHistories ?? []).length === 0 ? (
          <div className="empty">整備履歴はまだありません。</div>
        ) : (
          vehicle.serviceHistories.map((sh: any) => {
            const total = sh.items.reduce((s: number, i: any) => s + i.cost, 0);
            return (
              <div key={sh.id} className={`veh mb-2 ${sh.voided ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="mono text-xs text-[var(--muted)]">
                      {sh.date.slice(0, 10)}
                    </span>{' '}
                    <span
                      className="font-semibold"
                      style={sh.voided ? { textDecoration: 'line-through' } : undefined}
                    >
                      {sh.title}
                    </span>
                    {(sh.category ?? []).map((c: string) => (
                      <span key={c} className="expbadge ml-2">{c}</span>
                    ))}
                    {sh.mileage != null && (
                      <span className="mono text-xs text-[var(--muted)] ml-2">
                        {sh.mileage.toLocaleString()}km
                      </span>
                    )}
                    {sh.voided && (
                      <span className="expbadge exp-warn ml-2">🔴 訂正済み(赤伝)</span>
                    )}
                    {sh.correctedFromId && (
                      <span className="expbadge ml-2">⚫ 訂正後(黒伝)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="mono text-[var(--blue)] font-bold"
                      style={sh.voided ? { textDecoration: 'line-through' } : undefined}
                    >
                      ¥{total.toLocaleString()}
                    </span>
                    {!sh.voided && (
                      <button
                        className="btn-icon"
                        title="訂正する"
                        onClick={() => openCorrection(sh)}
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      onClick={() => deleteServiceHistory(sh.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {sh.items.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                    {sh.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.name}</span>
                        <span className="mono">¥{it.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {correctingId === sh.id && (
                  <div className="mt-3 pt-3 border-t border-dashed border-[var(--line)]">
                    <div className="kicker mono text-xs text-[var(--muted)] mb-2">
                      訂正内容(黒伝として新規登録し、元の行は赤伝として残ります)
                    </div>

                    <label className="field-label mb-2 block">
                      作業内容
                      <input
                        className="input"
                        value={correctionTitle}
                        onChange={(e) => setCorrectionTitle(e.target.value)}
                      />
                    </label>

                    {correctionItems.map((item, i) => (
                      <EstimateItemRow
                        key={i}
                        item={item}
                        onChange={(patch) => updateCorrectionItem(i, patch)}
                        onRemove={() =>
                          setCorrectionItems((items) => items.filter((_, idx) => idx !== i))
                        }
                      />
                    ))}

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCorrectionItems((items) => [...items, emptyEstimateItem()])
                        }
                        className="btn-dashed"
                      >
                        ➕ 項目を追加
                      </button>
                      <button
                        onClick={() =>
                          setCorrectionItems((items) => [
                            ...items,
                            laborEstimateItem(laborRatePerHour),
                          ])
                        }
                        className="btn-dashed"
                      >
                        ➕ 工賃を追加
                      </button>
                    </div>

                    <label className="field-label mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={correctionVisibleInPortal}
                        onChange={(e) => setCorrectionVisibleInPortal(e.target.checked)}
                      />
                      訂正後の内容を顧客ポータルに表示する
                    </label>

                    <div className="btnrow flex gap-2 mt-3">
                      <button
                        onClick={saveCorrection}
                        disabled={correcting}
                        className="btn btn-primary btn-sm"
                      >
                        {correcting ? '訂正中...' : '訂正を確定する'}
                      </button>
                      <button
                        onClick={() => setCorrectingId(null)}
                        className="btn btn-ghost btn-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="panel mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="disp text-xl">タイヤ溝測定</h2>
          {!showTireForm && (
            <button
              onClick={() => setShowTireForm(true)}
              className="btn btn-blue btn-sm"
            >
              ➕ 記録を追加
            </button>
          )}
        </div>

        <p className="note mb-3 text-xs text-[var(--muted)]">
          測定結果は顧客ポータル(有料プラン)の「推定交換時期」表示に使われます。
        </p>

        {showTireForm && (
          <div className="veh mb-3">
            <div className="grid2">
              <label className="field-label">
                測定日
                <input
                  type="date"
                  className="input"
                  value={tireDate}
                  onChange={(e) => setTireDate(e.target.value)}
                />
              </label>
              <label className="field-label">
                位置
                <select
                  className="input"
                  value={tirePosition}
                  onChange={(e) => setTirePosition(e.target.value)}
                >
                  {TIRE_POSITIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                夏/冬
                <select
                  className="input"
                  value={tireType}
                  onChange={(e) => setTireType(e.target.value)}
                >
                  {TIRE_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                残り溝の深さ(mm)
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  placeholder="例: 4.5"
                  value={tireDepth}
                  onChange={(e) => setTireDepth(e.target.value)}
                />
              </label>
              <label className="field-label">
                走行距離(km・任意)
                <input
                  type="number"
                  className="input"
                  placeholder="例: 45000"
                  value={tireMileage}
                  onChange={(e) => setTireMileage(e.target.value)}
                />
              </label>
            </div>

            <label className="field-label mt-2 block">
              メモ(任意)
              <input
                className="input"
                value={tireNote}
                onChange={(e) => setTireNote(e.target.value)}
              />
            </label>

            <label className="field-label mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={tireIsNew}
                onChange={(e) => setTireIsNew(e.target.checked)}
              />
              🆕 このタイミングで新品タイヤに交換した
            </label>

            <div className="btnrow flex gap-2 mt-3">
              <button onClick={saveTireMeasurement} className="btn btn-blue btn-sm">
                {editingTireId ? '訂正する' : '記録する'}
              </button>
              <button
                onClick={closeTireForm}
                className="btn btn-ghost btn-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {tireData.estimates.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tireData.estimates.map((e: any) => (
              <span key={`${e.position}-${e.tireType}`} className="expbadge">
                {TIRE_POSITIONS.find(([v]) => v === e.position)?.[1] ?? e.position}
                ・{tireTypeLabel(e.tireType)}: {tireEstimateLabel(e.estimate)}
              </span>
            ))}
          </div>
        )}

        {tireData.measurements.length === 0 ? (
          <div className="empty">タイヤ測定の記録はまだありません。</div>
        ) : (
          tireData.measurements.map((m: any) => (
            <div key={m.id} className="veh mb-2 flex justify-between items-center">
              <div>
                <span className="mono text-xs text-[var(--muted)]">{m.date.slice(0, 10)}</span>{' '}
                <span className="font-semibold">
                  {TIRE_POSITIONS.find(([v]) => v === m.position)?.[1] ?? m.position}
                </span>{' '}
                <span className="expbadge">{tireTypeLabel(m.tireType)}</span>{' '}
                {m.isNewTire && <span className="expbadge exp-ok">🆕 新品</span>}{' '}
                <span className="mono">{m.treadDepthMm}mm</span>
                {m.mileage != null && (
                  <span className="mono text-xs text-[var(--muted)] ml-2">
                    {m.mileage.toLocaleString()}km
                  </span>
                )}
                {m.note && <span className="ml-2 text-xs text-[var(--muted)]">{m.note}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn-icon"
                  title="訂正する"
                  onClick={() => openTireCorrection(m)}
                >
                  ✏️
                </button>
                <button className="btn-icon" onClick={() => deleteTireMeasurement(m.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="disp text-xl">他店舗見積(比較用)</h2>
          <label className="btn btn-blue btn-sm" style={{ cursor: 'pointer' }}>
            {uploadingCompetitor ? '解析中...' : '📷 見積を撮影・アップロード'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={uploadCompetitorEstimate}
              disabled={uploadingCompetitor}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <p className="note mb-3 text-xs text-[var(--muted)]">
          お客様が他店舗で受け取った見積書を撮影すると、AIが金額・項目を自動で読み取ります。ここで登録したものは顧客ポータルにも表示されます。
        </p>

        {competitorEstimates.length === 0 ? (
          <div className="empty">登録された他店舗見積はまだありません。</div>
        ) : (
          competitorEstimates.map((c) => (
            <div key={c.id} className="veh mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold">{c.shopName || '店舗名不明'}</span>
                  {c.estimateDate && (
                    <span className="ml-2 mono text-xs text-[var(--muted)]">{c.estimateDate}</span>
                  )}
                  <span className="expbadge ml-2">
                    {c.createdBy === 'CUSTOMER' ? 'お客様提供' : 'スタッフ登録'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {c.totalAmount != null && (
                    <span className="mono text-[var(--blue)] font-bold">
                      ¥{Number(c.totalAmount).toLocaleString()}
                    </span>
                  )}
                  <button className="btn-icon" onClick={() => deleteCompetitorEstimate(c.id)}>
                    🗑
                  </button>
                </div>
              </div>
              {Array.isArray(c.items) && c.items.length > 0 && (
                <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                  {c.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.name}</span>
                      {it.cost != null && <span className="mono">¥{Number(it.cost).toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {officialDocCategories.length > 0 && (
        <div className="panel mt-4">
          <h2 className="disp text-xl mb-1">公的書類</h2>
          <p className="note mb-3">
            車検・登録・車庫証明などの公的様式です。対応している書類は氏名・住所等をこの車両の情報で自動入力して印刷できます。
          </p>

          {officialDocBundles.length > 0 && (
            <div className="mb-4">
              <div className="field-label mb-2">手続き別に必要な書類を一括印刷</div>
              <div className="grid2">
                {officialDocBundles.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => openOfficialDocumentBundle(b.id, b.label)}
                    className="veh text-left"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="font-semibold">🖨 {b.label}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">{b.description}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {b.documents.map((d) => d.label).join('・')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field-label mb-2">書類ごとに個別に印刷</div>
          {officialDocCategories.map((cat) => {
            const isOpen = openOfficialDocCategories.has(cat.category);

            return (
              <div key={cat.category} className="feerate-category mb-2">
                <div
                  className="feerate-category-head"
                  onClick={() => toggleOfficialDocCategory(cat.category)}
                >
                  <span className="feerate-category-title">
                    {cat.category.replace(/^\d+_/, '')}
                    <span className="feerate-count">{cat.documents.length}</span>
                  </span>
                  <span className={`feerate-chevron ${isOpen ? 'is-open' : ''}`} aria-hidden>
                    ▾
                  </span>
                </div>

                {isOpen && (
                  <div className="feerate-category-body">
                    {cat.documents.map((d) => (
                      <div key={d.id} className="minirow">
                        <span className="l">
                          {d.label}
                          {d.hasAutofill && <span className="expbadge exp-ok ml-2">自動入力対応</span>}
                          <div className="text-xs text-[var(--muted)]">{d.description}</div>
                        </span>
                        <span className="r">
                          <button
                            type="button"
                            onClick={() => openOfficialDocument(d.id, d.hasAutofill, d.label)}
                            className="btn btn-ghost btn-sm"
                          >
                            {d.hasAutofill ? '🖨 この車両の情報で印刷' : '📄 白紙をダウンロード'}
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="panel mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="disp text-xl">見積書</h2>
          {!showEstimateForm && (
            <button
              onClick={() => {
                setShowEstimateForm(true);
                setEstimateVehicleCategory(inferVehicleCategory(vehicle));
              }}
              className="btn btn-blue btn-sm"
            >
              ➕ 見積を作成
            </button>
          )}
        </div>

        {showEstimateForm && (
          <div className="veh mb-3">
            <div className="grid2">
              <label className="field-label">
                件名
                <input
                  className="input"
                  placeholder="例: 車検見積"
                  value={estimateTitle}
                  onChange={(e) => setEstimateTitle(e.target.value)}
                />
              </label>

              <label className="field-label">
                担当
                <input
                  className="input"
                  placeholder="担当者名"
                  value={estimateStaffName}
                  onChange={(e) => setEstimateStaffName(e.target.value)}
                />
              </label>

              <label className="field-label">
                分類
                <select
                  className="input"
                  value={estimateCategory}
                  onChange={(e) =>
                    setEstimateCategory(e.target.value as EstimateCategory)
                  }
                >
                  {ESTIMATE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {estimateCategory === 'SHAKEN' && (
                <label className="field-label">
                  車両区分
                  <select
                    className="input"
                    value={estimateVehicleCategory}
                    onChange={(e) => setEstimateVehicleCategory(e.target.value)}
                  >
                    <option value="KEI">軽自動車</option>
                    <option value="REGULAR">普通乗用</option>
                    <option value="LARGE">大型・特殊</option>
                    <option value="CARGO">貨物自動車</option>
                  </select>
                </label>
              )}
            </div>

            {estimateCategory === 'SHAKEN' && (
              <button
                onClick={suggestShakenItems}
                disabled={suggesting}
                className="btn btn-primary btn-sm mt-3"
              >
                {suggesting ? 'AIが算出中...' : '🤖 AIで自動入力(重量税など)'}
              </button>
            )}

            <div className="kicker mono mt-3 text-xs text-[var(--muted)]">項目</div>
            {estimateItems.map((item, i) => (
              <EstimateItemRow
                key={i}
                item={item}
                onChange={(patch) => updateEstimateItem(i, patch)}
                onRemove={() =>
                  setEstimateItems((items) => items.filter((_, idx) => idx !== i))
                }
              />
            ))}

            <div className="flex gap-2">
              <button
                onClick={() => setEstimateItems((items) => [...items, emptyEstimateItem()])}
                className="btn-dashed"
              >
                ➕ 項目を追加
              </button>
              <button
                onClick={() =>
                  setEstimateItems((items) => [...items, laborEstimateItem(laborRatePerHour)])
                }
                className="btn-dashed"
              >
                ➕ 工賃を追加
              </button>
            </div>

            <div className="btnrow flex gap-2 mt-3">
              <button onClick={saveEstimate} className="btn btn-blue btn-sm">
                作成する
              </button>
              <button
                onClick={() => setShowEstimateForm(false)}
                className="btn btn-ghost btn-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {estimates.length === 0 ? (
          <div className="empty">見積書はまだありません。</div>
        ) : (
          estimates.map((es) => {
            const total = es.items.reduce((s: number, i: any) => s + i.cost, 0);
            return (
              <div key={es.id} className="veh mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="mono text-xs text-[var(--muted)]">
                      {es.date.slice(0, 10)}
                    </span>{' '}
                    <span className="font-semibold">{es.title}</span>
                    {es.category && es.category !== 'GENERAL' && (
                      <span className="expbadge exp-warn ml-2">
                        {ESTIMATE_CATEGORY_LABEL[es.category] ?? es.category}
                      </span>
                    )}
                    {es.staffName && (
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        担当: {es.staffName}
                      </span>
                    )}
                  </div>
                  <span className="mono text-[var(--blue)] font-bold">
                    ¥{total.toLocaleString()}
                  </span>
                </div>

                {es.items.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                    {es.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          {it.name}
                          {it.isFee && <span className="ml-1">（手数料）</span>}
                          {it.quantity > 1 && (
                            <span className="ml-1">
                              × {it.quantity}（@¥{it.unitPrice.toLocaleString()}）
                            </span>
                          )}
                        </span>
                        <span className="mono">¥{it.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="btnrow flex gap-2 mt-2">
                  <button
                    onClick={() => convertAndPrint(es.id)}
                    className="btn btn-primary btn-sm"
                  >
                    ✅🖨 整備履歴に登録して印刷
                  </button>
                  <button
                    onClick={() => deleteEstimate(es.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    🗑 削除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
