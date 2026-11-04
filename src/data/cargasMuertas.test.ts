import { describe, expect, it } from 'vitest';
import {
  CIELO_RASO,
  COMPONENTES,
  CUBIERTAS,
  ENCHAPES,
  ESPESORES_MURO_MM,
  MATERIALES,
  MUROS_MAMPOSTERIA,
  MUROS_PANELES,
  PARTICIONES_LIVIANAS,
  PISOS,
  RECUBRIMIENTO_MUROS,
  RELLENO_PISO,
  VALORES_ALTERNATIVOS,
  VENTANAS,
  buscarComponente,
  buscarMaterial,
  buscarMuro,
  buscarValorAlternativo,
} from './cargasMuertas';

describe('cargasMuertas: Tabla B.3.2-1 (masas de los materiales)', () => {
  it('56 materiales (28 por columna), ids únicos', () => {
    expect(MATERIALES).toHaveLength(56);
    const ids = MATERIALES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MATERIALES) expect(buscarMaterial(m.id)).toBe(m);
  });

  it('nombres únicos dentro de su grupo y densidades positivas en kg/m³', () => {
    const claves = MATERIALES.map((m) => `${m.grupo ?? ''}|${m.material}`);
    expect(new Set(claves).size).toBe(claves.length);
    for (const m of MATERIALES) {
      expect(m.densidad, m.id).toBeGreaterThan(0);
      expect(m.densidad, m.id).toBeGreaterThanOrEqual(200); // carbón vegetal es el más liviano
      expect(m.densidad, m.id).toBeLessThanOrEqual(11400); // plomo es el más pesado
      if (m.densidadMax !== undefined) expect(m.densidadMax).toBeGreaterThan(m.densidad);
    }
  });

  it('valores clave transcritos del PDF', () => {
    expect(buscarMaterial('concreto-reforzado')!.densidad).toBe(2400);
    expect(buscarMaterial('concreto-simple')!.densidad).toBe(2300);
    expect(buscarMaterial('acero')!.densidad).toBe(7800);
    expect(buscarMaterial('plomo')!.densidad).toBe(11400);
    expect(buscarMaterial('agua-dulce')!.densidad).toBe(1000);
    expect(buscarMaterial('agua-marina')!.densidad).toBe(1030);
    expect(buscarMaterial('madera-seca')).toMatchObject({ densidad: 450, densidadMax: 750 });
    expect(buscarMaterial('mamposteria-ladrillo-macizo')!.densidad).toBe(1850);
    expect(buscarMaterial('tierra-limo-humedo-suelto')!.densidad).toBe(1250);
    expect(buscarMaterial('zinc-laminas')!.densidad).toBe(7200);
  });
});

