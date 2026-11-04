import { describe, expect, it } from 'vitest';
import {
  ECUACIONES_U,
  TABLA_C95A,
  TABLA_C95B,
  TABLA_C95C,
  TABLA_PHI,
  TABLA_XI,
  FY_MAX_DISENO_MPA,
  ALFA_F_VIGA_BORDE_MIN,
} from './resistenciaServicioC9';

describe('Datos de C.9: integridad de las tablas transcritas', () => {
  it('siete ecuaciones U, C.9-1 a C.9-7, en la página C-67', () => {
    expect(ECUACIONES_U.map((e) => e.id)).toEqual(['C.9-1', 'C.9-2', 'C.9-3', 'C.9-4', 'C.9-5', 'C.9-6', 'C.9-7']);
    expect(ECUACIONES_U.every((e) => e.pag === 'C-67')).toBe(true);
  });

  it('Tabla C.9.5(a): divisores del PDF (p.372)', () => {
    expect(TABLA_C95A['losa-maciza']).toEqual({ simple: 20, 'un-extremo': 24, 'ambos-extremos': 28, voladizo: 10 });
    expect(TABLA_C95A['viga-nervada']).toEqual({ simple: 16, 'un-extremo': 18.5, 'ambos-extremos': 21, voladizo: 8 });
  });

  it('Tabla C.9.5(a): el divisor crece con la continuidad y el voladizo es el más flexible', () => {
    for (const fila of Object.values(TABLA_C95A)) {
      expect(fila.simple).toBeLessThan(fila['un-extremo']);
      expect(fila['un-extremo']).toBeLessThan(fila['ambos-extremos']);
      expect(fila.voladizo).toBeLessThan(fila.simple);
    }
  });

  it('Tabla C.9.5(b): límites ℓ/180, 360, 480 y 240 (p.373)', () => {
    expect(TABLA_C95B.map((f) => f.divisor)).toEqual([180, 360, 480, 240]);
    expect(TABLA_C95B.map((f) => f.id)).toEqual(['cubierta-plana', 'entrepiso', 'susceptibles', 'no-susceptibles']);
  });

  it('Tabla C.9.5(c): filas fy = 280, 420, 520 y valores del PDF (p.374)', () => {
    expect(TABLA_C95C.map((f) => f.fy)).toEqual([280, 420, 520]);
    const f280 = TABLA_C95C[0].valores;
    expect([f280['sin-abaco']['ext-sin-borde'], f280['sin-abaco']['ext-con-borde'], f280['sin-abaco'].interior]).toEqual([33, 36, 36]);
    expect([f280['con-abaco']['ext-sin-borde'], f280['con-abaco']['ext-con-borde'], f280['con-abaco'].interior]).toEqual([36, 40, 40]);
    const f420 = TABLA_C95C[1].valores;
    expect([f420['sin-abaco']['ext-sin-borde'], f420['sin-abaco']['ext-con-borde'], f420['sin-abaco'].interior]).toEqual([30, 33, 33]);
    expect([f420['con-abaco']['ext-sin-borde'], f420['con-abaco']['ext-con-borde'], f420['con-abaco'].interior]).toEqual([33, 36, 36]);
    const f520 = TABLA_C95C[2].valores;
    expect([f520['sin-abaco']['ext-sin-borde'], f520['sin-abaco']['ext-con-borde'], f520['sin-abaco'].interior]).toEqual([28, 31, 31]);
    expect([f520['con-abaco']['ext-sin-borde'], f520['con-abaco']['ext-con-borde'], f520['con-abaco'].interior]).toEqual([31, 34, 34]);
  });

  it('Tabla C.9.5(c): el divisor baja al subir fy y sube con ábacos; panel interior = exterior con borde', () => {
    for (let i = 0; i < TABLA_C95C.length - 1; i++) {
      for (const ab of ['sin-abaco', 'con-abaco'] as const) {
        for (const p of ['ext-sin-borde', 'ext-con-borde', 'interior'] as const) {
          expect(TABLA_C95C[i + 1].valores[ab][p]).toBeLessThan(TABLA_C95C[i].valores[ab][p]);
        }
      }
    }
    for (const f of TABLA_C95C) {
      for (const p of ['ext-sin-borde', 'ext-con-borde', 'interior'] as const) {
        expect(f.valores['con-abaco'][p]).toBeGreaterThan(f.valores['sin-abaco'][p]);
      }
      expect(f.valores['sin-abaco'].interior).toBe(f.valores['sin-abaco']['ext-con-borde']);
    }
  });

  it('ξ de C.9.5.2.5: 3, 6, 12 meses y 5 años', () => {
    expect(TABLA_XI.map((x) => [x.meses, x.xi])).toEqual([
      [3, 1.0],
      [6, 1.2],
      [12, 1.4],
      [60, 2.0],
    ]);
  });

  it('coeficientes φ de C.9.3 (PDF p.370–371)', () => {
    const phi = (s: string) => TABLA_PHI.find((f) => f.seccion === s)!;
    expect(phi('C.9.3.2.1').phi).toBe(0.9);
    expect(phi('C.9.3.2.2(a)').phi).toBe(0.75);
    expect(phi('C.9.3.2.2(b)').phi).toBe(0.65);
    expect(phi('C.9.3.2.3').phi).toBe(0.75);
    expect(phi('C.9.3.2.4').phi).toBe(0.65);
    expect(phi('C.9.3.2.5').phi).toBe(0.85);
    expect(phi('C.9.3.2.6').phi).toBe(0.75);
    expect(phi('C.9.3.2.7(b)')).toMatchObject({ phi: 0.75, phiFinal: 0.9 });
    expect(phi('C.9.3.4(a)').phi).toBe(0.6);
    expect(phi('C.9.3.4(c)').phi).toBe(0.85);
    expect(phi('C.9.3.5').phi).toBe(0.6);
    expect(new Set(TABLA_PHI.map((f) => f.seccion)).size).toBe(TABLA_PHI.length);
  });

  it('otros umbrales: fy ≤ 550 MPa y αf de viga de borde ≥ 0.80', () => {
    expect(FY_MAX_DISENO_MPA).toBe(550);
    expect(ALFA_F_VIGA_BORDE_MIN).toBe(0.8);
  });
});
