import { describe, expect, it } from 'vitest';
import {
  CLASES_FLEXION,
  ESFUERZOS_ACERO,
  ESFUERZOS_SERVICIO,
  ESFUERZOS_TRANSFERENCIA,
  FUENTES_PERDIDA,
  GAMMA_P,
  LOSAS_PREESFORZADAS,
  NO_ADHERIDOS,
  PREFABRICADO,
  REFUERZO_ADHERIDO,
  ZONA_ANCLAJE,
} from './preesforzado';

describe('Datos de C.18: coeficientes del PDF (p.455–467, C-153 a C-165)', () => {
  it('C.18.3.3: clases U, T, C', () => {
    expect(CLASES_FLEXION.U.max).toBe(0.62);
    expect(CLASES_FLEXION.T).toEqual({ min: 0.62, max: 1.0 });
    expect(CLASES_FLEXION.C.min).toBe(1.0);
  });
  it('C.18.4.1 y C.18.4.2 (C-154)', () => {
    expect(ESFUERZOS_TRANSFERENCIA).toEqual({ compresion: 0.6, compresionExtremosSimples: 0.7, traccionExtremosSimples: 0.5, traccionOtras: 0.25 });
    expect(ESFUERZOS_SERVICIO).toEqual({ compresionSostenida: 0.45, compresionTotal: 0.6 });
  });
  it('C.18.5.1 (C-155)', () => {
    expect(ESFUERZOS_ACERO).toEqual({ gatoFpy: 0.94, gatoFpuMax: 0.8, transferenciaFpy: 0.82, transferenciaFpuMax: 0.74, anclajesFpu: 0.7 });
  });
  it('C.18.6.1: seis fuentes de pérdida', () => {
    expect(FUENTES_PERDIDA.map((f) => f.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('γp (C-156): 0.55, 0.40 y 0.28 y relaciones fpy/fpu crecientes', () => {
    expect(GAMMA_P.map((g) => g.gamma)).toEqual([0.55, 0.4, 0.28]);
    expect(GAMMA_P.map((g) => g.fpyFpuMin)).toEqual([0.8, 0.85, 0.9]);
  });
  it('C.18-4 y C.18-5 (C-156/157)', () => {
    expect(NO_ADHERIDOS.luzAlturaLimite).toBe(35);
    expect(NO_ADHERIDOS.corto).toEqual({ divisor: 100, topeSobreFse: 420 });
    expect(NO_ADHERIDOS.largo).toEqual({ divisor: 300, topeSobreFse: 210 });
  });
  it('refuerzo adherido (C-157/158)', () => {
    expect(REFUERZO_ADHERIDO.coefAct).toBe(0.004);
    expect(REFUERZO_ADHERIDO.coefAcf).toBe(0.00075);
    expect(REFUERZO_ADHERIDO.fyMaxC187).toBe(420);
    expect(REFUERZO_ADHERIDO.barrasMin).toBe(4);
    expect(REFUERZO_ADHERIDO.separacionMaxMm).toBe(300);
  });
  it('losas preesforzadas (C-159 a C-160)', () => {
    expect(LOSAS_PREESFORZADAS.separacionMaxMm).toBe(1500);
    expect(LOSAS_PREESFORZADAS.preesfuerzoMinMpa).toBe(0.9);
    expect(LOSAS_PREESFORZADAS.coefBwDFy).toBe(2.1);
  });
  it('zonas de anclaje (C-161 a C-162)', () => {
    expect(ZONA_ANCLAJE.fcMinPostensarVariosMpa).toBe(28);
    expect(ZONA_ANCLAJE.fcMinPostensarUnoMpa).toBe(17);
    expect(ZONA_ANCLAJE.fraccionPpuLejosDelExtremo).toBe(0.35);
    expect(ZONA_ANCLAJE.fraccionPpuDescascaramiento).toBe(0.02);
  });
  it('C.16 prefabricado (C-147 a C-149)', () => {
    expect(PREFABRICADO.conexionDiafragmaKnPorM).toBe(4.4);
    expect(PREFABRICADO.panelAmarreKn).toBe(44);
    expect(PREFABRICADO.amarrePisoKnPorM).toBe(22);
    expect(PREFABRICADO.amarrePerimetralKn).toBe(71);
    expect(PREFABRICADO.apoyoMinLosaMm).toBe(50);
    expect(PREFABRICADO.apoyoMinVigaMm).toBe(75);
    expect(PREFABRICADO.almohadillaRetrocesoMm).toBe(13);
  });
});
