// frontend/components/estimate/EstimateItemRow.tsx

'use client';

export interface EstimateItemDraft {
  name: string;
  quantity: string;
  unitPrice: string;
  isFee: boolean;
}

export function emptyEstimateItem(): EstimateItemDraft {
  return { name: '', quantity: '1', unitPrice: '', isFee: false };
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
  const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

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
        min={1}
        placeholder="数量"
        value={item.quantity}
        onChange={(e) => onChange({ quantity: e.target.value })}
      />
      <input
        className="input"
        type="number"
        step="100"
        placeholder="単価(円)"
        value={item.unitPrice}
        onChange={(e) => onChange({ unitPrice: e.target.value })}
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
