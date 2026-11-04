import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AIRE_INCORPORADO,
  CLASES_EXPOSICION,
  EXPANSION_SULFATOS,
  LIMITES_F3,
  REQUISITOS_EXPOSICION,
  buscarClase,
  requisitoDeClase,
  type ClaseExposicion,
} from './durabilidad';

const CLASES: ClaseExposicion[] = ['F0', 'F1', 'F2', 'F3', 'S0', 'S1', 'S2', 'S3', 'P0', 'P1', 'C0', 'C1', 'C2'];

describe('durabilidad: Tabla C.4.2.1 (clases de exposición)', () => {
  it('13 clases únicas en el orden de la tabla', () => {
    expect(CLASES_EXPOSICION.map((c) => c.clase)).toEqual(CLASES);
  });

  it('cada clase pertenece a su categoría (inicial de la clase)', () => {
    for (const c of CLASES_EXPOSICION) expect(c.categoria).toBe(c.clase[0]);
  });

  it('las cuatro clases S tienen rangos de sulfato contiguos (suelo y agua)', () => {
    const s = CLASES_EXPOSICION.filter((c) => c.categoria === 'S');
    expect(s).toHaveLength(4);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].sulfatoSuelo!.min).toBe(s[i - 1].sulfatoSuelo!.max);
      expect(s[i].sulfatoAgua!.min).toBe(s[i - 1].sulfatoAgua!.max);
    }
    expect(buscarClase('S1').sulfatoAgua).toMatchObject({ min: 150, max: 1500 });
    expect(buscarClase('S3').sulfatoSuelo).toMatchObject({ min: 2 });
  });

  it('severidades de la tabla', () => {
    expect(buscarClase('F0').severidad).toBe('No es aplicable');
    expect(buscarClase('F3').severidad).toBe('Muy severa');
    expect(buscarClase('S2').severidad).toBe('Severa');
    expect(buscarClase('P1').severidad).toBe('Requerida');
    expect(buscarClase('C2').severidad).toBe('Severa');
  });
});

describe('durabilidad: Tabla C.4.3.1 (requisitos por clase)', () => {
  it('una fila por clase, en el mismo orden', () => {
    expect(REQUISITOS_EXPOSICION.map((r) => r.clase)).toEqual(CLASES);
  });

  it('a/mc máxima y f′c mínimo transcritos del PDF', () => {
    const esperado: Record<string, [number | null, number]> = {
      F0: [null, 17],
      F1: [0.45, 31],
      F2: [0.45, 31],
      F3: [0.45, 31],
      S0: [null, 17],
      S1: [0.5, 28],
      S2: [0.45, 31],
      S3: [0.45, 31],
      P0: [null, 17],
      P1: [0.5, 28],
      C0: [null, 17],
      C1: [0.5, 17],
      C2: [0.4, 35],
    };
    for (const [clase, [a, fc]] of Object.entries(esperado)) {
      const r = requisitoDeClase(clase as ClaseExposicion);
      expect(r.aMcMax, clase).toBe(a);
      expect(r.fcMin, clase).toBe(fc);
    }
  });

  it('f′c mínimo ≥ 17 MPa y a/mc entre 0.40 y 0.50', () => {
    for (const r of REQUISITOS_EXPOSICION) {
      expect(r.fcMin).toBeGreaterThanOrEqual(17);
      if (r.aMcMax !== null) {
        expect(r.aMcMax).toBeGreaterThanOrEqual(0.4);
        expect(r.aMcMax).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('aire solo en F1 a F3, límites de cementantes solo en F3, cementos solo en S, cloruro solo en C', () => {
    for (const r of REQUISITOS_EXPOSICION) {
      expect(Boolean(r.aire), r.clase).toBe(['F1', 'F2', 'F3'].includes(r.clase));
      expect(Boolean(r.limitesCementantes), r.clase).toBe(r.clase === 'F3');
      expect(Boolean(r.cementos), r.clase).toBe(r.clase[0] === 'S');
      expect(Boolean(r.cloruro), r.clase).toBe(r.clase[0] === 'C');
    }
  });

  it('cloruro: reforzado 1.00 / 0.30 / 0.15 y preesforzado 0.06 en C0, C1 y C2', () => {
    expect(requisitoDeClase('C0').cloruro).toEqual({ reforzado: 1.0, preesforzado: 0.06 });
    expect(requisitoDeClase('C1').cloruro).toEqual({ reforzado: 0.3, preesforzado: 0.06 });
    expect(requisitoDeClase('C2').cloruro).toEqual({ reforzado: 0.15, preesforzado: 0.06 });
  });

  it('cloruro de calcio: sin restricción en S0 y S1, no se permite en S2 y S3', () => {
    expect(requisitoDeClase('S0').cementos!.cloruroCalcio).toBe('Sin restricción');
    expect(requisitoDeClase('S1').cementos!.cloruroCalcio).toBe('Sin restricción');
    expect(requisitoDeClase('S2').cementos!.cloruroCalcio).toBe('No se permite');
    expect(requisitoDeClase('S3').cementos!.cloruroCalcio).toBe('No se permite');
  });
});

describe('durabilidad: Tablas C.4.4.1, C.4.4.2 y C.4.5.1', () => {
  it('aire: 7 tamaños crecientes con aire decreciente; F2/F3 supera a F1 en 0.5 a 1.5 puntos', () => {
    expect(AIRE_INCORPORADO.map((f) => f.tamanoMm)).toEqual([9.5, 12.5, 19, 25, 37.5, 50, 75]);
    for (let i = 1; i < AIRE_INCORPORADO.length; i++) {
      expect(AIRE_INCORPORADO[i].f1).toBeLessThanOrEqual(AIRE_INCORPORADO[i - 1].f1);
      expect(AIRE_INCORPORADO[i].f2f3).toBeLessThanOrEqual(AIRE_INCORPORADO[i - 1].f2f3);
    }
    for (const f of AIRE_INCORPORADO) {
      expect(f.f2f3 - f.f1).toBeGreaterThanOrEqual(0.5);
      expect(f.f2f3 - f.f1).toBeLessThanOrEqual(1.5);
    }
    expect(AIRE_INCORPORADO[0]).toMatchObject({ f1: 6, f2f3: 7.5 });
    expect(AIRE_INCORPORADO[6]).toMatchObject({ f1: 3.5, f2f3: 4.5 });
  });

  it('F3: 25 / 50 / 10 % y totales 50 y 35 %', () => {
    expect(LIMITES_F3.map((l) => l.maxPct)).toEqual([25, 50, 10, 50, 35]);
  });

  it('expansión a sulfatos: S1 0.10 (6 m), S2 0.05 (6 m) o 0.10 (12 m), S3 0.10 (18 m)', () => {
    expect(EXPANSION_SULFATOS).toEqual([{ clase: 'S1', seis: 0.1 }, { clase: 'S2', seis: 0.05, doce: 0.1 }, { clase: 'S3', dieciocho: 0.1 }]);
  });

  it('el capítulo c4.mdx transcribe todas las clases y el aire', () => {
    const mdx = readFileSync(new URL('../content/titulo-c/c4.mdx', import.meta.url), 'utf8');
    for (const c of CLASES) expect(mdx, c).toContain(`| ${c} |`);
    for (const f of AIRE_INCORPORADO) {
      const etiqueta = f.tamanoMm >= 50 ? `${f.tamanoMm}+` : f.tamanoMm.toFixed(1);
      expect(mdx, String(f.tamanoMm)).toContain(`| ${etiqueta} | ${f.f1} | ${f.f2f3} |`);
    }
  });
});
