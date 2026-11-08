import { describe, expect, it } from 'vitest';
import {
  alturaBloque,
  alturaEfectiva,
  anchoAletaMaximo,
  anchoEfectivoParalelo,
  anchoEfectivoPerpendicular,
  areaCortanteParalela,
  areaCortantePerpendicular,
  areaEfectiva,
  cargaBalanceada,
  coeficienteMachones,
  dimensionesEfectivas,
  dispersionPorUnidadProfundidad,
  distanciaMaximaApoyosViga,
  esVigaAlta,
  esfuerzoAplastamientoMaximo,
  espesorEfectivoMachones,
  espesorEquivalenteInercia,
  flechaMaximaViga,
  longitudAplastamiento,
  moduloCortanteMamposteria,
  moduloCortanteMortero,
  moduloElasticidadMamposteria,
  moduloElasticidadMamposteriaDetalle,
  moduloElasticidadMortero,
  moduloElasticidadMorteroDetalle,
  phiEnPlanoFlexocompresion,
  relacionModular,
  verificarEsbeltez,
} from './dimensionesMamposteria';

describe('D.5.2 módulos', () => {
  it('Em de concreto (Ec. D.5.2-2) y de arcilla (D.5.2-3)', () => {
    expect(moduloElasticidadMamposteria(10, 'concreto')).toBe(9000);
    expect(moduloElasticidadMamposteria(15, 'arcilla')).toBe(11250);
  });
  it('tope de 20 000 MPa', () => {
    const a = moduloElasticidadMamposteriaDetalle(30, 'arcilla');
    expect(a.sinTope).toBe(22500);
    expect(a.valor).toBe(20000);
    expect(a.topeActivo).toBe(true);
    expect(moduloElasticidadMamposteriaDetalle(22, 'concreto').valor).toBe(19800);
    expect(moduloElasticidadMamposteriaDetalle(22, 'concreto').topeActivo).toBe(false);
  });
  it('Er = 2500 √f′cr (Ec. D.5.2-4)', () => {
    expect(moduloElasticidadMortero(16)).toBeCloseTo(10000, 6);
    expect(moduloElasticidadMortero(21)).toBeCloseTo(11456.439, 2);
    expect(moduloElasticidadMorteroDetalle(64).valor).toBeCloseTo(20000, 6);
    const t = moduloElasticidadMorteroDetalle(100);
    expect(t.sinTope).toBeCloseTo(25000, 6);
    expect(t.valor).toBe(20000);
    expect(t.topeActivo).toBe(true);
  });
  it('Gm = 0.4 Em y Gr = 0.5 Er', () => {
    expect(moduloCortanteMamposteria(9000)).toBeCloseTo(3600, 9);
    expect(moduloCortanteMortero(10000)).toBe(5000);
  });
  it('relación modular n = Es/Em', () => {
    expect(relacionModular(9000)).toBeCloseTo(22.2222, 4);
    expect(relacionModular(10000, 200000)).toBe(20);
  });
});

