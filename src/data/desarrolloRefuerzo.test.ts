import { describe, expect, it } from 'vitest';
import {
  ALMA,
  CABEZA,
  CB_KTR_DB_MAX,
  C121_CONSTANTE,
  COMPRESION,
  EMPALMES,
  EMPALME_COLUMNAS,
  EMPALME_COMPRESION,
  FACTORES_GANCHO,
  FACTOR_CLASE_EMPALME,
  FACTOR_PAQUETE,
  FC_MAX_EQUIVALENTE_MPA,
  FLEXION,
  FRONTERA_TAMANO_DB_MM,
  KTR_CONSTANTE,
  MALLA,
  MINIMOS,
  PSI_E,
  PSI_S,
  PSI_T,
  RAIZ_FC_MAX_MPA,
  TABLA_C122,
  TORON,
} from './desarrolloRefuerzo';

describe('desarrolloRefuerzo: tabla de C.12.2.2 y factores de C.12.2.4', () => {
  it('Tabla C.12.2.2: 2.1 / 1.7 (espaciamiento adecuado) y 1.4 / 1.1 (otros casos)', () => {
    expect(TABLA_C122.map((f) => [f.id, f.pequenas, f.grandes])).toEqual([
      ['espaciamiento-adecuado', 2.1, 1.7],
      ['otros-casos', 1.4, 1.1],
    ]);
  });

  it('los divisores de la tabla son coherentes con la Ec. C.12-1 evaluada en (cb+Ktr)/db = 1.5 y 1.0', () => {
    // C.12-1: ℓd/db = fy ψs/(1.1 λ √f′c (cb+Ktr)/db). La tabla ya incluye ψs (0.8 para ≤ No. 6).
    const eq = (psiS: number, t: number) => 1.1 * t / psiS; // divisor equivalente
    const [adecuado, otros] = TABLA_C122;
    expect(eq(PSI_S.pequenas, 1.5)).toBeCloseTo(adecuado.pequenas, 1); // 2.06 ≈ 2.1
    expect(eq(PSI_S.grandes, 1.5)).toBeCloseTo(adecuado.grandes, 1); // 1.65 ≈ 1.7
    expect(eq(PSI_S.pequenas, 1.0)).toBeCloseTo(otros.pequenas, 1); // 1.375 ≈ 1.4
    expect(eq(PSI_S.grandes, 1.0)).toBeCloseTo(otros.grandes, 12); // 1.1
  });

  it('factores ψt, ψe, ψs y límites', () => {
    expect(PSI_T).toMatchObject({ masDe300mmDebajo: 1.3, otros: 1.0, umbralConcretoFrescoMm: 300 });
    expect(PSI_E).toMatchObject({
      epoxicoRecubrimientoOSeparacionPequenos: 1.5,
      epoxicoOtros: 1.2,
      sinEpoxico: 1.0,
      recubrimientoLimiteDb: 3,
      separacionLimiteDb: 6,
      productoMaximoPsiTPsiE: 1.7,
    });
    expect(PSI_S).toEqual({ pequenas: 0.8, grandes: 1.0 });
    expect(FRONTERA_TAMANO_DB_MM).toBe(20);
    expect(C121_CONSTANTE).toBe(1.1);
    expect(CB_KTR_DB_MAX).toBe(2.5);
    expect(KTR_CONSTANTE).toBe(40);
  });

  it('C.12.1.2: √f′c ≤ 8.3 MPa equivale a f′c ≤ 68.89 MPa', () => {
    expect(RAIZ_FC_MAX_MPA).toBe(8.3);
    expect(FC_MAX_EQUIVALENTE_MPA).toBeCloseTo(68.89, 12);
  });

  it('longitudes mínimas', () => {
    expect(MINIMOS).toMatchObject({ ldTraccion: 300, ldCompresion: 200, ldhFactorDb: 8, ldhMm: 150, ldtFactorDb: 8, ldtMm: 150, ldMallaCorrugada: 200, ldMallaLisa: 150, empalme: 300 });
  });
});

