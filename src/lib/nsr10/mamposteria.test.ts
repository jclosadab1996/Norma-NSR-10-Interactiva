import { describe, expect, it } from 'vitest';
import {
  alphaMcr,
  articulacionPlastica,
  bloqueCompresion,
  capasMuroEnPlano,
  cargaBalanceada,
  cParaCarga,
  coeficienteVm,
  coeficienteVnMax,
  cortanteFueraPlano,
  cortanteMamposteria,
  cortanteMaximo,
  cortanteMuroEnPlano,
  cortanteRefuerzo,
  cuantiaBalanceada,
  cuantiaCortante,
  curvaInteraccionMuro,
  esbeltez,
  esfuerzoFibraExtrema,
  estadoEnC,
  factorEsbeltez,
  flexionDobleArmadura,
  flexionSimple,
  momentoAgrietamiento,
  moduloRuptura,
  muroFueraPlano,
  phiCortanteEnPlano,
  phiEnPlanoFn,
  phiFueraPlanoFn,
  phiMuro,
  relacionMVd,
  requiereElementoBorde,
  resistenciaAxial,
  resistenciaAxialTeorica,
  resistenciaFlexoCompresion,
  verificarFlexoCompresion,
  type SeccionM,
} from './mamposteria';
import { phiEnPlanoFlexocompresion } from './dimensionesMamposteria';
import { TABLA_D581, TABLA_D582, TABLA_D583 } from '../../data/muroMamposteria';

describe('φ de D.5.1.5', () => {
  it('perpendicular: flexión 0.80, cortante 0.60; paralelo: flexión 0.85, compresión 0.60, cortante 0.60; aplastamiento 0.60', () => {
    expect(phiMuro('fuera-flexion')).toBe(0.8);
    expect(phiMuro('fuera-cortante')).toBe(0.6);
    expect(phiMuro('en-flexion')).toBe(0.85);
    expect(phiMuro('en-compresion')).toBe(0.6);
    expect(phiMuro('en-cortante')).toBe(0.6);
    expect(phiMuro('aplastamiento')).toBe(0.6);
  });
  it('cortante paralelo: 0.85 si Vn excede el cortante asociado a Mn', () => {
    expect(phiCortanteEnPlano(300, 250)).toBe(0.85);
    expect(phiCortanteEnPlano(200, 250)).toBe(0.6);
  });
  it('Pb (Ec. D.5.1-2): b = 150, d = 2850, f′m = 10, fy = 420 → ab = 1425 mm, Pb = 1710 kN', () => {
    expect(cargaBalanceada(10, 150, 2850, 420)).toBeCloseTo(1710, 6);
  });
  it('rampa de φ paralelo (simétrico, fy ≤ 420): 0.85 sin carga, 0.60 con φPn ≥ umbral, lineal en φPn entre ambos', () => {
    // Ae = 450 000 mm², f′m = 10: 0.10 f′m Ae = 450 kN; Pb = 1710 → 0.25 Pb = 427.5 kN (rige el menor).
    const f = phiEnPlanoFn({ fm: 10, Ae: 450000, fy: 420, simetrico: true, Pb: 1710 });
    expect(f(0)).toBe(0.85);
    expect(f(-50)).toBe(0.85);
    expect(f(1e5)).toBe(0.6);
    // En Pn = 196.7779: φ = 0.85/(1 + 0.25·196.7779/427.5) = 0.762281 y φPn = 150.
    expect(f(196.77790563866512)).toBeCloseTo(0.7622807, 6);
    expect(f(196.77790563866512) * 196.77790563866512).toBeCloseTo(150, 6);
    // Continuidad con 0.60: φPn = T = 427.5 → Pn = 427.5/0.6 = 712.5 → φ = 0.85/(1 + 0.25·712.5/427.5) = 0.6.
    expect(f(712.5)).toBeCloseTo(0.6, 10);
  });
  it('refuerzo no simétrico o fy > 420: sin rampa (0.60 con Pn > 0, 0.85 en flexión pura)', () => {
    expect(phiEnPlanoFn({ fm: 10, Ae: 1e5, fy: 420, simetrico: false })(10)).toBe(0.6);
    expect(phiEnPlanoFn({ fm: 10, Ae: 1e5, fy: 500, simetrico: true })(10)).toBe(0.6);
    expect(phiEnPlanoFn({ fm: 10, Ae: 1e5, fy: 500, simetrico: true })(0)).toBe(0.85);
  });
  it('coincide con phiEnPlanoFlexocompresion de dimensionesMamposteria.ts (d5a): mismo φ cuando φPn = 150 kN', () => {
    const f = phiEnPlanoFn({ fm: 10, Ae: 450000, fy: 420, simetrico: true, Pb: 1710 });
    const pn = 196.77790563866512;
    const d5a = phiEnPlanoFlexocompresion({ phiPn: f(pn) * pn, fmAe: 10 * 450000 / 1000, Pb: 1710, fy: 420 });
    expect(d5a.phi).toBeCloseTo(f(pn), 8);
    expect(d5a.limite).toBeCloseTo(427.5, 8);
  });
  it('phiFueraPlanoFn es 0.80 constante', () => {
    expect(phiFueraPlanoFn()(500)).toBe(0.8);
    expect(phiFueraPlanoFn()(-5)).toBe(0.8);
  });
});