describe('Tabla D.5.4-1 e interpolación', () => {
  it('valores de la tabla exactos', () => {
    expect(coeficienteMachones(6, 2).coef).toBeCloseTo(1.4, 12);
    expect(coeficienteMachones(6, 3).coef).toBeCloseTo(2.0, 12);
    expect(coeficienteMachones(8, 2).coef).toBeCloseTo(1.3, 12);
    expect(coeficienteMachones(8, 3).coef).toBeCloseTo(1.7, 12);
    expect(coeficienteMachones(10, 3).coef).toBeCloseTo(1.4, 12);
    expect(coeficienteMachones(15, 2).coef).toBeCloseTo(1.1, 12);
    expect(coeficienteMachones(20, 3).coef).toBeCloseTo(1.0, 12);
    expect(coeficienteMachones(8, 1).coef).toBeCloseTo(1.0, 12);
  });
  it('«6 ó menos» y «20 ó más»', () => {
    expect(coeficienteMachones(3, 3).coef).toBeCloseTo(2.0, 12);
    expect(coeficienteMachones(40, 3).coef).toBeCloseTo(1.0, 12);
  });
  it('interpolación lineal en una dirección', () => {
    expect(coeficienteMachones(9, 2).coef).toBeCloseTo(1.25, 12);
    expect(coeficienteMachones(12.5, 3).coef).toBeCloseTo(1.3, 12);
    expect(coeficienteMachones(8, 1.5).coef).toBeCloseTo(1.15, 12);
  });
  it('interpolación bilineal', () => {
    expect(coeficienteMachones(9, 2.5).coef).toBeCloseTo(1.4, 12);
    expect(coeficienteMachones(7, 2.5).coef).toBeCloseTo(1.6, 12);
  });
  it('fuera de la tabla se acota y se avisa', () => {
    const r = coeficienteMachones(8, 4);
    expect(r.fueraDeTabla).toBe(true);
    expect(r.coef).toBeCloseTo(1.7, 12);
    expect(coeficienteMachones(8, 0.5).fueraDeTabla).toBe(true);
    expect(coeficienteMachones(8, 2).fueraDeTabla).toBe(false);
  });
  it('espesor efectivo t = t_muro × coeficiente', () => {
    const r = espesorEfectivoMachones(140, 3150, 350);
    expect(r.coef).toBeCloseTo(1.4, 12);
    expect(r.t).toBeCloseTo(196, 9);
  });
  it('espesor equivalente por inercia', () => {
    expect(espesorEquivalenteInercia((1000 * 150 ** 3) / 12, 1000)).toBeCloseTo(150, 9);
    // T de ala 1000×100 y alma 150×200 (h total 300): I (eje y centroidal) calculado a mano = 7.6e8 mm⁴ aprox.; solo se verifica coherencia
    const I = 7.6e8;
    expect(espesorEquivalenteInercia(I, 1000)).toBeCloseTo(Math.cbrt((12 * I) / 1000), 9);
  });
});

describe('D.5.4.3 altura efectiva y esbeltez', () => {
  it('casos (a), (b) y (c)', () => {
    expect(alturaEfectiva(2700, 'ambos')).toBe(2700);
    expect(alturaEfectiva(1200, 'voladizo')).toBe(2400);
    expect(alturaEfectiva(1200, 'voladizo', 2000)).toBe(2000);
    expect(alturaEfectiva(1200, 'voladizo', 3000)).toBe(2400);
  });
  it('h′/t ≤ 25', () => {
    const a = verificarEsbeltez(3000, 120);
    expect(a.relacion).toBe(25);
    expect(a.cumple).toBe(true);
    expect(a.hMaxima).toBe(3000);
    expect(verificarEsbeltez(3001, 120).cumple).toBe(false);
    expect(verificarEsbeltez(3000, 196).relacion).toBeCloseTo(15.306, 3);
  });
});

describe('D.5.4.4 ancho efectivo y D.5.4.5 áreas', () => {
  it('flexión perpendicular al plano: trabado 6t, petaca 3t, mayor con la separación', () => {
    const a = anchoEfectivoPerpendicular({ aparejo: 'trabado', anchoNominal: 150, separacionRefuerzo: 800 });
    expect(a.nVecesAncho).toBe(900);
    expect(a.b).toBe(900);
    expect(a.bSiSeLeyeraComoTope).toBe(800);
    const p = anchoEfectivoPerpendicular({ aparejo: 'petaca', anchoNominal: 150, separacionRefuerzo: 800 });
    expect(p.nVecesAncho).toBe(450);
    expect(p.b).toBe(800);
    expect(p.bSiSeLeyeraComoTope).toBe(450);
    expect(anchoEfectivoPerpendicular({ aparejo: 'trabado', anchoNominal: 150, separacionRefuerzo: 1200 }).b).toBe(1200);
  });
  it('celdas inyectadas: sección sólida', () => {
    const s = anchoEfectivoPerpendicular({ aparejo: 'trabado', anchoNominal: 150, separacionRefuerzo: 800, todasInyectadas: true, anchoSolido: 1000 });
    expect(s.solida).toBe(true);
    expect(s.b).toBe(1000);
  });
  it('flexión paralela: b = Ae/ℓw', () => {
    expect(anchoEfectivoParalelo(252000, 3000)).toBe(84);
  });
  it('Ae y Amv', () => {
    expect(areaEfectiva({ areaContacto: 100000, areaInyectada: 50000 })).toBe(150000);
    expect(areaEfectiva({ areaContacto: 100000, areaInyectada: 50000, areaConfinamiento: 20000, factorJuntaRanurada: 0.9 })).toBe(160000);
    expect(areaCortantePerpendicular(252000)).toBe(252000);
    expect(areaCortantePerpendicular(252000, true, 120000)).toBe(120000);
    expect(areaCortanteParalela(84, 3000)).toBe(252000);
    expect(areaCortanteParalela(70, 3000)).toBe(210000);
  });
});