describe('cargasMuertas: tablas B.3.4.1 y B.3.4.2 (componentes)', () => {
  it('número de filas por tabla', () => {
    expect(CIELO_RASO).toHaveLength(9);
    expect(RELLENO_PISO).toHaveLength(4);
    expect(PISOS).toHaveLength(16);
    expect(CUBIERTAS).toHaveLength(24);
    expect(RECUBRIMIENTO_MUROS).toHaveLength(10);
    expect(PARTICIONES_LIVIANAS).toHaveLength(6);
    expect(ENCHAPES).toHaveLength(4);
    expect(MUROS_PANELES).toHaveLength(2);
    expect(VENTANAS).toHaveLength(2);
    expect(COMPONENTES).toHaveLength(9 + 4 + 16 + 24 + 10 + 6 + 4 + 2 + 2);
  });

  it('ids únicos y buscables', () => {
    const ids = COMPONENTES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COMPONENTES) expect(buscarComponente(c.id)).toBe(c);
    expect(buscarComponente('no-existe')).toBeUndefined();
  });

  it('sin filas duplicadas (misma tabla, grupo y nombre)', () => {
    const claves = COMPONENTES.map((c) => `${c.tabla}|${c.grupo ?? ''}|${c.componente}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('valores positivos y orientación coherente con la tabla', () => {
    for (const c of COMPONENTES) {
      expect(c.kN, c.id).toBeGreaterThan(0);
      expect(c.kgf, c.id).toBeGreaterThan(0);
      expect(c.orientacion, c.id).toBe(c.tabla.startsWith('B.3.4.1') ? 'horizontal' : 'vertical');
    }
  });

  it('unidades: la columna kgf de la norma es 100·kN (fijo) o 1000·kN/mm = kgf/cm (por espesor)', () => {
    for (const c of COMPONENTES) {
      const factor = c.tipo === 'fijo' ? 100 : 1000;
      expect(c.kgf, c.id).toBeCloseTo(c.kN * factor, 6);
    }
  });

  it('filas por espesor: las que la norma da "por mm de espesor"', () => {
    const porEspesor = COMPONENTES.filter((c) => c.tipo === 'por-espesor').map((c) => c.id).sort();
    expect(porEspesor).toEqual(
      [
        'cr-tableros-yeso',
        'rp-arena', 'rp-concreto-escoria', 'rp-concreto-piedra', 'rp-concreto-ligero',
        'pi-acabado-concreto', 'pi-pizarra',
        'cu-aislante-fibra-vidrio', 'cu-aislante-tableros-fibra', 'cu-aislante-perlita', 'cu-aislante-poliestireno',
        'cu-aislante-poliuretano', 'cu-entablado-madera', 'cu-madera-laminada',
        'rm-entablado-madera', 'rm-madera-laminada', 'rm-aislante-poliestireno', 'rm-aislante-poliuretano',
        'rm-aislante-fibra-acrilico', 'rm-aislante-perlita', 'rm-aislante-tableros-fibra',
        'en-ceramico', 'en-arenisca', 'en-caliza', 'en-granito',
      ].sort(),
    );
  });

  it('valores clave transcritos del PDF', () => {
    expect(buscarComponente('cr-entramado-cemento')!.kN).toBe(0.7);
    expect(buscarComponente('cr-tableros-yeso')!.kN).toBe(0.008);
    expect(buscarComponente('rp-concreto-piedra')!.kN).toBe(0.025);
    expect(buscarComponente('pi-baldosa-20-mortero-25')!.kN).toBe(1.1);
    expect(buscarComponente('pi-marmol-mortero')!.kN).toBe(1.6);
    expect(buscarComponente('cu-teja-arcilla')!.kN).toBe(0.8);
    expect(buscarComponente('cu-aislante-poliestireno')!.kN).toBe(0.0005);
    expect(buscarComponente('rm-baldosin-cemento')!.kN).toBe(0.8);
    expect(buscarComponente('pl-poste-madera-panete-ambos-lados')!.kN).toBe(2.0);
    expect(buscarComponente('en-granito')!.kN).toBe(0.017);
    expect(buscarComponente('ve-muro-cortina')!.kN).toBe(0.5);
    expect(buscarComponente('mu-panel-enchape-ladrillo')!.kN).toBe(2.5);
  });
});

describe('cargasMuertas: Tabla B.3.4.2-4 (muros de mampostería)', () => {
  it('11 variantes y 44 celdas con valor (10 + 29 + 5)', () => {
    expect(MUROS_MAMPOSTERIA).toHaveLength(11);
    const n = (tipo: string) =>
      MUROS_MAMPOSTERIA.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.kN.filter((v) => v !== null).length, 0);
    expect(n('bloque-arcilla')).toBe(10);
    expect(n('bloque-concreto')).toBe(5 + 4 * 6);
    expect(n('maciza-arcilla')).toBe(5);
    expect(n('maciza-concreto')).toBe(5);
  });

  it('ids únicos, cinco espesores por fila, kgf = 100·kN', () => {
    const ids = MUROS_MAMPOSTERIA.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MUROS_MAMPOSTERIA) {
      expect(buscarMuro(m.id)).toBe(m);
      expect(m.kN, m.id).toHaveLength(ESPESORES_MURO_MM.length);
      expect(m.kgf, m.id).toHaveLength(ESPESORES_MURO_MM.length);
      m.kN.forEach((v, i) => {
        if (v === null) expect(m.kgf[i]).toBeNull();
        else {
          expect(v, m.id).toBeGreaterThan(0);
          expect(m.kgf[i]).toBeCloseTo(v * 100, 6);
        }
      });
    }
  });

  it('la carga crece con el espesor en cada fila', () => {
    for (const m of MUROS_MAMPOSTERIA) {
      const vals = m.kN.filter((v): v is number => v !== null);
      for (let i = 1; i < vals.length; i++) expect(vals[i], m.id).toBeGreaterThan(vals[i - 1]);
    }
  });

  it('a igual espesor, más relleno implica más carga (bloque de concreto, 200 mm)', () => {
    const orden = ['mb-concreto-sin-relleno', 'mb-concreto-relleno-1.2', 'mb-concreto-relleno-1.0', 'mb-concreto-relleno-0.8', 'mb-concreto-relleno-0.6', 'mb-concreto-relleno-0.4', 'mb-concreto-celdas-llenas'];
    const v = orden.map((id) => buscarMuro(id)!.kN[2]!);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]);
  });

  it('valores clave transcritos del PDF', () => {
    expect(buscarMuro('mb-arcilla-panetado')!.kN).toEqual([1.8, 2.5, 3.1, 3.8, 4.4]);
    expect(buscarMuro('mb-arcilla-sin-panetar')!.kN).toEqual([1.3, 2.0, 2.6, 3.3, 3.9]);
    expect(buscarMuro('mb-concreto-sin-relleno')!.kN).toEqual([1.4, 1.45, 1.9, 2.25, 2.6]);
    expect(buscarMuro('mb-concreto-celdas-llenas')!.kN).toEqual([null, 3.0, 4.0, 5.0, 6.1]);
    expect(buscarMuro('mm-arcilla-sin-panetar')!.kN).toEqual([1.9, 2.9, 3.8, 4.7, 5.5]);
    expect(buscarMuro('mm-concreto-sin-panetar')!.kN).toEqual([2.0, 3.1, 4.2, 5.3, 6.4]);
  });
});

describe('cargasMuertas: Tabla B.3.4.3-1 (valores mínimos alternativos)', () => {
  it('13 filas con ids únicos', () => {
    expect(VALORES_ALTERNATIVOS).toHaveLength(13);
    const ids = VALORES_ALTERNATIVOS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of VALORES_ALTERNATIVOS) expect(buscarValorAlternativo(v.id)).toBe(v);
  });

  it('valores positivos y kgf = 100·kN', () => {
    for (const v of VALORES_ALTERNATIVOS) {
      expect(v.fachadaParticionesKN, v.id).toBeGreaterThan(0);
      expect(v.afinadoKN, v.id).toBeGreaterThan(0);
      expect(v.fachadaParticionesKgf, v.id).toBeCloseTo(v.fachadaParticionesKN * 100, 6);
      expect(v.afinadoKgf, v.id).toBeCloseTo(v.afinadoKN * 100, 6);
    }
  });

  it('valores clave transcritos del PDF', () => {
    expect(buscarValorAlternativo('va-residencial-mamposteria')).toMatchObject({ fachadaParticionesKN: 3.0, afinadoKN: 1.6 });
    expect(buscarValorAlternativo('va-residencial-livianas')).toMatchObject({ fachadaParticionesKN: 2.0, afinadoKN: 1.4 });
    expect(buscarValorAlternativo('va-educativos-salones')).toMatchObject({ fachadaParticionesKN: 2.0, afinadoKN: 1.5 });
    expect(buscarValorAlternativo('va-garajes-2000')).toMatchObject({ fachadaParticionesKN: 0.2, afinadoKN: 1.0 });
    expect(buscarValorAlternativo('va-institucional-prisiones')).toMatchObject({ fachadaParticionesKN: 2.5, afinadoKN: 1.8 });
    expect(buscarValorAlternativo('va-fabricas-livianas')).toMatchObject({ fachadaParticionesKN: 0.8, afinadoKN: 1.6 });
  });
});
