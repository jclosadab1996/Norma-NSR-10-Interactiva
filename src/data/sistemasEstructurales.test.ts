import { describe, expect, it } from 'vitest';
import {
  IRREGULARIDADES_ALTURA,
  IRREGULARIDADES_PLANTA,
  MEZCLA_SISTEMAS_ALTURA,
  NOTAS_TABLAS,
  REDUNDANCIA,
  SISTEMAS,
  buscarSistema,
  calcularR,
  describirLimite,
  omega0Efectivo,
  phiAltura,
  phiPlanta,
  phiRedundancia,
  r0Efectivo,
  sistemasPorTabla,
} from './sistemasEstructurales';

const ZONAS = ['alta', 'intermedia', 'baja'] as const;

describe('sistemasEstructurales: comprobaciones estructurales', () => {
  it('ids únicos y buscables', () => {
    const ids = SISTEMAS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SISTEMAS) expect(buscarSistema(s.id)).toBe(s);
    expect(buscarSistema('no-existe')).toBeUndefined();
  });

  it('número de filas por tabla (transcritas del PDF)', () => {
    expect(sistemasPorTabla('A.3-1')).toHaveLength(13);
    expect(sistemasPorTabla('A.3-2')).toHaveLength(28);
    expect(sistemasPorTabla('A.3-3')).toHaveLength(18);
    expect(sistemasPorTabla('A.3-4')).toHaveLength(27);
    expect(SISTEMAS).toHaveLength(86);
  });

  it('r0 > 0, omega0 plausible, tres zonas, alturas >= 0', () => {
    for (const s of SISTEMAS) {
      expect(s.r0, s.id).toBeGreaterThan(0);
      // Ω0 de la norma va de 1.5 (A.3-3 3e/3f) a 3.0
      expect(s.omega0, s.id).toBeGreaterThanOrEqual(1.5);
      expect(s.omega0, s.id).toBeLessThanOrEqual(3.0);
      for (const z of ZONAS) {
        const l = s.zonas[z];
        expect(l, `${s.id}/${z}`).toBeDefined();
        if (l.alturaMaxM !== null) expect(l.alturaMaxM).toBeGreaterThanOrEqual(0);
        if (l.tipoLimite === 'metros') expect(l.alturaMaxM).not.toBeNull();
        if (l.tipoLimite === 'pisos') expect(l.alturaMaxPisos).toBeGreaterThan(0);
        expect(l.permitido).toBe(l.tipoLimite !== 'no-permitido');
      }
      // el material y la capacidad deben ser consistentes con el texto
      if (s.capacidadDisipacion) expect(s.sistemaSismico + s.subsistema).toMatch(/DES|DMO|DMI|capacidad/);
    }
  });

  it('las notas citadas por las filas existen en su tabla', () => {
    for (const s of SISTEMAS) {
      for (const n of s.notas) expect(NOTAS_TABLAS[s.tabla][n], `${s.id} nota ${n}`).toBeTruthy();
      for (const z of ZONAS) for (const n of s.zonas[z].notas ?? []) expect(NOTAS_TABLAS[s.tabla][n]).toBeTruthy();
    }
  });
});

