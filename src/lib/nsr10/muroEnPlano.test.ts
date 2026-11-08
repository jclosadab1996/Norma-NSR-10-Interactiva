import { describe, expect, it } from 'vitest';
import { efectosCargaLateral, resumenMuroFueraPlano } from './muroFueraPlanoResumen';
import { resumenMuroEnPlano, type EntradaMuroEnPlano } from './muroEnPlano';

/** Ejemplos 5, 6 y 7 de d5b.mdx: muro de 3000 × 150, f′m = 10, 2 No. 4 por extremo (258 mm²) a d′ = 150, h′ = 2600, No. 3 c/400 embebidas. */
const ej5: EntradaMuroEnPlano = {
  fm: 10,
  fy: 420,
  lw: 3000,
  t: 150,
  hPrime: 2600,
  areaExtremo: 258,
  dPrime: 150,
  nIntermedias: 0,
  areaIntermedia: 0,
  Av: 71,
  s: 400,
  fyCortante: 420,
  refuerzoCortante: 'embebido',
  fr: 1.12,
  tipoInyeccion: 'inyectada-total',
  tipoBorde: 'reforzada',
  Pu: 150,
  Mu: 400,
  Vu: 300,
};

describe('resumenMuroEnPlano — ejemplos 5 a 7 de d5b.mdx', () => {
  const r = resumenMuroEnPlano(ej5);

  it('geometría y carga balanceada: Ae = 450 000, Ast = 516, Pb = 1710 kN', () => {
    expect(r.Ae).toBe(450000);
    expect(r.Ast).toBe(516);
    expect(r.Pb).toBeCloseTo(1710, 6);
  });

  it('flexión mínima (D.5.8-1, D.5.8-2): Mcr = 150·3000²/6·1.12 = 252 kN·m y 1.8 Mcr = 453.6 kN·m', () => {
    expect(r.minima.Mcr).toBeCloseTo(252, 8);
    expect(r.minima.alfa).toBe(1.8);
    expect(r.minima.alfaMcr).toBeCloseTo(453.6, 8);
    expect(r.minima.Mn).not.toBeNull();
    expect(r.minima.MnPura).not.toBeNull();
    // la flexión pura (sin carga) da menos Mn que con Pu = 150 kN
    expect(r.minima.MnPura!).toBeLessThan(r.minima.Mn!);
  });

  it('cortante (Tablas D.5.8-2 y D.5.8-3): Mu/(Vud) = 0.55556, Vm = 404.3 kN, Vs = 156.6 kN, Vn máx = 615.1 kN', () => {
    const c = r.cortante;
    expect(c.Amv).toBe(450000);
    expect(c.d).toBe(2400);
    expect(c.mvd).toBeCloseTo(400e6 / (300000 * 2400), 10);
    const coef = 0.33 - 0.13 * c.mvd;
    expect(c.Vm).toBeCloseTo((coef * 450000 * Math.sqrt(10)) / 1000 + 37.5, 8);
    expect(c.Vm).toBeCloseTo(404.3, 1);
    expect(c.rhoN).toBeCloseTo((71 * 0.7) / (400 * 150), 10);
    expect(c.Vs).toBeCloseTo(156.56, 2);
    expect(c.Vn).toBeCloseTo(c.Vm + c.Vs, 10);
    expect(c.VnMax).toBeCloseTo(((0.56 - 0.23 * c.mvd) * 450000 * Math.sqrt(10)) / 1000, 8);
    expect(c.VnMax).toBeCloseTo(615.1, 1);
    expect(c.cumpleMaximo).toBe(true);
  });

  it('articulación plástica (D.5.8.4.1): V(Mn) = Mn/(Mu/Vu), s máx = min(3·150, 600) = 450 mm; la separación dada (400) cumple', () => {
    expect(r.hinge.VMn).toBeCloseTo(r.minima.Mn! / (400 / 300), 8);
    expect(r.hinge.sMax).toBe(450);
    expect(r.hinge.cumpleSeparacion).toBe(true);
    expect(r.hinge.riesgo).toBe(r.cortante.VnUtil > r.hinge.VMn!);
  });

  it('elementos de borde (D.5.8.5): σ = 150000/450000 + 6·400e6/(150·3000²) = 2.1111 MPa > 0.20 f′m = 2.0 → se requieren', () => {
    expect(r.borde.sigma).toBeCloseTo(150000 / 450000 + (6 * 400e6) / (150 * 9e6), 10);
    expect(r.borde.sigma).toBeCloseTo(2.1111, 4);
    expect(r.borde.res.limite).toBeCloseTo(2, 10);
    expect(r.borde.res.requiere).toBe(true);
    expect(r.borde.res.limiteSuspension).toBeCloseTo(1.5, 10);
  });

  it('con refuerzo parcialmente reforzado el límite sube a 0.30 f′m = 3.0 MPa y no se requieren bordes', () => {
    const p = resumenMuroEnPlano({ ...ej5, tipoBorde: 'parcialmente-reforzada' });
    expect(p.borde.res.limite).toBeCloseTo(3, 10);
    expect(p.borde.res.requiere).toBe(false);
  });

  it('flexo-compresión (D.5.8-3) coincide con verificarFlexoCompresion y el diagrama tiene tope, balanceado y tracción pura', () => {
    expect(r.flexo.detalle).not.toBeNull();
    expect(r.flexo.cumple).toBe(r.flexo.razon! <= 1);
    expect(r.curva.puntos[0].etiqueta).toBe('tope');
    expect(r.curva.puntos[r.curva.puntos.length - 1].Pn).toBeCloseTo(-(516 * 420) / 1000, 8);
  });

  it('una demanda de Mu enorme no cumple flexo-compresión; Pu enorme se rechaza por el tope', () => {
    expect(resumenMuroEnPlano({ ...ej5, Mu: 5000, Vu: 300 }).flexo.cumple).toBe(false);
    const alto = resumenMuroEnPlano({ ...ej5, Pu: 9000 });
    expect(alto.flexo.motivo).toBe('Pu-excede-tope');
    expect(alto.minima.Mn).toBeNull();
    expect(alto.cumpleTodo).toBe(false);
  });

  it('s mayor que min(3t, 600) incumple la región de articulación si hay riesgo', () => {
    const w = resumenMuroEnPlano({ ...ej5, s: 800 });
    expect(w.hinge.cumpleSeparacion).toBe(false);
  });
});

