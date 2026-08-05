// frontend/components/estimate/PrintItemsTable.tsx

export interface PrintItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  laborCost: number;
  cost: number;
  isFee: boolean;
}

const TAX_RATE = 0.1;

/**
 * 法定費用・手数料(重量税・自賠責保険料・印紙代等)は消費税の課税対象外のため、
 * 整備項目(部品代・技術料)のみを消費税の計算対象にする
 */
export function calcPrintTotals(items: PrintItem[]) {
  const feeItems = items.filter((i) => i.isFee);
  const workItems = items.filter((i) => !i.isFee);
  const feeSubtotal = feeItems.reduce((s, i) => s + i.cost, 0);
  const workSubtotal = workItems.reduce((s, i) => s + i.cost, 0);
  const tax = Math.round(workSubtotal * TAX_RATE);
  const grandTotal = feeSubtotal + workSubtotal + tax;

  return { feeItems, workItems, feeSubtotal, workSubtotal, tax, grandTotal };
}

/** 法定費用・手数料(重量税・自賠責保険料・印紙代・検査代行手数料等)。金額は定額のため
 *  部品代・技術料の内訳は持たず、ディーラー見積書のような枠付きの簡易リストで見せる */
export function LegalFeeBox({ items }: { items: PrintItem[] }) {
  const subtotal = items.reduce((s, i) => s + i.cost, 0);

  return (
    <div className="print-legalfee-box">
      <div className="print-legalfee-title">
        法定費用・手数料<span className="print-legalfee-note">(消費税対象外)</span>
      </div>
      {items.map((item) => (
        <div key={item.id} className="print-legalfee-row">
          <span>{item.name}</span>
          <span>¥{item.cost.toLocaleString()}</span>
        </div>
      ))}
      <div className="print-legalfee-row print-legalfee-total">
        <span>小計</span>
        <span>¥{subtotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function WorkItemsTable({
  items,
  label,
  totalRowLabel = '小計',
}: {
  items: PrintItem[];
  label?: string;
  totalRowLabel?: string;
}) {
  const subtotal = items.reduce((s, i) => s + i.cost, 0);

  return (
    <>
      {label && <div className="print-worktable-label">{label}</div>}
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

/** 法定費用(非課税)と整備項目(消費税10%)を分けた、税抜小計・消費税・税込合計の内訳ボックス */
export function PrintTotalsBox({
  feeSubtotal,
  workSubtotal,
  tax,
  grandTotal,
  totalRowLabel = '合計',
}: {
  feeSubtotal: number;
  workSubtotal: number;
  tax: number;
  grandTotal: number;
  totalRowLabel?: string;
}) {
  return (
    <div className="print-grandtotal-box">
      {feeSubtotal > 0 && (
        <div className="print-grandtotal-row">
          <span>法定費用・手数料(非課税)</span>
          <span>¥{feeSubtotal.toLocaleString()}</span>
        </div>
      )}
      <div className="print-grandtotal-row">
        <span>整備項目 小計(税抜)</span>
        <span>¥{workSubtotal.toLocaleString()}</span>
      </div>
      <div className="print-grandtotal-row">
        <span>消費税(10%)</span>
        <span>¥{tax.toLocaleString()}</span>
      </div>
      <div className="print-grandtotal-row print-grandtotal-final">
        <span>{totalRowLabel}</span>
        <span>¥{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

/** 車検の法定費用・手数料と、それ以外の整備項目を分けて表示する(分ける必要が無ければ1つの表にまとめる)
 *  税区分を問わない単純な内訳が欲しい場面(赤黒伝票など)向けの、後方互換の簡易版 */
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
        <LegalFeeBox items={feeItems} />
        <WorkItemsTable items={workItems} label="整備項目" />
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
    return <LegalFeeBox items={feeItems} />;
  }

  return <WorkItemsTable items={items} totalRowLabel={totalRowLabel} />;
}