describe('D.5.5 — Compresión axial', () => {
  it('Re (Ec. D.5.5-2): h′/t = 16 → 1 − (16/42)² = 0.854875; h′/t = 36 → (21/36)² = 0.340278', () => {
    expect(esbeltez(2400, 150)).toBe(16);
    expect(factorEsbeltez(2400, 150)).toBeCloseTo(0.854875283, 8);
    expect(factorEsbeltez(5400, 150)).toBeCloseTo(0.340277778, 8);
  });
  it('Re es casi continua en h′/t = 30 (0.4898 y 0.4900) y vale 1 con h′ = 0', () => {
    expect(factorEsbeltez(30, 1)).toBeCloseTo(0.4897959, 6);
    expect(factorEsbeltez(30.0001, 1)).toBeCloseTo(0.49, 4);
    expect(factorEsbeltez(0, 150)).toBe(1);
  });
  it('Po (Ec. D.5.5-1): f′m = 10, Ae = 150 000, Ast = 258, fy = 420 → 8·149 742 + 108 360 = 1 306 296 N', () => {
    const r = resistenciaAxialTeorica({ fm: 10, Ae: 150000, Ast: 258, fy: 420 });
    expect(r.PoSinTope).toBeCloseTo(1306.296, 6);
    expect(r.Po).toBeCloseTo(1306.296, 6);
    expect(r.tope).toBe(1500);
    expect(r.limitada).toBe(false);
  });
  it('el tope f′m Ae rige con cuantías altas: Ast = 40 000 mm² sobre Ae = 150 000', () => {
    const r = resistenciaAxialTeorica({ fm: 10, Ae: 150000, Ast: 40000, fy: 420 });
    expect(r.PoSinTope).toBeCloseTo((0.8 * 10 * 110000 + 40000 * 420) / 1000, 8);
    expect(r.limitada).toBe(true);
    expect(r.Po).toBe(1500);
  });
  it('Pn = 0.80 Po Re = 893.376 kN; φPn = 0.60 → 536.026 kN y 0.80 → 714.701 kN', () => {
    const base = { fm: 10, Ae: 150000, Ast: 258, fy: 420, hPrime: 2400, t: 150 };
    const r6 = resistenciaAxial({ ...base, phi: 0.6, Pu: 500 });
    expect(r6.Pn).toBeCloseTo(893.376131, 5);
    expect(r6.phiPn).toBeCloseTo(536.025678, 5);
    expect(r6.razon).toBeCloseTo(500 / 536.025678, 8);
    expect(r6.cumple).toBe(true);
    expect(r6.esbeltezAdmisible).toBe(true);
    const r8 = resistenciaAxial({ ...base, phi: 0.8 });
    expect(r8.phiPn).toBeCloseTo(714.700904, 5);
    expect(r8.cumple).toBeNull();
  });
  it('h′/t > 25 se señala como no admisible en muros estructurales (D.5.4.3.1)', () => {
    expect(resistenciaAxial({ fm: 10, Ae: 150000, Ast: 258, fy: 420, hPrime: 4000, t: 150, phi: 0.6 }).esbeltezAdmisible).toBe(false);
  });
});

