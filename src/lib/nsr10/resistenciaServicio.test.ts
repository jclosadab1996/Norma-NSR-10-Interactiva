import { describe, expect, it } from 'vitest';
import { combinacionesResistencia } from './combinaciones';
import { moduloElasticidad } from './concreto';
import {
  alturaMinimaUnaDireccion,
  deflexionInmediataUniforme,
  divisorC95c,
  envolventeU,
  epsilonLimiteCompresion,
  epsilonTDesdeC,
  espesorMinimoDosDirecciones,
  factorConcretoLiviano,
  factorFyAltura,
  factorXi,
  fuerzaAnclajePostensado,
  inerciaEfectiva,
  inerciaEfectivaPromedio,
  inerciaFisuradaRectangular,
  lambdaDiferida,
  limiteDeflexion,
  momentoAgrietamiento,
  phiDetalle,
  phiFlexion,
  phiPorCargaAxial,
  phiPretensadoEmbebido,
  propiedadesRectangulares,
  puedeReducirL,
  resistenciaRequerida,
} from './resistenciaServicio';

const valor = (l: ReturnType<typeof resistenciaRequerida>, id: string) => l.find((x) => x.id === id)!.valor;

describe('C.9.2.1 — resistencia requerida U', () => {
  const cargas = { D: 800, L: 300, Lr: 60, W: 90, E: 300 };

  it('coincide con las combinaciones B.2.4-1 a B.2.4-7 del Título B (con y sin excepciones)', () => {
    const casos = [
      {},
      { reducirL: true },
      { viento13: true },
      { sismoServicio: true },
      { hNeutraliza: true },
      { reducirL: true, viento13: true, sismoServicio: true, hNeutraliza: true },
    ];
    const conH = { ...cargas, H: 50, F: 10, T: 5, G: 20, Le: 30 };
    for (const c of [cargas, conH]) {
      for (const o of casos) {
        const a = resistenciaRequerida(c, o);
        const b = combinacionesResistencia(c, {
          reducirFactorL: o.reducirL,
          viento13: o.viento13,
          sismoNivelServicio: o.sismoServicio,
          hNeutralizaWE: o.hNeutraliza,
        });
        expect(a.map((x) => x.valor)).toEqual(b.map((x) => x.valor));
      }
    }
  });

  it('valores a mano (D=800, L=300, Lr=60, W=90, E=300)', () => {
    const u = resistenciaRequerida(cargas);
    expect(valor(u, 'C.9-1')).toBeCloseTo(1120, 9);
    expect(valor(u, 'C.9-2')).toBeCloseTo(1.2 * 800 + 1.6 * 300 + 0.5 * 60, 9);
    expect(valor(u, 'C.9-3')).toBeCloseTo(1.2 * 800 + 1.6 * 60 + 300, 9); // gobierna L sobre 0.8W
    expect(valor(u, 'C.9-4')).toBeCloseTo(1.2 * 800 + 1.6 * 90 + 300 + 30, 9);
    expect(valor(u, 'C.9-5')).toBeCloseTo(1.2 * 800 + 300 + 300, 9);
    expect(valor(u, 'C.9-6')).toBeCloseTo(0.9 * 800 + 1.6 * 90, 9);
    expect(valor(u, 'C.9-7')).toBeCloseTo(0.9 * 800 + 300, 9);
    expect(envolventeU(u)!.maxima.id).toBe('C.9-5');
  });

  it('excepciones: 0.5L, 1.3W, 1.4E y H = 0', () => {
    expect(valor(resistenciaRequerida(cargas, { reducirL: true }), 'C.9-5')).toBeCloseTo(960 + 300 + 150, 9);
    expect(valor(resistenciaRequerida(cargas, { viento13: true }), 'C.9-6')).toBeCloseTo(720 + 1.3 * 90, 9);
    expect(valor(resistenciaRequerida(cargas, { sismoServicio: true }), 'C.9-7')).toBeCloseTo(720 + 1.4 * 300, 9);
    expect(valor(resistenciaRequerida({ D: 100, H: 40, W: 10 }, { hNeutraliza: true }), 'C.9-6')).toBeCloseTo(90 + 16, 9);
    expect(valor(resistenciaRequerida({ D: 100, H: 40, W: 10 }), 'C.9-6')).toBeCloseTo(90 + 16 + 64, 9);
  });

  it('(1.0L ó 0.8W): gobierna 0.8W cuando es mayor y entra una sola carga de cubierta', () => {
    const u = resistenciaRequerida({ D: 100, L: 10, Lr: 5, G: 8, W: 50 });
    const c3 = u.find((x) => x.id === 'C.9-3')!;
    expect(c3.valor).toBeCloseTo(120 + 1.6 * 8 + 0.8 * 50, 9);
    expect(c3.cubierta).toBe('G');
  });

  it('sentidos "ambos": añade el sentido contrario de W y E', () => {
    const u = resistenciaRequerida({ D: -80, L: -30, E: 55 }, { sentidos: 'ambos' });
    const c5 = u.filter((x) => x.id === 'C.9-5');
    expect(c5.map((x) => x.valor).sort((a, b) => a - b)).toEqual([-96 - 30 - 55, -96 - 30 + 55]);
    expect(u.filter((x) => x.id === 'C.9-1')).toHaveLength(1);
    const env = envolventeU(u)!;
    expect(env.minima.valor).toBeCloseTo(-181, 9);
  });

  it('puedeReducirL: no en estacionamientos, reunión pública ni L0 > 4.8', () => {
    expect(puedeReducirL('general', 2.0)).toBe(true);
    expect(puedeReducirL('general', 4.8)).toBe(true);
    expect(puedeReducirL('general', 4.9)).toBe(false);
    expect(puedeReducirL('estacionamiento', 2.5)).toBe(false);
    expect(puedeReducirL('reunion-publica', 4.8)).toBe(false);
  });

  it('C.9.2.4: 1.2 × fuerza del gato', () => {
    expect(fuerzaAnclajePostensado(1000)).toBeCloseTo(1200, 9);
  });
});

