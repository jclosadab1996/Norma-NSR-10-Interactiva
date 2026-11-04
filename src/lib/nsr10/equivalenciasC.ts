/**
 * Apéndice C-F (Equivalencia entre el sistema SI, el mks y el inglés de las ecuaciones no homogéneas del Título C).
 * PDF p.553–559 (C-251 a C-257). PDF = impresa + 302.
 *
 * Este módulo guarda (a) los factores de conversión que usa la norma, (b) los esfuerzos de referencia de la primera tabla
 * (PDF p.553, C-251) y (c) un registro de coeficientes numéricos de las ecuaciones, para comprobar que las tres columnas
 * del apéndice son equivalentes salvo redondeo. Los coeficientes son los impresos en la norma; los cálculos de
 * comprobación son del proyecto.
 */

export type SistemaUnidades = 'si' | 'mks' | 'ing';

/** Conversión que imprime la norma: 1 MPa = 10 kgf/cm² = 142.2 psi (PDF p.553, C-251). */
export const CONVERSION_NORMA = { mpaAKgfCm2: 10, mpaAPsi: 142.2 } as const;
/** Conversión exacta (proyecto): 1 MPa = 10.1972 kgf/cm² = 145.038 psi. */
export const CONVERSION_EXACTA = { mpaAKgfCm2: 10.19716, mpaAPsi: 145.0377 } as const;
/** 1 kgf = 9.80665 N; 1 lbf = 4.44822 N; 1 in = 25.4 mm; 1 cm = 10 mm (proyecto). */
export const KGF_A_N = 9.80665;
export const LBF_A_N = 4.448222;
export const IN_A_MM = 25.4;

/** Factor de esfuerzo k del sistema respecto de MPa. */
export function factorEsfuerzo(sistema: SistemaUnidades, exacto = true): number {
  const c = exacto ? CONVERSION_EXACTA : CONVERSION_NORMA;
  return sistema === 'si' ? 1 : sistema === 'mks' ? c.mpaAKgfCm2 : c.mpaAPsi;
}

/** Convierte un esfuerzo de MPa al sistema indicado. */
export const desdeMpa = (mpa: number, a: SistemaUnidades, exacto = true) => mpa * factorEsfuerzo(a, exacto);
/** Convierte un esfuerzo del sistema indicado a MPa. */
export const aMpa = (valor: number, de: SistemaUnidades, exacto = true) => valor / factorEsfuerzo(de, exacto);

/** Esfuerzos de referencia de la tabla de C-251 (PDF p.553): [símbolo, SI MPa, mks kgf/cm², inglés psi]. */
export const ESFUERZOS_REFERENCIA: { simbolo: string; mpa: number; kgfCm2: number; psi: number; nota?: string }[] = [
  { simbolo: "f′c", mpa: 21, kgfCm2: 210, psi: 3000 },
  { simbolo: "f′c", mpa: 28, kgfCm2: 280, psi: 4000 },
  { simbolo: "f′c", mpa: 35, kgfCm2: 350, psi: 5000 },
  { simbolo: "f′c", mpa: 40, kgfCm2: 420, psi: 6000, nota: 'Fila incoherente en el PDF: con 1 MPa = 10 kgf/cm², 420 kgf/cm² son 42 MPa, y 6 000 psi son 41.4 MPa; no 40 MPa.' },
  { simbolo: 'fy', mpa: 280, kgfCm2: 2800, psi: 40000 },
  { simbolo: 'fy', mpa: 420, kgfCm2: 4200, psi: 60000 },
  { simbolo: 'fpu', mpa: 1725, kgfCm2: 17600, psi: 250000 },
  { simbolo: 'fpu', mpa: 1860, kgfCm2: 19000, psi: 270000 },
];

/**
 * Fila del registro de coeficientes. `p` es la potencia del esfuerzo que tiene la dimensión del coeficiente:
 * 0.5 para un coeficiente de √f′c (p. ej. 0.17), 1 para un coeficiente con dimensión de esfuerzo (p. ej. 1.4 en 1.4/fy),
 * −0.5 y −1 para coeficientes inversos (p. ej. 3.3 en la Ec. C.12-3). Entonces c_sistema ≈ c_SI × k^p.
 */
