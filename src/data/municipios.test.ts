import { describe, expect, it } from 'vitest';
import municipios from './municipios.json';

type Zona = 'Baja' | 'Intermedia' | 'Alta';
type Municipio = {
  departamento: string;
  municipio: string;
  codigo: string;
  aa: number;
  av: number;
  zona: Zona;
  ae: number;
  ad: number;
};

const datos = municipios as Municipio[];
const EPS = 1e-9;
const multiploDe005 = (x: number) => Math.abs(x / 0.05 - Math.round(x / 0.05)) < 1e-6;

/**
 * Capitales de departamento: [código DANE, ciudad, aa, av, zona, ae, ad].
 * Aa, Av y zona: Tabla A.2.3-2 (PDF págs. 59-60); Ae: Tabla A.10.3-2 (PDF pág. 144);
 * Ad: Tabla A.12.2-2 (PDF pág. 163). Transcritas con coordenadas de palabras del PDF
 * (el texto en bruto desalinea las filas de las dos columnas de ciudades).
 */
const CAPITALES: [string, string, number, number, Zona, number, number][] = [
  ['81001', 'Arauca', 0.15, 0.15, 'Intermedia', 0.1, 0.04],
  ['63001', 'Armenia', 0.25, 0.25, 'Alta', 0.15, 0.1],
  ['08001', 'Barranquilla', 0.1, 0.1, 'Baja', 0.05, 0.03],
  ['11001', 'Bogotá D.C.', 0.15, 0.2, 'Intermedia', 0.13, 0.06],
  ['68001', 'Bucaramanga', 0.25, 0.25, 'Alta', 0.15, 0.09],
  ['76001', 'Cali', 0.25, 0.25, 'Alta', 0.15, 0.09],
  ['13001', 'Cartagena', 0.1, 0.1, 'Baja', 0.05, 0.03],
  ['54001', 'Cúcuta', 0.35, 0.3, 'Alta', 0.25, 0.1],
  ['18001', 'Florencia', 0.2, 0.15, 'Intermedia', 0.1, 0.05],
  ['73001', 'Ibagué', 0.2, 0.2, 'Intermedia', 0.15, 0.06],
  ['91001', 'Leticia', 0.05, 0.05, 'Baja', 0.04, 0.02],
  ['17001', 'Manizales', 0.25, 0.25, 'Alta', 0.2, 0.1],
  ['05001', 'Medellín', 0.15, 0.2, 'Intermedia', 0.13, 0.07],
  ['97001', 'Mitú', 0.05, 0.05, 'Baja', 0.04, 0.02],
  ['86001', 'Mocoa', 0.3, 0.25, 'Alta', 0.2, 0.1],
  ['23001', 'Montería', 0.1, 0.15, 'Intermedia', 0.07, 0.04],
  ['41001', 'Neiva', 0.25, 0.25, 'Alta', 0.2, 0.08],
  ['52001', 'Pasto', 0.25, 0.25, 'Alta', 0.15, 0.08],
  ['66001', 'Pereira', 0.25, 0.25, 'Alta', 0.2, 0.1],
  ['19001', 'Popayán', 0.25, 0.2, 'Alta', 0.15, 0.08],
  ['99001', 'Puerto Carreño', 0.05, 0.05, 'Baja', 0.04, 0.02],
  ['94001', 'Puerto Inírida', 0.05, 0.05, 'Baja', 0.04, 0.02],
  ['27001', 'Quibdó', 0.35, 0.35, 'Alta', 0.25, 0.13],
  ['44001', 'Riohacha', 0.1, 0.15, 'Intermedia', 0.07, 0.04],
  ['88001', 'San Andrés', 0.1, 0.1, 'Baja', 0.05, 0.03],
  ['47001', 'Santa Marta', 0.15, 0.1, 'Intermedia', 0.1, 0.04],
  ['95001', 'San José del Guaviare', 0.05, 0.05, 'Baja', 0.04, 0.02],
  ['70001', 'Sincelejo', 0.1, 0.15, 'Intermedia', 0.07, 0.04],
  ['15001', 'Tunja', 0.2, 0.2, 'Intermedia', 0.15, 0.07],
  ['20001', 'Valledupar', 0.1, 0.1, 'Baja', 0.05, 0.03],
  ['50001', 'Villavicencio', 0.35, 0.3, 'Alta', 0.2, 0.07],
  ['85001', 'Yopal', 0.3, 0.2, 'Alta', 0.15, 0.06],
];

