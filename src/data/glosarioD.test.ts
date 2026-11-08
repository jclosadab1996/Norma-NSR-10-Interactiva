import { describe, expect, it } from 'vitest';
import { definicionesD, inicialDe, simbolosD, TEMAS_GLOSARIO_D, textoPlano } from './glosarioD';

const porTermino = (t: string) => definicionesD.find((d) => d.termino === t);
const porSimbolo = (s: string) => simbolosD.find((x) => textoPlano(x.simbolo) === s);

describe('glosario D — definiciones (D.2.5)', () => {
  it('tiene todas las definiciones del PDF (43, incluidas «Murete o prisma» y «Prisma» por separado)', () => {
    expect(definicionesD).toHaveLength(43);
  });

  it('no repite términos (sin distinguir mayúsculas ni tildes)', () => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const vistos = new Set<string>();
    for (const d of definicionesD) {
      const k = norm(d.termino);
      expect(vistos.has(k), `duplicado: ${d.termino}`).toBe(false);
      vistos.add(k);
    }
  });

  it('ninguna definición ni término está vacío ni trae caracteres corruptos', () => {
    for (const d of definicionesD) {
      expect(d.termino.trim().length, d.termino).toBeGreaterThan(1);
      expect(d.definicion.trim().length, d.termino).toBeGreaterThan(5);
      expect(d.definicion, d.termino).not.toMatch(/�|[ \t]{2,}|\n/);
      expect(d.termino, d.termino).not.toMatch(/�|[ \t]{2,}/);
      expect(d.tema, d.termino).toBeTruthy();
    }
  });

  it('está ordenado alfabéticamente', () => {
    const c = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
    for (let i = 1; i < definicionesD.length; i++) {
      expect(c.compare(definicionesD[i - 1].termino, definicionesD[i].termino), `${definicionesD[i - 1].termino} / ${definicionesD[i].termino}`).toBeLessThanOrEqual(0);
    }
    expect(definicionesD[0].termino).toBe('Absorción');
    expect(definicionesD[definicionesD.length - 1].termino).toBe('Unidad de mampostería');
  });

  it('cada tema existe y todos los temas se usan', () => {
    const ids = new Set(TEMAS_GLOSARIO_D.map((t) => t.id));
    expect(TEMAS_GLOSARIO_D.length).toBeGreaterThanOrEqual(5);
    expect(TEMAS_GLOSARIO_D.length).toBeLessThanOrEqual(8);
    expect(ids.size).toBe(TEMAS_GLOSARIO_D.length);
    const usados = new Set(definicionesD.map((d) => d.tema));
    for (const d of definicionesD) expect(ids.has(d.tema), d.termino).toBe(true);
    for (const id of ids) expect(usados.has(id), id).toBe(true);
    for (const t of TEMAS_GLOSARIO_D) {
      expect(t.nombre.trim().length, t.id).toBeGreaterThan(3);
      expect(t.descripcion.trim().length, t.id).toBeGreaterThan(10);
    }
  });

  it('las secciones relacionadas tienen formato de referencia válido', () => {
    for (const d of definicionesD) {
      if (d.seccionRelacionada) expect(d.seccionRelacionada, d.termino).toMatch(/^D\.\d+(\.\d+)*$/);
    }
  });

  it('conserva muestras literales de la norma', () => {
    expect(porTermino('Absorción')?.definicion).toBe('Cantidad de agua que penetra en los poros de la unidad en relación al peso seco.');
    expect(porTermino('Prisma')?.definicion).toBe('Murete.');
    expect(porTermino('Aparejo trabado')?.definicion).toContain('al menos en un cuarto de la longitud de la pieza');
    expect(porTermino('Aparejo de petaca')?.definicion).toContain('sin traslapos');
    expect(porTermino('Dimensiones nominales')?.definicion).toContain('10 mm');
    expect(porTermino('Área neta de la sección')?.definicion).toContain('excluyendo las cavidades');
    expect(porTermino('Cuantía')?.definicion).toBe('Relación entre el área transversal del refuerzo y el área bruta de la sección considerada.');
    expect(porTermino('Elemento compuesto')?.definicion).toContain('L, T, C, H, Z, I, Y');
    expect(porTermino('Muro no estructural')?.definicion).toContain('únicamente debidas a su peso propio');
    expect(porTermino('Tasa inicial de absorción')?.definicion).toContain('durante un minuto');
    expect(porTermino('Tolete')?.definicion).toContain('sólida');
    expect(porTermino('Resistencia a la compresión de la mampostería (f′m)')?.definicion).toContain('área transversal neta');
    expect(porTermino('Mortero de recubrimiento o revoque (pañete)')?.definicion).toContain('enlucir');
  });

  it('conserva las erratas «continúa» del original', () => {
    expect(porTermino('Celda')?.definicion).toBe('Cavidad continúa interior en la mampostería.');
    expect(porTermino('Traba')?.definicion).toContain('continúa');
  });

  it('inicialDe ignora tildes', () => {
    expect(inicialDe('Área bruta de la sección')).toBe('A');
    expect(inicialDe('Unidad de mampostería')).toBe('U');
  });
});