describe('desarrolloRefuerzo: compresión, paquetes, ganchos y cabezas', () => {
  it('C.12.3: 0.24, 0.043 y factor 0.75 por espiral', () => {
    expect(COMPRESION).toMatchObject({ k1: 0.24, k2: 0.043, factorEspiral: 0.75, espiralBarraMinMm: 6, espiralPasoMaxMm: 100 });
  });

  it('C.12.4.1: ×1.20 (3 barras) y ×1.33 (4 barras)', () => {
    expect(FACTOR_PAQUETE[3]).toBe(1.2);
    expect(FACTOR_PAQUETE[4]).toBe(1.33);
  });

  it('C.12.5.3: factores 0.7, 0.8, 0.8 y el de exceso depende de As', () => {
    expect(FACTORES_GANCHO.map((f) => f.factor)).toEqual([0.7, 0.8, 0.8, null]);
    expect(FACTORES_GANCHO.map((f) => f.seccion)).toEqual(['C.12.5.3 (a)', 'C.12.5.3 (b)', 'C.12.5.3 (c)', 'C.12.5.3 (d)']);
  });

  it('C.12.6: barras con cabeza', () => {
    expect(CABEZA).toMatchObject({ k: 0.19, fyMaxMpa: 420, dbMaxMm: 36, areaApoyoMinFactor: 4, recubrimientoMinDb: 2, separacionLibreMinDb: 4, fcMaxMpa: 40, psiEEpoxico: 1.2 });
  });
});

describe('desarrolloRefuerzo: malla, torones, flexión y alma', () => {
  it('C.12.7 a C.12.9', () => {
    expect(MALLA).toMatchObject({ psiWConstanteMpa: 240, psiWFactorDbSobreS: 5, transversalMinDesdeSeccionMm: 50, mdMaxMm: 16, lisaK: 3.3 });
    expect(TORON).toMatchObject({ divisorFse: 21, divisorDelta: 7, factorSiTraccionSinAdherenciaHastaElExtremo: 2 });
  });

  it('C.12.10 a C.12.12', () => {
    expect(FLEXION.extensionDb).toBe(12);
    expect(FLEXION.fraccionVuC12105_1).toBeCloseTo(2 / 3, 12);
    expect(FLEXION.fraccionVuC12105_3).toBe(0.75);
    expect(FLEXION.estribosExtraK).toBe(0.41);
    expect(FLEXION.separacionMaxEstribosDivisor).toBe(8);
    expect(FLEXION.fraccionPositivoAlApoyo.simple).toBeCloseTo(1 / 3, 12);
    expect(FLEXION.fraccionPositivoAlApoyo.continuo).toBe(0.25);
    expect(FLEXION.penetracionApoyoViga).toBe(150);
    expect(FLEXION.aumentoMnVuConfinado).toBe(1.3);
    expect(FLEXION.divisorLnC12123).toBe(16);
  });

  it('C.12.13: estribos en U', () => {
    expect(ALMA).toMatchObject({ kEstriboU: 0.17, fytUmbralMpa: 280, traslapoParesEstriboU: 1.3, dMinSinTraslapoMm: 450, fuerzaRamaMaxKn: 40 });
  });
});

describe('desarrolloRefuerzo: empalmes', () => {
  it('C.12.15.1: Clase A 1.0 y Clase B 1.3', () => {
    expect(FACTOR_CLASE_EMPALME).toEqual({ A: 1.0, B: 1.3 });
  });

  it('C.12.14 y C.12.15', () => {
    expect(EMPALMES.factorFyMecanicoSoldado).toBe(1.25);
    expect(EMPALMES.claseAAreaFactorMin).toBe(2);
    expect(EMPALMES.claseAFraccionMaxEmpalmada).toBe(0.5);
    expect(EMPALMES.parcialEscalonamientoMm).toBe(600);
    expect(EMPALMES.parcialEsfuerzoMinimoMpa).toBe(140);
    expect(EMPALMES.amarreEscalonamientoMm).toBe(750);
    expect(EMPALMES.separacionTransversalMm).toBe(150);
    expect(EMPALMES.traslapoDbMaxBarraEq).toBe(11);
  });

  it('C.12.16: compresión 0.071 fy db ó (0.13 fy − 24) db; 21 MPa → +1/3', () => {
    expect(EMPALME_COMPRESION).toMatchObject({ k1: 0.071, k2: 0.13, resta: 24, fyUmbralMpa: 420, fcUmbralMpa: 21, minimoMm: 300 });
    expect(EMPALME_COMPRESION.incrementoFcBajo).toBeCloseTo(1 / 3, 12);
    // continuidad aproximada en fy = 420: 0.071·420 = 29.82 y 0.13·420 − 24 = 30.6 (diferencia de 2.6 %)
    expect(EMPALME_COMPRESION.k1 * 420).toBeCloseTo(29.82, 10);
    expect(EMPALME_COMPRESION.k2 * 420 - EMPALME_COMPRESION.resta).toBeCloseTo(30.6, 10);
  });

  it('C.12.17: columnas', () => {
    expect(EMPALME_COLUMNAS).toMatchObject({ fraccionFyTraccion: 0.5, estribosCuantiaMin: 0.0015, factorEstribos: 0.83, factorEspiral: 0.75, topeFraccionFy: 0.25 });
  });
});
