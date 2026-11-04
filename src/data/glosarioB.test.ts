import { describe, expect, it } from 'vitest';
import { definicionesB, inicialDe, simbolosB, TEMAS_GLOSARIO_B, textoPlano } from './glosarioB';

const porTermino = (t: string) => definicionesB.find((d) => d.termino === t);
const porSimbolo = (s: string, origen?: 'B.2.2' | 'B.6.3') => simbolosB.find((x) => textoPlano(x.simbolo) === s && (!origen || x.origen === origen));
/** Los términos de B.2.1.1 llevan la traducción al inglés entre paréntesis («(Loads)»); SPRFV (B.6.2) no. */
const esDeB2 = (t: string) => /\([A-Z][a-z][^)]*\)$/.test(t) || t === 'Curadurías'; // Curadurías: único término de B.2.1.1 sin traducción

describe('glosario B — definiciones (B.2.1.1 y B.6.2)', () => {
  it('tiene todas las definiciones del PDF (24 de B.2.1.1 + 27 de B.6.2 = 51)', () => {
    expect(definicionesB).toHaveLength(51);
    expect(definicionesB.filter((d) => esDeB2(d.termino))).toHaveLength(24);
    expect(definicionesB.filter((d) => !esDeB2(d.termino))).toHaveLength(27);
  });

  it('no repite términos (sin distinguir mayúsculas ni tildes)', () => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const vistos = new Set<string>();
    for (const d of definicionesB) {
      const k = norm(d.termino);
      expect(vistos.has(k), `duplicado: ${d.termino}`).toBe(false);
      vistos.add(k);
    }
  });

  it('ninguna definición ni término está vacío ni trae caracteres corruptos', () => {
    for (const d of definicionesB) {
      expect(d.termino.trim().length, d.termino).toBeGreaterThan(1);
      expect(d.definicion.trim().length, d.termino).toBeGreaterThan(8);
      expect(d.definicion, d.termino).not.toMatch(/�|[ \t]{2,}|\n{2,}/);
      expect(d.termino, d.termino).not.toMatch(/�/);
      expect(d.tema, d.termino).toBeTruthy();
    }
  });

  it('los términos de B.2.1.1 traen la traducción al inglés', () => {
    expect(porTermino('Cargas (Loads)')).toBeDefined();
    expect(porTermino('Vida de servicio de diseño (Design service life)')).toBeDefined();
    expect(porTermino('Método de los esfuerzos de trabajo (Allowable stress design method)')).toBeDefined();
  });

  it('está ordenado alfabéticamente', () => {
    const c = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
    for (let i = 1; i < definicionesB.length; i++) {
      expect(c.compare(definicionesB[i - 1].termino, definicionesB[i].termino), `${definicionesB[i - 1].termino} / ${definicionesB[i].termino}`).toBeLessThanOrEqual(0);
    }
  });

  it('cada tema existe y todos los temas se usan', () => {
    const ids = new Set(TEMAS_GLOSARIO_B.map((t) => t.id));
    expect(ids.size).toBe(TEMAS_GLOSARIO_B.length);
    const usados = new Set(definicionesB.map((d) => d.tema));
    for (const d of definicionesB) expect(ids.has(d.tema), d.termino).toBe(true);
    for (const id of ids) expect(usados.has(id), id).toBe(true);
    for (const t of TEMAS_GLOSARIO_B) {
      expect(t.nombre.trim().length, t.id).toBeGreaterThan(3);
      expect(t.descripcion.trim().length, t.id).toBeGreaterThan(10);
    }
  });

  it('las secciones relacionadas tienen formato de referencia válido', () => {
    for (const d of definicionesB) {
      if (d.seccionRelacionada) expect(d.seccionRelacionada, d.termino).toMatch(/^[A-K]\.\d+(\.\d+)*$/);
    }
  });

  it('conserva muestras literales de la norma', () => {
    expect(porTermino('Integridad estructural (Structural integrity)')?.definicion).toBe('Capacidad de la estructura para evitar colapso generalizado cuando ocurre daño localizado.');
    expect(porTermino('Carga mayorada (Factored load)')?.definicion).toContain('coeficiente de carga, el cual va incluido en la probabilidad de ocurrencia del sismo de diseño');
    expect(porTermino('Cargas nominales (Nominal loads)')?.definicion).toContain('NO han sido multiplicadas por el coeficiente de carga');
    expect(porTermino('Resistencia de diseño (Design strength)')?.definicion).toBe('Es el producto de la resistencia nominal por un coeficiente de reducción de resistencia.');
    expect(porTermino('Curadurías')?.definicion).toContain('Ley 388 de 1997');
    expect(porTermino('Edificio abierto')?.definicion).toContain('Ao ≥ 0.8Ag');
    expect(porTermino('Edificio abierto')?.definicion).toContain('al menos 80% del área');
    expect(porTermino('Edificio bajo')?.definicion).toContain('menor o igual a 18 m (60ft)');
    expect(porTermino('Edificio parcialmente cerrado')?.definicion).toContain('0.37 m² o 1% del área de esa pared');
    expect(porTermino('Edificio parcialmente cerrado')?.definicion).toContain('Aoi/Agi ≤ 0.20');
    expect(porTermino('Edificio parcialmente cerrado')?.definicion).toMatch(/\(paredes y cubierta\), en m²$/);
    expect(porTermino('Estructura o edificio rígido')?.definicion).toContain('mayor o igual a 1 Hz');
    expect(porTermino('Edificio u otra estructura flexible')?.definicion).toContain('menor a 1 Hz');
    expect(porTermino('Velocidad de viento, V')?.definicion).toContain('ráfaga de 3 segundos medida 10 m por encima del suelo en la Exposición C');
    expect(porTermino('Material para vidriado')?.definicion).toContain('K.4.1.2');
    expect(porTermino('Altura media de cubierta, h')?.definicion).toContain('menores o iguales a 10°');
  });

  it('incluye los incisos (a)–(b) de Edificio bajo y Edificio parcialmente cerrado', () => {
    for (const t of ['Edificio bajo', 'Edificio parcialmente cerrado']) {
      const d = porTermino(t)!.definicion;
      expect(d, t).toContain('(a) ');
      expect(d, t).toContain('(b) ');
    }
  });

  it('inicialDe ignora tildes', () => {
    expect(inicialDe('Área efectiva')).toBe('A');
    expect(inicialDe('Edificación (Building)')).toBe('E');
  });
});

