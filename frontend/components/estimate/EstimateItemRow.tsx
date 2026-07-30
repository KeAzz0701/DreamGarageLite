// frontend/components/estimate/EstimateItemRow.tsx

'use client';

export interface EstimateItemDraft {
  name: string;
  quantity: string;
  unitPrice: string;
  laborCost: string;
  isFee: boolean;
}

export function emptyEstimateItem(): EstimateItemDraft {
  return { name: '', quantity: '1', unitPrice: '', laborCost: '', isFee: false };
}

/** 工賃項目のひな形。数量欄を工数(時間)として使い、単価には保存済みの時間単価を入れておく */
export function laborEstimateItem(hourlyRate: number | null | undefined): EstimateItemDraft {
  return {
    name: '工賃',
    quantity: '1',
    unitPrice: hourlyRate ? String(hourlyRate) : '',
    laborCost: '',
    isFee: false,
  };
}

export function EstimateItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: EstimateItemDraft;
  onChange: (patch: Partial<EstimateItemDraft>) => void;
  onRemove: () => void;
}) {
  const subtotal =
    (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0);

  return (
    <div className="shitemrow-detail">
      <input
        className="input"
        placeholder="項目名"
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <input
        className="input"
        type="number"
        min={0}
        step="0.5"
        placeholder="数量(工賃は工数)"
        value={item.quantity}
        onChange={(e) => onChange({ quantity: e.target.value })}
      />
      <input
        className="input"
        type="number"
        step="100"
        placeholder="部品代 単価(円)"
        value={item.unitPrice}
        onChange={(e) => onChange({ unitPrice: e.target.value })}
      />
      <input
        className="input"
        type="number"
        step="100"
        placeholder="技術料(円)"
        value={item.laborCost}
        onChange={(e) => onChange({ laborCost: e.target.value })}
      />
      <div className="subtotal">¥{subtotal.toLocaleString()}</div>
      <label className="fee-toggle">
        <input
          type="checkbox"
          checked={item.isFee}
          onChange={(e) => onChange({ isFee: e.target.checked })}
        />
        手数料
      </label>
      <button className="btn-icon" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}