/**
 * Discrepancias internas de la propia norma (no del parser): el Apéndice A-4 imprime un valor
 * distinto al de las tablas de capitales. Todas verificadas visualmente contra el PDF
 * (págs. 206, 211, 212, 213 y 216). Se exige que sean exactamente estas, con el valor de A-4.
 * Ninguna cambia la zona de amenaza.
 *  - Montería 23001: Av 0.20 en A-4 vs 0.15 en A.2.3-2
 *  - Villavicencio 50001: Aa 0.25 en A-4 vs 0.35 en A.2.3-2
 *  - Cúcuta 54001: Av 0.25 en A-4 vs 0.30 en A.2.3-2
 *  - Armenia 63001: Ae 0.20 en A-4 vs 0.15 en A.10.3-2
 *  - Ibagué 73001: Ad 0.08 en A-4 vs 0.06 en A.12.2-2
 */
const DISCREPANCIAS_CAPITALES: Record<string, Partial<Municipio>> = {
  '23001': { av: 0.2 },
  '50001': { aa: 0.25 },
  '54001': { av: 0.25 },
  '63001': { ae: 0.2 },
  '73001': { ad: 0.08 },
};

/** Valores de Ae > 0.28 (máximo de la Tabla A.10.3-1) tal como están impresos en A-4. */
const AE_FUERA_DE_TABLA_A_10_3_1 = ['13670', '81300', '81794'];

