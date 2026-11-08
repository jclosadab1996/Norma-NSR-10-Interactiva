import { describe, expect, it } from 'vitest';
import {
  evaluarEsfuerzos,
  faColumnaNoReforzada,
  faColumnaReforzada,
  faMuro,
  fbAdmisible,
  ftAdmisible,
  fvMuroNoReforzado,
  fvMuroReforzado,
  fvVigaAdmisible,
  esfuerzoAdmisibleAcero,
  esfuerzoCortanteSolicitado,
  paColumnaReforzada,
  razonCombinada,
  reEsbeltez,
  refuerzoCortante,
  separacionMaximaCortante,
} from './esfuerzosAdmisiblesMamposteria';

describe('esfuerzos admisibles del acero (D-1.5-18 a D-1.5-23)', () => {
  it('barras corrugadas en tracción: 0.5 fy ≤ 170', () => {
    const r = esfuerzoAdmisibleAcero('corrugada-traccion', 420);
    expect(r.sinTope).toBeCloseTo(210, 6);
    expect(r.Fs).toBe(170);
    expect(r.topeActivo).toBe(true);
    expect(esfuerzoAdmisibleAcero('corrugada-traccion', 240).Fs).toBeCloseTo(120, 6);
    expect(esfuerzoAdmisibleAcero('corrugada-traccion', 240).topeActivo).toBe(false);
  });

  it('barras lisas y alambres', () => {
    expect(esfuerzoAdmisibleAcero('lisa-traccion', 420).Fs).toBe(140);
    expect(esfuerzoAdmisibleAcero('lisa-traccion', 240).Fs).toBeCloseTo(96, 6);
    expect(esfuerzoAdmisibleAcero('alambre-traccion', 420).Fs).toBeCloseTo(210, 6);
    expect(esfuerzoAdmisibleAcero('alambre-traccion', 600).Fs).toBe(210);
  });

  it('columnas en compresión: 0.4 fy ≤ 170', () => {
    expect(esfuerzoAdmisibleAcero('columna-compresion', 420).Fs).toBeCloseTo(168, 6);
    expect(esfuerzoAdmisibleAcero('columna-compresion', 500).Fs).toBe(170);
  });

  it('compresión en flexión', () => {
    expect(esfuerzoAdmisibleAcero('flexion-corrugada-compresion', 420).Fs).toBe(170);
    expect(esfuerzoAdmisibleAcero('flexion-lisa-compresion', 420).Fs).toBe(140);
  });
});

describe('compresión axial y por flexión (D-1.5.2, D-1.5.3)', () => {
  it('Re igual a la Ec. D.5.5-2: h′/t = 16 y h′/t > 30', () => {
    expect(reEsbeltez(2400, 150)).toBeCloseTo(0.854875, 6);
    expect(reEsbeltez(4500, 150)).toBeCloseTo(0.4897959, 6); // h′/t = 30 aún en la rama parabólica
    expect(reEsbeltez(4650, 150)).toBeCloseTo(0.4588971, 6);
    expect(reEsbeltez(0, 150)).toBe(1);
  });

  it('Fa de muro y columna no reforzada = 0.20 f′m Re', () => {
    expect(faMuro(10, 0.854875283446712)).toBeCloseTo(1.7097506, 6);
    expect(faColumnaNoReforzada(10, 1)).toBeCloseTo(2, 10);
  });

  it('columna reforzada: Pa y Fa (D-1.5-3 y D-1.5-4)', () => {
    const r = faColumnaReforzada({ fm: 10, Ae: 150000, Ast: 258, Fs: 168, Re: 0.854875283446712 });
    expect(r.Pa).toBeCloseTo(280106.38, 1);
    expect(r.Fa).toBeCloseTo(1.8673759, 6);
    expect(paColumnaReforzada({ fm: 10, Ae: 150000, Ast: 258, Fs: 168, Re: 1 })).toBeCloseTo(327657.6, 1);
  });

  it('Fb = 0.33 f′m ≤ 14 MPa', () => {
    expect(fbAdmisible(10).Fb).toBeCloseTo(3.3, 10);
    expect(fbAdmisible(10).topeActivo).toBe(false);
    expect(fbAdmisible(50).Fb).toBe(14);
    expect(fbAdmisible(50).topeActivo).toBe(true);
    expect(fbAdmisible(50).sinTope).toBeCloseTo(16.5, 10);
  });
});

