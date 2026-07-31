// frontend/lib/vehicleCategory.ts

export type VehicleCategory = 'KEI' | 'REGULAR' | 'LARGE' | 'CARGO';

/**
 * 車検証データ(排気量・用途・車両重量)から車両区分を推測する。
 * あくまで見積作成時の初期値としての自動記入用で、断定できない場合はREGULAR(普通乗用)に倒し、
 * スタッフが手動で修正できる前提にする(誤った法定費用区分での見積を避けるため過信しない)。
 */
export function inferVehicleCategory(vehicle: {
  displacement?: string | number | null;
  usage?: string | null;
  vehicleWeight?: string | number | null;
} | null | undefined): VehicleCategory {
  if (!vehicle) return 'REGULAR';

  const usage = vehicle.usage ?? '';
  if (usage.includes('貨物')) return 'CARGO';

  const displacement = Number(vehicle.displacement) || 0;
  if (displacement > 0 && displacement <= 660) return 'KEI';

  if (usage.includes('特殊') || usage.includes('特種')) return 'LARGE';

  const weight = Number(vehicle.vehicleWeight) || 0;
  if (weight >= 8000) return 'LARGE';

  return 'REGULAR';
}
