import { describe, expect, it } from 'vitest';
import {
  ALAMBRES_REFUERZO,
  BARRAS_METRICAS,
  BARRAS_PULGADA,
  ECUACIONES_CC,
  ESPACIAMIENTOS_ALAMBRE_MM,
  MASA_POR_AREA_ACERO,
  PHI_CC,
  TABLA_BETA_N,
  TABLA_BETA_S,
  TABLA_PHI_COMPARADA,
  TENDONES,
  areaBarra,
  areaNBarras,
  asPorMetroMalla,
  asPorMetroTabla,
  barrasNecesarias,
  buscarAlambre,
} from './apendicesC';

describe('Apéndice C-A: tablas de βs y βn', () => {
  it('cinco casos de βs y tres de βn', () => {
    expect(TABLA_BETA_S).toHaveLength(5);
    expect(TABLA_BETA_N).toHaveLength(3);
    expect(TABLA_BETA_N.map((f) => f.beta)).toEqual([1.0, 0.8, 0.6]);
  });
});

describe('Apéndice C-C: ecuaciones y φ', () => {
  it('seis ecuaciones C-C.9-1 a C-C.9-6', () => {
    expect(ECUACIONES_CC.map((e) => e.id)).toEqual(['C-C.9-1', 'C-C.9-2', 'C-C.9-3', 'C-C.9-4', 'C-C.9-5', 'C-C.9-6']);
  });
  it('PHI_CC coincide con la tabla comparada', () => {
    const f = (s: string) => TABLA_PHI_COMPARADA.find((x) => x.seccion === s)!;
    expect(f('C-C.9.3.2.1').phiCC).toBe(PHI_CC.traccion);
    expect(f('C-C.9.3.2.2(a)').phiCC).toBe(PHI_CC.compresionEspiral);
    expect(f('C-C.9.3.2.2(b)').phiCC).toBe(PHI_CC.compresionOtros);
    expect(f('C-C.9.3.2.3').phiCC).toBe(PHI_CC.cortanteTorsion);
    expect(f('C-C.9.3.2.4').phiCC).toBe(PHI_CC.aplastamiento);
    expect(f('C-C.9.3.2.5').phiCC).toBe(PHI_CC.anclajePostensado);
    expect(f('C-C.9.3.2.6').phiCC).toBe(PHI_CC.puntalTensor);
    expect(f('C-C.9.3.2.7').phiCC).toBe(PHI_CC.pretensadoSinDesarrollo);
    expect(f('C-C.9.3.5').phiCC).toBe(PHI_CC.simple);
  });
});

describe('Apéndice C-E: barras (Tablas C.3.5.3-1 y C.3.5.3-2)', () => {
  it('14 barras métricas y 12 de pulgada; la 6M y la 55M tal como en el PDF', () => {
    expect(BARRAS_METRICAS).toHaveLength(14);
    expect(BARRAS_PULGADA).toHaveLength(12);
    expect(areaBarra('6M')).toBe(28.3);
    expect(areaBarra('55M')).toBe(2375.8);
    expect(areaBarra('No. 8')).toBe(510);
    expect(areaBarra('No. 99')).toBeUndefined();
  });
  it('el área tabulada coincide con πd²/4 (métricas: 0.1 %; pulgadas: 2 %) y la masa con 7.85×10⁻³·A (métricas 1 %, pulgadas 2 %)', () => {
    for (const b of BARRAS_METRICAS) {
      expect(Math.abs(b.area / ((Math.PI * b.diametro ** 2) / 4) - 1)).toBeLessThan(0.001);
      expect(Math.abs(b.masa / (b.area * MASA_POR_AREA_ACERO) - 1)).toBeLessThan(0.01);
      expect(Math.abs(b.perimetro / (Math.PI * b.diametro) - 1)).toBeLessThan(0.001);
    }
    for (const b of BARRAS_PULGADA) {
      expect(Math.abs(b.area / ((Math.PI * b.diametro ** 2) / 4) - 1)).toBeLessThan(0.02);
      expect(Math.abs(b.masa / (b.area * MASA_POR_AREA_ACERO) - 1)).toBeLessThan(0.02);
    }
  });
  it('n barras y barras necesarias', () => {
    expect(areaNBarras(8, 'No. 8')).toBe(4080);
    expect(barrasNecesarias(4000, 'No. 8')).toBe(8); // 4000/510 = 7.84
    expect(barrasNecesarias(4080, 'No. 8')).toBe(8);
    expect(barrasNecesarias(4081, 'No. 8')).toBe(9);
    expect(barrasNecesarias(1000, '25M')).toBe(3); // 1000/490.9 = 2.04
    expect(() => barrasNecesarias(100, 'XX')).toThrow();
  });
});