describe('D.5.4.6 a D.5.4.8 y D.5.3', () => {
  it('vigas y dinteles', () => {
    expect(distanciaMaximaApoyosViga(140)).toBe(4480);
    expect(flechaMaximaViga(4000)).toBe(8);
    expect(esVigaAlta(2000, 1800).alta).toBe(true);
    expect(esVigaAlta(3000, 1800).alta).toBe(false);
    expect(esVigaAlta(3000, 1800, true).alta).toBe(true);
    expect(esVigaAlta(2250, 1800).relacion).toBe(1.25);
    expect(esVigaAlta(2250, 1800).alta).toBe(false);
  });
  it('aletas y aplastamiento', () => {
    expect(anchoAletaMaximo(150)).toBe(900);
    expect(longitudAplastamiento({ aparejo: 'trabado', anchoPieza: 200, espesorApoyo: 150 })).toBe(800);
    expect(longitudAplastamiento({ aparejo: 'trabado', anchoPieza: 200, espesorApoyo: 150, distanciaEntreCargas: 700 })).toBe(700);
    expect(longitudAplastamiento({ aparejo: 'petaca', tamanoUnidad: 390 })).toBe(390);
    expect(esfuerzoAplastamientoMaximo(10)).toBeCloseTo(5.1, 12);
    expect(dispersionPorUnidadProfundidad('trabado')).toBeCloseTo(1, 12);
    expect(dispersionPorUnidadProfundidad('petaca')).toBeCloseTo(0.57735, 5);
  });
});

describe('D.5.1 bloque, Pb y φ', () => {
  it('a = 0.85 c', () => {
    expect(alturaBloque(100)).toBe(85);
  });
  it('Pb y ab (Ec. D.5.1-2)', () => {
    const r = cargaBalanceada(10, 1000, 75, 420);
    expect(r.ab).toBeCloseTo(37.5, 9);
    expect(r.Pb).toBeCloseTo(300000, 3);
  });
  it('φ lineal de 0.60 a 0.85', () => {
    const base = { fmAe: 1_500_000, Pb: 300_000, fy: 420 };
    const a = phiEnPlanoFlexocompresion({ ...base, phiPn: 30_000 });
    expect(a.limite).toBe(75_000);
    expect(a.phi).toBeCloseTo(0.75, 12);
    expect(phiEnPlanoFlexocompresion({ ...base, phiPn: 0 }).phi).toBeCloseTo(0.85, 12);
    expect(phiEnPlanoFlexocompresion({ ...base, phiPn: 75_000 }).phi).toBeCloseTo(0.6, 12);
    expect(phiEnPlanoFlexocompresion({ ...base, phiPn: 500_000 }).phi).toBeCloseTo(0.6, 12);
    const alto = phiEnPlanoFlexocompresion({ ...base, phiPn: 10_000, fy: 500 });
    expect(alto.phi).toBe(0.6);
    expect(alto.incrementoPermitido).toBe(false);
  });
});

describe('dimensionesEfectivas (paquete de la calculadora)', () => {
  it('muro de bloque de concreto con machones', () => {
    const r = dimensionesEfectivas({
      tipo: 'concreto',
      fm: 10,
      fcr: 16,
      espesorMuro: 140,
      machones: { espaciamiento: 3150, espesor: 350 },
      dimensionVertical: 3000,
      apoyo: 'ambos',
    });
    expect(r.Em.valor).toBe(9000);
    expect(r.Gm).toBeCloseTo(3600, 9);
    expect(r.Er?.valor).toBeCloseTo(10000, 6);
    expect(r.Gr).toBeCloseTo(5000, 6);
    expect(r.t).toBeCloseTo(196, 9);
    expect(r.hEf).toBe(3000);
    expect(r.esbeltez.cumple).toBe(true);
  });
  it('sin machones ni mortero', () => {
    const r = dimensionesEfectivas({ tipo: 'arcilla', fm: 12, espesorMuro: 120, dimensionVertical: 1500, apoyo: 'voladizo' });
    expect(r.Em.valor).toBe(9000);
    expect(r.Er).toBeUndefined();
    expect(r.t).toBe(120);
    expect(r.hEf).toBe(3000);
    expect(r.esbeltez.relacion).toBe(25);
  });
});
