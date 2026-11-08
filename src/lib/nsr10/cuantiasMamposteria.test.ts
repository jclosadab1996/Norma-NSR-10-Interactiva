import { describe, expect, it } from 'vitest';
import {
  areaPorMm,
  clasificarPerforacionVertical,
  cuantia,
  cuantiasBloque,
  cuantiasCavidad,
  evaluarAdicionalesDES,
  resumir,
  verificarCavidad,
  verificarNoReforzada,
  verificarParcial,
  verificarReforzada,
  verificarSistema,
  type DatosBloque,
  type DatosCavidad,
} from './cuantiasMamposteria';

const N4 = { diametro: 12.7, area: 129 };
const N3 = { diametro: 9.5, area: 71 };
const A4 = { diametro: 4, area: 12.6 };
const M6 = { diametro: 6, area: 28.3 };

const muroD7: DatosBloque = {
  espesor: 150,
  fm: 12,
  longitud: 4,
  altura: 2.4,
  todasCeldasInyectadas: true,
  vertical: { ...N4, sep: 800 },
  horizontal: { ...M6, n: 2, sep: 400 },
  ubicacionHorizontal: 'juntas',
  extremo: { n: 1, diametro: 12.7 },
  remate: { n: 2, diametro: 9.5 },
  hayAberturas: false,
  aberturaVertical: { n: 1, diametro: 12.7 },
  aberturaHorizontal: { n: 2, diametro: 9.5 },
};

const cavidad: DatosCavidad = {
  espesorPared: 80,
  espesorCavidad: 100,
  fm: 10,
  fInyeccion: 14,
  capas: 1,
  fraccionCapaMayor: 1,
  verticalCavidad: { ...N4, sep: 400 },
  horizontalCavidad: { ...N3, sep: 400 },
  verticalParedes: { diametro: 0, area: 0, sep: 1, n: 0 },
  horizontalParedes: { ...A4, n: 2, sep: 400 },
  extremo: { n: 2, diametro: 12.7 },
  remate: { n: 2, diametro: 12.7 },
  contribuyeCompresion: false,
  estribo: { diametro: 6, sep: 150 },
  posicionadorSep: 1500,
  conector: { tipo: 'cercha', diametro: 4, sepVertical: 600, sepHorizontal: 800, pata: 0 },
};

const por = (vs: ReturnType<typeof verificarReforzada>, id: string) => vs.find((x) => x.id === id)!;

describe('cuantías (área de refuerzo / área bruta)', () => {
  it('área por mm y cuantía de una escalerilla de dos alambres de 4 mm cada 400 mm en un muro de 150 mm', () => {
    const r = { ...A4, n: 2, sep: 400 };
    expect(areaPorMm(r)).toBeCloseTo(0.063, 6);
    expect(cuantia(r, 150)).toBeCloseTo(0.00042, 8);
  });
  it('sin refuerzo (n = 0) la cuantía es 0; separación no positiva da NaN', () => {
    expect(cuantia({ diametro: 0, area: 0, sep: 1, n: 0 }, 150)).toBe(0);
    expect(Number.isNaN(cuantia({ ...N4, sep: 0 }, 150))).toBe(true);
  });
});

