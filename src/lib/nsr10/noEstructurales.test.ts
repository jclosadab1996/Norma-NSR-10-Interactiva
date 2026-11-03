import { describe, expect, it } from 'vitest';
import {
  ELEMENTOS_ARQUITECTONICOS,
  ELEMENTOS_INSTALACIONES,
  GRADO_MINIMO,
  RP_ANCLAJE,
  axEnBase,
  elementoNoEstructural,
  exentoPorA913,
  exigenciaAnclaje,
  fuerzaEsfuerzosTrabajo,
  fuerzaNoEstructural,
  fuerzaNoEstructuralConAx,
  fuerzasConexionFachada,
  gobiernaVientoFachada,
  gradoMinimo,
  rpRequerido,
} from './noEstructurales';
import { aceleracionSuperficie } from './elementosNoSismicos';
import { mesetaSa } from './espectro';

// Colegio (grupo III, I = 1.25) en Bogotá, perfil D: Aa = 0.15, Fa = 1.5, Av = 0.20, Fv = 2.0; hn = 18 m.
const sitio = { aa: 0.15, av: 0.2, fa: 1.5, fv: 2.0, i: 1.25 };
const base = {
  aa: sitio.aa,
  i: sitio.i,
  as: aceleracionSuperficie(sitio.aa, sitio.fa, sitio.i), // 0.28125
  sa: mesetaSa(sitio), // 0.703125
  hn: 18,
};

describe('A.9 — grado de desempeño y anclajes', () => {
  it('Tabla A.9.2-1', () => {
    expect(GRADO_MINIMO).toEqual({ IV: 'Superior', III: 'Superior', II: 'Bueno', I: 'Bajo' });
    expect(gradoMinimo('II')).toBe('Bueno');
  });

  it('A.9.1.3: exentos los grupos I y II en amenaza baja', () => {
    expect(exentoPorA913('I', 'Baja')).toBe(true);
    expect(exentoPorA913('II', 'Baja')).toBe(true);
    expect(exentoPorA913('III', 'Baja')).toBe(false);
    expect(exentoPorA913('I', 'Intermedia')).toBe(false);
  });

  it('A.9.4.9: Rp por tipo de anclaje', () => {
    expect(RP_ANCLAJE).toEqual({ especiales: 6, ductiles: 6, 'no-ductiles': 1.5, humedos: 0.5 });
  });

  it('las tablas tienen 19 y 11 filas', () => {
    expect(ELEMENTOS_ARQUITECTONICOS).toHaveLength(19);
    expect(ELEMENTOS_INSTALACIONES).toHaveLength(11);
  });

  it('lecturas puntuales de la Tabla A.9.5-1 (verificadas contra la imagen)', () => {
    const cielo = elementoNoEstructural('cielos-rasos');
    expect(cielo.ap).toBe(1.0);
    expect(exigenciaAnclaje(cielo, 'Superior')).toBe('no-ductiles');
    expect(exigenciaAnclaje(cielo, 'Bajo')).toBe('no-requerido');
    expect(rpRequerido(cielo, 'Superior')).toBe(1.5);
    expect(rpRequerido(cielo, 'Bajo')).toBeNull();

    const parapeto = elementoNoEstructural('voladizo-parapetos');
    expect(parapeto.ap).toBe(2.5);
    expect(rpRequerido(parapeto, 'Superior')).toBe(6);
    expect(rpRequerido(parapeto, 'Bueno')).toBe(1.5);

    const mnr = elementoNoEstructural('fachada-mamp-no-reforzada-confinada');
    expect(rpRequerido(mnr, 'Superior')).toBeNull();
    expect(exigenciaAnclaje(mnr, 'Superior')).toBe('no-permitido');
    expect(mnr.notaBajo).toBe(2);

    const estTituloF = elementoNoEstructural('estanterias-titulo-f');
    expect(exigenciaAnclaje(estTituloF, 'Superior')).toBe('especiales');
    expect(rpRequerido(estTituloF, 'Superior')).toBe(6);
    expect(rpRequerido(estTituloF, 'Bueno')).toBe(6);

    expect(rpRequerido(elementoNoEstructural('enchapes-fachada'), 'Bajo')).toBe(0.5);
    expect(elementoNoEstructural('altillos').ap).toBe(1.5);
  });

  it('lecturas puntuales de la Tabla A.9.6-1', () => {
    const general = elementoNoEstructural('equipo-general');
    expect(general.ap).toBe(1.0);
    expect(rpRequerido(general, 'Superior')).toBe(6);
    expect(rpRequerido(general, 'Bueno')).toBe(1.5);
    expect(rpRequerido(general, 'Bajo')).toBeNull();

    expect(elementoNoEstructural('proteccion-fuego').ap).toBe(2.5);
    expect(rpRequerido(elementoNoEstructural('tuberias-gases'), 'Bajo')).toBe(1.5);
    expect(rpRequerido(elementoNoEstructural('tuberias-otras'), 'Bueno')).toBeNull();
    expect(rpRequerido(elementoNoEstructural('maquinaria-industrial'), 'Bajo')).toBe(0.5);
    expect(rpRequerido(elementoNoEstructural('plantas-emergencia'), 'Superior')).toBe(1.5);
    // Anomalía del PDF: ap vacío en paneles de control.
    expect(elementoNoEstructural('paneles-control').ap).toBeNull();
    expect(() => elementoNoEstructural('no-existe')).toThrow();
  });
});