describe('tracción por flexión, Tabla D-1.5-1', () => {
  const base = { direccion: 'perpendicular-junta-horizontal', mortero: 'cemento-cal', clase: 'HMS' } as const;

  it('valores directos', () => {
    expect(ftAdmisible({ ...base, unidad: 'maciza' })).toBe(0.28);
    expect(ftAdmisible({ ...base, unidad: 'perforacion-vertical-sin-rellenar' })).toBe(0.17);
    expect(ftAdmisible({ ...base, unidad: 'perforacion-vertical-rellena' })).toBe(0.45);
    expect(ftAdmisible({ ...base, clase: 'N', unidad: 'maciza' })).toBe(0.21);
    expect(ftAdmisible({ ...base, mortero: 'cemento-mamposteria', clase: 'N', unidad: 'perforacion-vertical-sin-rellenar' })).toBe(0.06);
    expect(ftAdmisible({ direccion: 'perpendicular-junta-vertical', mortero: 'cemento-cal', clase: 'HMS', unidad: 'maciza' })).toBe(0.55);
    expect(ftAdmisible({ direccion: 'perpendicular-junta-vertical', mortero: 'cemento-mamposteria', clase: 'N', unidad: 'perforacion-vertical-rellena' })).toBe(0.21);
  });

  it('interpolación lineal para mampostería parcialmente inyectada (nota 1)', () => {
    // 50 % rellena: (0.17 + 0.45) / 2 = 0.31
    expect(ftAdmisible({ ...base, unidad: 'perforacion-vertical-sin-rellenar', fraccionRelleno: 0.5 })).toBeCloseTo(0.31, 10);
    expect(ftAdmisible({ ...base, unidad: 'perforacion-vertical-sin-rellenar', fraccionRelleno: 0 })).toBeCloseTo(0.17, 10);
    expect(ftAdmisible({ ...base, unidad: 'perforacion-vertical-sin-rellenar', fraccionRelleno: 1 })).toBeCloseTo(0.45, 10);
    expect(ftAdmisible({ ...base, unidad: 'perforacion-vertical-sin-rellenar', fraccionRelleno: 2 })).toBeCloseTo(0.45, 10);
  });
});

describe('esfuerzos combinados (D-1.5-7)', () => {
  it('suma de razones', () => {
    const r = razonCombinada(0.8, 1.7097506, 1.5, 3.3);
    expect(r.razon).toBeCloseTo(0.8 / 1.7097506 + 1.5 / 3.3, 10);
    expect(r.razon).toBeCloseTo(0.9224, 3);
    expect(r.cumple).toBe(true);
    expect(razonCombinada(1.5, 1.7097506, 2.5, 3.3).cumple).toBe(false);
  });
});

