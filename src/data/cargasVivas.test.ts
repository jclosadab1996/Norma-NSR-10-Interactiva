import { describe, expect, it } from 'vitest';
import {
  CARGAS_CUBIERTA,
  CARGAS_VIVAS,
  GRANIZO,
  GRUPOS_OCUPACION,
  IMPACTO,
  PANELES_INFLUENCIA,
  PASAMANOS,
  REDUCCION_AREA,
  buscarUso,
  cargaVivaCubierta,
} from './cargasVivas';

describe('Tabla B.4.2.1-1 (cargas vivas mínimas)', () => {
  it('tiene 32 filas con ids únicos', () => {
    expect(CARGAS_VIVAS).toHaveLength(32);
    expect(new Set(CARGAS_VIVAS.map((u) => u.id)).size).toBe(32);
  });

  it('kgf/m² = 100 · kN/m² en todas las filas', () => {
    for (const u of CARGAS_VIVAS) expect(u.kgfm2).toBeCloseTo(u.kNm2 * 100, 6);
  });

  it('número de filas por ocupación (transcritas del PDF)', () => {
    const n = (g: string) => CARGAS_VIVAS.filter((u) => u.ocupacion === g).length;
    expect(n('Reunión')).toBe(9);
    expect(n('Oficinas')).toBe(3);
    expect(n('Educativos')).toBe(4);
    expect(n('Fábricas')).toBe(2);
    expect(n('Institucional')).toBe(3);
    expect(n('Comercio')).toBe(2);
    expect(n('Residencial')).toBe(3);
    expect(n('Almacenamiento')).toBe(2);
    expect(n('Garajes')).toBe(2);
    expect(n('Coliseos y Estadios')).toBe(2);
    expect(new Set(CARGAS_VIVAS.map((u) => u.ocupacion))).toEqual(new Set(GRUPOS_OCUPACION));
  });

  it('valores clave verificados contra la imagen del PDF', () => {
    expect(buscarUso('oficinas-oficinas')?.kNm2).toBe(2.0);
    expect(buscarUso('residencial-cuartos')?.kNm2).toBe(1.8);
    expect(buscarUso('reunion-escenarios')?.kNm2).toBe(7.5);
    expect(buscarUso('fabricas-pesadas')?.kNm2).toBe(10.0);
    expect(buscarUso('almacenamiento-pesado')?.kNm2).toBe(12.0);
    expect(buscarUso('garajes-pasajeros')?.kNm2).toBe(2.5);
    expect(buscarUso('educativos-biblioteca-estanterias')?.kNm2).toBe(7.0);
    expect(buscarUso('educativos-biblioteca-lectura')?.kNm2).toBe(2.0);
    expect(buscarUso('no-existe')).toBeUndefined();
  });

  it('usos que admiten reducción por área aferente (1.8 < L0 < 3.0)', () => {
    const elegibles = CARGAS_VIVAS.filter((u) => u.kNm2 > REDUCCION_AREA.l0MinExcl && u.kNm2 < REDUCCION_AREA.l0MaxExcl).map((u) => u.id);
    expect(elegibles.sort()).toEqual(
      ['educativos-biblioteca-lectura', 'educativos-salones', 'garajes-pasajeros', 'institucional-cuartos', 'oficinas-oficinas'].sort(),
    );
  });
});

describe('Tabla B.4.2.1-2 (cubiertas)', () => {
  it('cuatro filas y valores', () => {
    expect(CARGAS_CUBIERTA).toHaveLength(4);
    expect(cargaVivaCubierta('jardin-reunion')).toBe(5.0);
    expect(cargaVivaCubierta('inclinada-mayor-15')).toBe(0.35);
    expect(cargaVivaCubierta('inclinada-menor-15')).toBe(0.5);
  });

  it('azotea: la mayor carga del resto de la edificación (Nota-1)', () => {
    expect(cargaVivaCubierta('azotea-terraza', [2.0, 5.0, 3.0])).toBe(5.0);
    expect(Number.isNaN(cargaVivaCubierta('azotea-terraza'))).toBe(true);
    expect(Number.isNaN(cargaVivaCubierta('otra'))).toBe(true);
  });
});

describe('otros valores explícitos del capítulo', () => {
  it('impacto B.4.4', () => {
    expect(IMPACTO.map((i) => i.porcentaje)).toEqual([100, 25, 10, 20, 50, 33]);
    expect(IMPACTO.find((i) => i.literal === 'e')?.minimo).toBe(true);
  });

  it('paneles B.4.5.1.2', () => {
    expect(PANELES_INFLUENCIA['viga-central'].paneles).toBe(2);
    expect(PANELES_INFLUENCIA['viga-borde'].paneles).toBe(1);
    expect(PANELES_INFLUENCIA['columna-central'].paneles).toBe(4);
    expect(PANELES_INFLUENCIA['columna-borde'].paneles).toBe(2);
    expect(PANELES_INFLUENCIA['columna-esquina'].paneles).toBe(1);
  });

  it('pasamanos B.4.2.2 y granizo B.4.8.3', () => {
    expect(PASAMANOS.general).toBe(1.0);
    expect(PASAMANOS.viviendaUnifamiliar).toBe(0.4);
    expect(PASAMANOS.estadiosColiseos).toBe(2.5);
    expect(PASAMANOS.barreraVehiculos.cargaKn).toBe(30);
    expect(GRANIZO.g).toBe(1.0);
    expect(GRANIZO.gReducida).toBe(0.5);
    expect(GRANIZO.alturaMsnmM).toBe(2000);
  });
});