describe('D.5.6 — Flexión sin carga axial', () => {
  it('bloque a (Ec. D.5.6-3): As = 258, fy = 420, f′m = 10, b = 150 → a = 90.3 mm', () => {
    expect(bloqueCompresion(258, 420, 10, 150)).toBeCloseTo(90.3, 10);
  });
  it('ρb = 0.80 f′m (0.85 εmu)/[(εmu + fy/Es) fy] = 0.0095238 con f′m = 10, fy = 420', () => {
    expect(cuantiaBalanceada(10, 420)).toBeCloseTo(0.0095238095, 9);
  });
  it('dintel 150 × d = 340, 2 No. 4: Mn = 258·420·(340 − 45.15) = 31.94995 kN·m; φMn(0.80) = 25.56', () => {
    const r = flexionSimple({ fm: 10, fy: 420, b: 150, d: 340, As: 258, phi: 0.8, Mu: 20 });
    expect(r.a).toBeCloseTo(90.3, 10);
    expect(r.Mn).toBeCloseTo(31.949946, 6);
    expect(r.phiMn).toBeCloseTo(25.5599568, 6);
    expect(r.rho).toBeCloseTo(0.0050588235, 9);
    expect(r.cumpleCuantia).toBe(true);
    expect(r.fluye).toBe(true);
    expect(r.cumple).toBe(true);
  });
  it('ρ > 0.75 ρb se marca: As = 400 con b = 150, d = 340 → ρ = 0.00784 > 0.00714', () => {
    const r = flexionSimple({ fm: 10, fy: 420, b: 150, d: 340, As: 400, phi: 0.8 });
    expect(r.rhoLimite).toBeCloseTo(0.00714286, 7);
    expect(r.cumpleCuantia).toBe(false);
  });
  it('doble armadura (Ec. D.5.6-4): As = 600, A′s = 258, d = 340, d′ = 50 → a = 119.7, Mn norma = 71.665146 kN·m; A′s NO fluye (ε′s = 0.001935 < 0.0021)', () => {
    const r = flexionDobleArmadura({ fm: 10, fy: 420, b: 150, d: 340, dPrime: 50, As: 600, AsPrime: 258, phi: 0.85 });
    expect(r.As1).toBe(342);
    expect(r.As2).toBe(258);
    expect(r.a).toBeCloseTo(119.7, 10);
    expect(r.c).toBeCloseTo(140.8235294, 6);
    expect(r.epsPrimeS).toBeCloseTo(0.0019348371, 8);
    expect(r.fluyeCompresion).toBe(false);
    expect(r.MnNorma).toBeCloseTo(71.665146, 6);
    // Equilibrio completo (A′s con f′s = 395.83 MPa): c = 146.937, Mn = 71.2143 kN·m.
    expect(r.MnCompatibilidad).toBeCloseTo(71.2143188, 4);
    expect(r.fsPrime).toBeCloseTo(395.8307620, 4);
    expect(r.Mn).toBeCloseTo(r.MnCompatibilidad, 10);
    expect(r.phiMn).toBeCloseTo(0.85 * 71.2143188, 4);
  });
  it('doble armadura con A′s en fluencia usa la Ec. D.5.6-4 tal cual (d′ pequeño)', () => {
    const r = flexionDobleArmadura({ fm: 10, fy: 420, b: 150, d: 340, dPrime: 20, As: 600, AsPrime: 258, phi: 0.85 });
    expect(r.fluyeCompresion).toBe(true);
    expect(r.Mn).toBeCloseTo(((342 * 420 * (340 - 59.85)) + 258 * 420 * 320) / 1e6, 6);
  });
});

