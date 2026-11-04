import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  CARGAS_VIVAS,
  GRUPOS_OCUPACION,
  IMPACTO,
  PANELES_INFLUENCIA,
  REDUCCION_AREA,
  buscarUso,
  type TipoElemento,
} from '@/data/cargasVivas';
import {
  areaInfluencia,
  areaParaFraccion,
  cargaConImpacto,
  curvaReduccion,
  reduccionAreaAferente,
  reduccionPorPisosUniforme,
} from '@/lib/nsr10/cargasVivas';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  unPiso: { label: 'Elemento de un piso (mín. 50 %)', color: 'var(--chart-1)' },
  variosPisos: { label: 'Elemento de dos o más pisos (mín. 40 %)', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const opcionesGrupo = GRUPOS_OCUPACION.map((g) => ({ value: g, label: g }));
const opcionesElemento = (Object.keys(PANELES_INFLUENCIA) as TipoElemento[]).map((k) => ({
  value: k,
  label: `${PANELES_INFLUENCIA[k].etiqueta} (${PANELES_INFLUENCIA[k].paneles} ${PANELES_INFLUENCIA[k].paneles === 1 ? 'panel' : 'paneles'})`,
}));
const opcionesImpacto = IMPACTO.map((i) => ({ value: i.id, label: `(${i.literal}) ${i.elemento} — ${i.minimo ? '≥ ' : ''}${i.porcentaje} %` }));

export default function ReduccionCargaViva() {
  const [grupo, setGrupo] = useState<string>('Oficinas');
  const [usoId, setUsoId] = useState<string>('oficinas-oficinas');
  const [l0Propio, setL0Propio] = useState<string | null>(null);
  const [elemento, setElemento] = useState<TipoElemento>('columna-central');
  const panel = useNum(42);
  const pisosSoportados = useNum(1);
  const nPisos = useNum(12);
  const aTrib = useNum(36);
  const [impactoId, setImpactoId] = useState<string>('ascensores');

  const usos = CARGAS_VIVAS.filter((u) => u.ocupacion === grupo);
  const uso = buscarUso(usoId) ?? usos[0];
  const l0Txt = l0Propio ?? String(uso.kNm2);
  const l0 = parseFloat(l0Txt.replace(',', '.'));
  const l0Ok = Number.isFinite(l0) && l0 >= uso.kNm2;

  const pisosSop = Math.max(1, Math.round(pisosSoportados.n || 1));
  const entradasArea = l0Ok && Number.isFinite(panel.n) && panel.n > 0;
  const ai = entradasArea ? areaInfluencia(elemento, panel.n, pisosSop) : NaN;
  const ra = entradasArea ? reduccionAreaAferente(l0, ai, pisosSop) : null;

  const aiMax = Math.max(1000, Number.isFinite(ai) ? Math.ceil(ai * 1.15) : 0);
  const datos = useMemo(() => curvaReduccion(aiMax, 240), [aiMax]);

  const n = Math.max(1, Math.min(60, Math.round(nPisos.n || 0)));
  const entradasPisos = l0Ok && Number.isFinite(aTrib.n) && aTrib.n > 0;
  const rp = entradasPisos ? reduccionPorPisosUniforme(n, l0 * aTrib.n) : null;
  // Comparación: mismo elemento de n pisos con el método de área aferente (Ai = n · A, B.4.5.1.2)
  const raCol = entradasPisos ? reduccionAreaAferente(l0, aTrib.n * n, n) : null;

  const imp = IMPACTO.find((i) => i.id === impactoId) ?? IMPACTO[0];

  return (
    <div className="space-y-5">
      <Grupo titulo="Carga viva mínima por ocupación (Tabla B.4.2.1-1)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector
            etiqueta="Ocupación"
            valor={grupo}
            onCambio={(g) => {
              setGrupo(g);
              const primero = CARGAS_VIVAS.find((u) => u.ocupacion === g)!;
              setUsoId(primero.id);
              setL0Propio(null);
            }}
            opciones={opcionesGrupo}
          />
          <Selector
            etiqueta="Uso"
            valor={uso.id}
            onCambio={(id) => {
              setUsoId(id);
              setL0Propio(null);
            }}
            opciones={usos.map((u) => ({ value: u.id, label: `${u.uso} — ${u.kNm2.toFixed(1)} kN/m²` }))}
          />
          <Campo
            etiqueta="Carga viva de diseño L0"
            unidad="kN/m²"
            valor={l0Txt}
            onCambio={setL0Propio}
            paso={0.1}
            min={uso.kNm2}
            ayuda={`Mínimo de la tabla: ${uso.kNm2.toFixed(1)} kN/m² (${uso.kgfm2} kgf/m²). Puedes usar un valor mayor, nunca menor (B.4.2.1).`}
          />
        </div>
        {!l0Ok && <Aviso tipo="error">L0 no puede ser menor que el mínimo de la Tabla B.4.2.1-1 para este uso.</Aviso>}
      </Grupo>

      <Grupo titulo="Reducción por área aferente (B.4.5.1)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Selector etiqueta="Elemento" valor={elemento} onCambio={(v) => setElemento(v as TipoElemento)} opciones={opcionesElemento} ayuda="Define cuántos paneles de placa tocan el elemento (B.4.5.1.2)." />
          <Campo etiqueta="Área de un panel de placa" unidad="m²" valor={panel.txt} onCambio={panel.setTxt} min={1} paso={1} />
          <Campo etiqueta="Pisos que soporta el elemento" valor={pisosSoportados.txt} onCambio={pisosSoportados.setTxt} min={1} max={60} ayuda="Con 2 o más pisos se suman las áreas y el mínimo baja a 40 %." />
        </div>

        {ra && (
          <>
            {!ra.aplica && (
              <Aviso tipo="atencion">
                No se permite la reducción por área aferente: {ra.motivos.join(' ')} Se usa L = L0.
              </Aviso>
            )}
            {ra.aplica && ra.ecuacionExcedeL0 && (
              <Aviso tipo="nota">
                Con Ai entre 35 y {fmt(areaParaFraccion(1), 1)} m² la ecuación da un valor mayor que L0; no hay reducción real (L = L0).
              </Aviso>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Valor etiqueta="Área de influencia Ai" unidad="m²" valor={fmt(ai, 1)} nota="B.4.5.1.2" />
              <Valor etiqueta="0.25 + 4.6/√Ai" valor={fmt(ra.factorEcuacion, 3)} nota="Ecuación B.4.5-1" />
              <Valor etiqueta="Mínimo permitido" valor={`${fmt(ra.fraccionMinima * 100, 0)} % de L0`} nota="B.4.5.1.1" />
              <Valor destacado etiqueta="L reducida" unidad="kN/m²" valor={fmt(ra.l, 3)} nota={ra.aplica ? (ra.gobiernaMinimo ? 'Gobierna el mínimo' : 'Gobierna la ecuación') : 'Sin reducción'} />
              <Valor etiqueta="L / L0" valor={`${fmt(ra.factor * 100, 1)} %`} estado={ra.aplica && ra.factor < 1 ? 'ok' : 'neutro'} />
            </div>
          </>
        )}

        <div className="rounded-xl border p-3">
          <ChartContainer config={config} className="aspect-[16/8] w-full">
            <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ai" type="number" domain={[0, aiMax]} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'Ai (m²)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
              <YAxis domain={[0.3, 1.05]} ticks={[0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]} tickFormatter={(v) => `${Math.round(Number(v) * 100)} %`} label={{ value: 'L / L0', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, pl) => `Ai = ${Number(pl?.[0]?.payload?.ai ?? 0).toFixed(0)} m²`}
                    formatter={(v, name) => (
                      <span className="font-mono">
                        {config[name as keyof typeof config]?.label}: {(Number(v) * 100).toFixed(1)} %
                      </span>
                    )}
                  />
                }
              />
              <ReferenceLine x={REDUCCION_AREA.areaMinM2} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: '35 m²', position: 'top', fontSize: 11 }} />
              <Line type="linear" dataKey="unPiso" stroke="var(--color-unPiso)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="variosPisos" stroke="var(--color-variosPisos)" strokeWidth={2.5} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
              {ra && Number.isFinite(ai) && <ReferenceDot x={ai} y={ra.aplica ? ra.factor : 1} r={6} fill="var(--chart-2)" stroke="var(--background)" strokeWidth={2} />}
            </LineChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
            <span><span className="mr-1 inline-block h-0.5 w-5 bg-[var(--chart-1)] align-middle" />un piso (mín. 50 %)</span>
            <span><span className="mr-1 inline-block h-0.5 w-5 border-t-2 border-dashed border-[var(--chart-3)] align-middle" />dos o más pisos (mín. 40 %)</span>
            <span>Curva válida solo si {REDUCCION_AREA.l0MinExcl.toFixed(2)} &lt; L0 &lt; {REDUCCION_AREA.l0MaxExcl.toFixed(2)} kN/m².</span>
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Reducción por número de pisos (B.4.5.2) — columnas y cimentación">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Número de pisos n" valor={nPisos.txt} onCambio={nPisos.setTxt} min={1} max={60} ayuda="La reducción solo aplica en edificios de 5 pisos o más." />
          <Campo etiqueta="Área tributaria por piso del elemento" unidad="m²" valor={aTrib.txt} onCambio={aTrib.setTxt} min={1} paso={1} ayuda="Se supone la misma en todos los pisos y la misma L0." />
        </div>
        {rp && (
          <>
            {!rp.aplica && <Aviso tipo="atencion">Con menos de 5 pisos no se permite esta reducción (r = 1.0 en todos los pisos).</Aviso>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Valor etiqueta="Σ Li sin reducir" unidad="kN" valor={fmt(rp.sinReducir, 1)} />
              <Valor destacado etiqueta="Σ r·Li" unidad="kN" valor={fmt(rp.reducida, 1)} nota="B.4.5.2" />
              <Valor etiqueta="Σ r / n" valor={`${fmt(rp.factorGlobal * 100, 1)} %`} estado={rp.aplica && rp.factorGlobal < 1 ? 'ok' : 'neutro'} />
              {raCol && (
                <Valor
                  etiqueta="Alternativa: área aferente"
                  unidad="kN"
                  valor={fmt(raCol.l * aTrib.n * n, 1)}
                  nota={raCol.aplica ? `Ai = ${fmt(aTrib.n * n, 0)} m², L = ${fmt(raCol.l, 2)} kN/m²` : 'No aplica (B.4.5.1)'}
                />
              )}
            </div>
            <div className="max-h-56 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs">
                  <tr>
                    {['Piso i', 'r', 'Li (kN)', 'r·Li (kN)'].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {[...rp.filas].reverse().map((f) => (
                    <tr key={f.piso} className="border-t">
                      <td className="px-2 py-1 text-left">{f.piso}</td>
                      <td className="px-2 py-1 text-right">{fmt(f.r, 2)}</td>
                      <td className="px-2 py-1 text-right">{fmt(f.carga, 1)}</td>
                      <td className="px-2 py-1 text-right font-semibold">{fmt(f.aporte, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              La norma presenta B.4.5.2 como <em>alternativa</em> a B.4.5.1: se escoge un método, no se combinan.
            </p>
          </>
        )}
      </Grupo>

      <Grupo titulo="Incremento por impacto (B.4.4)">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Selector etiqueta="Elemento sometido a impacto" valor={impactoId} onCambio={setImpactoId} opciones={opcionesImpacto} />
          {l0Ok && <Valor etiqueta="Carga viva incrementada" unidad="kN/m²" valor={fmt(cargaConImpacto(l0, imp.porcentaje), 2)} nota={`L0 · (1 + ${imp.porcentaje} %)`} />}
        </div>
      </Grupo>

      <PieCalc>
        B.4.5-1: L = L0(0.25 + 4.6/√Ai); r de B.4.5.2 con i = n en el piso superior. Si Ai está entre 35 y 37.6 m² el factor excede 1 y aquí se limita a 1.
      </PieCalc>
    </div>
  );
}