describe('D.7 — mampostería reforzada', () => {
  it('muro de 150 mm con N°4 cada 800 mm y escalerilla de 2×6M cada 400 mm cumple todo', () => {
    const q = cuantiasBloque(muroD7);
    expect(q.vertical).toBeCloseTo(129 / (800 * 150), 8); // 0.001075
    expect(q.horizontal).toBeCloseTo(56.6 / (400 * 150), 8); // 0.000943
    expect(q.suma).toBeCloseTo(0.0020183, 6);
    expect(resumir(verificarReforzada(muroD7)).todasCumplen).toBe(true);
  });
  it('2 alambres de 4 mm cada 200 mm: ρh ≥ 0.0007 pero la suma queda por debajo de 0.0020', () => {
    const vs = verificarReforzada({ ...muroD7, horizontal: { ...A4, n: 2, sep: 200 } });
    expect(por(vs, 'd7-rho-h').cumple).toBe(true);
    expect(por(vs, 'd7-rho-suma').cumple).toBe(false);
    expect(por(vs, 'd7-rho-suma').provisto).toBe('0.00192');
  });
  it('ρv menor que la mitad de ρh incumple D.7.3.1(c)', () => {
    const vs = verificarReforzada({ ...muroD7, vertical: { ...N4, sep: 1200 }, horizontal: { ...M6, n: 2, sep: 100 } });
    expect(por(vs, 'd7-rho-vh').cumple).toBe(false);
  });
  it('separación vertical: 1200 mm cumple y 1250 mm no', () => {
    expect(por(verificarReforzada({ ...muroD7, vertical: { ...N4, sep: 1200 } }), 'd7-sep-v').cumple).toBe(true);
    expect(por(verificarReforzada({ ...muroD7, vertical: { ...N4, sep: 1250 } }), 'd7-sep-v').cumple).toBe(false);
  });
  it('f′m fuera de 10–28 MPa y espesor menor de 120 mm incumplen', () => {
    expect(por(verificarReforzada({ ...muroD7, fm: 9.9 }), 'd7-fm').cumple).toBe(false);
    expect(por(verificarReforzada({ ...muroD7, fm: 28.1 }), 'd7-fm').cumple).toBe(false);
    expect(por(verificarReforzada({ ...muroD7, espesor: 110 }), 'd7-espesor').cumple).toBe(false);
  });
  it('diámetro de las barras mínimas: 12 mm en extremos, 9.5 mm en remate', () => {
    expect(por(verificarReforzada({ ...muroD7, extremo: { n: 1, diametro: 9.5 } }), 'd7-extremo').cumple).toBe(false);
    expect(por(verificarReforzada({ ...muroD7, extremo: { n: 1, diametro: 12 } }), 'd7-extremo').cumple).toBe(true);
    expect(por(verificarReforzada({ ...muroD7, remate: { n: 1, diametro: 9.5 } }), 'd7-remate').cumple).toBe(false);
  });
  it('elementos embebidos: se evalúa con 1200 mm y se informa el valor impreso de 120 mm', () => {
    const vs = verificarReforzada({ ...muroD7, ubicacionHorizontal: 'embebido', horizontal: { ...N3, n: 1, sep: 800 } });
    const c = por(vs, 'd7-h-sep-emb');
    expect(c.cumple).toBe(true);
    expect(c.errata).toBe(true);
    expect(c.cumpleValorImpreso).toBe(false);
  });
  it('aberturas mayores de 600 mm agregan dos verificaciones', () => {
    const a = verificarReforzada(muroD7).length;
    const b = verificarReforzada({ ...muroD7, hayAberturas: true }).length;
    expect(b - a).toBe(2);
  });
});

