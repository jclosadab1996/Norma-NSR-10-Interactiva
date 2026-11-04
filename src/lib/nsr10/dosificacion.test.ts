import { describe, expect, it } from 'vitest';
import {
  curadoEnObraDeficiente,
  curvaFcrVsDesviacion,
  desviacionEstandar,
  desviacionModificada,
  ensayosMinimosProyecto,
  evaluarAceptacion,
  evaluarNucleos,
  factorModificacionDesviacion,
  fcrConDatos,
  fcrPlanta,
  fcrSinDatos,
  fcrSinExperiencia,
  minimoIndividual,
  muestrasMinimasDia,
  promedio,
  puedeOmitirEnsayos,
} from './dosificacion';

describe('dosificacion: estadística', () => {
  it('promedio y desviación estándar de la muestra (n − 1)', () => {
    expect(promedio([2, 4, 4, 4, 5, 5, 7, 9])).toBe(5);
    expect(desviacionEstandar([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12);
    expect(() => desviacionEstandar([3])).toThrow();
  });
});

describe('dosificacion: factor de modificación (Tabla C.5.3.1.2)', () => {
  it('valores de la tabla', () => {
    expect(factorModificacionDesviacion(15)).toBeCloseTo(1.16, 12);
    expect(factorModificacionDesviacion(20)).toBeCloseTo(1.08, 12);
    expect(factorModificacionDesviacion(25)).toBeCloseTo(1.03, 12);
    expect(factorModificacionDesviacion(30)).toBe(1);
    expect(factorModificacionDesviacion(45)).toBe(1);
  });
  it('interpolación lineal entre filas', () => {
    expect(factorModificacionDesviacion(17)).toBeCloseTo(1.128, 12);
    expect(factorModificacionDesviacion(18)).toBeCloseTo(1.112, 12);
    expect(factorModificacionDesviacion(22)).toBeCloseTo(1.06, 12);
    expect(factorModificacionDesviacion(27)).toBeCloseTo(1.018, 12);
  });
  it('n < 15 no tiene factor (usar Tabla C.5.3.2.2)', () => {
    expect(factorModificacionDesviacion(14)).toBeNull();
    expect(desviacionModificada(3, 10)).toBeNull();
    expect(desviacionModificada(3, 15)).toBeCloseTo(3.48, 12);
  });
  it('el factor decrece monótonamente con n', () => {
    let previo = Infinity;
    for (let n = 15; n <= 30; n++) {
      const f = factorModificacionDesviacion(n) as number;
      expect(f).toBeLessThanOrEqual(previo);
      previo = f;
    }
  });
});

describe('dosificacion: f′cr con datos (Tabla C.5.3.2.1)', () => {
  it('f′c = 25: gobierna C.5-1 con ss pequeña y C.5-2 con ss grande', () => {
    const a = fcrConDatos(25, 3);
    expect(a.c51).toBeCloseTo(29.02, 10);
    expect(a.segunda).toBeCloseTo(28.49, 10);
    expect(a.gobierna).toBe('C.5-1');
    expect(a.fcr).toBeCloseTo(29.02, 10);
    const b = fcrConDatos(25, 4);
    expect(b.c51).toBeCloseTo(30.36, 10);
    expect(b.segunda).toBeCloseTo(30.82, 10);
    expect(b.gobierna).toBe('C.5-2');
    expect(b.fcr).toBeCloseTo(30.82, 10);
  });
  it('cruce de ecuaciones C.5-1 y C.5-2 en ss = 3.5/0.99', () => {
    const ss = 3.5 / 0.99;
    const r = fcrConDatos(28, ss);
    expect(r.c51).toBeCloseTo(r.segunda, 10);
  });
  it('f′c > 35 usa C.5-3 (0.90 f′c + 2.33 ss)', () => {
    const a = fcrConDatos(42, 3);
    expect(a.ecuacionSegunda).toBe('C.5-3');
    expect(a.c51).toBeCloseTo(46.02, 10);
    expect(a.segunda).toBeCloseTo(44.79, 10);
    expect(a.gobierna).toBe('C.5-1');
    const b = fcrConDatos(42, 5);
    expect(b.segunda).toBeCloseTo(49.45, 10);
    expect(b.gobierna).toBe('C.5-3');
  });
  it('f′c = 35 todavía usa C.5-2; 35.1 usa C.5-3', () => {
    expect(fcrConDatos(35, 3).ecuacionSegunda).toBe('C.5-2');
    expect(fcrConDatos(35.1, 3).ecuacionSegunda).toBe('C.5-3');
  });
  it('con ss = 0, f′cr = f′c si f′c ≤ 35 (C.5-1 gobierna: f′c > f′c − 3.5)', () => {
    expect(fcrConDatos(28, 0).fcr).toBe(28);
  });
  it('f′cr siempre ≥ f′c + 1.34 ss', () => {
    for (const fc of [17, 21, 28, 35, 40, 50]) for (const ss of [0, 1, 2.5, 4, 6]) expect(fcrConDatos(fc, ss).fcr).toBeGreaterThanOrEqual(fc + 1.34 * ss - 1e-9);
  });
  it('valida entradas', () => {
    expect(() => fcrConDatos(0, 2)).toThrow();
    expect(() => fcrConDatos(28, -1)).toThrow();
  });
});

describe('dosificacion: f′cr sin datos (Tabla C.5.3.2.2 y C.5.4.1)', () => {
  it('+7.0 si f′c < 21; +8.3 si 21 ≤ f′c ≤ 35; 1.10 f′c + 5.0 si > 35', () => {
    expect(fcrSinDatos(17)).toBeCloseTo(24, 10);
    expect(fcrSinDatos(20)).toBeCloseTo(27, 10);
    expect(fcrSinDatos(21)).toBeCloseTo(29.3, 10);
    expect(fcrSinDatos(28)).toBeCloseTo(36.3, 10);
    expect(fcrSinDatos(35)).toBeCloseTo(43.3, 10);
    expect(fcrSinDatos(40)).toBeCloseTo(49, 10);
  });
  it('C.5.4.1: f′c + 8.3, no permitido si f′c > 35', () => {
    expect(fcrSinExperiencia(28)).toBeCloseTo(36.3, 10);
    expect(fcrSinExperiencia(35)).toBeCloseTo(43.3, 10);
    expect(fcrSinExperiencia(40)).toBeNull();
  });
});

describe('dosificacion: f′cr de una planta', () => {
  it('15 ensayos con s = 2.8 y f′c = 28: ss = 3.248 y gobierna C.5-1', () => {
    const r = fcrPlanta(28, 2.8, 15);
    expect(r.origen).toBe('desviacion-modificada');
    expect(r.factor).toBeCloseTo(1.16, 12);
    expect(r.ss).toBeCloseTo(3.248, 10);
    expect(r.detalle!.c51).toBeCloseTo(32.35232, 10);
    expect(r.detalle!.segunda).toBeCloseTo(32.06784, 10);
    expect(r.fcr).toBeCloseTo(32.35232, 10);
  });
  it('30 ensayos o más no modifican s; 40 ensayos con s = 4.0 → C.5-2 gobierna', () => {
    const r = fcrPlanta(28, 4, 40);
    expect(r.origen).toBe('desviacion-completa');
    expect(r.factor).toBe(1);
    expect(r.fcr).toBeCloseTo(33.82, 10);
    expect(r.detalle!.gobierna).toBe('C.5-2');
  });
  it('menos de 15 ensayos o sin registro → Tabla C.5.3.2.2', () => {
    expect(fcrPlanta(28, 3, 12).origen).toBe('tabla-sin-datos');
    expect(fcrPlanta(28, 3, 12).fcr).toBeCloseTo(36.3, 10);
    expect(fcrPlanta(28).fcr).toBeCloseTo(36.3, 10);
  });
  it('con pocos ensayos la planta paga más que con 30: f′cr decrece al crecer n', () => {
    expect(fcrPlanta(28, 3, 15).fcr).toBeGreaterThan(fcrPlanta(28, 3, 25).fcr);
    expect(fcrPlanta(28, 3, 25).fcr).toBeGreaterThanOrEqual(fcrPlanta(28, 3, 30).fcr);
  });
  it('curva f′cr vs ss', () => {
    const c = curvaFcrVsDesviacion(28, 6, 12);
    expect(c).toHaveLength(13);
    expect(c[0].ss).toBe(0);
    expect(c[12].ss).toBe(6);
    for (const p of c) expect(p.fcr).toBe(Math.max(p.c51, p.segunda));
  });
});

describe('dosificacion: frecuencia de ensayos (C.5.6.2)', () => {
  it('120 m³ y 700 m² → 3, 4 → 4 muestras', () => {
    const m = muestrasMinimasDia(120, 700, 0);
    expect(m.porVolumen).toBe(3);
    expect(m.porSuperficie).toBe(4);
    expect(m.minimo).toBe(4);
  });
  it('exactamente 40 m³ → 1 muestra; 40.1 → 2; mínimo una por día', () => {
    expect(muestrasMinimasDia(40).minimo).toBe(1);
    expect(muestrasMinimasDia(40.1).minimo).toBe(2);
    expect(muestrasMinimasDia(0).minimo).toBe(1);
  });
  it('tandas: 120 tandas → 3 muestras', () => {
    expect(muestrasMinimasDia(10, 0, 120).porTandas).toBe(3);
  });
  it('C.5.6.2.2 y C.5.6.2.3', () => {
    expect(ensayosMinimosProyecto(3, 20)).toBe(5);
    expect(ensayosMinimosProyecto(3, 4)).toBe(4);
    expect(ensayosMinimosProyecto(7, 20)).toBe(7);
    expect(puedeOmitirEnsayos(9.9)).toBe(true);
    expect(puedeOmitirEnsayos(10)).toBe(false);
  });
});

describe('dosificacion: aceptación (C.5.6.3.3)', () => {
  it('mínimo individual: f′c − 3.5 (≤ 35) o 0.90 f′c (> 35)', () => {
    expect(minimoIndividual(28)).toBeCloseTo(24.5, 10);
    expect(minimoIndividual(35)).toBeCloseTo(31.5, 10);
    expect(minimoIndividual(40)).toBeCloseTo(36, 10);
  });
  it('serie satisfactoria', () => {
    const e = evaluarAceptacion([29.5, 27.0, 28.6, 30.2, 26.8, 28.9, 29.4, 27.5, 29.1], 28);
    expect(e.promediosMoviles).toHaveLength(7);
    expect(e.cumpleA).toBe(true);
    expect(e.cumpleB).toBe(true);
    expect(e.satisfactorio).toBe(true);
  });
  it('falla (b): un ensayo por debajo de f′c − 3.5', () => {
    const e = evaluarAceptacion([29.5, 24.0, 33.0, 30.2, 28.9], 28);
    expect(e.cumpleB).toBe(false);
    expect(e.individualesFallidos).toEqual([1]);
    expect(e.requiereInvestigacion).toBe(true);
    expect(e.satisfactorio).toBe(false);
  });
  it('falla (a): promedio de tres consecutivos bajo f′c aunque ninguno viole (b)', () => {
    const e = evaluarAceptacion([28.5, 26.0, 27.0, 29.0, 31.0], 28);
    expect(e.promediosMoviles[0]).toBeCloseTo(27.1667, 3);
    expect(e.cumpleA).toBe(false);
    expect(e.gruposFallidos).toContain(0);
    expect(e.cumpleB).toBe(true);
    expect(e.requiereInvestigacion).toBe(false);
  });
  it('un promedio exactamente igual a f′c cumple', () => {
    expect(evaluarAceptacion([27, 28, 29], 28).cumpleA).toBe(true);
  });
  it('f′c > 35: el límite individual es 0.10 f′c', () => {
    expect(evaluarAceptacion([40, 40, 36.0], 40).cumpleB).toBe(true);
    expect(evaluarAceptacion([40, 40, 35.9], 40).cumpleB).toBe(false);
  });
  it('menos de tres ensayos: datos insuficientes', () => {
    const e = evaluarAceptacion([30, 30], 28);
    expect(e.datosInsuficientes).toBe(true);
    expect(e.satisfactorio).toBe(false);
  });
});

describe('dosificacion: curado en obra y núcleos', () => {
  it('85 % de los cilindros de laboratorio, con exención si supera f′c + 3.5', () => {
    expect(curadoEnObraDeficiente(24, 30, 28)).toBe(true); // 24 < 25.5
    expect(curadoEnObraDeficiente(26, 30, 28)).toBe(false);
    expect(curadoEnObraDeficiente(32, 40, 28)).toBe(false); // 32 > 31.5: exento aunque 32 < 34
    expect(curadoEnObraDeficiente(31, 40, 28)).toBe(true); // 31 < 34 y no excede 31.5
  });
  it('núcleos: promedio ≥ 0.85 f′c y ninguno < 0.75 f′c', () => {
    const ok = evaluarNucleos([25, 22.6, 24.1], 28);
    expect(ok.umbralPromedio).toBeCloseTo(23.8, 10);
    expect(ok.umbralMinimo).toBeCloseTo(21, 10);
    expect(ok.adecuado).toBe(true);
    expect(evaluarNucleos([25, 20.5, 26], 28).cumpleMinimo).toBe(false);
    expect(evaluarNucleos([22, 22, 22], 28).cumplePromedio).toBe(false);
    expect(() => evaluarNucleos([25, 25], 28)).toThrow();
  });
});
