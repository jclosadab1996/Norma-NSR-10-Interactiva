import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import {
  CIELO_RASO,
  CUBIERTAS,
  ENCHAPES,
  MATERIALES,
  MUROS_MAMPOSTERIA,
  MUROS_PANELES,
  PARTICIONES_LIVIANAS,
  PISOS,
  RECUBRIMIENTO_MUROS,
  RELLENO_PISO,
  VALORES_ALTERNATIVOS,
  VENTANAS,
  ALTURA_MAX_VALORES_ALTERNATIVOS_M,
  buscarComponente,
  buscarMaterial,
  buscarMuro,
  buscarValorAlternativo,
  type ComponenteCarga,
} from '@/data/cargasMuertas';
import {
  cargaAlternativa,
  cargaComponente,
  cargaLineal,
  cargaMuroMamposteria,
  cargaPorEspesor,
  densidadDeCalculo,
  espesoresDisponibles,
  pesoPropioLosaMaciza,
  puedeUsarValoresAlternativos,
  sumarCargasMuertas,
  type Aporte,
} from '@/lib/nsr10/cargasMuertas';
import Selector, { type Opcion } from './Selector';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';

// ---------------------------------------------------------------------------------------------
// Catálogos de opciones
// ---------------------------------------------------------------------------------------------

type CatH = 'B.3.4.1-1' | 'B.3.4.1-2' | 'B.3.4.1-3' | 'B.3.4.1-4' | 'densidad';
type CatV = 'mamposteria' | 'paneles' | 'B.3.4.2-1' | 'B.3.4.2-2' | 'B.3.4.2-3' | 'B.3.4.2-5';

const CATS_H: { value: CatH; label: string; items?: readonly ComponenteCarga[] }[] = [
  { value: 'B.3.4.1-3', label: 'Pisos y acabados (B.3.4.1-3)', items: PISOS },
  { value: 'B.3.4.1-2', label: 'Relleno de pisos (B.3.4.1-2)', items: RELLENO_PISO },
  { value: 'B.3.4.1-1', label: 'Cielo raso (B.3.4.1-1)', items: CIELO_RASO },
  { value: 'B.3.4.1-4', label: 'Cubiertas (B.3.4.1-4)', items: CUBIERTAS },
  { value: 'densidad', label: 'Material × espesor (B.3.2-1)' },
];

const CATS_V: { value: CatV; label: string; items?: readonly ComponenteCarga[] }[] = [
  { value: 'mamposteria', label: 'Muros de mampostería (B.3.4.2-4)' },
  { value: 'paneles', label: 'Muros de paneles (B.3.4.2-4)', items: MUROS_PANELES },
  { value: 'B.3.4.2-2', label: 'Particiones livianas (B.3.4.2-2)', items: PARTICIONES_LIVIANAS },
  { value: 'B.3.4.2-1', label: 'Recubrimiento de muros (B.3.4.2-1)', items: RECUBRIMIENTO_MUROS },
  { value: 'B.3.4.2-3', label: 'Enchapes (B.3.4.2-3)', items: ENCHAPES },
  { value: 'B.3.4.2-5', label: 'Ventanas y muros cortina (B.3.4.2-5)', items: VENTANAS },
];

const etiquetaComponente = (c: ComponenteCarga) =>
  `${c.grupo && c.tabla !== 'B.3.4.2-4' ? `${c.grupo}: ` : ''}${c.componente} — ${
    c.tipo === 'fijo' ? `${c.kN} kN/m²` : `${c.kN} kN/m² por mm`
  }`;

const opcionesItemsH = (cat: CatH): Opcion[] =>
  cat === 'densidad'
    ? MATERIALES.map((m) => ({
        value: m.id,
        label: `${m.grupo ? `${m.grupo}: ` : ''}${m.material} — ${m.densidadMax ? `${m.densidad}–${m.densidadMax}` : m.densidad} kg/m³`,
      }))
    : (CATS_H.find((c) => c.value === cat)!.items ?? []).map((c) => ({ value: c.id, label: etiquetaComponente(c) }));

const opcionesItemsV = (cat: CatV): Opcion[] =>
  cat === 'mamposteria'
    ? MUROS_MAMPOSTERIA.map((m) => ({ value: m.id, label: `${m.familia.replace('Mampostería ', '')}: ${m.variante}` }))
    : (CATS_V.find((c) => c.value === cat)!.items ?? []).map((c) => ({ value: c.id, label: etiquetaComponente(c) }));

