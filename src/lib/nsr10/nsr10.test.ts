import { describe, expect, it } from 'vitest';
import {
  coeficienteCu,
  coeficienteCw,
  coeficienteFa,
  coeficienteFv,
  coeficienteImportancia,
  coeficienteR,
  coeficienteSeparacion,
  cortanteBasal,
  ctMuros,
  distribuirFuerzas,
  exponenteK,
  limiteDeriva,
  limiteDerivaUmbralDano,
  perfilPorVs,
  periodoAproximado,
  periodoMaximo,
  periodoPorPisos,
  periodosEspectro,
  periodosUmbral,
  sa,
  sad,
  separacionSismica,
  velocidadMediaCortante,
  verificarDeriva,
  zonaAmenaza,
  mesetaSa,
  curvaEspectro,
} from './index';

describe('A.2.3 — zona de amenaza (Tabla A.2.3-2, capitales)', () => {
  const casos: Array<[string, number, number, string]> = [
    ['Arauca', 0.15, 0.15, 'Intermedia'],
    ['Armenia', 0.25, 0.25, 'Alta'],
    ['Barranquilla', 0.1, 0.1, 'Baja'],
    ['Bogotá D. C.', 0.15, 0.2, 'Intermedia'],
    ['Cúcuta', 0.35, 0.3, 'Alta'],
    ['Florencia', 0.2, 0.15, 'Intermedia'],
    ['Leticia', 0.05, 0.05, 'Baja'],
    ['Montería', 0.1, 0.15, 'Intermedia'],
    ['Mocoa', 0.3, 0.25, 'Alta'],
    ['Popayán', 0.25, 0.2, 'Alta'],
  ];
  it.each(casos)('%s', (_n, aa, av, zona) => {
    expect(zonaAmenaza(aa, av)).toBe(zona);
  });
});

describe('A.2.4 — coeficientes de sitio Fa y Fv', () => {
  it('valores tabulados', () => {
    expect(coeficienteFa('D', 0.1)).toBe(1.6);
    expect(coeficienteFa('E', 0.5)).toBe(0.9);
    expect(coeficienteFv('C', 0.3)).toBe(1.5);
    expect(coeficienteFv('E', 0.1)).toBe(3.5);
  });
  it('interpola linealmente entre columnas (A.2.4.5.5)', () => {
    expect(coeficienteFa('D', 0.15)).toBeCloseTo(1.5, 6);
    expect(coeficienteFa('E', 0.25)).toBeCloseTo(1.45, 6);
    expect(coeficienteFv('E', 0.25)).toBeCloseTo(3.0, 6);
  });
  it('satura fuera del rango de la tabla', () => {
    expect(coeficienteFa('D', 0.05)).toBe(1.6);
    expect(coeficienteFa('D', 0.7)).toBe(1.0);
  });
  it('perfil F requiere estudio de sitio', () => {
    expect(coeficienteFa('F', 0.2)).toBeNull();
    expect(coeficienteFv('F', 0.2)).toBeNull();
  });
  it('clasifica por vs y calcula vs media (A.2.4-1)', () => {
    expect(perfilPorVs(1600).perfil).toBe('A');
    expect(perfilPorVs(800).perfil).toBe('B');
    expect(perfilPorVs(400).perfil).toBe('C');
    expect(perfilPorVs(250).perfil).toBe('D');
    expect(perfilPorVs(150).perfil).toBe('E');
    // 10 m a 200 m/s y 20 m a 400 m/s -> vs = 30 / (0.05 + 0.05) = 300 m/s
    expect(velocidadMediaCortante([{ espesor: 10, vs: 200 }, { espesor: 20, vs: 400 }])).toBeCloseTo(300, 9);
  });
});

describe('A.2.5 — coeficiente de importancia', () => {
  it('Tabla A.2.5-1', () => {
    expect(coeficienteImportancia('IV')).toBe(1.5);
    expect(coeficienteImportancia('III')).toBe(1.25);
    expect(coeficienteImportancia('II')).toBe(1.1);
    expect(coeficienteImportancia('I')).toBe(1.0);
  });
});

