// backend/src/common/tire-wear.ts

export type TireWearStatus = 'insufficient_data' | 'stable' | 'wearing';

export interface TireMeasurementPoint {
  date: Date;
  treadDepthMm: number;
  mileage: number | null;
  /** スタッフが「新品タイヤに交換した」と明示した測定点。深さの急増による自動検知より優先する */
  isNewTire?: boolean;
}

export type TireWearEstimate =
  | { status: 'insufficient_data'; latestDepthMm: number }
  | { status: 'stable'; latestDepthMm: number }
  | {
      status: 'wearing';
      latestDepthMm: number;
      dangerNow: boolean;
      axis: 'mileage' | 'days';
      /** 推奨交換の目安(3.0mm)に達するまでの残り走行距離(km)または残り日数。既に到達済みなら0 */
      remainingToRecommended: number;
    };

/** 道路運送車両法の保安基準上のスリップサイン残溝 */
const LEGAL_MIN_MM = 1.6;
/** 一般的にタイヤ交換が推奨される残溝の目安 */
const RECOMMENDED_REPLACE_MM = 3.0;
/** これ以上深さが増えていたら「新品タイヤに交換された」とみなすノイズ許容幅(isNewTireの明示が無い場合の保険) */
const NEW_TIRE_JUMP_MM = 0.3;

/**
 * 同一タイヤ(位置×夏冬)の測定点列から、摩耗傾向と交換時期の目安を推定する。
 * isNewTireが明示された点、または深さが急に増えている点があれば、それ以前は
 * 古いタイヤのデータとして切り捨てる。
 */
export function estimateTireWear(pointsInput: TireMeasurementPoint[]): TireWearEstimate {
  const points = [...pointsInput].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (points.length === 0) {
    return { status: 'insufficient_data', latestDepthMm: 0 };
  }

  let start = 0;

  for (let i = 1; i < points.length; i++) {
    const jumped = points[i].treadDepthMm > points[i - 1].treadDepthMm + NEW_TIRE_JUMP_MM;

    if (points[i].isNewTire || jumped) {
      start = i;
    }
  }

  const active = points.slice(start);
  const latest = active[active.length - 1];

  if (active.length < 2) {
    return { status: 'insufficient_data', latestDepthMm: latest.treadDepthMm };
  }

  const first = active[0];
  const depthDrop = first.treadDepthMm - latest.treadDepthMm;
  const useMileage = active.every((p) => p.mileage != null);
  const axis: 'mileage' | 'days' = useMileage ? 'mileage' : 'days';

  const xSpan = useMileage
    ? latest.mileage! - first.mileage!
    : (latest.date.getTime() - first.date.getTime()) / 86400000;

  if (xSpan <= 0 || depthDrop <= 0) {
    return { status: 'stable', latestDepthMm: latest.treadDepthMm };
  }

  const wearRatePerUnit = depthDrop / xSpan;
  const remainingMm = latest.treadDepthMm - RECOMMENDED_REPLACE_MM;
  const remainingToRecommended =
    remainingMm > 0 ? Math.round(remainingMm / wearRatePerUnit) : 0;

  return {
    status: 'wearing',
    latestDepthMm: latest.treadDepthMm,
    dangerNow: latest.treadDepthMm <= LEGAL_MIN_MM,
    axis,
    remainingToRecommended,
  };
}

export interface TireWearGroupResult {
  position: string;
  tireType: string;
  estimate: TireWearEstimate;
}

/** 位置×夏冬タイヤごとにグルーピングしてestimateTireWearをまとめて実行する */
export function groupAndEstimate(
  measurements: {
    position: string;
    tireType: string;
    date: Date;
    treadDepthMm: number;
    mileage: number | null;
    isNewTire?: boolean;
  }[],
): TireWearGroupResult[] {
  const groups = new Map<string, { position: string; tireType: string; points: TireMeasurementPoint[] }>();

  for (const m of measurements) {
    const key = `${m.position}::${m.tireType}`;
    const group = groups.get(key) ?? { position: m.position, tireType: m.tireType, points: [] };

    group.points.push({
      date: m.date,
      treadDepthMm: m.treadDepthMm,
      mileage: m.mileage,
      isNewTire: m.isNewTire,
    });

    groups.set(key, group);
  }

  return Array.from(groups.values()).map((g) => ({
    position: g.position,
    tireType: g.tireType,
    estimate: estimateTireWear(g.points),
  }));
}