const primerItemH = (cat: CatH) => opcionesItemsH(cat)[0].value;
const primerItemV = (cat: CatV) => opcionesItemsV(cat)[0].value;

type FilaH = { uid: number; cat: CatH; item: string; esp: string };
type FilaV = { uid: number; cat: CatV; item: string; esp: string; h: string; l: string; ub: 'interior' | 'fachada' };

const COLORES = {
  estructura: 'var(--chart-1)',
  horizontales: 'var(--chart-2)',
  interiores: 'var(--chart-3)',
  otras: 'var(--chart-5)',
} as const;

const config = {
  valor: { label: 'Carga (kN/m²)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const NOMBRE_CAT: Record<keyof typeof COLORES, string> = {
  estructura: 'Estructura',
  horizontales: 'Acabados, rellenos y cielo raso',
  interiores: 'Muros y particiones interiores (repartidos)',
  otras: 'Otras cargas permanentes',
};

// ---------------------------------------------------------------------------------------------
// Cálculo de cada fila
// ---------------------------------------------------------------------------------------------

function valorFilaH(f: FilaH): { nombre: string; valor: number } {
  const esp = parseNum(f.esp);
  if (f.cat === 'densidad') {
    const m = buscarMaterial(f.item);
    if (!m) return { nombre: '—', valor: NaN };
    return { nombre: `${m.material} (${f.esp} mm)`, valor: esp >= 0 ? cargaPorEspesor(densidadDeCalculo(m), esp / 1000) : NaN };
  }
  const c = buscarComponente(f.item);
  if (!c) return { nombre: '—', valor: NaN };
  return { nombre: c.tipo === 'por-espesor' ? `${c.componente} (${f.esp} mm)` : c.componente, valor: cargaComponente(c, esp) };
}

function valorFilaV(f: FilaV): { nombre: string; q: number } {
  if (f.cat === 'mamposteria') {
    const m = buscarMuro(f.item);
    if (!m) return { nombre: '—', q: NaN };
    const q = cargaMuroMamposteria(m, Number(f.esp));
    return { nombre: `Muro ${m.familia.replace('Mampostería ', '')} ${f.esp} mm, ${m.variante.toLowerCase()}`, q: q ?? NaN };
  }
  const c = buscarComponente(f.item);
  if (!c) return { nombre: '—', q: NaN };
  return { nombre: c.tipo === 'por-espesor' ? `${c.componente} (${f.esp} mm)` : c.componente, q: cargaComponente(c, parseNum(f.esp)) };
}

function espesorPorDefectoV(cat: CatV, item: string): string {
  if (cat === 'mamposteria') return String(espesoresDisponibles(buscarMuro(item)!)[0]);
  return '12';
}

// ---------------------------------------------------------------------------------------------

export default function CargaMuerta() {
  const uid = useRef(10);
  const siguiente = () => ++uid.current;

  const [modo, setModo] = useState<'detallado' | 'alternativo'>('detallado');
  const area = useNum(100);

  // Estructura
  const [estructura, setEstructura] = useState<'maciza' | 'material' | 'manual'>('maciza');
  const espLosa = useNum(15);
  const [matEstructura, setMatEstructura] = useState('concreto-reforzado');
  const espMat = useNum(10);
  const pesoManual = useNum(3.5);

  // Capas horizontales y elementos verticales
  const [filasH, setFilasH] = useState<FilaH[]>([
    { uid: 1, cat: 'B.3.4.1-3', item: 'pi-baldosa-20-mortero-25', esp: '20' },
    { uid: 2, cat: 'B.3.4.1-1', item: 'cr-canales-acero', esp: '12' },
    { uid: 3, cat: 'B.3.4.1-1', item: 'cr-tableros-yeso', esp: '12' },
  ]);
  const [filasV, setFilasV] = useState<FilaV[]>([
    { uid: 4, cat: 'mamposteria', item: 'mb-arcilla-panetado', esp: '100', h: '2.5', l: '30', ub: 'interior' },
    { uid: 5, cat: 'mamposteria', item: 'mb-arcilla-panetado', esp: '150', h: '2.5', l: '40', ub: 'fachada' },
  ]);
  const [fachadaRepartida, setFachadaRepartida] = useState(false);
  const otras = useNum(0);

  // Modo alternativo
  const [ocupacion, setOcupacion] = useState('va-residencial-mamposteria');
  const alturaPisos = useNum(2.5);

  const actualizarH = (id: number, parche: Partial<FilaH>) => setFilasH((fs) => fs.map((f) => (f.uid === id ? { ...f, ...parche } : f)));
  const actualizarV = (id: number, parche: Partial<FilaV>) => setFilasV((fs) => fs.map((f) => (f.uid === id ? { ...f, ...parche } : f)));

  // --- Resultados ---
  const calc = useMemo(() => {
    const aportes: Aporte[] = [];
    // Estructura
    if (estructura === 'maciza') {
      aportes.push({ nombre: `Losa maciza de concreto reforzado (${espLosa.txt} cm)`, categoria: 'estructura', valor: espLosa.n > 0 ? pesoPropioLosaMaciza(espLosa.n / 100) : NaN });
    } else if (estructura === 'material') {
      const m = buscarMaterial(matEstructura);
      aportes.push({
        nombre: `${m?.material ?? 'Material'} (${espMat.txt} cm)`,
        categoria: 'estructura',
        valor: m && espMat.n > 0 ? cargaPorEspesor(densidadDeCalculo(m), espMat.n / 100) : NaN,
      });
    } else {
      aportes.push({ nombre: 'Peso propio de la estructura (dato)', categoria: 'estructura', valor: pesoManual.n >= 0 ? pesoManual.n : NaN });
    }

    const lineasFachada: { nombre: string; q: number; lineal: number; total: number; L: number }[] = [];
    const interiores: { nombre: string; q: number; lineal: number; total: number; L: number }[] = [];
    let alt: ReturnType<typeof cargaAlternativa> | undefined;

    if (modo === 'detallado') {
      for (const f of filasH) {
        const r = valorFilaH(f);
        aportes.push({ nombre: r.nombre, categoria: 'horizontales', valor: r.valor });
      }
      for (const f of filasV) {
        const { nombre, q } = valorFilaV(f);
        const h = parseNum(f.h);
        const L = parseNum(f.l);
        const lineal = h > 0 ? cargaLineal(q, h) : NaN;
        const total = lineal * L;
        const fila = { nombre, q, lineal, total, L };
        if (f.ub === 'fachada') lineasFachada.push(fila);
        else interiores.push(fila);
      }
      for (const v of interiores) {
        aportes.push({ nombre: v.nombre, categoria: 'interiores', valor: area.n > 0 && v.L >= 0 ? v.total / area.n : NaN });
      }
      if (fachadaRepartida) {
        for (const v of lineasFachada) {
          aportes.push({ nombre: `${v.nombre} (fachada repartida)`, categoria: 'interiores', valor: area.n > 0 && v.L >= 0 ? v.total / area.n : NaN });
        }
      }
    } else {
      alt = cargaAlternativa(ocupacion);
      if (alt) {
        aportes.push({ nombre: 'Fachada y particiones (B.3.4.3-1)', categoria: 'interiores', valor: alt.fachadaParticiones });
        aportes.push({ nombre: 'Afinado de piso y cubierta (B.3.4.3-1)', categoria: 'horizontales', valor: alt.afinado });
      }
    }
    if (otras.n > 0) aportes.push({ nombre: 'Otras cargas permanentes / equipos fijos', categoria: 'otras', valor: otras.n });

    const desglose = sumarCargasMuertas(aportes);
    const sumaCat = (c: string) => desglose.filas.filter((f) => f.categoria === c).reduce((s, f) => s + f.valor, 0);
    const fachadaKnM = lineasFachada.reduce((s, v) => s + (Number.isFinite(v.lineal) ? v.lineal : 0), 0);
    return { desglose, sumaCat, interiores, lineasFachada, fachadaKnM, alt };
  }, [modo, estructura, espLosa.txt, espLosa.n, matEstructura, espMat.txt, espMat.n, pesoManual.n, filasH, filasV, fachadaRepartida, otras.n, area.n, ocupacion]);

  const { desglose } = calc;
  const datosGrafico = desglose.filas
    .filter((f) => f.valor > 0)
    .map((f) => ({ nombre: f.nombre, valor: f.valor, color: COLORES[f.categoria as keyof typeof COLORES] ?? COLORES.otras }));
  const altoGrafico = Math.max(180, 34 * datosGrafico.length + 50);
  const alternativoValido = puedeUsarValoresAlternativos(alturaPisos.n);

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border p-0.5 text-sm" role="group" aria-label="Método de cálculo">
        {(
          [
            ['detallado', 'Análisis detallado (B.3.4.1 y B.3.4.2)'],
            ['alternativo', 'Valores alternativos (B.3.4.3-1)'],
          ] as const
        ).map(([v, t]) => (
          <button
            key={v}
            type="button"
            aria-pressed={modo === v}
            onClick={() => setModo(v)}
            className={`rounded-md px-3 py-1.5 transition-colors ${modo === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <Grupo titulo="1. Estructura de la placa">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Selector
            etiqueta="Peso propio"
            valor={estructura}
            onCambio={(v) => setEstructura(v as typeof estructura)}
            opciones={[
              { value: 'maciza', label: 'Losa maciza de concreto reforzado' },
              { value: 'material', label: 'Otro material (B.3.2-1)' },
              { value: 'manual', label: 'Valor propio (losa aligerada, etc.)' },
            ]}
          />
          {estructura === 'maciza' && <Campo etiqueta="Espesor de la losa" unidad="cm" valor={espLosa.txt} onCambio={espLosa.setTxt} min={5} max={80} ayuda="ρ = 2400 kg/m³ → 23.52 kN/m³" />}
          {estructura === 'material' && (
            <>
              <Selector
                etiqueta="Material"
                valor={matEstructura}
                onCambio={setMatEstructura}
                opciones={MATERIALES.map((m) => ({ value: m.id, label: `${m.grupo ? `${m.grupo}: ` : ''}${m.material} (${m.densidadMax ? `${m.densidad}–${m.densidadMax}` : m.densidad} kg/m³)` }))}
                ayuda={buscarMaterial(matEstructura)?.densidadMax ? 'Rango en la tabla: se usa el valor máximo.' : undefined}
              />
              <Campo etiqueta="Espesor" unidad="cm" valor={espMat.txt} onCambio={espMat.setTxt} min={0.1} />
            </>
          )}
          {estructura === 'manual' && <Campo etiqueta="Peso propio" unidad="kN/m²" valor={pesoManual.txt} onCambio={pesoManual.setTxt} min={0} ayuda="Por ejemplo, de una losa aligerada según el fabricante" />}
          <Campo etiqueta="Área de planta" unidad="m²" valor={area.txt} onCambio={area.setTxt} min={1} ayuda={modo === 'detallado' ? 'Para repartir muros y particiones' : undefined} />
        </div>
      </Grupo>

      {modo === 'detallado' ? (
        <>
          <Grupo titulo="2. Elementos no estructurales horizontales (kN/m² de área en planta)">
            {filasH.map((f) => {
              const c = f.cat === 'densidad' ? undefined : buscarComponente(f.item);
              const necesitaEsp = f.cat === 'densidad' || c?.tipo === 'por-espesor';
              return (
                <div key={f.uid} className="grid items-end gap-2 sm:grid-cols-[1fr_1.6fr_7rem_auto]">
                  <Selector
                    etiqueta="Tabla"
                    valor={f.cat}
                    onCambio={(v) => {
                      const cat = v as CatH;
                      actualizarH(f.uid, { cat, item: primerItemH(cat), esp: cat === 'densidad' ? '20' : '12' });
                    }}
                    opciones={CATS_H}
                  />
                  <Selector etiqueta="Componente" valor={f.item} onCambio={(v) => actualizarH(f.uid, { item: v })} opciones={opcionesItemsH(f.cat)} />
                  {necesitaEsp ? <Campo etiqueta="Espesor" unidad="mm" valor={f.esp} onCambio={(v) => actualizarH(f.uid, { esp: v })} min={0} /> : <div className="pb-2 font-mono text-sm text-muted-foreground">valor fijo</div>}
                  <Button type="button" variant="outline" size="sm" onClick={() => setFilasH((fs) => fs.filter((x) => x.uid !== f.uid))} aria-label="Quitar capa">
                    Quitar
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="secondary" size="sm" onClick={() => setFilasH((fs) => [...fs, { uid: siguiente(), cat: 'B.3.4.1-3', item: primerItemH('B.3.4.1-3'), esp: '20' }])}>
              + Agregar capa
            </Button>
          </Grupo>

          <Grupo titulo="3. Elementos no estructurales verticales (muros, particiones, fachada)">
            {filasV.map((f) => {
              const c = f.cat === 'mamposteria' ? undefined : buscarComponente(f.item);
              const muro = f.cat === 'mamposteria' ? buscarMuro(f.item) : undefined;
              const { q } = valorFilaV(f);
              return (
                <div key={f.uid} className="space-y-2 rounded-lg border p-3">
                  <div className="grid items-end gap-2 sm:grid-cols-[1fr_1.6fr]">
                    <Selector
                      etiqueta="Tabla"
                      valor={f.cat}
                      onCambio={(v) => {
                        const cat = v as CatV;
                        const item = primerItemV(cat);
                        actualizarV(f.uid, { cat, item, esp: espesorPorDefectoV(cat, item) });
                      }}
                      opciones={CATS_V}
                    />
                    <Selector
                      etiqueta="Componente"
                      valor={f.item}
                      onCambio={(v) => {
                        const parche: Partial<FilaV> = { item: v };
                        if (f.cat === 'mamposteria' && !espesoresDisponibles(buscarMuro(v)!).includes(Number(f.esp))) parche.esp = espesorPorDefectoV('mamposteria', v);
                        actualizarV(f.uid, parche);
                      }}
                      opciones={opcionesItemsV(f.cat)}
                    />
                  </div>
                  <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {muro && (
                      <Selector
                        etiqueta="Espesor del muro"
                        valor={f.esp}
                        onCambio={(v) => actualizarV(f.uid, { esp: v })}
                        opciones={espesoresDisponibles(muro).map((e) => ({ value: String(e), label: `${e} mm` }))}
                      />
                    )}
                    {c?.tipo === 'por-espesor' && <Campo etiqueta="Espesor" unidad="mm" valor={f.esp} onCambio={(v) => actualizarV(f.uid, { esp: v })} min={0} />}
                    <Campo etiqueta="Altura" unidad="m" valor={f.h} onCambio={(v) => actualizarV(f.uid, { h: v })} min={0.1} paso={0.1} />
                    <Campo etiqueta="Longitud total" unidad="m" valor={f.l} onCambio={(v) => actualizarV(f.uid, { l: v })} min={0} />
                    <Selector
                      etiqueta="Ubicación"
                      valor={f.ub}
                      onCambio={(v) => actualizarV(f.uid, { ub: v as FilaV['ub'] })}
                      opciones={[
                        { value: 'interior', label: 'Interior (se reparte en planta)' },
                        { value: 'fachada', label: 'Fachada (carga en el borde)' },
                      ]}
                    />
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <span className="font-mono text-xs text-muted-foreground">{Number.isFinite(q) ? `${fmt(q, 3)} kN/m²` : '—'}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setFilasV((fs) => fs.filter((x) => x.uid !== f.uid))} aria-label="Quitar elemento">
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilasV((fs) => [...fs, { uid: siguiente(), cat: 'mamposteria', item: 'mb-arcilla-panetado', esp: '100', h: '2.5', l: '10', ub: 'interior' }])}
              >
                + Agregar elemento
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fachadaRepartida} onChange={(e) => setFachadaRepartida(e.target.checked)} />
                Repartir también la fachada en el área (aproximación; la norma pide carga distribuida en el borde de la losa)
              </label>
            </div>
          </Grupo>
        </>
      ) : (
        <Grupo titulo="2. Valores mínimos alternativos de la Tabla B.3.4.3-1">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Selector
              etiqueta="Ocupación"
              valor={ocupacion}
              onCambio={setOcupacion}
              opciones={VALORES_ALTERNATIVOS.map((v) => ({ value: v.id, label: `${v.ocupacion}: ${v.descripcion}` }))}
            />
            <Campo etiqueta="Altura entre pisos terminados" unidad="m" valor={alturaPisos.txt} onCambio={alturaPisos.setTxt} min={2} max={2.99} paso={0.1} ayuda={`Debe ser menor de ${ALTURA_MAX_VALORES_ALTERNATIVOS_M} m`} />
          </div>
          {!alternativoValido && <Aviso tipo="error">Con altura entre pisos de {ALTURA_MAX_VALORES_ALTERNATIVOS_M} m o más no se permiten los valores alternativos (B.3.4.3): usa el análisis detallado.</Aviso>}
          {(() => {
            const v = buscarValorAlternativo(ocupacion);
            return v ? (
              <p className="text-sm text-muted-foreground">
                Fachada y particiones: <b className="font-mono">{v.fachadaParticionesKN.toFixed(1)}</b> kN/m² · afinado de piso y cubierta: <b className="font-mono">{v.afinadoKN.toFixed(1)}</b> kN/m².
              </p>
            ) : null;
          })()}
        </Grupo>
      )}

      <Grupo titulo={modo === 'detallado' ? '4. Otras cargas permanentes' : '3. Otras cargas permanentes'}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Equipos fijos y otras" unidad="kN/m²" valor={otras.txt} onCambio={otras.setTxt} min={0} ayuda="B.3.5: ascensores, bombas, equipos de aire acondicionado… repartidos en el área" />
        </div>
      </Grupo>

      {desglose.invalidos.length > 0 && <Aviso tipo="error">Revisa los valores de: {desglose.invalidos.join('; ')}.</Aviso>}
      {modo === 'detallado' && !(area.n > 0) && <Aviso tipo="error">El área de planta debe ser positiva.</Aviso>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Valor destacado etiqueta="Carga muerta uniforme D" unidad="kN/m²" valor={fmt(desglose.total, 2)} nota={`≈ ${fmt(desglose.totalKgf, 0)} kgf/m² (× 100, como la norma)`} />
        <Valor etiqueta="Estructura" unidad="kN/m²" valor={fmt(calc.sumaCat('estructura'), 2)} />
        <Valor etiqueta="Acabados y cielo raso" unidad="kN/m²" valor={fmt(calc.sumaCat('horizontales'), 2)} />
        <Valor etiqueta="Muros/particiones repartidos" unidad="kN/m²" valor={fmt(calc.sumaCat('interiores'), 2)} />
      </div>
      {modo === 'detallado' && calc.lineasFachada.length > 0 && (
        <Valor
          etiqueta="Fachada: carga lineal en el borde de la losa"
          unidad="kN/m"
          valor={fmt(calc.fachadaKnM, 2)}
          nota={
            fachadaRepartida
              ? 'Ya está incluida (repartida) en el total de arriba.'
              : 'No está en el total uniforme: aplícala como carga distribuida sobre el borde (B.3.4.2, nota).'
          }
        />
      )}

      {datosGrafico.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="px-2 py-1.5 text-left">Componente</th>
                  <th className="px-2 py-1.5 text-right">kN/m²</th>
                  <th className="px-2 py-1.5 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {desglose.filas.map((f, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      <span className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: COLORES[f.categoria as keyof typeof COLORES] ?? COLORES.otras }} />
                      {f.nombre}
                    </td>
                    <td className="px-2 py-1 text-right font-mono">{fmt(f.valor, 3)}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmt(f.fraccion * 100, 1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-mono text-xs">
                <tr>
                  <td className="px-2 py-1.5">Total D</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{fmt(desglose.total, 3)}</td>
                  <td className="px-2 py-1.5 text-right">100.0</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div>
            <ChartContainer config={config} className="w-full" style={{ height: altoGrafico }}>
              <BarChart data={datosGrafico} layout="vertical" margin={{ left: 4, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <YAxis type="category" dataKey="nombre" tickLine={false} width={150} tick={{ fontSize: 11 }} tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)} />
                <XAxis type="number" tickFormatter={(v) => Number(v).toFixed(1)} label={{ value: 'kN/m²', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, _n, item) => <span className="font-mono">{String(item?.payload?.nombre)}: {Number(v).toFixed(3)} kN/m²</span>} />} />
                <Bar dataKey="valor" radius={3}>
                  {datosGrafico.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(Object.keys(COLORES) as (keyof typeof COLORES)[]).map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm" style={{ background: COLORES[k] }} />
                  {NOMBRE_CAT[k]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {modo === 'detallado' && calc.interiores.length + calc.lineasFachada.length > 0 && (
        <details className="rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Cargas lineales de los elementos verticales</summary>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {[...calc.interiores.map((v) => ({ ...v, ub: 'interior' })), ...calc.lineasFachada.map((v) => ({ ...v, ub: 'fachada' }))].map((v, i) => (
              <li key={i}>
                {v.nombre} [{v.ub}]: {fmt(v.q, 3)} kN/m² × h = {fmt(v.lineal, 3)} kN/m → {fmt(v.total, 1)} kN en {fmt(v.L, 1)} m
              </li>
            ))}
          </ul>
        </details>
      )}

      <PieCalc>
        Valores mínimos promedio de las tablas B.3.2-1 y B.3.4.x; kgf/m² = 100·kN/m² como en la norma. Los muros interiores solo pueden repartirse en planta si el sistema de piso resiste las cargas lineales sin afectar su resistencia o servicio.
      </PieCalc>
    </div>
  );
}
