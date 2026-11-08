import { describe, expect, it } from 'vitest';
import {
  COMBINADO_MAX,
  FA_COEF_FM,
  FB_COEF_FM,
  FB_MAX_MPA,
  FS_ADMISIBLE,
  FV_MURO_NO_REFORZADO,
  FV_MURO_REFORZADO,
  FV_VIGA_CON_REFUERZO,
  FV_VIGA_SIN_REFUERZO,
  J_POR_DEFECTO,
  MVD_UMBRAL,
  PA_COEF_ACERO,
  REDUCCION_TEXTO_CEMENTO_MAMPOSTERIA,
  S_MAX_FRACCION_D,
  S_MAX_MM,
  TABLA_D151,
} from './esfuerzosAdmisiblesMamposteria';

describe('constantes del Apéndice D-1 (verificadas contra las páginas D-70 a D-74)', () => {
  it('compresión axial y por flexión', () => {
    expect(FA_COEF_FM).toBe(0.2);
    expect(PA_COEF_ACERO).toBe(0.65);
    expect(FB_COEF_FM).toBe(0.33);
    expect(FB_MAX_MPA).toBe(14);
    expect(COMBINADO_MAX).toBe(1.0);
  });

  it('cortante en vigas y muros no reforzados', () => {
    expect(J_POR_DEFECTO).toBe(0.8);
    expect(FV_VIGA_SIN_REFUERZO).toEqual({ divisor: 12, maxMpa: 0.35 });
    expect(FV_VIGA_CON_REFUERZO).toEqual({ divisor: 4, maxMpa: 1.1 });
    expect(FV_MURO_NO_REFORZADO).toEqual({ divisor: 40, maxMpa: 0.56, incrementoFam: 0.2 });
  });

  it('cortante en muros reforzados (D-1.5-13 a D-1.5-16)', () => {
    expect(MVD_UMBRAL).toBe(1.0);
    expect(FV_MURO_REFORZADO.mamposteria.bajo).toEqual({ coefMvd: 4, divisor: 40, c0: 0.6, c1: 0.3 });
    expect(FV_MURO_REFORZADO.mamposteria.alto).toEqual({ divisor: 12, maxMpa: 0.25 });
    expect(FV_MURO_REFORZADO.refuerzo.bajo).toEqual({ coefMvd: 4, divisor: 24, c0: 0.84, c1: 0.3 });
    expect(FV_MURO_REFORZADO.refuerzo.alto).toEqual({ divisor: 8, maxMpa: 0.52 });
  });

  it('separación del refuerzo de cortante', () => {
    expect(S_MAX_MM).toBe(1200);
    expect(S_MAX_FRACCION_D).toBe(0.5);
  });

  it('esfuerzos admisibles del acero D-1.5-18 a D-1.5-23', () => {
    expect(FS_ADMISIBLE['corrugada-traccion']).toMatchObject({ coef: 0.5, maxMpa: 170, ecuacion: 'D-1.5-18' });
    expect(FS_ADMISIBLE['lisa-traccion']).toMatchObject({ coef: 0.4, maxMpa: 140, ecuacion: 'D-1.5-19' });
    expect(FS_ADMISIBLE['alambre-traccion']).toMatchObject({ coef: 0.5, maxMpa: 210, ecuacion: 'D-1.5-20' });
    expect(FS_ADMISIBLE['columna-compresion']).toMatchObject({ coef: 0.4, maxMpa: 170, ecuacion: 'D-1.5-21' });
    expect(FS_ADMISIBLE['flexion-corrugada-compresion']).toMatchObject({ coef: 0.5, maxMpa: 170, ecuacion: 'D-1.5-22' });
    expect(FS_ADMISIBLE['flexion-lisa-compresion']).toMatchObject({ coef: 0.4, maxMpa: 140, ecuacion: 'D-1.5-23' });
  });
});

describe('Tabla D-1.5-1 (D-71)', () => {
  const v = (dir: string, uni: string) => TABLA_D151.find((f) => f.direccion === dir && f.unidad === uni)!;

  it('tiene 6 filas', () => {
    expect(TABLA_D151).toHaveLength(6);
  });

  it('perpendicular a las juntas horizontales', () => {
    expect(v('perpendicular-junta-horizontal', 'maciza').cementoCal).toEqual({ HMS: 0.28, N: 0.21 });
    expect(v('perpendicular-junta-horizontal', 'maciza').cementoMamposteria).toEqual({ HMS: 0.17, N: 0.1 });
    expect(v('perpendicular-junta-horizontal', 'perforacion-vertical-sin-rellenar').cementoCal).toEqual({ HMS: 0.17, N: 0.13 });
    expect(v('perpendicular-junta-horizontal', 'perforacion-vertical-sin-rellenar').cementoMamposteria).toEqual({ HMS: 0.1, N: 0.06 });
    expect(v('perpendicular-junta-horizontal', 'perforacion-vertical-rellena').cementoCal).toEqual({ HMS: 0.45, N: 0.43 });
    expect(v('perpendicular-junta-horizontal', 'perforacion-vertical-rellena').cementoMamposteria).toEqual({ HMS: 0.42, N: 0.4 });
  });

  it('perpendicular a la junta vertical', () => {
    expect(v('perpendicular-junta-vertical', 'maciza').cementoCal).toEqual({ HMS: 0.55, N: 0.41 });
    expect(v('perpendicular-junta-vertical', 'maciza').cementoMamposteria).toEqual({ HMS: 0.33, N: 0.21 });
    expect(v('perpendicular-junta-vertical', 'perforacion-vertical-sin-rellenar').cementoCal).toEqual({ HMS: 0.35, N: 0.26 });
    expect(v('perpendicular-junta-vertical', 'perforacion-vertical-sin-rellenar').cementoMamposteria).toEqual({ HMS: 0.21, N: 0.13 });
    expect(v('perpendicular-junta-vertical', 'perforacion-vertical-rellena').cementoCal).toEqual({ HMS: 0.55, N: 0.41 });
    expect(v('perpendicular-junta-vertical', 'perforacion-vertical-rellena').cementoMamposteria).toEqual({ HMS: 0.33, N: 0.21 });
  });

  it('la reducción del 50 % del texto no coincide con la tabla (errata del original)', () => {
    expect(REDUCCION_TEXTO_CEMENTO_MAMPOSTERIA).toBe(0.5);
    const f = v('perpendicular-junta-horizontal', 'perforacion-vertical-rellena');
    expect(f.cementoMamposteria.HMS).not.toBeCloseTo(f.cementoCal.HMS * 0.5, 2);
  });
});
