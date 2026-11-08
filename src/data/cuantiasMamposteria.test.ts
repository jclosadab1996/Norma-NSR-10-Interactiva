import { describe, expect, it } from 'vitest';
import {
  BARRAS_D,
  CAPACIDAD_DISIPACION,
  D6,
  D7,
  D8,
  D9,
  DIAMETRO_N2_6M,
  DIAMETRO_N3_10M,
  DIAMETRO_N4_12M,
  buscarBarraD,
} from './cuantiasMamposteria';
import { buscarBarra } from './materialesConcreto';

describe('constantes de los Capítulos D.6 a D.9 (verificadas contra las páginas D-43 a D-52)', () => {
  it('D.6: espesores, resistencias y cuantías', () => {
    expect(D6.espesorTotalMin).toBe(190);
    expect(D6.espesorParedMin + D6.espesorCavidadMin + D6.espesorParedMin).toBe(190);
    expect(D6.resistencias).toMatchObject({ materialInyeccionMin: 12.5, fmMin: 6.25, fmFraccionMin: 0.5, fmFraccionMax: 2 });
    expect(D6.cuantiaCavidad).toEqual({ vertical: 0.0015, horizontal: 0.002 });
    expect(D6.cuantiaSeccion).toEqual({ porDireccion: 0.0007, suma: 0.002 });
  });
  it('D.6: separaciones, conectores, capas y construcción', () => {
    expect(D6.separacion).toEqual({ max: 400, min: 50, posicionadorDiametros: 250, posicionadorMax: 3000 });
    expect(D6.conectores).toMatchObject({ diametroMin: 4, sepVerticalMax: 600, sepHorizontalMax: 800 });
    expect(D6.conectorZeta).toEqual({ pataMin: 50, sepVerticalMax: 400, sepHorizontalMax: 600 });
    expect(D6.capas).toEqual({ unaCapaHasta: 150, fraccionMaxPorCapa: 0.66 });
    expect(D6.diametroMaxFraccionCavidad).toBe(0.25);
    expect(D6.cortanteContactoMax).toBe(0.07);
    expect(D6.compresion.estriboSepMax).toBe(200);
    expect(D6.compresion.estriboSepDiametros).toBe(16);
    expect(D6.construccion.longitudInyeccionMax).toBe(8);
    expect(D6.construccion.alturaCapaInyeccion).toBe(1.2);
    expect(D6.construccion.edadMinimaInyeccionDias).toBe(3);
  });
  it('D.7: cuantías y separaciones', () => {
    expect(D7.espesorNominalMin).toBe(120);
    expect([D7.fmMin, D7.fmMax]).toEqual([10, 28]);
    expect(D7.cuantia).toEqual({ porDireccion: 0.0007, suma: 0.002, fraccionVerticalDeHorizontal: 0.5 });
    expect(D7.vertical.sepMax).toBe(1200);
    expect(D7.horizontal.juntaSepMax).toBe(600);
    expect(D7.horizontal.juntaDiametroMin).toBe(4);
    // Valor impreso (posible errata) y valor probable
    expect(D7.horizontal.embebidoSepMax).toBe(120);
    expect(D7.horizontal.embebidoSepMaxProbable).toBe(1200);
    expect(D7.des.limiteImpreso).toBe(120);
    expect(D7.des.limiteProbable).toBe(1200);
  });
  it('D.8: cuantía y separaciones', () => {
    expect(D8.cuantiaPorDireccion).toBe(0.00027);
    expect(D8.fmMin).toBe(8);
    expect(D8.vertical.sepMax).toBe(2400);
    expect(D8.horizontal.juntaSepMax).toBe(800);
    expect(D8.horizontal.embebidoSepMax).toBe(3000);
  });
  it('D.9: espesor y Aa', () => {
    expect(D9.espesorNominalMin).toBe(120);
    expect(D9.aaMax).toBe(0.05);
  });
  it('equivalencias de diámetro y capacidad de disipación', () => {
    expect([DIAMETRO_N4_12M, DIAMETRO_N3_10M, DIAMETRO_N2_6M]).toEqual([12, 9.5, 6]);
    expect(CAPACIDAD_DISIPACION.cavidad.codigo).toBe('DES');
    expect(CAPACIDAD_DISIPACION.reforzadaSoloConRefuerzo.codigo).toBe('DMO');
    expect(CAPACIDAD_DISIPACION.parcial.codigo).toBe('DMO');
    expect(CAPACIDAD_DISIPACION.noReforzada.codigo).toBe('DMI');
  });
  it('catálogo de barras: coincide con las tablas C.3.5.3 (salvo el alambre de 4 mm)', () => {
    for (const b of BARRAS_D) {
      if (b.id === 'alambre-4') {
        expect(b.area).toBeCloseTo((Math.PI * 16) / 4, 0);
        continue;
      }
      const ref = buscarBarra(b.id);
      expect(ref, b.id).toBeDefined();
      expect(b.area).toBe(ref!.area);
      expect(b.diametro).toBe(ref!.diametro);
    }
    expect(buscarBarraD('No. 4').area).toBe(129);
    expect(buscarBarraD('no-existe')).toBe(BARRAS_D[0]);
  });
});
