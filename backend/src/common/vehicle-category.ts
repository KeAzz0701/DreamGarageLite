// backend/src/common/vehicle-category.ts

import { VehicleCategory } from '@prisma/client';

/**
 * 車検証データ(排気量・用途・車両重量)から車両区分を推測する。
 * frontend/lib/vehicleCategory.ts と同じロジック。断定できない場合はREGULARに倒す。
 */
export function inferVehicleCategory(
  vehicle:
    | {
        displacement?: string | number | null;
        usage?: string | null;
        vehicleWeight?: string | number | null;
      }
    | null
    | undefined,
): VehicleCategory {
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
