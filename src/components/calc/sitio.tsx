import { useState } from 'react';
import type { GrupoUso, PerfilSuelo } from '@/data/tablas';
import { GRUPOS_USO } from '@/data/tablas';
import { coeficienteFa, coeficienteFv, coeficienteImportancia, zonaAmenaza } from '@/lib/nsr10';
import { Campo, parseNum, useNum } from './ui';
import Selector from './Selector';

export const OPCIONES_PERFIL = [
  { value: 'A', label: 'A — Roca competente' },
  { value: 'B', label: 'B — Roca de rigidez media' },
  { value: 'C', label: 'C — Suelo muy denso / roca blanda' },
  { value: 'D', label: 'D — Suelo rígido' },
  { value: 'E', label: 'E — Suelo blando' },
  { value: 'F', label: 'F — Requiere estudio de sitio' },
] as const;

export const OPCIONES_GRUPO = GRUPOS_USO.map((g) => ({
  value: g.grupo,
  label: `Grupo ${g.grupo} — ${g.nombre} (I = ${coeficienteImportancia(g.grupo).toFixed(2)})`,
}));

/** Ciudades de la Tabla A.2.3-2 (valores verificados) para rellenar rápido. */
export const CIUDADES_EJEMPLO = [
  { nombre: 'Bogotá D. C.', aa: 0.15, av: 0.2 },
  { nombre: 'Medellín', aa: 0.15, av: 0.2 },
  { nombre: 'Cali', aa: 0.25, av: 0.25 },
  { nombre: 'Barranquilla', aa: 0.1, av: 0.1 },
  { nombre: 'Cartagena', aa: 0.1, av: 0.1 },
  { nombre: 'Bucaramanga', aa: 0.25, av: 0.25 },
  { nombre: 'Cúcuta', aa: 0.35, av: 0.3 },
  { nombre: 'Pasto', aa: 0.25, av: 0.25 },
  { nombre: 'Mocoa', aa: 0.3, av: 0.25 },
  { nombre: 'Leticia', aa: 0.05, av: 0.05 },
] as const;

export type Sitio = {
  aa: number;
  av: number;
  fa: number | null;
  fv: number | null;
  i: number;
  perfil: PerfilSuelo;
  grupo: GrupoUso;
  zona: ReturnType<typeof zonaAmenaza>;
  /** true si los datos de sitio son válidos para calcular el espectro. */
  valido: boolean;
};

/** Hook que agrupa los datos de sitio de A.2 (Aa, Av, perfil, grupo) y deriva Fa, Fv e I. */
export function useSitio(inicial?: { aa?: number; av?: number; perfil?: PerfilSuelo; grupo?: GrupoUso }) {
  const aaN = useNum(inicial?.aa ?? 0.15);
  const avN = useNum(inicial?.av ?? 0.2);
  const [perfil, setPerfil] = useState<PerfilSuelo>(inicial?.perfil ?? 'D');
  const [grupo, setGrupo] = useState<GrupoUso>(inicial?.grupo ?? 'I');

  const aa = aaN.n;
  const av = avN.n;
  const okAa = Number.isFinite(aa) && aa > 0 && aa <= 0.6;
  const okAv = Number.isFinite(av) && av > 0 && av <= 0.6;
  const fa = okAa ? coeficienteFa(perfil, aa) : null;
  const fv = okAv ? coeficienteFv(perfil, av) : null;
  const sitio: Sitio = {
    aa,
    av,
    fa,
    fv,
    i: coeficienteImportancia(grupo),
    perfil,
    grupo,
    zona: okAa && okAv ? zonaAmenaza(aa, av) : 'Baja',
    valido: okAa && okAv && fa !== null && fv !== null,
  };

  const campos = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo etiqueta="Aa" valor={aaN.txt} onCambio={aaN.setTxt} paso={0.05} min={0.05} max={0.5} ayuda="Aceleración pico efectiva (corto período)" />
      <Campo etiqueta="Av" valor={avN.txt} onCambio={avN.setTxt} paso={0.05} min={0.05} max={0.5} ayuda="Velocidad pico efectiva (período intermedio)" />
      <Selector etiqueta="Perfil de suelo" valor={perfil} onCambio={(v) => setPerfil(v as PerfilSuelo)} opciones={OPCIONES_PERFIL} />
      <Selector etiqueta="Grupo de uso" valor={grupo} onCambio={(v) => setGrupo(v as GrupoUso)} opciones={OPCIONES_GRUPO} />
    </div>
  );

  const fijar = (a: number, v: number) => {
    aaN.setTxt(String(a));
    avN.setTxt(String(v));
  };

  return { sitio, campos, fijar, setPerfil, setGrupo, aaTxt: aaN.txt, avTxt: avN.txt, parseNum };
}