describe('valores literales verificados contra la imagen del PDF', () => {
  it('A.3-1 (PDF p.95, A-52): muros de carga', () => {
    const wood = buscarSistema('a3-1-1')!; // fila 1 paneles de madera
    expect([wood.r0, wood.omega0]).toEqual([3.0, 2.5]);
    expect(wood.zonas.alta.alturaMaxM).toBe(6);
    expect(wood.zonas.intermedia.alturaMaxM).toBe(9);
    expect(wood.zonas.baja.alturaMaxM).toBe(12);

    const des = buscarSistema('a3-1-2a')!; // muros de concreto DES
    expect(des.r0).toBe(5.0);
    expect(des.zonas.alta.alturaMaxM).toBe(50);
    expect(des.zonas.intermedia.tipoLimite).toBe('sin-limite');

    const dmi = buscarSistema('a3-1-2c')!; // muros de concreto DMI
    expect(dmi.r0).toBe(2.5);
    expect(dmi.zonas.alta.permitido).toBe(false);
    expect(dmi.zonas.intermedia.permitido).toBe(false);
    expect(dmi.zonas.baja.alturaMaxM).toBe(50);

    const parcial = buscarSistema('a3-1-2f')!; // mampostería parcialmente reforzada
    expect(parcial.r0).toBe(2.0);
    expect(parcial.zonas.alta).toMatchObject({ tipoLimite: 'pisos', alturaMaxPisos: 2, soloGrupoI: true });
    expect(parcial.zonas.intermedia.alturaMaxM).toBe(12);
    expect(parcial.zonas.baja.alturaMaxM).toBe(18);

    const noRef = buscarSistema('a3-1-2i')!; // mampostería no reforzada
    expect(noRef.r0).toBe(1.0);
    expect(noRef.zonas.baja).toMatchObject({ alturaMaxPisos: 2, soloGrupoI: true, notas: [3] });
  });

  it('A.3-2 (PDF p.96-97, A-53/A-54): combinado', () => {
    const exc = buscarSistema('a3-2-1a')!;
    expect([exc.r0, exc.omega0]).toEqual([7.0, 2.0]);
    expect([exc.zonas.alta.alturaMaxM, exc.zonas.intermedia.alturaMaxM]).toEqual([45, 60]);

    const mur = buscarSistema('a3-2-2a')!;
    expect([mur.r0, mur.omega0, mur.zonas.alta.alturaMaxM]).toEqual([7.0, 2.5, 72]);

    const losa = buscarSistema('a3-2-2c')!;
    expect([losa.zonas.intermedia.alturaMaxM, losa.zonas.baja.alturaMaxM]).toEqual([18, 27]);

    const placa = buscarSistema('a3-2-2n')!; // PDF p.97
    expect([placa.r0, placa.omega0]).toEqual([6.5, 2.5]);

    const conc3b = buscarSistema('a3-2-3b')!; // PDF p.97: intermedia 10 m, baja 60 m
    expect([conc3b.r0, conc3b.zonas.alta.permitido, conc3b.zonas.intermedia.alturaMaxM, conc3b.zonas.baja.alturaMaxM]).toEqual([
      4.0,
      false,
      10,
      60,
    ]);

    const mixDMI = buscarSistema('a3-2-3d')!; // PDF p.97: no se permite (nota 5) en alta e intermedia
    expect(mixDMI.zonas.alta).toMatchObject({ permitido: false, notas: [5], alturaExcepcionM: 20 });
    expect(mixDMI.zonas.baja.tipoLimite).toBe('sin-limite');
  });

  it('A.3-3 (PDF p.98, A-55): pórticos', () => {
    const des = buscarSistema('a3-3-1a')!;
    expect([des.r0, des.omega0, des.capacidadDisipacion]).toEqual([7.0, 3.0, 'DES']);
    for (const z of ZONAS) expect(des.zonas[z].tipoLimite).toBe('sin-limite');

    const acero = buscarSistema('a3-3-1b')!; // R0 7.0 con nota 3
    expect(acero.r0).toBe(7.0);
    expect(acero.ajusteR0?.factor).toBe(0.9);
    expect(r0Efectivo(acero, true)).toBeCloseTo(6.3, 10);
    expect(r0Efectivo(acero, false)).toBe(7.0);

    const cerchas = buscarSistema('a3-3-1d')!;
    expect([cerchas.r0, cerchas.zonas.alta.alturaMaxM, cerchas.zonas.intermedia.alturaMaxM]).toEqual([6.0, 30, 45]);

    const dmi = buscarSistema('a3-3-3a')!;
    expect([dmi.r0, dmi.omega0, dmi.zonas.baja.tipoLimite]).toEqual([2.5, 3.0, 'sin-limite']);

    const aceroDMI = buscarSistema('a3-3-3b')!; // Ω0 = 2.5 con R0 = 3.0
    expect([aceroDMI.r0, aceroDMI.omega0]).toEqual([3.0, 2.5]);

    const cerchasNoDuctiles = buscarSistema('a3-3-3e')!; // Ω0 = 1.5
    expect([cerchasNoDuctiles.r0, cerchasNoDuctiles.omega0, cerchasNoDuctiles.zonas.baja.alturaMaxM]).toEqual([1.5, 1.5, 12]);
    expect(cerchasNoDuctiles.zonas.alta).toMatchObject({ permitido: false, notas: [5], alturaExcepcionM: 12 });

    const losaCol = buscarSistema('a3-3-4a')!;
    expect([losaCol.r0, losaCol.zonas.intermedia.alturaMaxM, losaCol.zonas.baja.alturaMaxM]).toEqual([2.5, 15, 21]);

    const pendulo = buscarSistema('a3-3-5c')!;
    expect([pendulo.r0, pendulo.omega0, pendulo.zonas.alta.permitido]).toEqual([1.5, 2.0, false]);
  });

  it('A.3-4 (PDF p.99-100, A-56/A-57): dual', () => {
    const d1a = buscarSistema('a3-4-1a')!;
    expect([d1a.r0, d1a.omega0]).toEqual([8.0, 2.5]);
    for (const z of ZONAS) expect(d1a.zonas[z].tipoLimite).toBe('sin-limite');

    const mamp = buscarSistema('a3-4-1e')!; // mampostería DES: R0 5.5, Ω0 3.0, 45 m en todas las zonas
    expect([mamp.r0, mamp.omega0]).toEqual([5.5, 3.0]);
    for (const z of ZONAS) expect(mamp.zonas[z].alturaMaxM).toBe(45);

    const g = buscarSistema('a3-4-1g')!;
    for (const z of ZONAS) expect(g.zonas[z].alturaMaxM).toBe(35);

    const p = buscarSistema('a3-4-1p')!;
    expect([p.r0, p.omega0, p.zonas.baja.tipoLimite]).toEqual([4.0, 3.0, 'sin-limite']);

    expect(buscarSistema('a3-4-1l')).toBeUndefined(); // la norma salta de "k" a "m"
    expect(buscarSistema('a3-4-1m')!.r0).toBe(6.5);

    const c2 = buscarSistema('a3-4-2c')!; // PDF p.100
    expect([c2.r0, c2.omega0]).toEqual([6.0, 2.5]);

    const conc = buscarSistema('a3-4-3c')!;
    expect([conc.r0, conc.zonas.intermedia.alturaMaxM, conc.zonas.baja.alturaMaxM]).toEqual([4.0, 24, 30]);

    const f = buscarSistema('a3-4-3f')!;
    expect([f.zonas.alta.permitido, f.zonas.intermedia.alturaMaxM]).toEqual([false, 10]);

    const g3 = buscarSistema('a3-4-3g')!;
    expect([g3.r0, g3.zonas.alta.alturaMaxM, g3.zonas.intermedia.alturaMaxM]).toEqual([5.5, 50, 30]);

    const tension = buscarSistema('a3-4-3h')!;
    expect(tension.r0).toBe(3.0);
    for (const z of ZONAS) expect(tension.zonas[z].permitido).toBe(false);
  });

  it('notas de las tablas con valores numéricos clave (p.95-100)', () => {
    expect(NOTAS_TABLAS['A.3-3'][3]).toMatch(/0\.90/);
    expect(NOTAS_TABLAS['A.3-2'][5]).toMatch(/20m/);
    expect(NOTAS_TABLAS['A.3-3'][5]).toMatch(/12m/);
    expect(NOTAS_TABLAS['A.3-4'][4]).toMatch(/12m/);
    expect(NOTAS_TABLAS['A.3-1'][3]).toMatch(/0\.05/);
    expect(NOTAS_TABLAS['A.3-4'][1]).toMatch(/25 por ciento/);
    expect(NOTAS_TABLAS['A.3-4'][1]).toMatch(/75 por ciento/);
  });
});