describe('C.9.3 — φ', () => {
  it('extremos: compresión 0.65 / 0.75, tracción 0.90', () => {
    expect(phiFlexion(0.001)).toBe(0.65);
    expect(phiFlexion(0.002)).toBe(0.65);
    expect(phiFlexion(0.001, 'espiral')).toBe(0.75);
    expect(phiFlexion(0.005)).toBe(0.9);
    expect(phiFlexion(0.012, 'espiral')).toBe(0.9);
  });

  it('transición lineal entre 0.002 y 0.005 (fy = 420)', () => {
    expect(phiFlexion(0.0035)).toBeCloseTo(0.775, 12);
    expect(phiFlexion(0.0035, 'espiral')).toBeCloseTo(0.825, 12);
    expect(phiFlexion(0.004)).toBeCloseTo(0.65 + (0.25 * 2) / 3, 12);
    const d = phiDetalle(0.0035);
    expect(d.zona).toBe('transicion');
    expect(d.fraccion).toBeCloseTo(0.5, 12);
    expect(phiDetalle(0.0045).zona).toBe('transicion');
    expect(phiDetalle(0.002).zona).toBe('compresion');
    expect(phiDetalle(0.005).zona).toBe('traccion');
  });

  it('φ es continua y no decreciente en εt', () => {
    let previo = phiFlexion(0);
    for (let e = 0; e <= 0.008; e += 0.0001) {
      const p = phiFlexion(e);
      expect(p).toBeGreaterThanOrEqual(previo - 1e-12);
      previo = p;
    }
    expect(phiFlexion(0.002 + 1e-9)).toBeCloseTo(0.65, 6);
    expect(phiFlexion(0.005 - 1e-9)).toBeCloseTo(0.9, 6);
  });

  it('límite de compresión: 0.002 para 420 y preesforzado; fy/Es en otros casos', () => {
    expect(epsilonLimiteCompresion()).toBe(0.002);
    expect(epsilonLimiteCompresion(420)).toBe(0.002);
    expect(epsilonLimiteCompresion('preesforzado')).toBe(0.002);
    expect(epsilonLimiteCompresion(500)).toBeCloseTo(0.0025, 12);
    expect(epsilonLimiteCompresion(280)).toBeCloseTo(0.0014, 12);
    expect(phiFlexion(0.0025, 'otro', 500)).toBe(0.65);
    expect(() => epsilonLimiteCompresion(0)).toThrow(RangeError);
    expect(() => phiFlexion(NaN)).toThrow(RangeError);
  });

  it('εt desde c y dt (εcu = 0.003)', () => {
    expect(epsilonTDesdeC(150, 450)).toBeCloseTo(0.006, 12);
    expect(epsilonTDesdeC(270, 450)).toBeCloseTo(0.002, 12);
    expect(() => epsilonTDesdeC(0, 450)).toThrow(RangeError);
  });

  it('alternativa por φPn: lineal de φ de compresión a 0.90 entre 0.10 f′c Ag y cero', () => {
    // f′c = 28 MPa, Ag = 400×400 = 160000 mm² → 0.10 f′c Ag = 448 kN
    expect(phiPorCargaAxial(448, 28, 160000)).toBe(0.65);
    expect(phiPorCargaAxial(1000, 28, 160000)).toBe(0.65);
    expect(phiPorCargaAxial(0, 28, 160000)).toBe(0.9);
    expect(phiPorCargaAxial(224, 28, 160000)).toBeCloseTo(0.775, 12);
    expect(phiPorCargaAxial(224, 28, 160000, 'espiral')).toBeCloseTo(0.825, 12);
    // φPb menor que 0.10 f′c Ag: usa el menor
    expect(phiPorCargaAxial(100, 28, 160000, 'otro', 200)).toBeCloseTo(0.9 - 0.25 * 0.5, 12);
  });

  it('pretensado C.9.3.2.7: 0.75 hasta lt, lineal hasta 0.90 en ld', () => {
    expect(phiPretensadoEmbebido(0.2, 0.5, 1.5)).toBe(0.75);
    expect(phiPretensadoEmbebido(1.0, 0.5, 1.5)).toBeCloseTo(0.825, 12);
    expect(phiPretensadoEmbebido(2, 0.5, 1.5)).toBe(0.9);
    expect(() => phiPretensadoEmbebido(1, 2, 1)).toThrow(RangeError);
  });
});