describe('Sección con capas: equilibrio y compatibilidad (D.5.1.6)', () => {
  const franja: SeccionM = { b: 1000, h: 150, fm: 10, fy: 420, capas: [{ area: 161, y: 75 }] };
  it('c = 75 mm: a = 63.75, Cm = 510 kN, acero con ε = 0 → Pn = 510 kN, Mn = 510·(75 − 31.875)/1000 = 21.99375 kN·m', () => {
    const e = estadoEnC(franja, 75);
    expect(e.a).toBeCloseTo(63.75, 10);
    expect(e.Pn).toBeCloseTo(510, 8);
    expect(e.Mn).toBeCloseTo(21.99375, 8);
    expect(e.epsT).toBeCloseTo(0, 12);
  });
  it('flexión pura: reproduce Mn = As fy (d − a/2) = 4.785721 kN·m con c = 9.944 mm', () => {
    const c = cParaCarga(franja, 0)!;
    expect(c).toBeCloseTo(9.9441176, 5);
    const e = estadoEnC(franja, c);
    expect(e.Mn).toBeCloseTo(4.785720975, 6);
    expect(e.Mn).toBeCloseTo((161 * 420 * (75 - (161 * 420) / (0.8 * 10 * 1000) / 2)) / 1e6, 6);
  });
  it('con Pn = 250 kN: c = 45.814 mm y Mn = 17.29935 kN·m', () => {
    const c = cParaCarga(franja, 250)!;
    expect(c).toBeCloseTo(45.8144129, 5);
    expect(estadoEnC(franja, c).Mn).toBeCloseTo(17.2993549, 5);
  });
  it('fuera de alcance: más tracción que fy As o más compresión que 0.80 f′m b h + fy As', () => {
    expect(cParaCarga(franja, -100)).toBeNull();
    expect(cParaCarga(franja, 5000)).toBeNull();
  });
  it('capas del muro en su plano: extremos y n barras intermedias equiespaciadas', () => {
    const capas = capasMuroEnPlano(3000, 150, 398, 129, 2);
    expect(capas.map((c) => c.y)).toEqual([150, 2850, 1050, 1950]);
    expect(capas.map((c) => c.area)).toEqual([398, 398, 129, 129]);
  });
});

