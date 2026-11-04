import { describe, expect, it } from 'vitest';
import { definicionesC, inicialDe, simbolosC, TEMAS_GLOSARIO_C, textoPlano } from './glosarioC';

const porTermino = (t: string) => definicionesC.find((d) => d.termino === t);
const porSimbolo = (s: string) => simbolosC.find((x) => textoPlano(x.simbolo) === s);

describe('glosario C — definiciones (C.2.2)', () => {
  it('tiene todas las definiciones del PDF (132, incluidas las anidadas de conexión, muro y pórtico)', () => {
    expect(definicionesC).toHaveLength(132);
  });

  it('no repite términos (sin distinguir mayúsculas ni tildes)', () => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const vistos = new Set<string>();
    for (const d of definicionesC) {
      const k = norm(d.termino);
      expect(vistos.has(k), `duplicado: ${d.termino}`).toBe(false);
      vistos.add(k);
    }
  });

  it('ninguna definición ni término está vacío ni trae caracteres corruptos', () => {
    for (const d of definicionesC) {
      expect(d.termino.trim().length, d.termino).toBeGreaterThan(1);
      expect(d.definicion.trim().length, d.termino).toBeGreaterThan(8);
      expect(d.definicion, d.termino).not.toMatch(/�|[ \t]{2,}|\n{2,}/);
      expect(d.termino, d.termino).not.toMatch(/�|[ \t]{2,}/);
      expect(d.tema, d.termino).toBeTruthy();
    }
  });

  it('cada término lleva la traducción al inglés entre paréntesis', () => {
    for (const d of definicionesC) expect(d.termino, d.termino).toMatch(/\([^()]*\)( \([^()]*\))?$/);
  });

  it('está ordenado alfabéticamente', () => {
    const c = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
    for (let i = 1; i < definicionesC.length; i++) {
      expect(c.compare(definicionesC[i - 1].termino, definicionesC[i].termino), `${definicionesC[i - 1].termino} / ${definicionesC[i].termino}`).toBeLessThanOrEqual(0);
    }
  });

  it('cada tema existe y todos los temas se usan', () => {
    const ids = new Set(TEMAS_GLOSARIO_C.map((t) => t.id));
    expect(TEMAS_GLOSARIO_C.length).toBeGreaterThanOrEqual(7);
    expect(TEMAS_GLOSARIO_C.length).toBeLessThanOrEqual(9);
    expect(ids.size).toBe(TEMAS_GLOSARIO_C.length);
    const usados = new Set(definicionesC.map((d) => d.tema));
    for (const d of definicionesC) expect(ids.has(d.tema), d.termino).toBe(true);
    for (const id of ids) expect(usados.has(id), id).toBe(true);
    for (const t of TEMAS_GLOSARIO_C) {
      expect(t.nombre.trim().length, t.id).toBeGreaterThan(3);
      expect(t.descripcion.trim().length, t.id).toBeGreaterThan(10);
    }
  });

  it('las secciones relacionadas tienen formato de referencia válido', () => {
    for (const d of definicionesC) {
      if (d.seccionRelacionada) expect(d.seccionRelacionada, d.termino).toMatch(/^([BC]\.\d+(\.\d+)*|C-[A-G](\.\d+)*)$/);
    }
  });

  it('conserva muestras literales de la norma', () => {
    expect(porTermino('Esfuerzo (Stress)')?.definicion).toBe('Fuerza por unidad de área.');
    expect(porTermino('Concreto simple (Plain concrete)')?.definicion).toBe('Concreto estructural sin refuerzo o con menos refuerzo que el mínimo especificado para concreto reforzado.');
    expect(porTermino('Concreto liviano (Lightweight concrete)')?.definicion).toContain('entre 1440 y 1840 kg/m³');
    expect(porTermino('Agregado liviano (Lightweight aggregate)')?.definicion).toContain('1120 kg/m³ o menos');
    expect(porTermino('Densidad de equilibrio (Equilibrium density)')?.definicion).toContain('50 ± 5 por ciento y a una temperatura de 23 ± 2 °C');
    expect(porTermino('Sección controlada por tracción (Tension controlled section)')?.definicion).toContain('mayor o igual que 0.005');
    expect(porTermino('Gancho sísmico (Seismic hook)')?.definicion).toContain('más de 135 grados');
    expect(porTermino('Gancho sísmico (Seismic hook)')?.definicion).toContain('6db (pero no menor de 75 mm)');
    expect(porTermino('Columna (Column)')?.definicion).toContain('mayor de 3');
    expect(porTermino('Pedestal (Pedestal)')?.definicion).toContain('menor o igual a 3');
    expect(porTermino('Torón (Strand)')?.definicion).toContain('siete alambres');
    expect(porTermino('Resistencia especificada a la compresión del concreto (f′c) (Specified compressive strength of concrete)')?.definicion).toContain('raíz cuadrada del valor numérico');
    expect(porTermino('Concreto reforzado (Reinforced concrete)')?.definicion).toContain('Capítulos C.1 al C.21 y en los Apéndices C-A al C-C');
  });

  it('incluye los incisos (a)–(c) de Alambre y las definiciones anidadas', () => {
    const d = porTermino('Alambre (Wire)')!.definicion;
    for (const i of ['(a) ', '(b) ', '(c) ']) expect(d).toContain(i);
    for (const t of ['Conexión dúctil (Ductile connection)', 'Conexión fuerte (Strong connection)', 'Muro estructural especial – DES (Special structural wall)', 'Muro estructural intermedio – DMO (Intermediate structural wall)', 'Muro estructural ordinario de concreto reforzado – DMI (Ordinary reinforced concrete structural wall)', 'Muro estructural ordinario de concreto simple (Ordinary structural plain concrete wall)', 'Pórtico especial resistente a momento – DES (Special moment frame)', 'Pórtico intermedio resistente a momento (Intermediate moment frame)', 'Pórtico ordinario resistente a momento (Ordinary moment frame)']) {
      expect(porTermino(t), t).toBeDefined();
    }
  });

  it('inicialDe ignora tildes', () => {
    expect(inicialDe('Ábaco (Drop panel)')).toBe('A');
    expect(inicialDe('Índice')).toBe('I');
  });
});