describe('D.7.2.1.1 — adicionales para DES y clasificación', () => {
  it('límite = menor de L/3, H/3 y 1200 mm', () => {
    const e = evaluarAdicionalesDES({ ...muroD7, longitud: 4, altura: 2.4 });
    expect(e.limiteSeparacion).toBeCloseTo(800, 6); // H/3 = 800 mm
    expect(e.limiteImpreso).toBe(120);
    expect(e.verticalOk).toBe(true); // 800 mm ≤ 800 mm (sin error de coma flotante)
    const e2 = evaluarAdicionalesDES({ ...muroD7, longitud: 9, altura: 6 });
    expect(e2.limiteSeparacion).toBe(1200);
  });
  it('con refuerzo horizontal en juntas no se cumple (b): debe estar embebido en mortero de relleno', () => {
    const e = evaluarAdicionalesDES({ ...muroD7, vertical: { ...N4, sep: 600 } });
    expect(e.verticalOk).toBe(true);
    expect(e.horizontalOk).toBe(false);
    expect(e.cumpleAdicionales).toBe(false);
  });
  it('D.7: DES si inyecta todas las celdas o cumple los adicionales (D.2.1.2: «o»); DMO si ninguna de las dos', () => {
    const adicionales: DatosBloque = { ...muroD7, todasCeldasInyectadas: false, vertical: { ...N4, sep: 600 }, ubicacionHorizontal: 'embebido', horizontal: { ...M6, n: 2, sep: 400 } };
    expect(evaluarAdicionalesDES(adicionales).cumpleAdicionales).toBe(true);
    const c = clasificarPerforacionVertical(adicionales);
    expect(c.sistema).toBe('reforzada');
    expect(c.capacidad).toBe('DES');
    // Todas las celdas inyectadas (aunque no cumpla los adicionales): DES
    expect(clasificarPerforacionVertical(muroD7).capacidad).toBe('DES');
    // Solo celdas con refuerzo y sin los adicionales (horizontal en juntas): DMO
    expect(clasificarPerforacionVertical({ ...muroD7, todasCeldasInyectadas: false }).capacidad).toBe('DMO');
  });
  it('cae a D.8 si cumple solo el parcial y a D.9 si no cumple ninguno', () => {
    const parcial: DatosBloque = { ...muroD7, fm: 8.5, vertical: { ...N3, sep: 1000 }, horizontal: { ...A4, n: 2, sep: 400 }, extremo: { n: 1, diametro: 9.5 } };
    const c = clasificarPerforacionVertical(parcial);
    expect(c.cumpleReforzada).toBe(false); // f′m < 10 MPa y diámetro de extremo
    expect(c.cumpleParcial).toBe(true);
    expect(c.sistema).toBe('parcial');
    expect(c.capacidad).toBe('DMO');
    const nada = clasificarPerforacionVertical({ ...parcial, vertical: { ...N3, sep: 3000 } });
    expect(nada.sistema).toBe('no-reforzada');
    expect(nada.capacidad).toBe('DMI');
  });
});

describe('D.8 — mampostería parcialmente reforzada', () => {
  const muroD8: DatosBloque = { ...muroD7, fm: 8.5, vertical: { ...N3, sep: 2400 }, horizontal: { ...A4, n: 1, sep: 800 }, extremo: { n: 1, diametro: 9.5 } };
  it('cuantía 0.00027: 1 alambre de 4 mm cada 800 mm en 150 mm es 0.000105 (no cumple); 2 alambres cada 400 sí', () => {
    const q = cuantiasBloque(muroD8);
    expect(q.horizontal).toBeCloseTo(12.6 / (800 * 150), 8);
    expect(por(verificarParcial(muroD8), 'd8-rho-h').cumple).toBe(false);
    const ok = verificarParcial({ ...muroD8, horizontal: { ...A4, n: 2, sep: 400 } });
    expect(por(ok, 'd8-rho-h').cumple).toBe(true); // 25.2/60000 = 0.00042
  });
  it('N°3 cada 2.40 m en 150 mm: ρv = 0.000197 < 0.00027 aunque la separación sí cumple', () => {
    const vs = verificarParcial(muroD8);
    expect(por(vs, 'd8-sep-v').cumple).toBe(true);
    expect(por(vs, 'd8-rho-v').cumple).toBe(false);
    expect(cuantiasBloque(muroD8).vertical).toBeCloseTo(71 / (2400 * 150), 8);
  });
  it('separaciones: 2400 y 800 mm cumplen; 2450 y 850 no; embebidos hasta 3000', () => {
    const base: DatosBloque = { ...muroD8, vertical: { ...N4, sep: 400 }, horizontal: { ...M6, n: 2, sep: 400 } };
    const vs = verificarParcial(base);
    expect(por(vs, 'd8-sep-v').cumple).toBe(true);
    expect(por(verificarParcial({ ...base, vertical: { ...N4, sep: 2450 } }), 'd8-sep-v').cumple).toBe(false);
    expect(por(verificarParcial({ ...base, horizontal: { ...M6, n: 2, sep: 850 } }), 'd8-h-sep').cumple).toBe(false);
    expect(por(verificarParcial({ ...base, ubicacionHorizontal: 'embebido', horizontal: { ...M6, n: 2, sep: 3000 } }), 'd8-h-sep').cumple).toBe(true);
  });
  it('f′m menor de 8 MPa incumple y sin máximo (30 MPa cumple)', () => {
    expect(por(verificarParcial({ ...muroD8, fm: 7.9 }), 'd8-fm').cumple).toBe(false);
    expect(por(verificarParcial({ ...muroD8, fm: 30 }), 'd8-fm').cumple).toBe(true);
  });
});