describe('glosario B — nomenclatura (B.2.2 y B.6.3)', () => {
  it('tiene todos los símbolos del PDF (16 de B.2.2 + 83 de B.6.3 = 99)', () => {
    expect(simbolosB).toHaveLength(99);
    expect(simbolosB.filter((s) => s.origen === 'B.2.2')).toHaveLength(16);
    expect(simbolosB.filter((s) => s.origen === 'B.6.3')).toHaveLength(83);
  });

  it('conserva el orden de la norma: B.2.2 primero y luego B.6.3', () => {
    const primerB63 = simbolosB.findIndex((s) => s.origen === 'B.6.3');
    expect(primerB63).toBe(16);
    expect(simbolosB.slice(primerB63).every((s) => s.origen === 'B.6.3')).toBe(true);
    expect(textoPlano(simbolosB[0].simbolo)).toBe('D');
    expect(textoPlano(simbolosB[15].simbolo)).toBe('W');
    expect(textoPlano(simbolosB[16].simbolo)).toBe('A');
    expect(textoPlano(simbolosB[simbolosB.length - 1].simbolo)).toBe('ν');
  });

  it('no repite símbolos dentro de cada capítulo (salvo el A_g impreso dos veces en B.6.3) y todos tienen significado', () => {
    for (const origen of ['B.2.2', 'B.6.3'] as const) {
      const vistos = new Set<string>();
      for (const s of simbolosB.filter((x) => x.origen === origen)) {
        const k = textoPlano(s.simbolo);
        if (origen === 'B.6.3' && k === 'Ag') continue;
        expect(vistos.has(k), `duplicado ${origen}: ${k}`).toBe(false);
        vistos.add(k);
      }
    }
    expect(simbolosB.filter((s) => s.origen === 'B.6.3' && textoPlano(s.simbolo) === 'Ag')).toHaveLength(2);
    for (const s of simbolosB) {
      const k = textoPlano(s.simbolo);
      expect(k.trim().length, k).toBeGreaterThan(0);
      expect(s.significado.trim().length, k).toBeGreaterThan(5);
      expect(s.significado, k).not.toMatch(/�|[ \t]{2,}/);
      expect(s.simbolo, k).not.toMatch(/�/);
    }
  });

  it('contiene los símbolos fundamentales de B.2.2 y B.6.3', () => {
    for (const e of ['D', 'E', 'Ed', 'F', 'Fa', 'Fs', 'G', 'L', 'Le', 'Lr', 'L0', 'H', 'R0', 'R', 'T', 'W']) expect(porSimbolo(e, 'B.2.2'), e).toBeDefined();
    const b6 = ['A', 'Af', 'Agi', 'Ao', 'Aoi', 'Aog', 'Cf', 'CN', 'Cp', 'GCpn', 'GCp', 'GCpf', 'GCpi', 'gQ', 'gR', 'gν', 'he', 'I', 'K1, K2, K3', 'Kd', 'Kh', 'Kz', 'Kzt', 'Lh', 'Lr', 'ℓ', 'N1', 'n1', 'pL', 'pnet', 'pnet10', 'ps', 'ps10', 'pw', 'qh', 'qi', 'qp', 'qz', 'RB, Rh, RL', 'Ri', 'Rn', 'Vi', 'zg', 'zmin', 'α', 'β', 'ε', 'λ', 'η', 'θ', 'ν'];
    for (const e of b6) expect(porSimbolo(e, 'B.6.3'), e).toBeDefined();
  });

  it('conserva las barras y sombreros de la norma', () => {
    expect(porSimbolo('b̄')?.significado).toContain('media de viento horaria');
    expect(porSimbolo('b̂')?.significado).toContain('ráfaga de 3 segundos');
    expect(porSimbolo('z̄')?.significado).toBe('altura equivalente de la estructura, en m');
    expect(porSimbolo('α̂')?.significado).toBe('inversa de α de la Tabla B.6.5-2');
    expect(porSimbolo('ᾱ')?.significado).toContain('media horaria');
    expect(porSimbolo('ε̄')?.significado).toContain('escala de longitud integral');
    expect(porSimbolo('Iz̄')?.significado).toBe('intensidad de turbulencia de la ec. B.6.5-6');
    expect(porSimbolo('Lz̄')?.significado).toContain('túnel de viento');
    expect(porSimbolo('V̄z̄')?.significado).toContain('promedia por hora');
  });

  it('conserva muestras literales verificadas contra la imagen', () => {
    expect(textoPlano(porSimbolo('E', 'B.2.2')!.significado)).toContain('E = Fs/R');
    expect(textoPlano(porSimbolo('R', 'B.2.2')!.significado)).toContain('R = φaφpφrR0');
    expect(porSimbolo('L0')?.significado).toBe('carga viva sin reducir, en kN/m². Véase B.4.5.1.');
    expect(porSimbolo('L0')?.ref).toBe('B.4.5.1');
    expect(porSimbolo('Fa')?.significado).toBe('carga debida a inundación.');
    expect(porSimbolo('Kh')?.significado).toBe('coeficiente de exposición de presión por velocidad evaluado en z = h');
    expect(porSimbolo('D′')?.significado).toBe('profundidad de elementos sobresalientes como nervaduras y cornisas, en m');
    expect(porSimbolo('pnet10')?.significado).toContain('h=10.0 m');
    expect(porSimbolo('V', 'B.6.3')?.significado).toContain('categoría de exposición C');
    expect(porSimbolo('Vi')?.significado).toBe('volumen interno sin particiones, en m³.');
    expect(porSimbolo('θ')?.significado).toBe('ángulo de inclinación de la cubierta, en grados.');
    expect(porSimbolo('I', 'B.6.3')?.significado).toBe('factor de importancia');
    expect(porSimbolo('K1, K2, K3')?.significado).toContain('calcular K_{zt}');
  });

  it('el marcado de sub y superíndices se quita con textoPlano', () => {
    expect(textoPlano('GC_{pf}')).toBe('GCpf');
    expect(textoPlano('p_{net10}')).toBe('pnet10');
    expect(textoPlano('K_{1}, K_{2}, K_{3}')).toBe('K1, K2, K3');
  });

  it('las referencias tienen formato de sección, capítulo o ecuación/figura/tabla', () => {
    for (const s of simbolosB) {
      if (!s.ref) continue;
      for (const r of s.ref.split(',').map((x) => x.trim())) expect(r, textoPlano(s.simbolo)).toMatch(/^[AB]\.\d+(\.\d+)*(-\d+[A-Z]?)?$/);
    }
  });
});