describe('C.9.5.2 — altura mínima (Tabla C.9.5(a))', () => {
  it('fy = 420 y peso normal: ℓ/divisor', () => {
    const r = alturaMinimaUnaDireccion({ elemento: 'viga-nervada', apoyo: 'ambos-extremos', luzMm: 8400 });
    expect(r.divisor).toBe(21);
    expect(r.hMm).toBeCloseTo(400, 9);
    expect(alturaMinimaUnaDireccion({ elemento: 'losa-maciza', apoyo: 'simple', luzMm: 4000 }).hMm).toBeCloseTo(200, 9);
    expect(alturaMinimaUnaDireccion({ elemento: 'viga-nervada', apoyo: 'un-extremo', luzMm: 7400 }).hMm).toBeCloseTo(400, 9);
    expect(alturaMinimaUnaDireccion({ elemento: 'losa-maciza', apoyo: 'voladizo', luzMm: 1500 }).hMm).toBeCloseTo(150, 9);
  });

  it('factor (0.4 + fy/700)', () => {
    expect(factorFyAltura(420)).toBeCloseTo(1, 12);
    expect(factorFyAltura(280)).toBeCloseTo(0.8, 12);
    expect(factorFyAltura(520)).toBeCloseTo(0.4 + 520 / 700, 12);
    const r = alturaMinimaUnaDireccion({ elemento: 'losa-maciza', apoyo: 'ambos-extremos', luzMm: 5600, fy: 280 });
    expect(r.hMm).toBeCloseTo((5600 / 28) * 0.8, 9);
  });

  it('concreto liviano: (1.65 − 0.0003 wc), mínimo 1.09, solo 1440 a 1840', () => {
    expect(factorConcretoLiviano(1500)).toBeCloseTo(1.2, 12);
    expect(factorConcretoLiviano(1840)).toBeCloseTo(1.098, 12);
    expect(factorConcretoLiviano(1440)).toBeCloseTo(1.218, 12);
    expect(() => factorConcretoLiviano(1400)).toThrow(RangeError);
    expect(() => factorConcretoLiviano(2300)).toThrow(RangeError);
    const r = alturaMinimaUnaDireccion({ elemento: 'viga-nervada', apoyo: 'simple', luzMm: 6400, wc: 1700, fy: 420 });
    expect(r.hMm).toBeCloseTo(400 * (1.65 - 0.0003 * 1700), 9);
  });

  it('entradas inválidas', () => {
    expect(() => alturaMinimaUnaDireccion({ elemento: 'losa-maciza', apoyo: 'simple', luzMm: 0 })).toThrow(RangeError);
  });
});