describe('cortante (D-1.5.6 a D-1.5.9)', () => {
  it('fv = V / (b j d)', () => {
    expect(esfuerzoCortanteSolicitado(30000, 1000, 2000)).toBeCloseTo(0.01875, 10);
    expect(esfuerzoCortanteSolicitado(30000, 1000, 2000, 0.9)).toBeCloseTo(30000 / (1000 * 0.9 * 2000), 10);
  });

  it('vigas: con y sin refuerzo, con tope', () => {
    const a = fvVigaAdmisible(10, false);
    expect(a.Fv).toBeCloseTo(0.2635231, 6);
    expect(a.ecuacion).toBe('D-1.5-9');
    expect(fvVigaAdmisible(25, false).Fv).toBe(0.35);
    expect(fvVigaAdmisible(25, false).topeActivo).toBe(true);
    expect(fvVigaAdmisible(10, true).Fv).toBeCloseTo(0.7905694, 6);
    expect(fvVigaAdmisible(25, true).Fv).toBe(1.1);
  });

  it('muro no reforzado: √f′m/40 y el incremento 0.2 fam', () => {
    expect(fvMuroNoReforzado(10).Fv).toBeCloseTo(0.0790569, 6);
    const r = fvMuroNoReforzado(10, 0.5);
    expect(r.incremento).toBeCloseTo(0.1, 10);
    expect(r.Fv).toBeCloseTo(0.1790569, 6);
  });

  it('muro reforzado, la mampostería toma todo el cortante', () => {
    const a = fvMuroReforzado(10, 0.5, 'mamposteria');
    expect(a.Fv).toBeCloseTo(0.2766993, 6);
    expect(a.ecuacion).toBe('D-1.5-13');
    expect(a.rama).toBe('M/Vd < 1');
    expect(a.tope).toBeCloseTo(0.45, 10);
    const b = fvMuroReforzado(40, 0, 'mamposteria');
    expect(b.Fv).toBeCloseTo(0.6, 10); // gobierna el tope 0.6 − 0.3·0
    expect(b.topeActivo).toBe(true);
    const c = fvMuroReforzado(10, 1.5, 'mamposteria');
    expect(c.Fv).toBe(0.25); // √10/12 = 0.2635 > 0.25
    expect(c.ecuacion).toBe('D-1.5-14');
    expect(c.rama).toBe('M/Vd ≥ 1');
  });

  it('muro reforzado, el refuerzo toma todo el cortante', () => {
    const a = fvMuroReforzado(10, 0.5, 'refuerzo');
    expect(a.Fv).toBeCloseTo(0.4611655, 6);
    expect(a.tope).toBeCloseTo(0.69, 10);
    expect(a.ecuacion).toBe('D-1.5-15');
    expect(fvMuroReforzado(40, 0, 'refuerzo').Fv).toBeCloseTo(0.84, 10);
    const c = fvMuroReforzado(10, 2, 'refuerzo');
    expect(c.Fv).toBeCloseTo(0.3952847, 6);
    expect(c.ecuacion).toBe('D-1.5-16');
    expect(fvMuroReforzado(40, 1, 'refuerzo').Fv).toBe(0.52);
  });

  it('refuerzo transversal D-1.5-17 y separación máxima', () => {
    expect(refuerzoCortante(0.5, 150, 400, 170)).toBeCloseTo(176.4706, 3);
    expect(separacionMaximaCortante(2400)).toBe(1200);
    expect(separacionMaximaCortante(1500)).toBe(750);
  });
});