describe('irregularidades y redundancia (A.3-6, A.3-7, A.3.3)', () => {
  it('A.3-6 (PDF p.102): φp', () => {
    const phi = Object.fromEntries(IRREGULARIDADES_PLANTA.map((i) => [i.tipo, i.phi]));
    expect(phi).toEqual({ '1aP': 0.9, '1bP': 0.8, '2P': 0.9, '3P': 0.9, '4P': 0.8, '5P': 0.9 });
  });

  it('A.3-7 (PDF p.103): φa', () => {
    const phi = Object.fromEntries(IRREGULARIDADES_ALTURA.map((i) => [i.tipo, i.phi]));
    expect(phi).toEqual({ '1aA': 0.9, '1bA': 0.8, '2A': 0.9, '3A': 0.9, '4A': 0.8, '5aA': 0.9, '5bA': 0.8 });
  });

  it('A.3.3.3: se aplica el menor φ y R = φa·φp·φr·R0', () => {
    expect(phiPlanta(['1aP', '4P', '2P'])).toBe(0.8);
    expect(phiPlanta([])).toBe(1);
    expect(phiAltura(['1aA', '5bA'])).toBe(0.8);
    expect(calcularR(7.0, 0.9, 0.8, 0.75)).toBeCloseTo(7.0 * 0.9 * 0.8 * 0.75, 10);
    expect(calcularR(5.0)).toBe(5.0);
  });

  it('A.3.3.8 (PDF p.86-87): φr = 1.0 / 0.75', () => {
    expect(REDUNDANCIA.phiRRedundante).toBe(1.0);
    expect(REDUNDANCIA.phiRAusenciaRedundancia).toBe(0.75);
    expect(REDUNDANCIA.fraccionCorteBasalPisosEvaluados).toBe(0.35);
    expect(REDUNDANCIA.reduccionMaximaResistenciaPiso).toBe(0.33);
    expect(phiRedundancia('DMI', false)).toBe(1.0);
    expect(phiRedundancia('DES', false)).toBe(0.75);
    expect(phiRedundancia('DMO', true)).toBe(1.0);
    expect(phiRedundancia('DES', false, true)).toBe(1.0);
  });

  it('Ω0 con diafragma flexible (nota: -0.5, mínimo 2.0)', () => {
    expect(omega0Efectivo(3.0, true)).toBe(2.5);
    expect(omega0Efectivo(2.5, true)).toBe(2.0);
    expect(omega0Efectivo(2.0, true)).toBe(2.0);
    expect(omega0Efectivo(1.5, true)).toBe(1.5);
    expect(omega0Efectivo(3.0, false)).toBe(3.0);
  });

  it('A.3-5 (PDF p.101)', () => {
    const f = MEZCLA_SISTEMAS_ALTURA.find((m) => m.id === 'flexible-sobre-rigido')!;
    expect(f.umbrales).toMatchObject({ relacionRigidezPisoInferiorSuperiorMin: 10, relacionPeriodoTotalSuperiorMax: 1.1 });
    expect(MEZCLA_SISTEMAS_ALTURA.find((m) => m.id === 'rigido-sobre-flexible')!.aceptable).toBe(false);
  });

  it('describirLimite', () => {
    expect(describirLimite(buscarSistema('a3-1-2a')!.zonas.alta)).toBe('hasta 50 m');
    expect(describirLimite(buscarSistema('a3-1-2b')!.zonas.alta)).toBe('no se permite');
    expect(describirLimite(buscarSistema('a3-1-2a')!.zonas.baja)).toBe('sin límite de altura');
    expect(describirLimite(buscarSistema('a3-1-2f')!.zonas.alta)).toBe('hasta 2 pisos (solo Grupo I)');
  });
});
