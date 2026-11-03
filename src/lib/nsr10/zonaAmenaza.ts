/** A.2.3 — Zonas de amenaza sísmica (Tabla A.2.3-1). */
export type ZonaAmenaza = 'Baja' | 'Intermedia' | 'Alta';

/**
 * Clasifica la zona de amenaza sísmica a partir de Aa y Av (A.2.3.1 a A.2.3.3):
 *  - Baja: Aa y Av ≤ 0.10
 *  - Intermedia: alguno > 0.10 y ninguno > 0.20
 *  - Alta: alguno > 0.20
 */
export function zonaAmenaza(aa: number, av: number): ZonaAmenaza {
  const mayor = Math.max(aa, av);
  // Tolerancia por representación binaria de decimales (0.1, 0.2).
  if (mayor <= 0.1 + 1e-9) return 'Baja';
  if (mayor <= 0.2 + 1e-9) return 'Intermedia';
  return 'Alta';
}