describe('Muro en su plano 150 × 3000, f′m = 10, 2 No. 5 por extremo (d′ = 150), flexo-compresión', () => {
  const sec: SeccionM = { b: 150, h: 3000, fm: 10, fy: 420, capas: capasMuroEnPlano(3000, 150, 398) };
  const phi = phiEnPlanoFn({ fm: 10, Ae: 450000, fy: 420, simetrico: true, Pb: cargaBalanceada(10, 150, 2850, 420) });
  it('con Pu = 150 kN: Pn = 196.778 kN, φ = 0.7623, c = 258.52 mm, Mn = 727.564 kN·m, φMn = 554.608 kN·m', () => {
    const r = resistenciaFlexoCompresion(sec, 150, phi)!;
    expect(r.Pn).toBeCloseTo(196.7779056, 4);
    expect(r.phi).toBeCloseTo(0.7622807, 6);
    expect(r.c).toBeCloseTo(258.5235032, 3);
    expect(r.Mn).toBeCloseTo(727.5635555, 3);
    expect(r.phiMn).toBeCloseTo(554.6076576, 3);
  });
  it('verificación: Mu = 450 cumple; Mu = 600 no cumple', () => {
    expect(verificarFlexoCompresion(sec, 150, 450, phi).cumple).toBe(true);
    const v = verificarFlexoCompresion(sec, 150, 600, phi);
    expect(v.cumple).toBe(false);
    expect(v.motivo).toBe('Mu-excede');
  });
  it('Pu mayor que φ·0.80·Po·Re se rechaza por el tope (Po = 3927.952 kN con Ast = 796 mm²)', () => {
    const v = verificarFlexoCompresion(sec, 5000, 0, phi);
    expect(v.PnMax).toBeCloseTo(0.8 * 3927.952, 3);
    expect(v.cumple).toBe(false);
    expect(v.motivo).toBe('Pu-excede-tope');
  });
  it('curva: la primera punta es el tope Pn,max (Mn pequeño), contiene el balanceado, la flexión pura y la tracción pura −fy·Ast', () => {
    const c = curvaInteraccionMuro(sec, phi);
    expect(c.PnMax).toBeCloseTo(3142.3616, 3);
    expect(c.puntos[0].Pn).toBeCloseTo(c.PnMax, 6);
    expect(c.puntos[0].etiqueta).toBe('tope');
    const tr = c.puntos[c.puntos.length - 1];
    expect(tr.etiqueta).toBe('traccion-pura');
    expect(tr.Pn).toBeCloseTo(-(796 * 420) / 1000, 8);
    expect(c.balanceado.c).toBeCloseTo((0.003 * 2850) / (0.003 + 0.0021), 8);
    expect(c.flexionPura!.Pn).toBeCloseTo(0, 6);
    // Pn decreciente a lo largo de la lista
    for (let i = 1; i < c.puntos.length; i++) expect(c.puntos[i].Pn).toBeLessThanOrEqual(c.puntos[i - 1].Pn + 1e-9);
  });
});

describe('D.5.7 — Muros fuera de su plano', () => {
  const base = { fm: 10, fy: 420, b: 1000, t: 150, d: 75, As: 161, hPrime: 2800, Ae: 150000 };
  it('Pu = 40 kN < 0.10 f′m Ae = 150 kN: Ase = 256.238, a = 13.4525, Mn = 7.347621 kN·m/m, Re = 0.80247, φReMn = 4.71699', () => {
    const r = muroFueraPlano({ ...base, Pu: 40, Mu: 4 });
    expect(r.caso).toBe('menor');
    expect(r.umbralPu).toBe(150);
    expect(r.esbeltez).toBeCloseTo(18.6666667, 6);
    expect(r.Re).toBeCloseTo(0.8024691358, 8);
    expect(r.Ase).toBeCloseTo(256.2380952, 6);
    expect(r.a).toBeCloseTo(13.4525, 8);
    expect(r.Mn).toBeCloseTo(7.347620975, 8);
    expect(r.phiReMn).toBeCloseTo(4.716991243, 8);
    expect(r.rho).toBeCloseTo(0.00214667, 7);
    expect(r.cumpleCuantia).toBe(true);
    expect(r.razon).toBeCloseTo(4 / 4.716991243, 8);
    expect(r.cumple).toBe(true);
    expect(r.esbeltezAdmisible).toBe(true);
  });
  it('Pu = 200 kN > 150 kN: interacción con Pn = Pu/φ = 250 kN → Mn = 17.29935 kN·m; φReMn = 0.8·0.80247·17.29935', () => {
    const r = muroFueraPlano({ ...base, Pu: 200 });
    expect(r.caso).toBe('mayor');
    expect(r.Ase).toBeNull();
    expect(r.Mn).toBeCloseTo(17.2993549, 4);
    expect(r.phiReMn).toBeCloseTo(0.8 * 0.8024691358 * 17.2993549, 4);
  });
  it('h′/t = 36 con Pu alto no es admisible (límite 30)', () => {
    const r = muroFueraPlano({ ...base, hPrime: 5400, Pu: 200 });
    expect(r.esbeltezAdmisible).toBe(false);
  });
  it('Vn = (1/6) Amv √f′m = 79.057 kN con Amv = 150 000 mm² y f′m = 10 MPa; φVn(0.60) = 47.43', () => {
    const v = cortanteFueraPlano(150000, 10);
    expect(v).toBeCloseTo(79.0569415, 6);
    expect(0.6 * v).toBeCloseTo(47.4341649, 6);
  });
});