describe('Apéndice C-E: tendones de preesfuerzo', () => {
  it('25 tamaños en 5 tipos', () => {
    expect(TENDONES).toHaveLength(25);
    const por = (t: string) => TENDONES.filter((x) => x.tipo === t).length;
    expect(por('toron-1725')).toBe(6);
    expect(por('toron-1860')).toBe(4);
    expect(por('alambre-preesforzado')).toBe(4);
    expect(por('barra-preesforzado-lisa')).toBe(6);
    expect(por('barra-preesforzado-corrugada')).toBe(5);
  });
  it('la masa es ≈ 7.85×10⁻³ × área (3 %; 5 % en barras corrugadas de rosca)', () => {
    for (const x of TENDONES) {
      const tol = x.tipo === 'barra-preesforzado-corrugada' ? 0.05 : 0.03;
      expect(Math.abs(x.masa / (x.area * MASA_POR_AREA_ACERO) - 1)).toBeLessThan(tol);
    }
  });
  it('el área de las barras lisas y del alambre es ≈ πd²/4 (3.5 %); los dos valores sin punto en el PDF se deducen', () => {
    for (const x of TENDONES.filter((t) => t.tipo === 'barra-preesforzado-lisa' || t.tipo === 'alambre-preesforzado')) {
      expect(Math.abs(x.area / ((Math.PI * x.diametro ** 2) / 4) - 1)).toBeLessThan(0.035);
    }
    expect(TENDONES.filter((x) => x.deducido)).toHaveLength(2);
  });
  it('los torones de 15.2 y 15.24 mm tienen 139.4 y 140.0 mm²', () => {
    expect(TENDONES.find((x) => x.tipo === 'toron-1725' && x.diametro === 15.2)!.area).toBe(139.4);
    expect(TENDONES.find((x) => x.tipo === 'toron-1860' && x.diametro === 15.24)!.area).toBe(140.0);
  });
});

describe('Apéndice C-E: alambre de refuerzo MW y MD', () => {
  it('21 tamaños y 7 espaciamientos; MW 20, 15, 10 y 5 no tienen corrugado', () => {
    expect(ALAMBRES_REFUERZO).toHaveLength(21);
    expect(ESPACIAMIENTOS_ALAMBRE_MM).toHaveLength(7);
    expect(ALAMBRES_REFUERZO.filter((a) => a.corrugado === null).map((a) => a.liso)).toEqual(['MW 20', 'MW 15', 'MW 10', 'MW 5']);
  });
  it('el número del tamaño es el área en mm²: el diámetro es √(4A/π) y la masa 7.85×10⁻³·A (1 %)', () => {
    for (const a of ALAMBRES_REFUERZO) {
      const area = Number(a.liso.replace('MW', ''));
      expect(Math.abs(a.diametro / Math.sqrt((4 * area) / Math.PI) - 1)).toBeLessThan(0.01);
      expect(Math.abs(a.masa / (area * MASA_POR_AREA_ACERO) - 1)).toBeLessThan(0.01);
    }
  });
  it('cada As/m tabulada es área·1000/s con el redondeo de la tabla (≤ 5.5 %)', () => {
    for (const a of ALAMBRES_REFUERZO) {
      const area = Number(a.liso.replace('MW', ''));
      ESPACIAMIENTOS_ALAMBRE_MM.forEach((s, i) => {
        const exacto = (area * 1000) / s;
        expect(Math.abs(a.asPorMetro[i] / exacto - 1)).toBeLessThan(0.055);
      });
    }
  });
  it('lecturas puntuales: MW 130 @ 150 = 870; MD 130 @ 150 = 870; MW 25 @ 300 = 83; MW 290 @ 50 = 5800', () => {
    expect(asPorMetroTabla('MW 130', 150)).toBe(870);
    expect(asPorMetroTabla('MD130', 150)).toBe(870);
    expect(asPorMetroTabla('MW 25', 300)).toBe(83);
    expect(asPorMetroTabla('MW 290', 50)).toBe(5800);
    expect(buscarAlambre('MD 20')).toBeUndefined();
    expect(asPorMetroTabla('MW 999', 100)).toBeUndefined();
  });
  it('asPorMetroMalla: 130 mm² cada 150 mm = 866.7 mm²/m', () => {
    expect(asPorMetroMalla(130, 150)).toBeCloseTo(866.667, 3);
  });
});