describe('A.2.6 — espectro de diseño (Bogotá, suelo D, grupo I)', () => {
  // Aa = 0.15, Av = 0.20 -> Fa = 1.5, Fv = 2.0, I = 1.0
  const p = { aa: 0.15, av: 0.2, fa: 1.5, fv: 2.0, i: 1.0 };
  it('períodos característicos', () => {
    const { t0, tc, tl } = periodosEspectro(p);
    expect(t0).toBeCloseTo(0.17778, 4);
    expect(tc).toBeCloseTo(0.85333, 4);
    expect(tl).toBeCloseTo(4.8, 9);
  });
  it('meseta y ramas', () => {
    expect(mesetaSa(p)).toBeCloseTo(0.5625, 9);
    expect(sa(0.5, p)).toBeCloseTo(0.5625, 9);
    expect(sa(1.0, p)).toBeCloseTo(0.48, 9);
    expect(sa(5.0, p)).toBeCloseTo(0.09216, 9);
  });
  it('continuidad en TC y TL', () => {
    const { tc, tl } = periodosEspectro(p);
    expect(sa(tc - 1e-9, p)).toBeCloseTo(sa(tc + 1e-9, p), 6);
    expect(sa(tl - 1e-9, p)).toBeCloseTo(sa(tl + 1e-9, p), 6);
  });
  it('rama inicial T0 (A.2.6-7) solo si se pide', () => {
    expect(sa(0, p)).toBeCloseTo(0.5625, 9);
    expect(sa(0, p, { ramaInicialT0: true })).toBeCloseTo(0.5625 * 0.4, 9);
  });
  it('la curva incluye los puntos de quiebre', () => {
    const { tc } = periodosEspectro(p);
    expect(curvaEspectro(p, 4).some((q) => Math.abs(q.t - tc) < 1e-12)).toBe(true);
  });
  it('el grupo de uso escala todo el espectro linealmente', () => {
    const pIV = { ...p, i: coeficienteImportancia('IV') };
    expect(sa(1.0, pIV)).toBeCloseTo(1.5 * sa(1.0, p), 9);
  });
});

describe('A.4 — período y fuerzas sísmicas', () => {
  it('Cu = 1.75 − 1.2·Av·Fv con mínimo 1.2 (A.4.2-2)', () => {
    expect(coeficienteCu(0.2, 2.0)).toBeCloseTo(1.27, 9);
    expect(coeficienteCu(0.5, 2.4)).toBe(1.2); // 1.75 − 1.44 = 0.31 -> 1.2
  });
  it('Ta = Ct·hn^α (Tabla A.4.2-1)', () => {
    expect(periodoAproximado('porticos-concreto', 30)).toBeCloseTo(1.0035, 3);
    expect(periodoAproximado('porticos-acero', 30)).toBeCloseTo(0.072 * Math.pow(30, 0.8), 9);
    expect(periodoAproximado('otros-muros', 20)).toBeCloseTo(0.049 * Math.pow(20, 0.75), 9);
  });
  it('Ta = 0.1·N (A.4.2-5) y Tmax = Cu·Ta', () => {
    expect(periodoPorPisos(8)).toBeCloseTo(0.8, 9);
    expect(periodoMaximo(0.2, 2.0, 1.0)).toBeCloseTo(1.27, 9);
  });
  it('exponente k (A.4.3.2)', () => {
    expect(exponenteK(0.3)).toBe(1.0);
    expect(exponenteK(0.5)).toBe(1.0);
    expect(exponenteK(1.0)).toBeCloseTo(1.25, 9);
    expect(exponenteK(2.5)).toBeCloseTo(2.0, 9);
    expect(exponenteK(3.0)).toBe(2.0);
  });
  it('Cw y Ct para muros (A.4.2-4)', () => {
    // Un muro: Awi = 2 m², hwi = hn = 20 m, ℓwi = 4 m, AB = 400 m²
    // Cw = (100/400)·[(1)²·2 / (1 + 0.83·(20/4)²)] = 0.25·2/(1+20.75) = 0.022989
    const cw = coeficienteCw([{ awi: 2, hwi: 20, lwi: 4 }], 400, 20);
    expect(cw).toBeCloseTo(0.0229885, 6);
    const { ct, alpha } = ctMuros(cw);
    expect(ct).toBeCloseTo(0.0062 / Math.sqrt(cw), 12);
    expect(alpha).toBe(1);
  });
  it('Vs = Sa·g·M', () => {
    // Sa = 0.5, M = 100 000 kg -> Vs = 0.5·9.8·1e5 = 490 000 N
    expect(cortanteBasal(0.5, 100_000)).toBeCloseTo(490_000, 6);
  });
  it('distribución por pisos suma Vs y respeta k (A.4.3-2/3)', () => {
    const niveles = [
      { h: 3, m: 1000 },
      { h: 6, m: 1000 },
      { h: 9, m: 1000 },
    ];
    // T = 0.4 -> k = 1: Cvx = h/Σh = 3/18, 6/18, 9/18
    const r = distribuirFuerzas(niveles, 1800, 0.4);
    expect(r.map((x) => x.fx)).toEqual([300, 600, 900]);
    expect(r.reduce((s, x) => s + x.fx, 0)).toBeCloseTo(1800, 9);
    expect(r[0].cortantePiso).toBeCloseTo(1800, 9);
    expect(r[2].cortantePiso).toBeCloseTo(900, 9);
    // T = 1.0 -> k = 1.25: la suma de Fx sigue siendo Vs
    const r2 = distribuirFuerzas(niveles, 1800, 1.0);
    expect(r2.reduce((s, x) => s + x.fx, 0)).toBeCloseTo(1800, 9);
    expect(r2[2].cvx).toBeGreaterThan(r2[2].h / 18); // más peso arriba con k > 1
  });
});

