import { describe, expect, it } from 'vitest';
import {
  alturaEfectiva,
  amortiguamientoEfectivo,
  cortanteConISE,
  derivaConISE,
  masaParticipante,
  periodoEfectivoISE,
  reduccionCortanteISE,
  rigidezEmpotrada,
} from './interaccionSueloEstructura';
import { periodosEspectro, sa } from './espectro';

// Edificio de 10 pisos (hn = 30 m, M = 10 000 t) sobre perfil E, Aa = 0.15, Av = 0.20 (Fa = 2.1, Fv = 3.2), I = 1.0.
// Losa de fundación de 30 × 30 m con G = 26 MPa, ν = 0.4: Ky = 8GR/(2−ν), Kθ = 8GR³/[3(1−ν)], R = √(A/π).
const espectro = { aa: 0.15, av: 0.2, fa: 2.1, fv: 3.2, i: 1.0 };
const M = 1.0e7;
const T = 1.0;
const R = Math.sqrt(900 / Math.PI);
const G_SUELO = 26e6;
const ky = (8 * G_SUELO * R) / (2 - 0.4);
const kth = (8 * G_SUELO * R ** 3) / (3 * (1 - 0.4));

describe('A.7 / Apéndice A-2 — interacción suelo-estructura (FHE)', () => {
  it('parámetros del espectro del caso', () => {
    const { tc, tl } = periodosEspectro(espectro);
    expect(tc).toBeCloseTo(0.97524, 4);
    expect(tl).toBeCloseTo(7.68, 10);
    expect(sa(1.0, espectro)).toBeCloseTo(0.768, 10); // 1.2·0.2·3.2/1.0
  });

  it('masa participante, altura efectiva y rigidez de base empotrada (A-2-4)', () => {
    expect(masaParticipante(M)).toBeCloseTo(7.0e6, 6);
    expect(alturaEfectiva(30)).toBeCloseTo(21, 10);
    // k = 4π²·7·10⁶/1² = 2.76349·10⁸ N/m
    expect(rigidezEmpotrada(7.0e6, T)).toBeCloseTo(2.7634892e8, -1);
  });

  it('rigideces de la cimentación (valores del caso)', () => {
    expect(ky).toBeCloseTo(2.2003394e9, -3);
    expect(kth).toBeCloseTo(5.6031182e11, -6);
  });

  it('período efectivo (A-2-3) a mano: 1·√(1 + 0.12560·(1 + 1.73182)) = 1.1589 s', () => {
    const k = rigidezEmpotrada(masaParticipante(M), T);
    const tEf = periodoEfectivoISE(T, k, ky, kth, alturaEfectiva(30));
    expect(tEf).toBeCloseTo(1.15892, 4);
    expect(tEf).toBeGreaterThan(T);
  });

  it('amortiguamiento efectivo (A-2-9) y sus límites 0.05–0.20', () => {
    // 0.03 + 0.05/1.15892³ = 0.03 + 0.032122 = 0.062122
    expect(amortiguamientoEfectivo(0.03, 1.15892, 1.0)).toBeCloseTo(0.06212, 4);
    expect(amortiguamientoEfectivo(0, 1.0, 1.0)).toBeCloseTo(0.05, 12);
    expect(amortiguamientoEfectivo(0.5, 1.0, 1.0)).toBeCloseTo(0.2, 12);
  });

  it('reducción del cortante (A-2-2) y piso de A.7.3.4', () => {
    const k = rigidezEmpotrada(masaParticipante(M), T);
    const tEf = periodoEfectivoISE(T, k, ky, kth, alturaEfectiva(30));
    const beta = amortiguamientoEfectivo(0.03, tEf, T);
    const saT = sa(T, espectro); // 0.768
    const saEf = sa(tEf, espectro); // 0.768/1.15892 = 0.66269
    const dV = reduccionCortanteISE(saT, saEf, beta, masaParticipante(M));
    // [0.768 − 0.66269·(0.05/0.062122)^0.4]·9.8·7·10⁶ = 11.0055 MN
    expect(dV).toBeCloseTo(11.0055e6, -4);

    const vs = saT * 9.8 * M; // 75.264 MN
    const cuTa = 1.2 * 1.00348; // 1.2042 s
    const vsPrima = sa(cuTa, espectro) * 9.8 * M; // 62.52 MN
    const r = cortanteConISE(vs, dV, vsPrima);
    expect(r.vsReducido).toBeCloseTo(64.2585e6, -4);
    expect(r.vsDiseno).toBeCloseTo(r.vsReducido, 6); // 64.26 > 62.52: el piso no gobierna
    expect(r.gobiernaPiso).toBe(false);
    expect(r.pisoApendice).toBeCloseTo(0.7 * vsPrima, 6);
  });

  it('el piso de A.7.3.4 gobierna con suelo más blando (G/2)', () => {
    const vs = 75.264e6;
    const vsPrima = 62.52e6;
    const r = cortanteConISE(vs, 12.9977e6, vsPrima); // V̄s = 62.27 MN < 62.52 MN
    expect(r.gobiernaPiso).toBe(true);
    expect(r.vsDiseno).toBeCloseTo(vsPrima, 6);
  });

  it('si la interacción aumenta el cortante se diseña para el mayor', () => {
    const r = cortanteConISE(70e6, -3e6, 60e6);
    expect(r.vsReducido).toBeCloseTo(73e6, 6);
    expect(r.vsDiseno).toBeCloseTo(73e6, 6);
    expect(r.gobiernaPiso).toBe(false);
  });

  it('deriva modificada (A-2-11) con cabeceo', () => {
    // Mo = 1600 MN·m, hpi = 3 m, Kθ = 5.6031·10¹¹ → cabeceo = 8.567 mm; (0.85/1)(21 + 8.567) = 25.13 mm
    const r = derivaConISE(0.021, 3, 1600e6, kth, 0.85e6, 1e6);
    expect(r.incrementoPorCabeceo).toBeCloseTo(0.0085669, 6);
    expect(r.derivaModificada).toBeCloseTo(0.85 * (0.021 + 0.0085669), 6);
  });
});
