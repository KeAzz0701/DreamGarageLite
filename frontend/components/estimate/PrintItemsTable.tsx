// frontend/components/estimate/PrintItemsTable.tsx

interface PrintItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  laborCost: number;
  cost: number;
  isFee: boolean;
}

/** 法定費用・手数料(重量税・自賠責保険料・印紙代・検査代行手数料等)。金額は定額のため
 *  部品代・技術料の内訳は持たず、ディーラー見積書のような枠付きの簡易リストで見せる */
function LegalFeeBox({ items, totalRowLabel }: { items: PrintItem[]; totalRowLabel: string }) {
  const subtotal = items.reduce((s, i) => s + i.cost, 0);

  return (
    <div className="print-legalfee-box">
      <div className="print-legalfee-title">法定費用・手数料</div>
      {items.map((item) => (
        <div key={item.id} className="print-legalfee-row">
          <span>{item.name}</span>
          <span>¥{item.cost.toLocaleString()}</span>
        </div>
      ))}
      <div className="print-legalfee-row print-legalfee-total">
        <span>{totalRowLabel}</span>
        <span>¥{subtotal.toLocaleString()}</span>
      </div>
    </div>
  );
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
              <th style={{ width: 44, textAlign: 'center' }}>数量</th>
              <th style={{ width: 90, textAlign: 'right' }}>部品・油脂代</th>
              <th style={{ width: 80, textAlign: 'right' }}>技術料</th>
              <th style={{ width: 90, textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>
                  ¥{(item.quantity * item.unitPrice).toLocaleString()}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.laborCost ? `¥${item.laborCost.toLocaleString()}` : ''}
                </td>
                <td style={{ textAlign: 'right' }}>¥{item.cost.toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="font-bold">
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
        <LegalFeeBox items={feeItems} totalRowLabel="小計" />
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

  if (feeItems.length > 0) {
    return <LegalFeeBox items={feeItems} totalRowLabel={totalRowLabel} />;
  }

  return <ItemTable items={items} totalRowLabel={totalRowLabel} />;
}