describe('C.9.5.3 — losas en dos direcciones', () => {
  it('Tabla C.9.5(c) con interpolación lineal en fy', () => {
    expect(divisorC95c(420, 'sin-abaco', 'interior')).toBe(33);
    expect(divisorC95c(350, 'sin-abaco', 'ext-sin-borde')).toBeCloseTo(31.5, 12);
    expect(divisorC95c(470, 'con-abaco', 'ext-con-borde')).toBeCloseTo(35, 12);
    expect(() => divisorC95c(250, 'sin-abaco', 'interior')).toThrow(RangeError);
    expect(() => divisorC95c(550, 'sin-abaco', 'interior')).toThrow(RangeError);
  });

  it('losa sin vigas: ℓn/33 con fy = 420 y mínimo de 125 mm', () => {
    const r = espesorMinimoDosDirecciones({ lnMm: 6000, beta: 1, alfaFm: 0, fy: 420, panel: 'interior' });
    expect(r.regla).toBe('C.9.5.3.2');
    expect(r.hMm).toBeCloseTo(6000 / 33, 9);
    expect(espesorMinimoDosDirecciones({ lnMm: 3000, beta: 1, alfaFm: 0, fy: 420 }).hMm).toBe(125);
    expect(espesorMinimoDosDirecciones({ lnMm: 3000, beta: 1, alfaFm: 0, fy: 420, abaco: 'con-abaco' }).hMm).toBe(100);
  });

  it('Ec. C.9-12 (0.2 < αfm ≤ 2.0)', () => {
    const r = espesorMinimoDosDirecciones({ lnMm: 6000, beta: 1.2, alfaFm: 1.0, fy: 420 });
    expect(r.regla).toBe('C.9-12');
    expect(r.hCalculadaMm).toBeCloseTo((6000 * (0.8 + 420 / 1400)) / (36 + 5 * 1.2 * 0.8), 9);
    expect(r.hMm).toBeCloseTo(r.hCalculadaMm, 9);
    expect(espesorMinimoDosDirecciones({ lnMm: 2000, beta: 1, alfaFm: 1, fy: 420 }).hMm).toBe(125);
  });

  it('Ec. C.9-13 (αfm > 2.0) y mínimo de 90 mm', () => {
    const r = espesorMinimoDosDirecciones({ lnMm: 6000, beta: 1, alfaFm: 3, fy: 420 });
    expect(r.regla).toBe('C.9-13');
    expect(r.hCalculadaMm).toBeCloseTo((6000 * 1.1) / 45, 9);
    expect(espesorMinimoDosDirecciones({ lnMm: 2000, beta: 1, alfaFm: 3, fy: 420 }).hMm).toBe(90);
  });

  it('C.9.5.3.3(d): +10 % con borde discontinuo sin viga de borde', () => {
    const base = espesorMinimoDosDirecciones({ lnMm: 6000, beta: 1, alfaFm: 3, fy: 420 });
    const borde = espesorMinimoDosDirecciones({ lnMm: 6000, beta: 1, alfaFm: 3, fy: 420, bordeDiscontinuoSinViga: true });
    expect(borde.hMm).toBeCloseTo(base.hMm * 1.1, 9);
  });
});