describe('glosario D — notación (D.2.4)', () => {
  it('tiene todos los símbolos del PDF (85: 8 + 37 + 40 por página D-8, D-9, D-10)', () => {
    expect(simbolosD).toHaveLength(85);
    expect(simbolosD.every((s) => s.origen === 'D.2.4')).toBe(true);
  });

  it('conserva el orden de la norma: de Aa a η', () => {
    expect(textoPlano(simbolosD[0].simbolo)).toBe('Aa');
    expect(textoPlano(simbolosD[1].simbolo)).toBe('Aci');
    expect(textoPlano(simbolosD[simbolosD.length - 1].simbolo)).toBe('η');
    const i = (s: string) => simbolosD.findIndex((x) => textoPlano(x.simbolo) === s);
    expect(i('Av')).toBeLessThan(i('a'));
    expect(i('As2')).toBeLessThan(i('Av'));
    expect(i('f′m')).toBeLessThan(i('√f′m'));
    expect(i('√f′m')).toBeLessThan(i('fr'));
    expect(i('kr')).toBeLessThan(i('ℓ'));
    expect(i('ℓw')).toBeLessThan(i('M'));
    expect(i('ΔPui')).toBeLessThan(i('R'));
    expect(i('x̄')).toBeLessThan(i('α'));
    expect(i('φ')).toBeLessThan(i('ρ'));
  });

  it('no repite símbolos y todos tienen significado', () => {
    const vistos = new Set<string>();
    for (const s of simbolosD) {
      const k = textoPlano(s.simbolo);
      expect(k.trim().length, k).toBeGreaterThan(0);
      expect(vistos.has(k), `duplicado: ${k}`).toBe(false);
      vistos.add(k);
      expect(s.significado.trim().length, k).toBeGreaterThan(5);
      expect(s.significado, k).not.toMatch(/�|[ \t]{2,}|\n/);
      expect(s.simbolo, k).not.toMatch(/�|\s/);
    }
  });

  it('contiene los símbolos fundamentales de D.2.4', () => {
    const esperados = ['Ae', 'Amv', 'Ase', 'Ast', 'As1', 'As2', 'Av', 'a', 'ab', 'b', 'c', 'd', 'd′', 'E', 'Ecre', 'Em', 'Er', 'Es', 'f′c', 'f′cp', 'f′cr', 'f′cre', 'f′cu', 'f′m', '√f′m', 'fr', 'fy', 'Gm', 'Gr', 'h', 'h′', 'K', 'kp', 'kr', 'ℓ', 'ℓc', 'ℓw', 'M', 'Mn', 'Mcr', 'Mu', 'Pb', 'Pn', 'Po', 'Pu', 'R', 'Re', 'Rm', 'R0', 'r', 's', 't', 'V', 'Vn', 'Vnc', 'Vm', 'Vu', 'Vuc', 'Vs', 'α', 'εmu', 'εy', 'φ', 'ρ', 'ρb', 'ρn', 'η'];
    for (const e of esperados) expect(porSimbolo(e), e).toBeDefined();
  });

  it('conserva muestras literales verificadas contra la imagen', () => {
    expect(porSimbolo('Ae')?.significado).toBe('área efectiva de la sección de mampostería, mm². Véase D.5.4.1');
    expect(porSimbolo('Ae')?.ref).toBe('D.5.4.1');
    expect(porSimbolo('Amv')?.ref).toBe('D.5.4.5');
    expect(porSimbolo('b')?.ref).toBe('D.5.4.4');
    expect(porSimbolo('t')?.ref).toBe('D.5.4.2');
    expect(porSimbolo('h′')?.ref).toBe('D.5.4.3');
    expect(porSimbolo('a')?.significado).toContain('0.85c');
    expect(porSimbolo('f′m')?.significado).toBe('resistencia especificada a la compresión de la mampostería, MPa');
    expect(porSimbolo('√f′m')?.significado).toContain('raíz cuadrada');
    expect(porSimbolo('kp')?.significado).toContain('k_{p} = 1.4 para unidades de concreto');
    expect(porSimbolo('kp')?.significado).toContain('0.8 para unidades de arcilla o sílico-calcáreas');
    expect(porSimbolo('kr')?.significado).toContain('0.90 para unidades de concreto');
    expect(porSimbolo('kr')?.significado).toContain('0.75 para unidades de arcilla o sílico-calcáreas');
    expect(porSimbolo('Ict')?.significado).toContain('mm⁴');
    expect(porSimbolo('εmu')?.significado).toContain('0.003');
    expect(porSimbolo('Pnt')?.significado).toContain('siempre negativa');
    expect(porSimbolo('Pnc')?.significado).toContain('siempre positiva');
    expect(porSimbolo('ρ')?.significado).toContain('A_{s}/(bd)');
    expect(porSimbolo('ρn')?.significado).toContain('mm²'); // errata del original (unidad en una cuantía)
    expect(porSimbolo('ΔPui')?.significado).toContain('valor absoluto');
  });

  it('x̄ usa la marca de barra superior combinada (U+0304)', () => {
    const s = simbolosD.find((x) => x.simbolo.startsWith('x') && x.simbolo.length === 2);
    expect(s).toBeDefined();
    expect(s!.simbolo.codePointAt(1)).toBe(0x304);
  });

  it('el marcado de sub y superíndices se quita con textoPlano', () => {
    expect(textoPlano('A_{ci}')).toBe('Aci');
    expect(textoPlano('f′_{cre}')).toBe('f′cre');
    expect(textoPlano('√f′_{m}')).toBe('√f′m');
  });

  it('las referencias tienen formato de sección del Título D', () => {
    for (const s of simbolosD) {
      if (!s.ref) continue;
      for (const r of s.ref.split(',').map((x) => x.trim())) expect(r, textoPlano(s.simbolo)).toMatch(/^D\.\d+(\.\d+)*$/);
    }
  });
});
