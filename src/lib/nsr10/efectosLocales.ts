import {
  COLUMNAS_INTENSIDAD,
  COEFICIENTE_IMPORTANCIA,
  TABLA_FA,
  TABLA_FV,
  type GrupoUso,
  type PerfilSuelo,
  type PerfilSueloConCoef,
} from '../../data/tablas';

/** Interpolación lineal sobre las columnas 0.1, 0.2, … 0.5 de las tablas A.2.4-3 y A.2.4-4. */
function interpolarColumnas(valores: readonly number[], intensidad: number): number {
  const cols = COLUMNAS_INTENSIDAD;
  if (intensidad <= cols[0]) return valores[0];
  if (intensidad >= cols[cols.length - 1]) return valores[valores.length - 1];
  for (let i = 0; i < cols.length - 1; i++) {
    const x0 = cols[i];
    const x1 = cols[i + 1];
    if (intensidad >= x0 && intensidad <= x1) {
      const t = (intensidad - x0) / (x1 - x0);
      return valores[i] + t * (valores[i + 1] - valores[i]);
    }
  }
  return valores[valores.length - 1];
}

function esPerfilConCoeficiente(p: PerfilSuelo): p is PerfilSueloConCoef {
  return p !== 'F';
}

function redondear(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/**
 * A.2.4.5.5 — Coeficiente Fa (se interpola con Aa). Para perfil F la norma exige un estudio
 * de sitio (A.2.10), por eso devuelve `null`.
 */
export function coeficienteFa(perfil: PerfilSuelo, aa: number): number | null {
  if (!esPerfilConCoeficiente(perfil)) return null;
  return redondear(interpolarColumnas(TABLA_FA[perfil], aa));
}

/** A.2.4.5.6 — Coeficiente Fv (se interpola con Av). `null` para perfil F. */
export function coeficienteFv(perfil: PerfilSuelo, av: number): number | null {
  if (!esPerfilConCoeficiente(perfil)) return null;
  return redondear(interpolarColumnas(TABLA_FV[perfil], av));
}

/** A.2.5.2 — Coeficiente de importancia I (Tabla A.2.5-1). */
export function coeficienteImportancia(grupo: GrupoUso): number {
  return COEFICIENTE_IMPORTANCIA[grupo];
}

export type ClasePerfil = {
  perfil: PerfilSuelo;
  motivo: string;
};

/**
 * Clasificación simplificada del perfil de suelo por velocidad media de onda de cortante vs
 * (Tablas A.2.4-1 y A.2.4-2). No sustituye el procedimiento completo de A.2.4.5 (que además
 * considera arcillas blandas, N, Nch, su y perfil F): es una ayuda didáctica.
 */
export function perfilPorVs(vs: number): ClasePerfil {
  if (vs >= 1500) return { perfil: 'A', motivo: 'vs ≥ 1500 m/s' };
  if (vs >= 760) return { perfil: 'B', motivo: '1500 m/s > vs ≥ 760 m/s' };
  if (vs >= 360) return { perfil: 'C', motivo: '760 m/s > vs ≥ 360 m/s' };
  if (vs >= 180) return { perfil: 'D', motivo: '360 m/s > vs ≥ 180 m/s' };
  return { perfil: 'E', motivo: 'vs < 180 m/s' };
}

/** Velocidad media de la onda de cortante (A.2.4-1): vs = Σdi / Σ(di/vsi). */
export function velocidadMediaCortante(estratos: ReadonlyArray<{ espesor: number; vs: number }>): number {
  const sumaD = estratos.reduce((s, e) => s + e.espesor, 0);
  const sumaT = estratos.reduce((s, e) => s + e.espesor / e.vs, 0);
  return sumaD / sumaT;
}
