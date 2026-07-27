// backend/src/common/tire-wear.spec.ts

import { estimateTireWear } from './tire-wear';

describe('estimateTireWear', () => {
  it('returns insufficient_data for no points', () => {
    expect(estimateTireWear([])).toEqual({
      status: 'insufficient_data',
      latestDepthMm: 0,
    });
  });

  it('returns insufficient_data for a single point', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 5.0, mileage: 10000 },
    ]);

    expect(result).toEqual({ status: 'insufficient_data', latestDepthMm: 5.0 });
  });

  it('returns stable when depth is flat', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 5.0, mileage: 10000 },
      { date: new Date('2026-04-01'), treadDepthMm: 5.0, mileage: 13000 },
    ]);

    expect(result.status).toBe('stable');
  });

  it('projects a replacement estimate using mileage when wearing normally', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 6.0, mileage: 0 },
      { date: new Date('2026-04-01'), treadDepthMm: 5.0, mileage: 5000 },
    ]);

    expect(result.status).toBe('wearing');
    if (result.status === 'wearing') {
      expect(result.axis).toBe('mileage');
      expect(result.dangerNow).toBe(false);
      // 5000kmで1.0mm摩耗 -> 3.0mmまであと2.0mm -> 10000km
      expect(result.remainingToRecommended).toBe(10000);
    }
  });

  it('flags dangerNow when already at/below the legal minimum', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 2.0, mileage: 0 },
      { date: new Date('2026-04-01'), treadDepthMm: 1.5, mileage: 5000 },
    ]);

    expect(result.status).toBe('wearing');
    if (result.status === 'wearing') {
      expect(result.dangerNow).toBe(true);
      expect(result.remainingToRecommended).toBe(0);
    }
  });

  it('discards old-tire data once a new tire is detected (depth jumps back up)', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 2.0, mileage: 0 },
      { date: new Date('2026-02-01'), treadDepthMm: 1.7, mileage: 2000 },
      // 新品タイヤに交換された
      { date: new Date('2026-03-01'), treadDepthMm: 7.0, mileage: 2500 },
      { date: new Date('2026-06-01'), treadDepthMm: 6.0, mileage: 5500 },
    ]);

    expect(result.status).toBe('wearing');
    if (result.status === 'wearing') {
      expect(result.latestDepthMm).toBe(6.0);
      expect(result.dangerNow).toBe(false);
    }
  });

  it('discards old-tire data at an explicit isNewTire point, even without a depth jump', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 2.0, mileage: 0 },
      { date: new Date('2026-02-01'), treadDepthMm: 1.7, mileage: 2000 },
      // 深さの増加はごくわずか(自動検知の閾値0.3mm未満)だが、新品と明示されている
      { date: new Date('2026-03-01'), treadDepthMm: 1.9, mileage: 2500, isNewTire: true },
      { date: new Date('2026-06-01'), treadDepthMm: 1.5, mileage: 5500 },
    ]);

    expect(result.status).toBe('wearing');
    if (result.status === 'wearing') {
      expect(result.latestDepthMm).toBe(1.5);
      // 1.9mmを起点にしていれば計算に古いタイヤの摩耗ペースが混ざらないはず
      expect(result.dangerNow).toBe(true);
    }
  });

  it('falls back to a days-based axis when mileage is missing on any point', () => {
    const result = estimateTireWear([
      { date: new Date('2026-01-01'), treadDepthMm: 6.0, mileage: 1000 },
      { date: new Date('2026-07-01'), treadDepthMm: 5.0, mileage: null },
    ]);

    expect(result.status).toBe('wearing');
    if (result.status === 'wearing') {
      expect(result.axis).toBe('days');
    }
  });
});
