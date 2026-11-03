/**
 * Capítulo A.10 — Evaluación e intervención de edificaciones existentes.
 * Funciones auxiliares para los ejemplos del capítulo (no modifican `index.ts`; se importan directamente).
 */
import type { GrupoUso, PerfilSuelo } from '../../data/tablas';
import { coeficienteFa, coeficienteFv } from './efectosLocales';
import type { ParametrosEspectro } from './espectro';

/** Calificación cualitativa de A.10.2.2 (calidad del diseño/construcción y estado de la estructura). */
export type Calificacion = 'buena' | 'regular' | 'mala';

/** Tabla A.10.4-1 — Valores de φc y φe. */
export const PHI_CALIFICACION: Record<Calificacion, number> = { buena: 1.0, regular: 0.8, mala: 0.6 };

/** Ecuación A.10-1: Nef = φc·φe·Nex. */
export function resistenciaEfectiva(nex: number, calidad: Calificacion, estado: Calificacion): number {
  return PHI_CALIFICACION[calidad] * PHI_CALIFICACION[estado] * nex;
}

/** A.10.4.3.2 — Índice de sobreesfuerzo de un elemento = solicitación equivalente / resistencia efectiva. */
export function indiceSobreesfuerzo(
  solicitacion: number,
  nex: number,
  calidad: Calificacion,
  estado: Calificacion,
): number {
  return solicitacion / resistenciaEfectiva(nex, calidad, estado);
}

/** A.10.4.3.5 — Índice de flexibilidad de piso = deriva obtenida / deriva permitida. */
export function indiceFlexibilidad(derivaObtenida: number, derivaPermitida: number): number {
  return derivaObtenida / derivaPermitida;
}

/**
 * A.10.3.4 — Parámetros del espectro con seguridad limitada: se sustituyen Aa y Av por Ae en A.2.6.
 * Se interpretan Fa y Fv con Ae (como A.12.3.1 lo hace explícitamente con Ad). Devuelve `null` para perfil F.
 */
export function parametrosSeguridadLimitada(ae: number, perfil: PerfilSuelo, i = 1): ParametrosEspectro | null {
  const fa = coeficienteFa(perfil, ae);
  const fv = coeficienteFv(perfil, ae);
  if (fa === null || fv === null) return null;
  return { aa: ae, av: ae, fa, fv, i };
}

/** Información disponible sobre el diseño original (A.10.4.2.4). */
export type InformacionOriginal = 'buena' | 'incompleta' | 'ninguna' | 'mamposteria-no-reforzada';

/**
 * A.10.4.2.4 — Valor de referencia de R′ dado R (= φa·φp·φr·R0, Capítulo A.3).
 *  - buena información: R′ por comparación con los requisitos; interpolación si cumplimiento parcial (≤ R).
 *  - incompleta: R′ a criterio, sin exceder R.
 *  - ninguna: se permite 0.75·R (sin necesidad de bajar de 1.0).
 *  - mampostería no reforzada: R′ = 1.0.
 * `maximo = true` indica que el valor es un techo (el ingeniero puede escoger menos).
 */
export function rPrimaReferencia(r: number, info: InformacionOriginal): { valor: number; maximo: boolean } {
  switch (info) {
    case 'buena':
    case 'incompleta':
      return { valor: r, maximo: true };
    case 'ninguna':
      return { valor: Math.max(0.75 * r, 1), maximo: false };
    case 'mamposteria-no-reforzada':
      return { valor: 1, maximo: false };
  }
}

/** A.10.6.3 — ¿Se puede ejecutar la modificación sin revalidar la capacidad de la estructura existente? */
export function modificacionSinRevalidar(incrementoSolicitacion: number, reduccionCapacidad: number): boolean {
  return incrementoSolicitacion <= 0.1 && reduccionCapacidad <= 0.1;
}

export type NivelRehabilitacion = {
  /** Etiqueta corta del nivel exigido. */
  nivel: 'nueva' | 'nueva-o-limitada' | 'limitada-minimo';
  /** Índice de sobreesfuerzo máximo permitido tras la intervención. */
  sobreesfuerzoMax: number;
  /** Índice de flexibilidad máximo permitido tras la intervención. */
  flexibilidadMax: number;
  /** ¿Exige memorial protocolizado cuando se opta por seguridad limitada? */
  memorialSiLimitada: boolean;
  ref: string;
};

const FECHA_NSR98 = new Date(Date.UTC(1998, 1, 19)); // 19 de febrero de 1998
const FECHA_DEC1400 = new Date(Date.UTC(1984, 11, 1)); // 1 de diciembre de 1984

/**
 * A.10.9.2 — Nivel de seguridad exigido al rehabilitar según el grupo de uso y la fecha de diseño y construcción.
 * (Edificaciones declaradas patrimonio histórico: A.10.9.2.5, tratamiento especial no incluido aquí.)
 */
export function nivelRehabilitacion(grupo: GrupoUso, fechaDisenoConstruccion: Date): NivelRehabilitacion {
  if (grupo === 'III' || grupo === 'IV') {
    return { nivel: 'nueva', sobreesfuerzoMax: 1, flexibilidadMax: 1, memorialSiLimitada: false, ref: 'A.10.9.2.1' };
  }
  if (fechaDisenoConstruccion.getTime() > FECHA_NSR98.getTime()) {
    return { nivel: 'nueva', sobreesfuerzoMax: 1, flexibilidadMax: 1, memorialSiLimitada: false, ref: 'A.10.9.2.2' };
  }
  if (fechaDisenoConstruccion.getTime() > FECHA_DEC1400.getTime()) {
    return { nivel: 'nueva-o-limitada', sobreesfuerzoMax: 1, flexibilidadMax: 1.5, memorialSiLimitada: true, ref: 'A.10.9.2.3' };
  }
  return { nivel: 'limitada-minimo', sobreesfuerzoMax: 1, flexibilidadMax: 1, memorialSiLimitada: true, ref: 'A.10.9.2.4' };
}