describe('C.9.5.2.3 a C.9.5.2.5 — Ie y deflexión diferida', () => {
  const { ig, yt } = propiedadesRectangulares(300, 500);
  const fc = 21;
  const ec = moduloElasticidad(fc);

  it('Ig, Mcr y Ie cumplen Ie ≤ Ig y límites', () => {
    expect(ig).toBeCloseTo(3.125e9, 0);
    expect(yt).toBe(250);
    const fr = 0.62 * Math.sqrt(fc);
    const mcr = momentoAgrietamiento(fr, ig, yt);
    expect(mcr).toBeCloseTo((fr * 3.125e9) / 250 / 1e6, 9);
    const icr = 1.2e9;
    expect(inerciaEfectiva(mcr, mcr * 0.5, ig, icr)).toBe(ig); // sin fisurar
    expect(inerciaEfectiva(mcr, mcr, ig, icr)).toBeCloseTo(ig, 3);
    const ie = inerciaEfectiva(mcr, mcr * 2, ig, icr);
    expect(ie).toBeCloseTo(0.125 * ig + 0.875 * icr, 3);
    expect(ie).toBeGreaterThan(icr);
    expect(ie).toBeLessThan(ig);
    // Ma → ∞ tiende a Icr
    expect(inerciaEfectiva(mcr, mcr * 1000, ig, icr)).toBeCloseTo(icr, -3);
    expect(inerciaEfectiva(mcr, 0, ig, icr)).toBe(ig);
  });

  it('Ie decrece al aumentar Ma', () => {
    const mcr = 30;
    let previo = Infinity;
    for (let ma = 5; ma <= 300; ma += 5) {
      const ie = inerciaEfectiva(mcr, ma, ig, 1e9);
      expect(ie).toBeLessThanOrEqual(previo + 1e-6);
      previo = ie;
    }
  });

  it('Icr rectangular: sección simple y con refuerzo de compresión', () => {
    const r = inerciaFisuradaRectangular({ bMm: 300, dMm: 450, asMm2: 1530, ecMpa: ec });
    const n = 200000 / ec;
    // x resuelve b x²/2 = n As (d − x)
    expect((300 * r.x ** 2) / 2).toBeCloseTo(n * 1530 * (450 - r.x), 3);
    expect(r.icr).toBeCloseTo((300 * r.x ** 3) / 3 + n * 1530 * (450 - r.x) ** 2, 0);
    expect(r.icr).toBeLessThan(ig);
    const rc = inerciaFisuradaRectangular({ bMm: 300, dMm: 450, asMm2: 1530, ecMpa: ec, asPrimaMm2: 600, dPrimaMm: 50 });
    expect(rc.icr).toBeGreaterThan(r.icr);
    expect(rc.x).toBeLessThan(r.x);
  });

  it('promedio de Ie en elementos continuos (C.9.5.2.4)', () => {
    expect(inerciaEfectivaPromedio([2, 4])).toBe(3);
    expect(() => inerciaEfectivaPromedio([])).toThrow(RangeError);
  });

  it('λΔ = ξ/(1 + 50ρ′) y ξ de la norma', () => {
    expect(factorXi(3)).toBe(1);
    expect(factorXi(6)).toBe(1.2);
    expect(factorXi(12)).toBe(1.4);
    expect(factorXi(60)).toBe(2);
    expect(() => factorXi(24 as never)).toThrow(RangeError);
    expect(lambdaDiferida(2, 0)).toBe(2);
    expect(lambdaDiferida(2, 0.01)).toBeCloseTo(2 / 1.5, 12);
    expect(lambdaDiferida(1.4, 0.02)).toBeCloseTo(0.7, 12);
  });

  it('deflexión elástica de una viga simple 5wL⁴/(384EI) y voladizo wL⁴/(8EI)', () => {
    // w = 10 kN/m, L = 6 m, E = 20000 MPa, I = 1e9 mm⁴ → 5·10·6000⁴/(384·20000·1e9)
    expect(deflexionInmediataUniforme('simple', 10, 6, 20000, 1e9)).toBeCloseTo((5 * 10 * 6000 ** 4) / (384 * 20000 * 1e9), 9);
    expect(deflexionInmediataUniforme('voladizo', 10, 2, 20000, 1e9)).toBeCloseTo((10 * 2000 ** 4) / (8 * 20000 * 1e9), 9);
  });

  it('límites de la Tabla C.9.5(b)', () => {
    expect(limiteDeflexion('cubierta-plana', 6000)).toBeCloseTo(6000 / 180, 9);
    expect(limiteDeflexion('entrepiso', 6000)).toBeCloseTo(6000 / 360, 9);
    expect(limiteDeflexion('susceptibles', 6000)).toBeCloseTo(6000 / 480, 9);
    expect(limiteDeflexion('no-susceptibles', 6000)).toBeCloseTo(6000 / 240, 9);
  });
});