describe('D.5.8 — Tabla D.5.8-1 (módulo de ruptura)', () => {
  it('transcripción de los 24 valores de la tabla', () => {
    const v = TABLA_D581.map((f) => [f.cementoCal.HMS, f.cementoCal.N, f.cementoMamposteria.HMS, f.cementoMamposteria.N]);
    expect(v).toEqual([
      [0.69, 0.52, 0.41, 0.26],
      [0.43, 0.33, 0.26, 0.16],
      [1.12, 1.09, 1.06, 1.0],
      [1.38, 1.03, 0.83, 0.52],
      [0.86, 0.66, 0.52, 0.33],
      [1.38, 1.03, 0.83, 0.52],
    ]);
  });
  it('búsquedas directas', () => {
    expect(moduloRuptura({ direccion: 'horizontal', unidad: 'maciza', mortero: 'cemento-cal', tipoMortero: 'HMS' })).toBe(0.69);
    expect(moduloRuptura({ direccion: 'horizontal', unidad: 'perforacion-vertical', relleno: 1, mortero: 'cemento-cal', tipoMortero: 'HMS' })).toBe(1.12);
    expect(moduloRuptura({ direccion: 'horizontal', unidad: 'perforacion-vertical', relleno: 0, mortero: 'cemento-mamposteria', tipoMortero: 'N' })).toBe(0.16);
    expect(moduloRuptura({ direccion: 'vertical', unidad: 'maciza', mortero: 'cemento-mamposteria', tipoMortero: 'N' })).toBe(0.52);
  });
  it('parcialmente inyectada (nota 1): interpolación lineal; 50 % con cemento-cal H/M/S → (0.43 + 1.12)/2 = 0.775', () => {
    expect(moduloRuptura({ direccion: 'horizontal', unidad: 'perforacion-vertical', relleno: 0.5, mortero: 'cemento-cal', tipoMortero: 'HMS' })).toBeCloseTo(0.775, 10);
    expect(moduloRuptura({ direccion: 'vertical', unidad: 'perforacion-vertical', relleno: 0.3, mortero: 'cemento-cal', tipoMortero: 'HMS' })).toBe(1.38);
    expect(moduloRuptura({ direccion: 'vertical', unidad: 'perforacion-vertical', relleno: 0, mortero: 'cemento-cal', tipoMortero: 'HMS' })).toBe(0.86);
  });
  it('Mcr = b ℓw² fr / 6 y α (D.5.8-1/2): b = 150, ℓw = 3000, fr = 1.12 → 252 kN·m; α = 1.8 → Mn ≥ 453.6', () => {
    const mcr = momentoAgrietamiento(150, 3000, 1.12);
    expect(mcr).toBeCloseTo(252, 8);
    expect(alphaMcr('inyectada-total') * mcr).toBeCloseTo(453.6, 8);
    expect(alphaMcr('inyectada-solo-refuerzo')).toBe(3);
    expect(alphaMcr('cavidad-reforzada')).toBe(3);
  });
});