describe('A.9.4 — fuerza sísmica de diseño de elementos no estructurales', () => {
  it('tanque de 5 250 kg en la cubierta (hx = 18 m), ap = 1.0, Rp = 6', () => {
    // ax = Sa·hx/heq = 0.703125·18/13.5 = 0.9375; peso = 5250·9.8 = 51 450 N
    const r = fuerzaNoEstructural({ ...base, hx: 18, ap: 1.0, rp: 6, mp: 5250 });
    expect(r.ax).toBeCloseTo(0.9375, 10);
    expect(r.fpCalculada).toBeCloseTo(8039.0625, 6); // 0.9375/6 · 51 450
    expect(r.fpMinima).toBeCloseTo(4823.4375, 6); // 0.15·1.25/2 · 51 450
    expect(r.fp).toBeCloseTo(8039.0625, 6);
    expect(r.gobiernaMinima).toBe(false);
    expect(r.fuerzaVertical).toBeCloseTo(17150, 6);
  });

  it('el mismo tanque con anclaje no dúctil (Rp = 1.5) y húmedo (Rp = 0.5)', () => {
    const r15 = fuerzaNoEstructural({ ...base, hx: 18, ap: 1.0, rp: 1.5, mp: 5250 });
    const r05 = fuerzaNoEstructural({ ...base, hx: 18, ap: 1.0, rp: 0.5, mp: 5250 });
    expect(r15.fp).toBeCloseTo(32156.25, 6);
    expect(r05.fp).toBeCloseTo(96468.75, 5);
  });

  it('cielo raso de 15 kg/m² en el piso 4 (hx = 12 m), ap = 1.0, Rp = 1.5', () => {
    // ax = 0.28125 + 0.421875·12/13.5 = 0.65625; peso = 147 N/m²
    const r = fuerzaNoEstructural({ ...base, hx: 12, ap: 1.0, rp: 1.5, mp: 15 });
    expect(r.ax).toBeCloseTo(0.65625, 10);
    expect(r.fp).toBeCloseTo(64.3125, 6);
    expect(r.fpMinima).toBeCloseTo(13.78125, 6);
  });

  it('fachada de mampostería reforzada apoyada solo abajo (ap = 2.5, Rp = 6) en hx = 15 m, 240 kg/m²', () => {
    const r = fuerzaNoEstructural({ ...base, hx: 15, ap: 2.5, rp: 6, mp: 240 });
    expect(r.ax).toBeCloseTo(0.78125, 10); // 0.703125·15/13.5
    expect(r.fp).toBeCloseTo(765.625, 6); // 0.78125·2.5/6 · 2352
    const c = fuerzasConexionFachada(r.fp);
    expect(c.elementoConexion).toBeCloseTo(1018.28125, 6);
    expect(c.sujetadores).toBeCloseTo(2296.875, 6);
  });

  it('en la base (A.9.4.8) gobierna la cota mínima AaI/2', () => {
    // ax = Aa·I = 0.1875; con ap = 1, Rp = 6: 0.03125 < 0.09375
    expect(axEnBase(0.15, 1.25)).toBeCloseTo(0.1875, 12);
    const r = fuerzaNoEstructuralConAx(axEnBase(0.15, 1.25), { aa: 0.15, i: 1.25, ap: 1.0, rp: 6, mp: 1000 });
    expect(r.fpCalculada).toBeCloseTo(0.03125 * 9800, 6);
    expect(r.fp).toBeCloseTo(0.09375 * 9800, 6);
    expect(r.gobiernaMinima).toBe(true);
  });

  it('esfuerzos de trabajo (×0.7), viento sobre fachadas y conexiones', () => {
    expect(fuerzaEsfuerzosTrabajo(1000)).toBeCloseTo(700, 10);
    expect(gobiernaVientoFachada(600, 1000)).toEqual({ gobierna: false, fuerzaAnclajes: 1000 });
    const v = gobiernaVientoFachada(800, 1000);
    expect(v.gobierna).toBe(true);
    expect(v.fuerzaAnclajes).toBeCloseTo(1120, 10);
  });
});