describe('A.3.3.3 — R = φa·φp·φr·R0', () => {
  it('regular', () => expect(coeficienteR(7.0)).toBe(7.0));
  it('irregular', () => expect(coeficienteR(7.0, 0.9, 0.8, 0.75)).toBeCloseTo(7 * 0.9 * 0.8 * 0.75, 9));
});

describe('A.6 — deriva y separación sísmica', () => {
  it('límites (Tablas A.6.4-1 y A.12.5-1)', () => {
    expect(limiteDeriva('general')).toBe(0.01);
    expect(limiteDeriva('mamposteriaCortante')).toBe(0.005);
    expect(limiteDerivaUmbralDano('general')).toBe(0.004);
    expect(limiteDerivaUmbralDano('mamposteriaCortante')).toBe(0.002);
  });
  it('verifica deriva de un piso', () => {
    // hpi = 3 m, δi = 0.045 m, δi-1 = 0.020 m -> Δ = 0.025 m = 0.833 % hpi < 1.0 %
    const ok = verificarDeriva(0.045, 0.02, 3, limiteDeriva('general'));
    expect(ok.razon).toBeCloseTo(0.025 / 3, 9);
    expect(ok.cumple).toBe(true);
    // Δ = 0.035 m = 1.167 % hpi > 1.0 %
    const mal = verificarDeriva(0.055, 0.02, 3, limiteDeriva('general'));
    expect(mal.cumple).toBe(false);
    // con secciones fisuradas (×0.7): 0.035·0.7 = 0.0245 m -> cumple
    expect(verificarDeriva(0.055, 0.02, 3, limiteDeriva('general'), 0.7).cumple).toBe(true);
  });
  it('coeficientes de separación sísmica (Tabla A.6.5-1)', () => {
    expect(coeficienteSeparacion(2, 'no-coinciden-losas')).toBe(0);
    expect(coeficienteSeparacion(3, 'coinciden-losas')).toBe(0);
    expect(coeficienteSeparacion(3, 'no-coinciden-losas')).toBe(0.01);
    expect(coeficienteSeparacion(10, 'coinciden-losas')).toBe(0.02);
    expect(coeficienteSeparacion(10, 'no-coinciden-losas')).toBe(0.03);
    expect(coeficienteSeparacion(10, 'sin-vecino-o-separado')).toBe(0.01);
    expect(separacionSismica(30, 10, 'no-coinciden-losas')).toBeCloseTo(0.9, 9);
  });
});

describe('A.12 — espectro del umbral de daño', () => {
  // Ad = 0.08, suelo D con Av = Ad -> Fv = 2.4 -> S = 3.0, TCd = 1.5, TLd = 7.2
  const p = { ad: 0.08, fv: 2.4 };
  it('períodos', () => {
    const { tcd, tld } = periodosUmbral(p.fv);
    expect(tcd).toBeCloseTo(1.5, 9);
    expect(tld).toBeCloseTo(7.2, 9);
  });
  it('ramas', () => {
    expect(sad(0.1, p)).toBeCloseTo(0.08 * 1.8, 9);
    expect(sad(1.0, p)).toBeCloseTo(0.24, 9);
    expect(sad(2.0, p)).toBeCloseTo(0.18, 9);
    expect(sad(8.0, p)).toBeCloseTo(0.0405, 9);
  });
});
