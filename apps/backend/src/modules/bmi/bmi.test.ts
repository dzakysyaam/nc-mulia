import { describe, it, expect } from 'vitest';
import { BmiService } from './service.js';

// ── Service instance ────────────────────────────────────────────────────────
const service = new BmiService();

// ─────────────────────────────────────────────────────────────────────────────
// BMI calculation
// ─────────────────────────────────────────────────────────────────────────────
describe('BmiService.calculate', () => {

  // ── All 4 categories ─────────────────────────────────────────────────────
  it('UNDERWEIGHT: 48kg / 168cm → BMI ~17.0 → Kurus', () => {
    const r = service.calculate(48, 168);
    expect(r.value).toBeCloseTo(17.0, 1);
    expect(r.category).toBe('Kurus');
    expect(r.dbCategory).toBe('KURUS');
  });

  it('NORMAL: 60kg / 170cm → BMI ~20.8 → Normal', () => {
    const r = service.calculate(60, 170);
    expect(r.value).toBeCloseTo(20.8, 1);
    expect(r.category).toBe('Normal');
    expect(r.dbCategory).toBe('NORMAL');
  });

  it('OVERWEIGHT (regression): 68kg / 163cm → BMI ~25.6 → Kelebihan Berat', () => {
    const r = service.calculate(68, 163);
    expect(r.value).toBeCloseTo(25.6, 1);
    expect(r.category).toBe('Kelebihan Berat');
    expect(r.dbCategory).toBe('KELebihan_BERAT');
  });

  it('OBESITY: 85kg / 163cm → BMI ~32.0 → Obesitas', () => {
    const r = service.calculate(85, 163);
    expect(r.value).toBeCloseTo(32.0, 1);
    expect(r.dbCategory).toBe('OBESITAS');
    expect(r.category).toBe('Obesitas');
  });

  // ── Boundaries ───────────────────────────────────────────────────────────
  // BMI calculation uses Math.round(..., 1). Rounded BMI value determines category.
  // 53.4 kg / 170 cm = 18.479... → rounds to 18.5 → Normal (18.5 ≥ 18.5)
  it('Just below 18.5 rounds to 18.5 → Normal (boundary rounding)', () => {
    const r = service.calculate(53.4, 170);
    expect(r.value).toBeCloseTo(18.5, 1);
    expect(r.category).toBe('Normal');
  });

  // 53.49 kg / 170 cm = 18.506... → rounds to 18.5 → still Normal
  // 53.5 kg / 170 cm = 18.518... → rounds to 18.5 → still Normal
  // To get 18.4: need exact raw BMI = 18.4
  it('BMI rounds to 18.4 when raw value < 18.45 → Kurus', () => {
    // Solve: weight / 2.89 = 18.45 (rounds to 18.5), 18.44 (rounds to 18.4)
    // 18.44 * 2.89 = 53.29
    const r = service.calculate(53.29, 170);
    expect(r.value).toBeCloseTo(18.4, 1);
    expect(r.category).toBe('Kurus');
  });

  // 72.25 kg / 170 cm = 25.0 → rounds to 25.0 → Kelebihan Berat (25 ≤ 25)
  it('Exact boundary 25 → Kelebihan Berat', () => {
    const r = service.calculate(72.25, 170);
    expect(r.value).toBeCloseTo(25.0, 1);
    expect(r.category).toBe('Kelebihan Berat');
    expect(r.dbCategory).toBe('KELebihan_BERAT');
  });

  // 72.24 kg / 170 cm = 24.99 → rounds to 25.0 → Kelebihan Berat
  it('Just below 25 rounds to 25.0 → Kelebihan Berat', () => {
    const r = service.calculate(72.24, 170);
    expect(r.value).toBeCloseTo(25.0, 1);
    expect(r.category).toBe('Kelebihan Berat');
  });

  // 71.95 kg / 170 cm = 24.895 → rounds to 24.9 → Normal (< 25)
  it('Just below 25 (raw) rounds to 24.9 → Normal', () => {
    const r = service.calculate(71.95, 170);
    expect(r.value).toBeCloseTo(24.9, 1);
    expect(r.category).toBe('Normal');
  });

  it('Just below 30 → Kelebihan Berat', () => {
    // 29.9 * (1.70^2) = 86.4
    const r = service.calculate(86.4, 170);
    expect(r.category).toBe('Kelebihan Berat');
  });

  it('Exact boundary 30 → Obesitas (30 is in Obesitas range: ≥ 30)', () => {
    // 30 * (1.70^2) = 86.7
    const r = service.calculate(86.7, 170);
    expect(r.category).toBe('Obesitas');
    expect(r.dbCategory).toBe('OBESITAS');
  });

  it('Just above 30 → Obesitas', () => {
    const r = service.calculate(91, 170);
    expect(r.category).toBe('Obesitas');
  });

  // ── Additional edge cases ─────────────────────────────────────────────────
  it('BMI exactly 0 is not possible with positive inputs', () => {
    const r = service.calculate(1, 100);
    expect(r.value).toBeGreaterThan(0);
  });

  it('Extreme obesity → Obesitas', () => {
    const r = service.calculate(150, 170);
    expect(r.category).toBe('Obesitas');
    expect(r.dbCategory).toBe('OBESITAS');
  });

  it('Very slight underweight → Kurus', () => {
    const r = service.calculate(52, 170);
    expect(r.category).toBe('Kurus');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB enum ↔ label mapping (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────
describe('BmiService category ↔ DB enum mapping', () => {
  const cases: [number, number, string, string][] = [
    [48,       168, 'Kurus',         'KURUS'],
    [60,       170, 'Normal',         'NORMAL'],
    [68,       163, 'Kelebihan Berat', 'KELebihan_BERAT'],
    [85,       163, 'Obesitas',       'OBESITAS'],
    [72.25,    170, 'Kelebihan Berat', 'KELebihan_BERAT'],
    [86.7,     170, 'Obesitas',       'OBESITAS'],
    [53.5,     170, 'Normal',         'NORMAL'],
    [53.4,     170, 'Normal',          'NORMAL'],  // BMI=18.5 (rounded) → Normal
    [86.4,     170, 'Kelebihan Berat', 'KELebihan_BERAT'],
  ];

  cases.forEach(([w, h, label, dbVal]) => {
    it(`weight=${w} height=${h} → label="${label}" db="${dbVal}"`, () => {
      const r = service.calculate(w, h);
      expect(r.category).toBe(label);
      expect(r.dbCategory).toBe(dbVal);
    });
  });
});