describe('municipios.json (Apéndice A-4)', () => {
  it('tiene el total esperado: 1117 registros (1118 filas del PDF; Bogotá D.C. figura dos veces)', () => {
    expect(datos.length).toBe(1117);
    expect(datos.length).toBeGreaterThanOrEqual(1100);
    expect(datos.length).toBeLessThanOrEqual(1125);
  });

  it('tiene campos exactos, nombres limpios y números finitos', () => {
    for (const m of datos) {
      expect(Object.keys(m).sort()).toEqual([
        'aa', 'ad', 'ae', 'av', 'codigo', 'departamento', 'municipio', 'zona',
      ]);
      expect(m.departamento.trim()).not.toBe('');
      expect(m.municipio.trim()).not.toBe('');
      expect(m.municipio).not.toMatch(/\s{2,}|^\s|\s$/);
      for (const k of ['aa', 'av', 'ae', 'ad'] as const) {
        expect(Number.isFinite(m[k]), `${m.codigo} ${k}`).toBe(true);
      }
    }
  });

  it('códigos únicos de 5 dígitos; dentro de cada departamento, orden creciente por código', () => {
    const codigos = datos.map((m) => m.codigo);
    for (const c of codigos) expect(c).toMatch(/^\d{5}$/);
    expect(new Set(codigos).size).toBe(codigos.length);
    const vistos = new Set<string>();
    for (let i = 0; i < datos.length; i++) {
      const m = datos[i];
      if (i > 0 && datos[i - 1].departamento === m.departamento) {
        expect(datos[i - 1].codigo < m.codigo, m.codigo).toBe(true);
      } else {
        // un departamento no reaparece más adelante (bloques contiguos)
        expect(vistos.has(m.departamento), m.departamento).toBe(false);
      }
      vistos.add(m.departamento);
    }
  });

  it('el prefijo DANE del código corresponde a un único departamento y viceversa', () => {
    const dePrefijo = new Map<string, Set<string>>();
    const deDepto = new Map<string, Set<string>>();
    for (const m of datos) {
      const p = m.codigo.slice(0, 2);
      dePrefijo.set(p, (dePrefijo.get(p) ?? new Set()).add(m.departamento));
      deDepto.set(m.departamento, (deDepto.get(m.departamento) ?? new Set()).add(p));
    }
    for (const [p, s] of dePrefijo) expect([...s], `prefijo ${p}`).toHaveLength(1);
    for (const [d, s] of deDepto) expect([...s], d).toHaveLength(1);
    expect(deDepto.size).toBe(33); // 31 departamentos + San Andrés + Bogotá D.C.
    const esperado: Record<string, string> = {
      '05': 'Antioquia', '08': 'Atlántico', '11': 'Bogotá D.C.', '13': 'Bolívar', '15': 'Boyacá',
      '17': 'Caldas', '18': 'Caquetá', '19': 'Cauca', '20': 'Cesar', '23': 'Córdoba',
      '25': 'Cundinamarca', '27': 'Chocó', '41': 'Huila', '44': 'La Guajira', '47': 'Magdalena',
      '50': 'Meta', '52': 'Nariño', '54': 'Norte de Santander', '63': 'Quindío', '66': 'Risaralda',
      '68': 'Santander', '70': 'Sucre', '73': 'Tolima', '76': 'Valle del Cauca', '81': 'Arauca',
      '85': 'Casanare', '86': 'Putumayo', '88': 'San Andrés, Providencia y Santa Catalina',
      '91': 'Amazonas', '94': 'Guainía', '95': 'Guaviare', '97': 'Vaupés', '99': 'Vichada',
    };
    expect(dePrefijo.size).toBe(Object.keys(esperado).length);
    for (const [p, s] of dePrefijo) expect([...s][0], `prefijo ${p}`).toBe(esperado[p]);
  });

  it('cada registro cumple la regla de zona según max(Aa, Av)', () => {
    for (const m of datos) {
      const mx = Math.max(m.aa, m.av);
      const esperada: Zona = mx <= 0.1 + EPS ? 'Baja' : mx <= 0.2 + EPS ? 'Intermedia' : 'Alta';
      expect(m.zona, `${m.codigo} ${m.municipio} aa=${m.aa} av=${m.av}`).toBe(esperada);
    }
  });

  it('Aa y Av son múltiplos de 0.05 en [0.05, 0.50]; Ae y Ad en rangos plausibles', () => {
    for (const m of datos) {
      for (const k of ['aa', 'av'] as const) {
        expect(m[k], `${m.codigo} ${k}`).toBeGreaterThanOrEqual(0.05 - EPS);
        expect(m[k], `${m.codigo} ${k}`).toBeLessThanOrEqual(0.5 + EPS);
        expect(multiploDe005(m[k]), `${m.codigo} ${k}=${m[k]}`).toBe(true);
      }
      expect(m.ae, m.codigo).toBeGreaterThanOrEqual(0);
      expect(m.ad, m.codigo).toBeGreaterThanOrEqual(0);
      expect(m.ad, m.codigo).toBeLessThanOrEqual(0.15 + EPS);
      if (!AE_FUERA_DE_TABLA_A_10_3_1.includes(m.codigo)) {
        expect(m.ae, m.codigo).toBeLessThanOrEqual(0.28 + EPS); // máximo de la Tabla A.10.3-1
      }
    }
    // Las excepciones documentadas existen y están por encima de 0.28
    for (const c of AE_FUERA_DE_TABLA_A_10_3_1) {
      expect(datos.find((m) => m.codigo === c)!.ae).toBeGreaterThan(0.28);
    }
  });

  it('las 32 capitales de departamento coinciden con A.2.3-2, A.10.3-2 y A.12.2-2', () => {
    expect(CAPITALES.length).toBe(32);
    for (const [codigo, ciudad, aa, av, zona, ae, ad] of CAPITALES) {
      const m = datos.find((x) => x.codigo === codigo);
      expect(m, `${ciudad} (${codigo}) no existe`).toBeDefined();
      const esperado = { aa, av, zona, ae, ad, ...DISCREPANCIAS_CAPITALES[codigo] };
      expect({ c: ciudad, aa: m!.aa, av: m!.av, zona: m!.zona, ae: m!.ae, ad: m!.ad }).toEqual({
        c: ciudad, ...esperado,
      });
    }
  });

  it('valores literales de capitales verificados contra el PDF', () => {
    const get = (c: string) => datos.find((x) => x.codigo === c)!;
    expect(get('08001')).toMatchObject({ municipio: 'Barranquilla', aa: 0.1, av: 0.1, zona: 'Baja', ae: 0.05, ad: 0.03 });
    expect(get('11001')).toMatchObject({ aa: 0.15, av: 0.2, zona: 'Intermedia', ae: 0.13, ad: 0.06 });
    expect(get('05001')).toMatchObject({ municipio: 'Medellín', aa: 0.15, av: 0.2, ae: 0.13, ad: 0.07 });
    expect(get('76001')).toMatchObject({ aa: 0.25, av: 0.25, zona: 'Alta', ae: 0.15, ad: 0.09 });
    expect(get('54001')).toMatchObject({ municipio: 'Cúcuta', aa: 0.35, av: 0.25, ae: 0.25, ad: 0.1 });
    expect(get('27001')).toMatchObject({ aa: 0.35, av: 0.35, zona: 'Alta', ae: 0.25, ad: 0.13 });
    expect(get('91001')).toMatchObject({ municipio: 'Leticia', aa: 0.05, av: 0.05, zona: 'Baja', ae: 0.04, ad: 0.02 });
    expect(get('88001')).toMatchObject({ municipio: 'San Andrés', zona: 'Baja', ae: 0.05, ad: 0.03 });
    expect(get('47001')).toMatchObject({ municipio: 'Santa Marta', aa: 0.15, av: 0.1, zona: 'Intermedia' });
    expect(get('50001')).toMatchObject({ municipio: 'Villavicencio', aa: 0.25, av: 0.3, zona: 'Alta', ae: 0.2, ad: 0.07 }); // A-4 (A.2.3-2 dice Aa 0.35)
    expect(get('85001')).toMatchObject({ municipio: 'Yopal', aa: 0.3, av: 0.2, zona: 'Alta', ae: 0.15, ad: 0.06 });
  });
});