describe('resumenMuroFueraPlano — ejemplo 4 de d5b.mdx (franja de 1 m, No. 4 c/800 al centro, h′ = 2800)', () => {
  const base = { fm: 10, fy: 420, t: 150, b: 1000, fraccionAe: 1, hPrime: 2800, areaBarra: 129, sep: 800, d: 75 };

  it('As = 129/0.80 = 161.25 mm²/m, Ae = 150 000, umbral 0.10 f′m Ae = 150 kN/m', () => {
    const r = resumenMuroFueraPlano({ ...base, Pu: 40, Mu: 4 });
    expect(r.As).toBeCloseTo(161.25, 8);
    expect(r.Ae).toBe(150000);
    expect(r.fuera.umbralPu).toBe(150);
    expect(r.fuera.Re).toBeCloseTo(1 - (2800 / 150 / 42) ** 2, 10);
  });

  it('caso A (Pu = 40): Ase, a, Mn y φReMn de las Ecs. D.5.7-1 a D.5.7-4', () => {
    const r = resumenMuroFueraPlano({ ...base, Pu: 40, Mu: 4 });
    expect(r.fuera.caso).toBe('menor');
    const Ase = (161.25 * 420 + 40000) / 420;
    const a = (161.25 * 420 + 40000) / (0.8 * 10 * 1000);
    const Mn = (Ase * 420 * (75 - a / 2)) / 1e6;
    expect(r.fuera.Ase).toBeCloseTo(Ase, 8);
    expect(r.fuera.a).toBeCloseTo(a, 8);
    expect(r.fuera.Mn).toBeCloseTo(Mn, 8);
    expect(r.fuera.phiReMn).toBeCloseTo(0.8 * r.fuera.Re * Mn, 8);
    expect(r.fuera.cumple).toBe(true);
    expect(r.Pn).toBe(40);
    expect(r.cumpleTodo).toBe(true);
  });

  it('caso B (Pu = 200 > 150): interacción con Pn = Pu/φ = 250 kN/m; φReMn del orden de 6–8 kN·m/m', () => {
    const r = resumenMuroFueraPlano({ ...base, Pu: 200, Mu: 8 });
    expect(r.fuera.caso).toBe('mayor');
    expect(r.Pn).toBeCloseTo(250, 10);
    expect(r.fuera.Mn).toBeGreaterThan(8);
    expect(r.fuera.phiReMn).toBeCloseTo(0.8 * r.fuera.Re * r.fuera.Mn, 10);
    expect(r.fuera.esbeltezAdmisible).toBe(true);
  });

  it('cortante D.5.7-7: Vn = 150000·√10/6 = 79.057 kN/m y φVn = 47.434 kN/m', () => {
    const r = resumenMuroFueraPlano({ ...base, Pu: 40, Mu: 4, Vu: 30 });
    expect(r.Vn).toBeCloseTo(79.0569415, 6);
    expect(r.phiVn).toBeCloseTo(47.4341649, 6);
    expect(r.razonV).toBeCloseTo(30 / 47.4341649, 6);
    expect(r.cumpleV).toBe(true);
    expect(resumenMuroFueraPlano({ ...base, Pu: 40, Mu: 4, Vu: 60 }).cumpleV).toBe(false);
  });

  it('un Mu grande no cumple', () => {
    expect(resumenMuroFueraPlano({ ...base, Pu: 40, Mu: 20 }).cumpleTodo).toBe(false);
  });

  it('carga lateral uniforme: q = 1.2 kN/m², b = 1 m, h′ = 2.8 m → Mu = 1.176 kN·m/m y Vu = 1.68 kN/m', () => {
    const e = efectosCargaLateral(1.2, 1000, 2800);
    expect(e.Mu).toBeCloseTo(1.176, 10);
    expect(e.Vu).toBeCloseTo(1.68, 10);
  });
});