describe('D.5.8 — Cortante (Tablas D.5.8-2 y D.5.8-3)', () => {
  it('transcripción de coeficientes', () => {
    expect(TABLA_D582).toEqual({ bajo: 0.3, intermedio: { a: 0.33, b: 0.13 }, alto: 0.2, coefPu: 0.25 });
    expect(TABLA_D583).toEqual({ bajo: 0.5, intermedio: { a: 0.56, b: 0.23 }, alto: 0.33 });
  });
  it('coeficientes por banda de Mu/(Vud)', () => {
    expect(coeficienteVm(0.1)).toBe(0.3);
    expect(coeficienteVm(0.25)).toBe(0.3);
    expect(coeficienteVm(0.625)).toBeCloseTo(0.33 - 0.13 * 0.625, 12);
    expect(coeficienteVm(1)).toBe(0.2);
    expect(coeficienteVnMax(0.2)).toBe(0.5);
    expect(coeficienteVnMax(0.625)).toBeCloseTo(0.56 - 0.23 * 0.625, 12);
    expect(coeficienteVnMax(1.7)).toBe(0.33);
  });
  it('las tablas son prácticamente continuas en 0.25 y 1.00 (Vm: 0.2975 vs 0.30 y 0.20; Vn,max: 0.5025 vs 0.50 y 0.33)', () => {
    expect(coeficienteVm(0.2500001)).toBeCloseTo(0.2975, 3);
    expect(coeficienteVm(0.9999999)).toBeCloseTo(0.2, 4);
    expect(coeficienteVnMax(0.2500001)).toBeCloseTo(0.5025, 3);
    expect(coeficienteVnMax(0.9999999)).toBeCloseTo(0.33, 4);
  });
  it('Mu/(Vud) = 450e6/(300e3·2400) = 0.625; se toma positivo y no mayor que 1', () => {
    expect(relacionMVd(450, 300, 2400)).toBeCloseTo(0.625, 12);
    expect(relacionMVd(-450, 300, 2400)).toBeCloseTo(0.625, 12);
    expect(relacionMVd(5000, 100, 2400)).toBe(1);
  });
  it('Vm = (0.33 − 0.13·0.625)·450 000·√10 + 0.25·150 000 = 391.4775 kN', () => {
    const vm = cortanteMamposteria({ Amv: 450000, fm: 10, Pu: 150, mvd: 0.625 });
    expect(vm).toBeCloseTo(391.4774556, 6);
  });
  it('Vs = ρn fy Amv: Av = 71, s = 400, b = 150, η = 0.70 → ρn = 0.00082833; Vs = 156.555 kN', () => {
    expect(cuantiaCortante(71, 400, 150, 0.7)).toBeCloseTo(0.000828333, 9);
    expect(cortanteRefuerzo({ Av: 71, s: 400, b: 150, eta: 0.7, fy: 420, Amv: 450000 })).toBeCloseTo(156.555, 6);
    expect(cuantiaCortante(71, 400, 150, 0.35)).toBeCloseTo(0.000414167, 9);
  });
  it('Vn,max = (0.56 − 0.23·0.625)·450 000·√10 = 592.334 kN', () => {
    expect(cortanteMaximo({ Amv: 450000, fm: 10, mvd: 0.625 })).toBeCloseTo(592.3341342, 6);
  });
  it('conjunto: Vu = 300, Mu = 450, Pu = 150 con No. 3 (71 mm²) c/400 en elementos embebidos: Vn = 548.032 kN, φVn = 328.82 kN', () => {
    const r = cortanteMuroEnPlano({ fm: 10, lw: 3000, b: 150, Vu: 300, Mu: 450, Pu: 150, Av: 71, s: 400, fyCortante: 420, refuerzo: 'embebido' });
    expect(r.Amv).toBe(450000);
    expect(r.d).toBe(2400);
    expect(r.mvd).toBeCloseTo(0.625, 12);
    expect(r.Vm).toBeCloseTo(391.4774556, 6);
    expect(r.Vs).toBeCloseTo(156.555, 6);
    expect(r.Vn).toBeCloseTo(548.0324556, 6);
    expect(r.VnMax).toBeCloseTo(592.3341342, 6);
    expect(r.cumpleMaximo).toBe(true);
    expect(r.phi).toBe(0.6);
    expect(r.phiVn).toBeCloseTo(0.6 * 548.0324556, 6);
    expect(r.requiereRefuerzo).toBe(true); // Vu = 300 ≥ φVm = 234.9
    expect(r.cumple).toBe(true);
    // Vs requerido = 300/0.6 − 391.4775 = 108.5225 kN; Av/s = Vs b /(η fy Amv)
    expect(r.VsRequerido).toBeCloseTo(108.5225444, 6);
    expect(r.AvSobreSRequerido).toBeCloseTo((108.5225444 * 1000 * 150) / (0.7 * 420 * 450000), 8);
  });
  it('sin refuerzo y Vu pequeño: solo mampostería (Vu = 120, Mu = 240: Mu/(Vud) = 0.8333, Vm = 353.xx; no requiere refuerzo)', () => {
    const r = cortanteMuroEnPlano({ fm: 10, lw: 3000, b: 150, Vu: 120, Mu: 240, Pu: 150 });
    expect(r.Vs).toBe(0);
    expect(r.mvd).toBeCloseTo(0.833333, 5);
    expect(r.Vm).toBeCloseTo(((0.33 - 0.13 * (240e6 / (120e3 * 2400))) * 450000 * Math.sqrt(10) + 37500) / 1000, 8);
    expect(r.requiereRefuerzo).toBe(false);
    expect(r.VsRequerido).toBe(0);
  });
  it('articulación plástica (D.5.8.4.1): V(Mn) = Mn/(M/V); s ≤ min(3t, 600)', () => {
    const a = articulacionPlastica({ Vn: 548, Mn: 727.56, brazoMV: 1500, t: 150 });
    expect(a.VMn).toBeCloseTo(485.04, 6);
    expect(a.riesgo).toBe(true);
    expect(a.sMax).toBe(450);
    expect(articulacionPlastica({ Vn: 548, Mn: 727.56, brazoMV: 1500, t: 250 }).sMax).toBe(600);
  });
  it('con MnFlexion el cortante marca articulación y sube φ a 0.85 si Vn > V(Mn)', () => {
    const r = cortanteMuroEnPlano({ fm: 10, lw: 3000, b: 150, Vu: 300, Mu: 450, Pu: 150, Av: 71, s: 400, fyCortante: 420, MnFlexion: 400 });
    // V(Mn) = 400/(450/300) = 266.67 kN < Vn → riesgo de articulación; φ = 0.85
    expect(r.VMn).toBeCloseTo(266.6667, 3);
    expect(r.articulacionPlastica).toBe(true);
    expect(r.phi).toBe(0.85);
  });
});

describe('D.5.8.5 — Elementos de borde', () => {
  it('σ = Pu/Ae + 6Mu/(b ℓw²) = 150000/450000 + 6·240e6/(150·9e6) = 1.4 MPa', () => {
    expect(esfuerzoFibraExtrema({ Pu: 150, Mu: 240, b: 150, lw: 3000 })).toBeCloseTo(0.333333 + 1.066667, 5);
  });
  it('límites 0.20 f′m (reforzada, cavidad) y 0.30 f′m (parcialmente reforzada); suspensión 0.15 f′m', () => {
    const a = requiereElementoBorde(1.4, 10, 'reforzada');
    expect(a.limite).toBe(2);
    expect(a.requiere).toBe(false);
    expect(a.limiteSuspension).toBe(1.5);
    expect(requiereElementoBorde(2.5, 10, 'reforzada').requiere).toBe(true);
    expect(requiereElementoBorde(2.5, 10, 'parcialmente-reforzada').requiere).toBe(false);
    expect(requiereElementoBorde(3.5, 10, 'parcialmente-reforzada').requiere).toBe(true);
    expect(requiereElementoBorde(2.5, 10, 'cavidad-reforzada').limite).toBe(2);
  });
});
