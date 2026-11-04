import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BARRAS_METRICAS,
  BARRAS_PULGADA,
  NORMAS_ASTM_SIN_NTC,
  NORMAS_DECLARADAS,
  NORMAS_MATERIALES,
  NORMAS_NTC,
  buscarBarra,
  buscarNTC,
} from './materialesConcreto';

describe('materialesConcreto: Tabla C.3.5.3-1 (barras métricas)', () => {
  it('14 designaciones únicas de 6M a 55M', () => {
    expect(BARRAS_METRICAS).toHaveLength(14);
    expect(new Set(BARRAS_METRICAS.map((b) => b.designacion)).size).toBe(14);
    expect(BARRAS_METRICAS[0].designacion).toBe('6M');
    expect(BARRAS_METRICAS[13].designacion).toBe('55M');
  });

  it('la designación coincide con el diámetro; área ≈ π d²/4, perímetro ≈ π d, masa ≈ 7.85e-3·A', () => {
    for (const b of BARRAS_METRICAS) {
      expect(b.designacion, b.designacion).toBe(`${b.diametro}M`);
      expect(Math.abs(b.area - (Math.PI * b.diametro ** 2) / 4), b.designacion).toBeLessThan(0.1);
      expect(Math.abs(b.perimetro - Math.PI * b.diametro), b.designacion).toBeLessThan(0.01);
      expect(Math.abs(b.masa / (b.area * 7.85e-3) - 1), b.designacion).toBeLessThan(0.005);
    }
  });

  it('valores clave del PDF', () => {
    expect(buscarBarra('10M')).toMatchObject({ diametro: 10, area: 78.5, perimetro: 31.42, masa: 0.616 });
    expect(buscarBarra('25M')).toMatchObject({ area: 490.9, masa: 3.851 });
    expect(buscarBarra('55M')).toMatchObject({ area: 2375.8, masa: 18.638 });
  });

  it('áreas y masas estrictamente crecientes', () => {
    for (let i = 1; i < BARRAS_METRICAS.length; i++) {
      expect(BARRAS_METRICAS[i].area).toBeGreaterThan(BARRAS_METRICAS[i - 1].area);
      expect(BARRAS_METRICAS[i].masa).toBeGreaterThan(BARRAS_METRICAS[i - 1].masa);
    }
  });
});

describe('materialesConcreto: Tabla C.3.5.3-2 (barras en octavos de pulgada)', () => {
  it('12 barras: No. 2 a 11, 14 y 18', () => {
    expect(BARRAS_PULGADA.map((b) => b.designacion)).toEqual(['No. 2', 'No. 3', 'No. 4', 'No. 5', 'No. 6', 'No. 7', 'No. 8', 'No. 9', 'No. 10', 'No. 11', 'No. 14', 'No. 18']);
  });

  it('el diámetro en mm es ≈ (No./8)·25.4 (±1.5 mm: los diámetros nominales ASTM de las barras gruesas difieren del No./8 en pulgadas) y el área ≈ π d²/4 (±2.5 %: el área tabulada es la estándar en pulgadas² convertida)', () => {
    for (const b of BARRAS_PULGADA) {
      const octavos = Number(b.designacion.replace('No. ', ''));
      expect(Math.abs(b.diametro - (octavos / 8) * 25.4), b.designacion).toBeLessThan(1.5);
      expect(Math.abs(b.area / ((Math.PI * b.diametro ** 2) / 4) - 1), b.designacion).toBeLessThan(0.025);
      expect(Math.abs(b.perimetro - Math.PI * b.diametro), b.designacion).toBeLessThan(0.3);
      expect(Math.abs(b.masa / (b.area * 7.85e-3) - 1), b.designacion).toBeLessThan(0.025);
    }
  });

  it('valores clave del PDF', () => {
    expect(buscarBarra('No. 4')).toMatchObject({ diametro: 12.7, area: 129, perimetro: 40, masa: 0.994 });
    expect(buscarBarra('No. 8')).toMatchObject({ area: 510, masa: 3.973 });
    expect(buscarBarra('No. 18')).toMatchObject({ area: 2581, masa: 20.24 });
  });
});

describe('materialesConcreto: normas de materiales y normas citadas', () => {
  it('todas las filas de NORMAS_MATERIALES traen al menos una norma y página impresa C-25 a C-30', () => {
    expect(NORMAS_MATERIALES.length).toBeGreaterThanOrEqual(40);
    for (const n of NORMAS_MATERIALES) {
      expect(Boolean(n.ntc || n.astm), `${n.seccion} ${n.material}`).toBe(true);
      expect(n.pag, n.seccion).toMatch(/^C-(2[5-9]|30)$/);
    }
  });

  it('NTC de C.3.8.1: 59 normas con número único', () => {
    expect(NORMAS_NTC).toHaveLength(59);
    expect(new Set(NORMAS_NTC.map((n) => n.numero)).size).toBe(59);
    expect(buscarNTC(2289)?.astm).toBe('ASTM A706');
    expect(buscarNTC(3330)?.astm).toBe('ASTM C1012');
    expect(buscarNTC(4049)?.titulo).toMatch(/cloruros solubles/);
    expect(buscarNTC(9999)).toBeUndefined();
  });

  it('las NTC citadas en C.3.2 a C.3.6 están en la lista C.3.8.1, salvo NTC 1362 (cemento blanco), que el PDF no lista', () => {
    const citadas = new Set<number>();
    for (const n of NORMAS_MATERIALES) for (const m of (n.ntc ?? '').matchAll(/NTC (\d+)/g)) citadas.add(Number(m[1]));
    const faltan = [...citadas].filter((c) => !buscarNTC(c));
    expect(faltan).toEqual([1362]);
  });

  it('ASTM sin NTC: 15 normas; declaradas: C.3.8.2 a C.3.8.8', () => {
    expect(NORMAS_ASTM_SIN_NTC).toHaveLength(15);
    expect(NORMAS_DECLARADAS.map((n) => n.seccion)).toEqual(['C.3.8.2', 'C.3.8.3', 'C.3.8.4', 'C.3.8.5', 'C.3.8.6', 'C.3.8.7', 'C.3.8.8']);
  });

  it('el capítulo c3.mdx transcribe todas las NTC, ASTM sin NTC y barras', () => {
    const mdx = readFileSync(new URL('../content/titulo-c/c3.mdx', import.meta.url), 'utf8');
    for (const n of NORMAS_NTC) expect(mdx, `NTC ${n.numero}`).toContain(`| NTC ${n.numero} |`);
    for (const a of NORMAS_ASTM_SIN_NTC) expect(mdx, a.designacion).toContain(a.designacion);
    for (const b of BARRAS_METRICAS) expect(mdx, b.designacion).toContain(`| ${b.designacion} | ${b.diametro.toFixed(1)} | ${b.area} |`);
    for (const b of BARRAS_PULGADA) expect(mdx, b.designacion).toContain(`| ${b.designacion} |`);
  });
});