describe('D.9 — mampostería no reforzada', () => {
  it('espesor ≥ 120 mm y Aa ≤ 0.05', () => {
    expect(resumir(verificarNoReforzada({ espesor: 120, aa: 0.05 })).todasCumplen).toBe(true);
    expect(verificarNoReforzada({ espesor: 100, aa: 0.05 })[0].cumple).toBe(false);
    expect(verificarNoReforzada({ espesor: 120, aa: 0.06 })[1].cumple).toBe(false);
  });
});

describe('D.6 — mampostería de cavidad reforzada', () => {
  it('cuantías de cavidad y de sección completa', () => {
    const q = cuantiasCavidad(cavidad);
    expect(q.espesorTotal).toBe(260);
    expect(q.cavidadVertical).toBeCloseTo(129 / (400 * 100), 8); // 0.003225
    expect(q.cavidadHorizontal).toBeCloseTo(71 / (400 * 100), 8); // 0.001775
    expect(q.seccionVertical).toBeCloseTo(129 / (400 * 260), 8);
    expect(q.seccionHorizontal).toBeCloseTo((71 / 400 + 25.2 / 400) / 260, 8);
  });
  it('el muro base incumple solo la cuantía horizontal de la cavidad (0.001775 < 0.0020)', () => {
    const vs = verificarCavidad(cavidad);
    const malos = vs.filter((x) => !x.cumple).map((x) => x.id);
    expect(malos).toContain('d6-rho-cav-h');
    expect(malos).not.toContain('d6-rho-cav-v');
  });
  it('con horizontales N°3 cada 300 mm (0.002367) cumple todo', () => {
    const d: DatosCavidad = { ...cavidad, horizontalCavidad: { ...N3, sep: 300 } };
    const vs = verificarCavidad(d);
    expect(vs.filter((x) => !x.cumple).map((x) => x.id)).toEqual([]);
  });
  it('espesor total 190 mm = 70 + 50 + 70 cumple; con 60 mm en una pared no', () => {
    const justo: DatosCavidad = { ...cavidad, espesorPared: 70, espesorCavidad: 50, verticalCavidad: { diametro: 12, area: 113.1, sep: 400 } };
    const vs = verificarCavidad(justo);
    expect(vs.find((x) => x.id === 'd6-esp-total')!.cumple).toBe(true);
    expect(verificarCavidad({ ...justo, espesorPared: 60 }).find((x) => x.id === 'd6-esp-pared')!.cumple).toBe(false);
  });
  it('f′m relativo al material de inyección: 0.5 a 2 veces', () => {
    const f = (fm: number, fi: number) => verificarCavidad({ ...cavidad, fm, fInyeccion: fi }).find((x) => x.id === 'd6-fm-rel')!.cumple;
    expect(f(7, 14)).toBe(true);
    expect(f(28, 14)).toBe(true);
    expect(f(6.9, 14)).toBe(false);
    expect(f(28.1, 14)).toBe(false);
  });
  it('separación del refuerzo en la cavidad: 50 a 400 mm', () => {
    const s = (sep: number) => verificarCavidad({ ...cavidad, verticalCavidad: { ...N4, sep } }).find((x) => x.id === 'd6-sep-v')!.cumple;
    expect([s(400), s(50), s(401), s(49)]).toEqual([true, true, false, false]);
  });
  it('posicionadores: menor de 250 diámetros y 3 m (N°4: 250·12.7 = 3175 → gobierna 3000)', () => {
    const p = (posicionadorSep: number) => verificarCavidad({ ...cavidad, posicionadorSep }).find((x) => x.id === 'd6-posicionadores')!.cumple;
    expect(p(3000)).toBe(true);
    expect(p(3100)).toBe(false);
    const fino = { ...cavidad, verticalCavidad: { diametro: 6, area: 28.3, sep: 400 } };
    expect(verificarCavidad({ ...fino, posicionadorSep: 1500 }).find((x) => x.id === 'd6-posicionadores')!.cumple).toBe(true); // 250·6 = 1500
    expect(verificarCavidad({ ...fino, posicionadorSep: 1600 }).find((x) => x.id === 'd6-posicionadores')!.cumple).toBe(false);
  });
  it('diámetro máximo ¼ de la cavidad: 12.7 mm en 50 mm de cavidad (máx 12.5) no cumple', () => {
    expect(verificarCavidad({ ...cavidad, espesorCavidad: 50 }).find((x) => x.id === 'd6-diam-max')!.cumple).toBe(false);
    expect(verificarCavidad({ ...cavidad, espesorCavidad: 60 }).find((x) => x.id === 'd6-diam-max')!.cumple).toBe(true);
  });
  it('capas: 1 capa hasta 150 mm; con 200 mm, 2 capas con la mayor ≤ 66 %', () => {
    const capas = (d: DatosCavidad) => verificarCavidad(d).find((x) => x.id === 'd6-capas')!.cumple;
    expect(capas({ ...cavidad, espesorCavidad: 150 })).toBe(true);
    expect(capas({ ...cavidad, espesorCavidad: 200 })).toBe(false);
    expect(capas({ ...cavidad, espesorCavidad: 200, capas: 2, fraccionCapaMayor: 0.5 })).toBe(true);
    expect(capas({ ...cavidad, espesorCavidad: 200, capas: 2, fraccionCapaMayor: 0.7 })).toBe(false);
  });
  it('refuerzo vertical que trabaja a compresión: ≥ 12 mm y estribos cada ≤ min(200, 16∅)', () => {
    const d: DatosCavidad = { ...cavidad, contribuyeCompresion: true, estribo: { diametro: 6, sep: 200 } };
    const vs = verificarCavidad(d);
    // 16 · 12.7 = 203.2 → gobierna 200
    expect(vs.find((x) => x.id === 'd6-estribo')!.cumple).toBe(true);
    expect(verificarCavidad({ ...d, estribo: { diametro: 6, sep: 210 } }).find((x) => x.id === 'd6-estribo')!.cumple).toBe(false);
    expect(verificarCavidad({ ...d, verticalCavidad: { ...N3, sep: 400 } }).find((x) => x.id === 'd6-diam-min')!.cumple).toBe(false);
  });
  it('conectores en zeta: 400 mm vertical y 600 mm horizontal, pata ≥ 50 mm', () => {
    const z = { tipo: 'zeta' as const, diametro: 4, sepVertical: 400, sepHorizontal: 600, pata: 50 };
    expect(verificarCavidad({ ...cavidad, conector: z }).filter((x) => x.grupo === 'Conectores').every((x) => x.cumple)).toBe(true);
    const mal = verificarCavidad({ ...cavidad, conector: { ...z, sepVertical: 500 } });
    expect(mal.find((x) => x.id === 'd6-conector-sepv')!.cumple).toBe(false);
  });
  it('extremos: 2 barras de ≥ 12 mm', () => {
    expect(verificarCavidad({ ...cavidad, extremo: { n: 1, diametro: 12.7 } }).find((x) => x.id === 'd6-extremos')!.cumple).toBe(false);
    expect(verificarCavidad({ ...cavidad, extremo: { n: 2, diametro: 10 } }).find((x) => x.id === 'd6-extremos')!.cumple).toBe(false);
  });
});

describe('verificarSistema', () => {
  it('despacha por sistema', () => {
    const datos = { cavidad, bloque: muroD7, aa: 0.05 };
    expect(verificarSistema('cavidad', datos).some((x) => x.seccion.startsWith('D.6'))).toBe(true);
    expect(verificarSistema('reforzada', datos).every((x) => x.seccion.startsWith('D.7'))).toBe(true);
    expect(verificarSistema('parcial', datos).every((x) => x.seccion.startsWith('D.8'))).toBe(true);
    expect(verificarSistema('no-reforzada', datos).every((x) => x.seccion.startsWith('D.9'))).toBe(true);
  });
});
