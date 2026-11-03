import { describe, expect, it } from 'vitest';
import { definiciones, inicialDe, prefijosSI, reglasSI, simbolos, TEMAS_GLOSARIO, textoPlano } from './glosario';

const porTermino = (t: string) => definiciones.find((d) => d.termino === t);
const porSimbolo = (s: string) => simbolos.find((x) => textoPlano(x.simbolo) === s);

describe('glosario — definiciones (A.13.1)', () => {
  it('tiene todas las definiciones del PDF (154 entradas)', () => {
    expect(definiciones).toHaveLength(154);
  });

  it('no repite términos (sin distinguir mayúsculas ni tildes)', () => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const vistos = new Set<string>();
    for (const d of definiciones) {
      const k = norm(d.termino);
      expect(vistos.has(k), `duplicado: ${d.termino}`).toBe(false);
      vistos.add(k);
    }
  });

  it('ninguna definición ni término está vacío ni trae caracteres corruptos', () => {
    for (const d of definiciones) {
      expect(d.termino.trim().length, d.termino).toBeGreaterThan(1);
      expect(d.definicion.trim().length, d.termino).toBeGreaterThan(8);
      expect(d.definicion, d.termino).not.toMatch(/�|\s{2,}/);
      expect(d.termino, d.termino).not.toMatch(/�/);
    }
  });

  it('está ordenado alfabéticamente', () => {
    const c = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
    for (let i = 1; i < definiciones.length; i++) {
      expect(c.compare(definiciones[i - 1].termino, definiciones[i].termino), `${definiciones[i - 1].termino} / ${definiciones[i].termino}`).toBeLessThanOrEqual(0);
    }
  });

  it('cada tema existe y todos los temas se usan', () => {
    const ids = new Set(TEMAS_GLOSARIO.map((t) => t.id));
    const usados = new Set(definiciones.map((d) => d.tema));
    for (const d of definiciones) expect(ids.has(d.tema), d.termino).toBe(true);
    for (const id of ids) expect(usados.has(id), id).toBe(true);
  });

  it('las secciones relacionadas tienen formato de referencia válido', () => {
    for (const d of definiciones) {
      if (d.seccionRelacionada) expect(d.seccionRelacionada, d.termino).toMatch(/^(A\.\d+(\.\d+)*|A-\d|B\.\d+(\.\d+)*|Título [A-Z]|[A-K]\.\d+)$/);
    }
  });

  it('conserva muestras literales de la norma', () => {
    expect(porTermino('Sismo de diseño')?.definicion).toContain('probabilidad de sólo diez por ciento de ser excedidos en un lapso de cincuenta años');
    expect(porTermino('Sismo de diseño')?.definicion).toContain('período promedio de retorno de 475 años');
    expect(porTermino('Sismo de seguridad limitada')?.definicion).toContain('225 años');
    expect(porTermino('Sismo del umbral de daño')?.definicion).toContain('ochenta por ciento');
    expect(porTermino('Sismo del umbral de daño')?.definicion).toContain('31 años');
    expect(porTermino('Deriva de piso')?.definicion).toBe('Es la diferencia entre los desplazamientos horizontales de los niveles entre los cuales está comprendido el piso.');
    expect(porTermino('Índice de deriva')?.definicion).toBe('Es la deriva del piso dividida por la altura del mismo.');
    expect(porTermino('Piso flexible')?.definicion).toContain('menor que el 70%');
    expect(porTermino('Piso débil')?.definicion).toContain('menor que el 70%');
    expect(porTermino('Altura del piso')?.definicion).toContain('exceda 6 m');
    expect(porTermino('Cerramiento')?.definicion).toContain('no excede 4 metros');
    expect(porTermino('Amortiguamiento')?.definicion).toBe('Pérdida de energía en un movimiento ondulatorio.');
    expect(porTermino('Peso')?.definicion).toContain('g = 9.8 m/s²');
    expect(porTermino('Carga gravitacional o peso, (M.g)')?.definicion).toContain('25 por ciento de la masa que produce la carga viva');
    expect(porTermino('Capacidad de disipación de energía')?.definicion).toContain('R = φa·φp·φr·R0');
    expect(porTermino('Capacidad de disipación de energía')?.definicion).toContain('especial (DES), moderado (DMO) y mínimo (DMI)');
    expect(porTermino('Plastificación progresiva, método de')?.definicion).toContain('push-over');
    expect(porTermino('DES')?.definicion).toBe('Capacidad especial de disipación de energía.');
    expect(porTermino('Sistema Internacional de Medidas (SI)')?.definicion).toContain('Decreto 1731 de 18 de Septiembre de 1967');
  });

  it('une las definiciones partidas por el salto de página', () => {
    // Capacidad de disipación... R (cruza A-126→A-127); Número de pisos aéreos en la colindancia (A-130→A-131); Sistema de arriostramiento horizontal (A-133→A-134)
    expect(porTermino('Coeficiente de capacidad de disipación de energía, R')?.definicion).toMatch(/redundancia del sistema estructural de resistencia sísmica, φr\. \(R = φa·φp·φr·R0\)\.$/);
    expect(porTermino('Número de pisos aéreos en la colindancia')?.definicion).toMatch(/en la colindancia\.$/);
    expect(porTermino('Sistema de arriostramiento horizontal')?.definicion).toBe('Es un sistema de cercha, o armadura, horizontal que cumple las mismas funciones de un diafragma.');
    expect(porTermino('Supervisor técnico')?.definicion).toContain('Véase interventor.');
  });

  it('incluye los subincisos (a)–(d) de Ductilidad y (a)–(c) de Desempeño', () => {
    const duct = porTermino('Ductilidad')!.definicion;
    for (const x of ['(a) Ductilidad de curvatura', '(b) Ductilidad de rotación', '(c) Ductilidad de desplazamiento', '(d) Ductilidad de deformación']) expect(duct).toContain(x);
    const des = porTermino('Desempeño de los elementos no estructurales')!.definicion;
    for (const x of ['(a) Grado de desempeño superior', '(b) Grado de desempeño bueno', '(c) Grado de desempeño bajo']) expect(des).toContain(x);
  });

  it('las remisiones «Véase» apuntan a términos existentes', () => {
    expect(porTermino('Armadura')?.definicion).toBe('Véase cercha.');
    expect(porTermino('Cercha')).toBeDefined();
    expect(porTermino('Muro de cortante')?.definicion).toBe('Véase muro estructural.');
    expect(porTermino('Muro estructural')).toBeDefined();
    expect(porTermino('Temblor, terremoto')?.definicion).toBe('Véase sismo.');
  });

  it('inicialDe ignora tildes', () => {
    expect(inicialDe('Índice de deriva')).toBe('I');
    expect(inicialDe('Ángulo')).toBe('A');
    expect(inicialDe('Período de vibración, T')).toBe('P');
  });
});

