import { describe, expect, it } from 'vitest';
import {
  BS_VALLAS,
  CF_VALLAS_AB,
  CP_CUBIERTA_BARLOVENTO,
  CP_CUBIERTA_SOTAVENTO,
  CP_MURO_SOTAVENTO,
  FACTOR_REDUCCION_AREA,
  GCPF,
  GCPI,
  GCPN_PARAPETO,
  HL_CUBIERTA,
  THETA_BARLOVENTO,
  THETA_SOTAVENTO,
  ZONAS_GCPF,
} from './vientoPresiones';

describe('forma de las tablas de viento (B.6.5.11)', () => {
  it('GCpi de la Figura B.6.5-2 (PDF p.268)', () => {
    expect(GCPI.abierto.positivo).toBe(0);
    expect(GCPI.parcial.positivo).toBe(0.55);
    expect(GCPI.parcial.negativo).toBe(-0.55);
    expect(GCPI.cerrado.positivo).toBe(0.18);
    expect(GCPI.cerrado.negativo).toBe(-0.18);
  });

  it('Cp de cubiertas: dimensiones y monotonía', () => {
    expect(CP_CUBIERTA_BARLOVENTO.map((f) => f.hl)).toEqual([...HL_CUBIERTA]);
    for (const f of CP_CUBIERTA_BARLOVENTO) {
      expect(f.fila1.length).toBe(THETA_BARLOVENTO.length);
      expect(f.fila2.length).toBe(THETA_BARLOVENTO.length);
      // la fila 1 nunca excede a la fila 2 hasta θ = 30° (succión máxima en la fila superior), salvo la errata de θ = 30°
      for (let j = 0; j < 4; j++) expect(f.fila1[j]).toBeLessThanOrEqual(f.fila2[j]);
    }
    for (const f of CP_CUBIERTA_SOTAVENTO) expect(f.cp.length).toBe(THETA_SOTAVENTO.length);
    // la succión a sotavento nunca es mayor a −0.7 ni menor a −0.3
    for (const f of CP_CUBIERTA_SOTAVENTO) for (const v of f.cp) expect(v >= -0.7 && v <= -0.3).toBe(true);
  });

  it('valores de referencia de la Figura B.6.5-3 transcritos', () => {
    expect(CP_CUBIERTA_BARLOVENTO[0].fila1[0]).toBe(-0.7);
    expect(CP_CUBIERTA_BARLOVENTO[1].fila1[0]).toBe(-0.9);
    expect(CP_CUBIERTA_BARLOVENTO[2].fila1[0]).toBe(-1.3);
    expect(CP_CUBIERTA_SOTAVENTO[2].cp).toEqual([-0.7, -0.6, -0.6]);
    expect(CP_MURO_SOTAVENTO.map((p) => p.cp)).toEqual([-0.5, -0.3, -0.2]);
  });

  it('GCpf de la Figura B.6.5-7 (PDF p.275): 10 zonas por fila y signos de la zona 1', () => {
    expect(ZONAS_GCPF.length).toBe(10);
    for (const f of GCPF) expect(f.valores.length).toBe(10);
    for (const f of GCPF) expect(f.valores[0]).toBeGreaterThan(0); // zona 1 siempre a presión
    // las zonas 3–6 y 3E–4E son siempre succión
    for (const f of GCPF) for (const j of [2, 3, 4, 5, 8, 9]) expect(f.valores[j]).toBeLessThan(0);
    // la zona de esquina 1E supera a la 1 y la 3E succiona al menos lo que la 3
    for (const f of GCPF) {
      expect(f.valores[6]).toBeGreaterThanOrEqual(f.valores[0]);
      expect(f.valores[8]).toBeLessThanOrEqual(f.valores[2]); // 3E vs 3 (succión mayor en la esquina)
    }
  });

  it('factor de reducción por área es decreciente y termina en 0.8', () => {
    for (let i = 1; i < FACTOR_REDUCCION_AREA.length; i++) {
      expect(FACTOR_REDUCCION_AREA[i].factor).toBeLessThan(FACTOR_REDUCCION_AREA[i - 1].factor);
    }
    expect(FACTOR_REDUCCION_AREA[FACTOR_REDUCCION_AREA.length - 1].factor).toBe(0.8);
  });

  it('parapetos: +1.5 a barlovento y −1.0 a sotavento (B.6.5.12.2.4)', () => {
    expect(GCPN_PARAPETO).toEqual({ barlovento: 1.5, sotavento: -1.0 });
  });

  it('Cf de vallas (Figura B.6.5-17, casos A y B): 7 filas × 12 columnas; Cf crece al disminuir s/h', () => {
    expect(CF_VALLAS_AB.length).toBe(7);
    for (const f of CF_VALLAS_AB) expect(f.cf.length).toBe(BS_VALLAS.length);
    // para B/s = 1 (columna 4): 1.45 en s/h = 1 y 1.80 en s/h ≤ 0.16
    expect(CF_VALLAS_AB[0].cf[4]).toBe(1.45);
    expect(CF_VALLAS_AB[6].cf[4]).toBe(1.8);
    for (let i = 1; i < CF_VALLAS_AB.length; i++) {
      for (let j = 0; j < BS_VALLAS.length; j++) {
        expect(CF_VALLAS_AB[i].cf[j]).toBeGreaterThanOrEqual(CF_VALLAS_AB[i - 1].cf[j]);
      }
    }
  });
});
