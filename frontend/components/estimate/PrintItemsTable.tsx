// frontend/components/estimate/PrintItemsTable.tsx

interface PrintItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  isFee: boolean;
}

function ItemTable({
  items,
  label,
  totalRowLabel,
}: {
  items: PrintItem[];
  label?: string;
  totalRowLabel: string;
}) {
  const subtotal = items.reduce((s, i) => s + i.cost, 0);

  return (
    <>
      {label && <div className="text-xs font-semibold mt-4 mb-1">{label}</div>}
      <div className="print-table-wrap">
        <table className="print-table">
          <thead>
            <tr>
              <th>項目</th>
              <th style={{ width: 50, textAlign: 'center' }}>数量</th>
              <th style={{ width: 90, textAlign: 'right' }}>単価</th>
              <th style={{ width: 100, textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>¥{item.unitPrice.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>¥{item.cost.toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="font-bold">
                {totalRowLabel}
              </td>
              <td className="font-bold mono" style={{ textAlign: 'right' }}>
                ¥{subtotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/** 車検の法定費用・手数料と、それ以外の整備項目を分けて表示する(分ける必要が無ければ1つの表にまとめる) */
export function PrintItemsTable({
  items,
  totalRowLabel = '合計',
}: {
  items: PrintItem[];
  totalRowLabel?: string;
}) {
  const feeItems = items.filter((i) => i.isFee);
  const workItems = items.filter((i) => !i.isFee);
  const total = items.reduce((s, i) => s + i.cost, 0);

  if (feeItems.length > 0 && workItems.length > 0) {
    return (
      <>
        <ItemTable items={feeItems} label="法定費用・手数料" totalRowLabel="小計" />
        <ItemTable items={workItems} label="整備項目" totalRowLabel="小計" />
        <div
          className="flex justify-between mt-3 pt-2"
          style={{ borderTop: '2px solid #1e2023' }}
        >
          <span className="font-bold">{totalRowLabel}</span>
          <span className="font-bold mono">¥{total.toLocaleString()}</span>
        </div>
      </>
    );
  }

  return <ItemTable items={items} totalRowLabel={totalRowLabel} />;
}