describe('glosario — nomenclatura (A.13.2)', () => {
  it('tiene todos los símbolos del PDF (104 entradas)', () => {
    expect(simbolos).toHaveLength(104);
  });

  it('no repite símbolos y todos tienen significado', () => {
    const vistos = new Set<string>();
    for (const s of simbolos) {
      const k = textoPlano(s.simbolo);
      expect(vistos.has(k), `duplicado: ${k}`).toBe(false);
      vistos.add(k);
      expect(s.significado.trim().length, k).toBeGreaterThan(5);
      expect(s.significado, k).not.toMatch(/�/);
    }
  });

  it('contiene los símbolos fundamentales del Título A', () => {
    const esperados = ['Aa', 'Av', 'Ae', 'Ad', 'Fa', 'Fv', 'I', 'Sa', 'Sv', 'Sd', 'Sad', 'T', 'Ta', 'T0', 'TC', 'TL', 'TCd', 'TLd', 'Ct', 'Cu', 'Cvx', 'R', 'R0', 'R′', 'Rp', 'RC', 'φa', 'φp', 'φr', 'φe', 'φc', 'Ω0', 'Vs', 'Vx', 'Vsd', 'Vmj', 'Fi, Fx', 'Qi', 'θi', 'α', 'k', 'g', 'M', 'w', 'IP', 'vsi', 'sui', 'Ni', 'di', 'dc', 'ds', 'H', 'E', 'Ed', 'Ω0'];
    for (const e of esperados) {
      expect(porSimbolo(e), e).toBeDefined();
    }
  });

  it('conserva muestras literales verificadas contra la imagen', () => {
    expect(porSimbolo('Aa')?.significado).toBe('coeficiente que representa la aceleración horizontal pico efectiva, para diseño, dado en A.2.2.');
    expect(porSimbolo('Av')?.significado).toBe('coeficiente de aceleración que representa la velocidad horizontal pico efectiva, para diseño, dado en A.2.2.');
    expect(porSimbolo('Ae')?.significado).toContain('seguridad limitada, dado en A.10.3');
    expect(porSimbolo('Ad')?.significado).toContain('umbral de daño, dado en A.12.2');
    expect(porSimbolo('g')?.significado).toBe('aceleración debida a la gravedad (g = 9.8 m/s²).');
    expect(porSimbolo('Fv')?.significado).toContain('períodos intermedios');
    expect(porSimbolo('Fa')?.significado).toContain('períodos cortos');
    expect(porSimbolo('I')?.significado).toBe('coeficiente de importancia dado en A.2.5.2.');
    expect(porSimbolo('IP')?.significado).toContain('ASTM D 4318');
    expect(porSimbolo('Ω0')?.significado).toBe('coeficiente de sobreresistencia. Véase A.3.3.9.');
    expect(porSimbolo('Ct')?.ref).toBe('A.4.2.2');
    expect(porSimbolo('Cu')?.ref).toBe('A.4.2.1');
    expect(porSimbolo('k')?.ref).toBe('A.4.3.2');
    expect(porSimbolo('R')?.significado).toContain('R = φ_{a}φ_{p}φ_{r}R_{0}');
    expect(textoPlano(porSimbolo('R')!.significado)).toContain('R = φaφpφrR0');
    expect(textoPlano(porSimbolo('E')!.significado)).toContain('E = Fs/R');
    expect(porSimbolo('ℓwi')?.significado).toContain('longitud medida horizontalmente');
    expect(porSimbolo('Awi')?.significado).toContain('área mínima de cortante');
  });

  it('las referencias tienen formato de sección, capítulo o ecuación', () => {
    for (const s of simbolos) {
      if (!s.ref) continue;
      for (const r of s.ref.split(',').map((x) => x.trim())) expect(r, textoPlano(s.simbolo)).toMatch(/^A\.\d+(\.\d+)*(-\d+)?$|^A-\d$|^A\.\d+-\d+$/);
    }
  });

  it('textoPlano quita el marcado de sub y superíndices', () => {
    expect(textoPlano('δ_{cm,j}^{i}')).toBe('δcm,ji');
    expect(textoPlano('h_{p}^{i}')).toBe('hpi');
    expect(textoPlano('M̄_{j}')).toBe('M̄j');
  });
});

describe('glosario — SI', () => {
  it('12 prefijos y 11 reglas de sintaxis', () => {
    expect(prefijosSI).toHaveLength(12);
    expect(reglasSI).toHaveLength(11);
    expect(reglasSI.map((r) => r.letra).join('')).toBe('abcdefghijk');
    expect(prefijosSI.find((p) => p.nombre === 'kilo')).toMatchObject({ simbolo: 'k', valor: '1 000' });
    expect(prefijosSI.find((p) => p.nombre === 'micro')?.simbolo).toBe('μ');
  });
});