export interface CoeficienteEquivalente {
  ref: string;
  termino: string;
  p: number;
  si: number;
  mks: number;
  ing: number;
}

/** Registro de coeficientes de los esfuerzos (PDF p.553–559, C-251 a C-257). */
export const COEFICIENTES_C_F: CoeficienteEquivalente[] = [
  // C-251
  { ref: 'C.8.5.1', termino: 'Ec = 4700√f′c', p: 0.5, si: 4700, mks: 15100, ing: 57000 },
  { ref: 'C.8.6.1', termino: 'λ = fct/(0.56√fc)', p: 0.5, si: 0.56, mks: 1.78, ing: 6.7 },
  { ref: 'C.9-10', termino: 'fr = 0.62λ√f′c', p: 0.5, si: 0.62, mks: 2, ing: 7.5 },
  { ref: 'Tabla C.5.3.2.2', termino: 'f′cr = f′c + 7.0', p: 1, si: 7, mks: 70, ing: 1000 },
  { ref: 'Tabla C.5.3.2.2', termino: 'f′cr = f′c + 8.3', p: 1, si: 8.3, mks: 84, ing: 1200 },
  { ref: 'Tabla C.5.3.2.2', termino: 'f′cr = 1.10f′c + 5.0', p: 1, si: 5, mks: 50, ing: 700 },
  { ref: 'C.5-2', termino: 'f′cr = f′c + 2.33ss − 3.5', p: 1, si: 3.5, mks: 35, ing: 500 },
  { ref: 'C.7.12.2.1(c)', termino: '0.0018 × 420 / fy', p: 1, si: 420, mks: 4200, ing: 60000 },
  // C-252
  { ref: 'C.10-3', termino: '0.25√f′c/fy', p: 0.5, si: 0.25, mks: 0.8, ing: 3 },
  { ref: 'C.10-3', termino: '1.4 bw d/fy', p: 1, si: 1.4, mks: 14, ing: 200 },
  { ref: 'C.10-4', termino: '280/fs', p: 1, si: 280, mks: 2800, ing: 40000 },
  { ref: 'C.11.1.2', termino: '√f′c ≤ 8.3', p: 0.5, si: 8.3, mks: 27, ing: 100 },
  { ref: 'C.11-3', termino: '0.17λ√f′c bw d', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11-4', termino: 'Nu/(14 Ag)', p: 1, si: 14, mks: 140, ing: 2000 },
  { ref: 'C.11-5', termino: '0.16λ√f′c', p: 0.5, si: 0.16, mks: 0.5, ing: 1.9 },
  { ref: 'C.11-5', termino: '17 ρw Vu d/Mu', p: 1, si: 17, mks: 176, ing: 2500 },
  { ref: 'C.11-5', termino: '≤ 0.29λ√f′c bw d', p: 0.5, si: 0.29, mks: 0.93, ing: 3.5 },
  { ref: 'C.11-7', termino: '0.29λ√f′c bw d', p: 0.5, si: 0.29, mks: 0.93, ing: 3.5 },
  { ref: 'C.11-7', termino: '√(1 + 0.29 Nu/Ag)', p: -1, si: 0.29, mks: 1 / 35, ing: 1 / 500 },
  { ref: 'C.11-8', termino: '0.17(1 + 0.29 Nu/Ag)', p: -1, si: 0.29, mks: 1 / 35, ing: 1 / 500 },
  { ref: 'C.11-9', termino: '0.05λ√f′c', p: 0.5, si: 0.05, mks: 0.16, ing: 0.6 },
  { ref: 'C.11-9', termino: '4.8 Vu dp/Mu', p: 1, si: 4.8, mks: 49, ing: 700 },
  { ref: 'C.11-9', termino: '≤ 0.42λ√f′c bw d', p: 0.5, si: 0.42, mks: 1.33, ing: 5 },
  { ref: 'C.11-10', termino: '0.05λ√f′c', p: 0.5, si: 0.05, mks: 0.16, ing: 0.6 },
  { ref: 'C.11-10', termino: '≥ 0.14λ√f′c bw d', p: 0.5, si: 0.14, mks: 0.45, ing: 1.7 },
  { ref: 'C.11-11', termino: '0.5λ√f′c', p: 0.5, si: 0.5, mks: 1.6, ing: 6 },
  { ref: 'C.11-12', termino: '0.29λ√f′c', p: 0.5, si: 0.29, mks: 0.93, ing: 3.5 },
  { ref: 'C.11-12', termino: '0.33λ√f′c', p: 0.5, si: 0.33, mks: 1.1, ing: 4 },
  { ref: 'C.11.4.5.3', termino: '0.33√f′c bw d', p: 0.5, si: 0.33, mks: 1.1, ing: 4 },
  { ref: 'C.11.4.6.1(f)', termino: 'φ0.17√f′c bw d', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  // C-253
  { ref: 'C.11-13', termino: '0.062√f′c bw s/fyt', p: 0.5, si: 0.062, mks: 0.2, ing: 0.75 },
  { ref: 'C.11-13', termino: '0.35 bw s/fyt', p: 1, si: 0.35, mks: 3.5, ing: 50 },
  { ref: 'C.11-17', termino: '≤ 0.25√f′c bw d', p: 0.5, si: 0.25, mks: 0.8, ing: 3 },
  { ref: 'C.11.4.7.9', termino: '0.66√f′c bw d', p: 0.5, si: 0.66, mks: 2.2, ing: 8 },
  { ref: 'C.11.5.1(a)', termino: 'φ0.083λ√f′c (Acp²/pcp)', p: 0.5, si: 0.083, mks: 0.27, ing: 1 },
  { ref: 'C.11.5.1(b)', termino: '1 + fpc/(0.33λ√f′c)', p: 0.5, si: 0.33, mks: 1, ing: 4 },
  { ref: 'C.11.5.2.2(a)', termino: 'φ0.33λ√f′c (Acp²/pcp)', p: 0.5, si: 0.33, mks: 1, ing: 4 },
  { ref: 'C.11-18', termino: 'φ(Vc/bwd + 0.66√f′c)', p: 0.5, si: 0.66, mks: 2, ing: 8 },
  { ref: 'C.11-19', termino: 'φ(Vc/bwd + 0.66√f′c)', p: 0.5, si: 0.66, mks: 2, ing: 8 },
  { ref: 'C.11-23', termino: '0.062√f′c bw s/fyt', p: 0.5, si: 0.062, mks: 0.2, ing: 0.75 },
  { ref: 'C.11-23', termino: '0.35 bw s/fyt', p: 1, si: 0.35, mks: 3.5, ing: 50 },
  // C-254
  { ref: 'C.11-24', termino: '0.42√f′c Acp/fy', p: 0.5, si: 0.42, mks: 1.33, ing: 5 },
  { ref: 'C.11-24', termino: 'At/s ≥ 0.175 bw/fyt', p: 1, si: 0.175, mks: 1.75, ing: 25 },
  { ref: 'C.11.6.5', termino: '3.3 + 0.08f′c', p: 1, si: 3.3, mks: 34, ing: 480 },
  { ref: 'C.11.6.5', termino: '11 Ac', p: 1, si: 11, mks: 110, ing: 1600 },
  { ref: 'C.11.6.5', termino: '5.5 Ac', p: 1, si: 5.5, mks: 55, ing: 800 },
  { ref: 'C.11.7.3', termino: '0.83√f′c bw d', p: 0.5, si: 0.83, mks: 2.65, ing: 10 },
  { ref: 'C.11.8.3.2.2', termino: '5.5 − 1.9 av/d', p: 1, si: 5.5, mks: 55, ing: 800 },
  { ref: 'C.11.8.3.2.2', termino: '5.5 − 1.9 av/d', p: 1, si: 1.9, mks: 20, ing: 280 },
  { ref: 'C.11.9.3', termino: '0.83√f′c h d', p: 0.5, si: 0.83, mks: 2.65, ing: 10 },
  { ref: 'C.11.9.5', termino: '0.17λ√f′c h d', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11-27', termino: '0.27λ√f′c h d', p: 0.5, si: 0.27, mks: 0.88, ing: 3.3 },
  { ref: 'C.11-31', termino: '0.17(1 + 2/β)λ√f′c bo d', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11-32', termino: '0.083(αs d/bo + 2)λ√f′c bo d', p: 0.5, si: 0.083, mks: 0.27, ing: 1 },
  { ref: 'C.11-33', termino: '0.33λ√f′c bo d', p: 0.5, si: 0.33, mks: 1, ing: 4 },
  { ref: 'C.11.11.2.2', termino: '0.5 MPa / 5 kgf/cm² / 70 psi (el PDF lo rotula √f′c)', p: 1, si: 0.5, mks: 5, ing: 70 },
  { ref: 'C.11.11.3.1', termino: '0.17λ√f′c bo d', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11.11.3.2', termino: '0.5√f′c bo d', p: 0.5, si: 0.5, mks: 1.6, ing: 6 },
  { ref: 'C.11.11.4.8', termino: '0.33√f′c bo d', p: 0.5, si: 0.33, mks: 1.1, ing: 4 },
  { ref: 'C.11.11.4.8', termino: '0.58√f′c bo d', p: 0.5, si: 0.58, mks: 1.9, ing: 7 },
  // C-255
  { ref: 'C.11.11.5.1', termino: '0.25λ√f′c bo d', p: 0.5, si: 0.25, mks: 0.8, ing: 3 },
  { ref: 'C.11.11.5.1', termino: '0.66√f′c bo d', p: 0.5, si: 0.66, mks: 2.1, ing: 8 },
  { ref: 'C.11.11.5.1', termino: '0.17√f′c', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11.11.5.2', termino: '0.5φ√f′c', p: 0.5, si: 0.5, mks: 1.6, ing: 6 },
  { ref: 'C.11.11.5.4', termino: '0.17φλ√f′c', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11.11.7.2', termino: '0.17φλ√f′c', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.11.11.7.3', termino: '0.33φλ√f′c', p: 0.5, si: 0.33, mks: 1.1, ing: 4 },
  { ref: 'C.12.1.2', termino: '√f′c ≤ 8.3', p: 0.5, si: 8.3, mks: 26.5, ing: 100 },
  { ref: 'C.12.2.2', termino: 'ℓd = fyψtψe/(2.1λ√f′c) db', p: 0.5, si: 2.1, mks: 6.6, ing: 25 },
  { ref: 'C.12.2.2', termino: 'ℓd = fyψtψe/(1.7λ√f′c) db', p: 0.5, si: 1.7, mks: 5.3, ing: 20 },
  { ref: 'C.12.2.2', termino: 'ℓd = fyψtψe/(1.4λ√f′c) db', p: 0.5, si: 1.4, mks: 4.4, ing: 50 / 3 },
  { ref: 'C.12.2.2', termino: 'ℓd = fyψtψe/(1.1λ√f′c) db', p: 0.5, si: 1.1, mks: 3.5, ing: 40 / 3 },
  { ref: 'C.12-1', termino: 'ℓd = fy/(1.1λ√f′c) …', p: 0.5, si: 1.1, mks: 3.5, ing: 40 / 3 },
  { ref: 'C.12.3.2', termino: '0.24 fy/(λ√f′c) db', p: -0.5, si: 0.24, mks: 0.075, ing: 0.02 },
  { ref: 'C.12.3.2', termino: '0.043 fy db', p: -1, si: 0.043, mks: 0.0044, ing: 0.0003 },
  { ref: 'C.12.5.2', termino: '0.24ψe fy/(λ√f′c) db', p: -0.5, si: 0.24, mks: 0.075, ing: 0.02 },
  { ref: 'C.12.6.2', termino: '0.19ψe fy/√f′c db', p: -0.5, si: 0.19, mks: 0.06, ing: 0.016 },
  { ref: 'C.12.7.2', termino: '(fy − 240)/fy', p: 1, si: 240, mks: 2460, ing: 35000 },
  { ref: 'C-12-3', termino: 'ℓd = 3.3 (Ab/s)(fy/λ√f′c)', p: -0.5, si: 3.3, mks: 1, ing: 0.27 },
  { ref: 'C-12-4', termino: 'fse/21', p: 1, si: 21, mks: 210, ing: 3000 },
  { ref: 'C-12-4', termino: '(fps − fse)/7', p: 1, si: 7, mks: 70, ing: 1000 },
  { ref: 'C.12.10.5.2', termino: '0.41 bw s/fyt', p: 1, si: 0.41, mks: 4.2, ing: 60 },
  // C-256
  { ref: 'C.12.13.2.2', termino: '0.17 db fyt/(λ√f′c)', p: -0.5, si: 0.17, mks: 0.053, ing: 0.014 },
  { ref: 'C.12.16.1', termino: '0.071 fy db', p: -1, si: 0.071, mks: 0.0073, ing: 0.0005 },
  { ref: 'C.12.16.1', termino: '(0.13 fy − 24) db', p: -1, si: 0.13, mks: 0.013, ing: 0.0009 },
  { ref: 'C.17.5.3.1', termino: '0.55 bv d', p: 1, si: 0.55, mks: 5.6, ing: 80 },
  { ref: 'C.17.5.3.3', termino: '(1.8 + 0.6ρv fy) λ bv d', p: 1, si: 1.8, mks: 18, ing: 260 },
  { ref: 'C.17.5.3.3', termino: '≤ 3.5 bv d', p: 1, si: 3.5, mks: 35, ing: 500 },
  { ref: 'C.18.3.3', termino: 'Clase U: ft ≤ 0.62√f′c', p: 0.5, si: 0.62, mks: 2, ing: 7.5 },
  { ref: 'C.18.3.3', termino: 'Clase T/C: 1.0√f′c', p: 0.5, si: 1, mks: 3.2, ing: 12 },
  { ref: 'C.18.3.3', termino: 'ft ≤ 0.50√f′ci', p: 0.5, si: 0.5, mks: 1.6, ing: 6 },
  { ref: 'C.18.4.1(c)', termino: '0.25√f′ci', p: 0.5, si: 0.25, mks: 0.8, ing: 3 },
  { ref: 'C.18-4', termino: 'fps = fse + 70 + …', p: 1, si: 70, mks: 700, ing: 10000 },
  { ref: 'C.18.9.3.1', termino: '0.17√f′c', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.18.12.7', termino: '2.1 bw d/fy', p: 1, si: 2.1, mks: 21, ing: 300 },
  { ref: 'C.18.13.4.1', termino: 'fps = fse + 70', p: 1, si: 70, mks: 700, ing: 10000 },
  { ref: 'C.19.4.10', termino: '0.33φλ√f′c', p: 0.5, si: 0.33, mks: 1.1, ing: 4 },
  { ref: 'C.21.5.2.1', termino: '1.4 bw d/fy', p: 1, si: 1.4, mks: 14, ing: 200 },
  { ref: 'C.21.7.4.1', termino: '1.7√f′c Aj', p: 0.5, si: 1.7, mks: 5.3, ing: 20 },
  { ref: 'C.21.7.4.1', termino: '1.2√f′c Aj', p: 0.5, si: 1.2, mks: 4, ing: 15 },
  { ref: 'C.21.7.4.1', termino: '1.0√f′c Aj', p: 0.5, si: 1, mks: 3.2, ing: 12 },
  { ref: 'C.21-6', termino: 'ℓdh = fy db/(5.4√f′c)', p: 0.5, si: 5.4, mks: 17.2, ing: 65 },
  { ref: 'C.21.9.2.1', termino: '0.083 Acv λ√f′c', p: 0.5, si: 0.083, mks: 0.27, ing: 1 },
  { ref: 'C.21.9.2.2', termino: '0.17 Acv λ√f′c', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  // C-257
  { ref: 'C.21-7', termino: 'αc = 0.25', p: 0.5, si: 0.25, mks: 0.8, ing: 3 },
  { ref: 'C.21-7', termino: 'αc = 0.17', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.21.9.4.4', termino: '0.66 Acv √f′c', p: 0.5, si: 0.66, mks: 2.12, ing: 8 },
  { ref: 'C.21.9.4.4', termino: '0.83 Acw √f′c', p: 0.5, si: 0.83, mks: 2.65, ing: 10 },
  { ref: 'C.21.9.6.5(a)', termino: '2.8/fy', p: 1, si: 2.8, mks: 28, ing: 400 },
  { ref: 'C.21.9.6.5(b)', termino: '0.083 Acv λ√f′c', p: 0.5, si: 0.083, mks: 0.27, ing: 1 },
  { ref: 'C.21.9.7.2', termino: '0.33λ√f′c Acw', p: 0.5, si: 0.33, mks: 1, ing: 4 },
  { ref: 'C.21-9', termino: '≤ 0.83√f′c Acw', p: 0.5, si: 0.83, mks: 2.65, ing: 10 },
  { ref: 'C.21-10', termino: '0.17λ√f′c', p: 0.5, si: 0.17, mks: 0.53, ing: 2 },
  { ref: 'C.21.11.9.2', termino: '0.66 Acv √f′c', p: 0.5, si: 0.66, mks: 2.12, ing: 8 },
  { ref: 'C.21.13.6', termino: '0.29√f′c bo d', p: 0.5, si: 0.29, mks: 0.93, ing: 3.5 },
  { ref: 'C.22-2', termino: 'Mn = 0.42λ√f′c Sm', p: 0.5, si: 0.42, mks: 1.33, ing: 5 },
  { ref: 'C.22-7', termino: 'φ0.42λ√f′c', p: 0.5, si: 0.42, mks: 1.33, ing: 5 },
  { ref: 'C.22-9', termino: 'Vn = 0.11λ√f′c bw h', p: 0.5, si: 0.11, mks: 0.35, ing: 4 / 3 },
  { ref: 'C.22-10', termino: '0.11(1 + 2/β)λ√f′c bo h', p: 0.5, si: 0.11, mks: 0.35, ing: 4 / 3 },
  { ref: 'C.22-10', termino: '≤ 0.22λ√f′c bo h', p: 0.5, si: 0.22, mks: 0.71, ing: 2.66 },
  { ref: 'C-B-1', termino: 'ρb = … 600/(600 + fy)', p: 1, si: 600, mks: 6120, ing: 87000 },
];

/** Coeficiente esperado en el sistema destino a partir del de SI: c_SI × k^p (con la conversión exacta por defecto). */
export function coeficienteEsperado(c: CoeficienteEquivalente, sistema: SistemaUnidades, exacto = true): number {
  if (sistema === 'si') return c.si;
  return c.si * factorEsfuerzo(sistema, exacto) ** c.p;
}

/** Desviación relativa del coeficiente impreso respecto del esperado (positiva si el impreso es mayor). */
export function desviacionRelativa(c: CoeficienteEquivalente, sistema: Exclude<SistemaUnidades, 'si'>, exacto = true): number {
  const impreso = sistema === 'mks' ? c.mks : c.ing;
  return impreso / coeficienteEsperado(c, sistema, exacto) - 1;
}

/**
 * Fuerza cortante Vc = 0.17 λ √f′c bw d (C.11-3) evaluada en cada sistema con el coeficiente impreso en C-F (kN).
 * Entradas físicas en MPa y mm; la función convierte a las unidades del sistema (exacto), evalúa con la
 * fórmula del sistema y devuelve kN.
 */
export function vcSimpleEnSistema(sistema: SistemaUnidades, fcMpa: number, bw: number, d: number, lambda = 1): number {
  if (sistema === 'si') return (0.17 * lambda * Math.sqrt(fcMpa) * bw * d) / 1000;
  if (sistema === 'mks') {
    const fc = desdeMpa(fcMpa, 'mks');
    return (0.53 * lambda * Math.sqrt(fc) * (bw / 10) * (d / 10) * KGF_A_N) / 1000;
  }
  const fc = desdeMpa(fcMpa, 'ing');
  return (2 * lambda * Math.sqrt(fc) * (bw / IN_A_MM) * (d / IN_A_MM) * LBF_A_N) / 1000;
}

/**
 * Nb = kc λ √f′c hef^1.5 en cada sistema (C-D-7 con kc = 10 en SI y mks, 24 en inglés; C-F, PDF p.559, C-257). kN.
 * Entradas en MPa y mm. En mks las longitudes van en cm y el resultado en kgf; en inglés, pulgadas y lbf.
 */
export function nbEnSistema(sistema: SistemaUnidades, fcMpa: number, hef: number, lambda = 1): number {
  if (sistema === 'si') return (10 * lambda * Math.sqrt(fcMpa) * hef ** 1.5) / 1000;
  if (sistema === 'mks') return (10 * lambda * Math.sqrt(desdeMpa(fcMpa, 'mks')) * (hef / 10) ** 1.5 * KGF_A_N) / 1000;
  return (24 * lambda * Math.sqrt(desdeMpa(fcMpa, 'ing')) * (hef / IN_A_MM) ** 1.5 * LBF_A_N) / 1000;
}