describe('glosario C — notación (C.2.1)', () => {
  it('tiene todos los símbolos del PDF (337)', () => {
    expect(simbolosC).toHaveLength(337);
    expect(simbolosC.every((s) => s.origen === 'C.2.1')).toBe(true);
  });

  it('conserva el orden de la norma: de a hasta ω′w', () => {
    expect(textoPlano(simbolosC[0].simbolo)).toBe('a');
    expect(textoPlano(simbolosC[1].simbolo)).toBe('av');
    expect(textoPlano(simbolosC[simbolosC.length - 1].simbolo)).toBe('ω′w');
    const i = (s: string) => simbolosC.findIndex((x) => textoPlano(x.simbolo) === s);
    expect(i('A1')).toBeLessThan(i('b'));
    expect(i('D')).toBeLessThan(i('e'));
    expect(i('fy')).toBeLessThan(i('F'));
    expect(i('wc')).toBeLessThan(i('α'));
    expect(i('φ')).toBeLessThan(i('ψc,N'));
  });

  it('no repite símbolos (la norma no repite ninguno en C.2.1) y todos tienen significado', () => {
    const vistos = new Set<string>();
    for (const s of simbolosC) {
      const k = textoPlano(s.simbolo);
      expect(k.trim().length, k).toBeGreaterThan(0);
      expect(vistos.has(k), `duplicado: ${k}`).toBe(false);
      vistos.add(k);
      expect(s.significado.trim().length, k).toBeGreaterThan(5);
      expect(s.significado, k).not.toMatch(/�|[ \t]{2,}|\n/);
      expect(s.simbolo, k).not.toMatch(/�|\s/);
    }
  });

  it('contiene los símbolos fundamentales de C.2.1', () => {
    const esperados = ['a', 'Ag', 'As', 'A′s', 'Ast', 'Av', 'Aps', 'b', 'bw', 'c', 'd', 'd′', 'dt', 'D', 'E', 'Ec', 'Es', 'EI', 'f′c', '√f′c', 'f′ci', 'fy', 'fyt', 'fpu', 'fpy', 'fps', 'fse', 'fr', 'Fn', 'h', 'hef', 'Ig', 'Icr', 'Ie', 'k', 'ℓ', 'ℓd', 'ℓdh', 'ℓn', 'ℓu', 'L', 'Lr', 'Mn', 'Mu', 'Mcr', 'Mpr', 'M1', 'M2', 'M2,min', 'Nu', 'Pn', 'Pn,max', 'Po', 'Pu', 'Q', 'r', 's', 'Se', 'Tn', 'Tu', 'U', 'vn', 'Vc', 'Vs', 'Vn', 'Vu', 'wc', 'W', 'α', 'αf', 'β', 'β1', 'γf', 'γv', 'δ', 'δs', 'Δ1', 'Δ2', 'εt', 'θ', 'λ', 'λΔ', 'μ', 'ξ', 'ρ', 'ρ′', 'ρb', 'ρw', 'φ', 'ψe', 'ψs', 'ψt', 'ω', 'ω′'];
    for (const e of esperados) expect(porSimbolo(e), e).toBeDefined();
  });

  it('conserva muestras literales verificadas contra la imagen', () => {
    expect(porSimbolo('a')?.significado).toBe('profundidad del bloque rectangular equivalente de esfuerzos tal como se define en C.10.2.7.1, mm, Capítulo C.10');
    expect(porSimbolo('a')?.ref).toBe('C.10.2.7.1');
    expect(porSimbolo('Ab')?.significado).toBe('área de una barra o alambre individual, mm², Capítulos C.10, C.12');
    expect(porSimbolo('Acv')?.significado).toContain('espesor del alma');
    expect(porSimbolo('f′c')?.significado).toContain('resistencia especificada a la compresión del concreto, MPa');
    expect(porSimbolo('√f′c')?.significado).toContain('raíz cuadrada');
    expect(porSimbolo('fr')?.significado).toBe('módulo de ruptura del concreto, MPa, véase C.9.5.2.3, Capítulos C.9, C.14, C.18, Apéndice C-B');
    expect(porSimbolo('EI')?.significado).toContain('N·mm²');
    expect(porSimbolo('I')?.significado).toContain('mm⁴');
    expect(porSimbolo('Mpr')?.significado).toContain('1.25f_{y}');
    expect(porSimbolo('ℓpx')?.significado).toContain(', m, véase C.18.6.2');
    expect(porSimbolo('wc')?.significado).toContain('kg/m³');
    expect(porSimbolo('εt')?.significado).toContain('deformación unitaria neta de tracción');
    expect(porSimbolo('ψh')?.significado).toContain('h_{a} < 1.5c_{a1}');
    expect(porSimbolo('K')?.significado).toBe('coeficiente de fricción por desviación accidental, por metro de tendón de preesforzado, Capítulo C.18');
    expect(porSimbolo('μ')?.significado).toContain('Capítulos 1 C.1, C.21'); // errata del original
  });

  it('el marcado de sub y superíndices se quita con textoPlano', () => {
    expect(textoPlano('A_{s,min}')).toBe('As,min');
    expect(textoPlano('f′_{ci}')).toBe('f′ci');
    expect(textoPlano('√f′_{c}')).toBe('√f′c');
  });

  it('las referencias tienen formato de sección o apéndice', () => {
    for (const s of simbolosC) {
      if (!s.ref) continue;
      for (const r of s.ref.split(',').map((x) => x.trim())) expect(r, textoPlano(s.simbolo)).toMatch(/^(C\.\d+(\.\d+)*|C-[A-G]\.\d+(\.\d+)*)$/);
    }
  });
});