describe('evaluarEsfuerzos', () => {
  it('muro reforzado: admisibles y verificación completa', () => {
    const r = evaluarEsfuerzos({
      elemento: 'muro-reforzado',
      fm: 10,
      hPrime: 2400,
      t: 150,
      Ae: 150000,
      fy: 420,
      tipoAcero: 'corrugada',
      cortante: { b: 150, d: 2400, MVd: 0.5, quien: 'mamposteria' },
      actuantes: { P: 150000, fb: 1.0, V: 60000, fsTraccion: 120 },
    });
    expect(r.Re).toBeCloseTo(0.854875, 6);
    expect(r.esbeltez).toBeCloseTo(16, 10);
    expect(r.esbeltezAdmisible).toBe(true);
    expect(r.fa).toBeCloseTo(1.0, 10);
    const v = (k: string) => r.verificaciones.find((x) => x.clave === k)!;
    expect(v('axial').admisible).toBeCloseTo(1.7097506, 6);
    expect(v('axial').razon).toBeCloseTo(1 / 1.7097506, 6);
    expect(v('axial').cumple).toBe(true);
    expect(v('flexion').admisible).toBeCloseTo(3.3, 10);
    expect(v('combinada').actuante).toBeCloseTo(1 / 1.7097506 + 1 / 3.3, 6);
    expect(v('cortante').admisible).toBeCloseTo(0.2766993, 6);
    expect(v('cortante').actuante).toBeCloseTo(60000 / (150 * 0.8 * 2400), 10);
    expect(v('cortante').cumple).toBe(true); // 0.2083 ≤ 0.2767
    expect(v('acero-traccion').admisible).toBe(170);
    expect(v('acero-traccion').cumple).toBe(true);
    expect(v('acero-compresion').admisible).toBe(170);
    expect(v('traccion')).toBeUndefined();
    expect(r.cumpleTodo).toBe(true);
  });

  it('detecta incumplimiento y esbeltez excesiva', () => {
    const r = evaluarEsfuerzos({
      elemento: 'muro-reforzado',
      fm: 10,
      hPrime: 4200,
      t: 150,
      Ae: 150000,
      fy: 420,
      actuantes: { fa: 1.0, fb: 2.5 },
    });
    expect(r.esbeltez).toBeCloseTo(28, 10);
    expect(r.esbeltezAdmisible).toBe(false);
    expect(r.verificaciones.find((x) => x.clave === 'combinada')!.cumple).toBe(false);
    expect(r.cumpleTodo).toBe(false);
  });

  it('columna reforzada usa Pa/Ae y Fs = 0.4 fy ≤ 170 (D-1.5-21)', () => {
    const r = evaluarEsfuerzos({
      elemento: 'columna-reforzada',
      fm: 10,
      hPrime: 2400,
      t: 150,
      Ae: 150000,
      Ast: 258,
      fy: 420,
      actuantes: { P: 250000 },
    });
    expect(r.FsColumna).toBeCloseTo(168, 10);
    expect(r.Pa).toBeCloseTo(280106.38, 1);
    expect(r.verificaciones.find((x) => x.clave === 'axial')!.admisible).toBeCloseTo(1.8673759, 6);
    expect(r.verificaciones.find((x) => x.clave === 'axial')!.cumple).toBe(true); // 1.667 ≤ 1.867
    expect(r.verificaciones.find((x) => x.clave === 'cortante')).toBeUndefined();
  });

  it('muro no reforzado: tracción por flexión y cortante con 0.2 fam', () => {
    const r = evaluarEsfuerzos({
      elemento: 'muro-no-reforzado',
      fm: 10,
      hPrime: 2400,
      t: 150,
      Ae: 150000,
      traccion: { direccion: 'perpendicular-junta-horizontal', unidad: 'perforacion-vertical-sin-rellenar', mortero: 'cemento-cal', clase: 'HMS' },
      cortante: { fam: 0.5 },
      actuantes: { ft: 0.12, fv: 0.15 },
    });
    const v = (k: string) => r.verificaciones.find((x) => x.clave === k)!;
    expect(v('traccion').admisible).toBe(0.17);
    expect(v('traccion').cumple).toBe(true);
    expect(v('cortante').admisible).toBeCloseTo(0.1790569, 6);
    expect(v('cortante').cumple).toBe(true);
    expect(v('acero-traccion')).toBeUndefined();
  });

  it('viga: Fb, Fv con refuerzo y acero lisa/alambre', () => {
    const r = evaluarEsfuerzos({
      elemento: 'viga',
      fm: 10,
      fy: 240,
      tipoAcero: 'lisa',
      cortante: { conRefuerzo: true },
      actuantes: { fb: 3.0, fv: 0.5, fsTraccion: 100 },
    });
    const v = (k: string) => r.verificaciones.find((x) => x.clave === k)!;
    expect(r.Re).toBeNull();
    expect(v('axial')).toBeUndefined();
    expect(v('flexion').cumple).toBe(true);
    expect(v('cortante').admisible).toBeCloseTo(0.7905694, 6);
    expect(v('acero-traccion').admisible).toBeCloseTo(96, 10);
    expect(v('acero-traccion').cumple).toBe(false); // 100 > 96
    expect(v('acero-compresion').admisible).toBeCloseTo(96, 10);
    const w = evaluarEsfuerzos({ elemento: 'viga', fm: 10, fy: 420, tipoAcero: 'alambre' });
    expect(w.verificaciones.find((x) => x.clave === 'acero-compresion')!.admisible).toBeNull();
    expect(w.verificaciones.find((x) => x.clave === 'acero-traccion')!.admisible).toBeCloseTo(210, 10);
    expect(w.cumpleTodo).toBeNull();
  });

  it('el factor de incremento opcional multiplica los admisibles', () => {
    const r = evaluarEsfuerzos({ elemento: 'viga', fm: 10, incremento: 1.33, actuantes: { fb: 4.0 } });
    const fb = r.verificaciones.find((x) => x.clave === 'flexion')!;
    expect(fb.admisible).toBeCloseTo(3.3 * 1.33, 10);
    expect(fb.cumple).toBe(true); // 4.0 ≤ 4.389
  });
});
