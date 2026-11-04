import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { desviacionEstandar, evaluarAceptacion, factorModificacionDesviacion, fcrConDatos, fcrPlanta, fcrSinDatos, fcrSinExperiencia, minimoIndividual, promedio } from '@/lib/nsr10/dosificacion';
import Selector from './Selector';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';

type Modo = 'fcr' | 'ensayos';
type Grafica = 'ss' | 'n';

const configFcr = {
  c51: { label: 'C.5-1', color: 'var(--chart-2)' },
  segunda: { label: 'C.5-2 / C.5-3', color: 'var(--chart-3)' },
  fcr: { label: "f′cr (el mayor)", color: 'var(--chart-1)' },
} satisfies ChartConfig;

const configN = {
  fcr: { label: "f′cr con la s dada", color: 'var(--chart-1)' },
  sinDatos: { label: 'Tabla C.5.3.2.2 (sin datos)', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const configEnsayos = {
  x: { label: 'Ensayo', color: 'var(--chart-1)' },
  prom3: { label: 'Promedio de 3 consecutivos', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** Lee una lista de números separados por espacios, comas, punto y coma o saltos de línea (admite coma decimal si no hay otros separadores). */
function leerLista(texto: string): number[] {
  const comaDecimal = texto.includes(';') || texto.includes('\n');
  const tokens = comaDecimal ? texto.split(/[;\n\s]+/) : texto.split(/[\s,]+/);
  return tokens.map((t) => parseNum(t.trim())).filter((x) => Number.isFinite(x));
}

export default function ResistenciaPromedio() {
  const [modo, setModo] = useState<Modo>('fcr');
  const fc = useNum(28);

  // Modo f′cr
  const [registro, setRegistro] = useState<'con' | 'sin'>('con');
  const s = useNum(3);
  const n = useNum(20);
  const [grafica, setGrafica] = useState<Grafica>('ss');

  // Modo ensayos
  const [texto, setTexto] = useState('29.5 27.0 28.6 30.2 26.8 28.9 29.4 27.5 29.1 28.3 30.0 27.8 29.2 28.1 31.0');

  const fcOk = Number.isFinite(fc.n) && fc.n > 0;
  const nEntero = Math.floor(n.n);
  const datosValidos = fcOk && (registro === 'sin' || (Number.isFinite(s.n) && s.n >= 0 && Number.isFinite(n.n) && n.n >= 0));

  const res = useMemo(() => {
    if (!datosValidos) return null;
    return registro === 'sin' ? fcrPlanta(fc.n) : fcrPlanta(fc.n, s.n, nEntero);
  }, [datosValidos, registro, fc.n, s.n, nEntero]);

  const curvaSs = useMemo(() => {
    if (!fcOk) return [];
    const ssMax = Math.max(6, Math.ceil((res?.ss ?? 0) + 1));
    return Array.from({ length: 31 }, (_, i) => {
      const ss = (ssMax * i) / 30;
      const r = fcrConDatos(fc.n, ss);
      return { ss: Number(ss.toFixed(3)), c51: r.c51, segunda: r.segunda, fcr: r.fcr };
    });
  }, [fcOk, fc.n, res?.ss]);

  const curvaN = useMemo(() => {
    if (!fcOk || !Number.isFinite(s.n) || s.n < 0) return [];
    return Array.from({ length: 31 }, (_, i) => {
      const nn = 10 + i;
      return { n: nn, fcr: fcrPlanta(fc.n, s.n, nn).fcr, sinDatos: fcrSinDatos(fc.n) };
    });
  }, [fcOk, fc.n, s.n]);

  // Modo ensayos
  const ensayos = useMemo(() => leerLista(texto), [texto]);
  const analisis = useMemo(() => {
    if (!fcOk || ensayos.length === 0) return null;
    const ev = evaluarAceptacion(ensayos, fc.n);
    const media = promedio(ensayos);
    const sMuestra = ensayos.length >= 2 ? desviacionEstandar(ensayos) : NaN;
    const planta = Number.isFinite(sMuestra) ? fcrPlanta(fc.n, sMuestra, ensayos.length) : null;
    const serie = ensayos.map((x, i) => ({ i: i + 1, x, prom3: i >= 2 ? (ensayos[i - 2] + ensayos[i - 1] + x) / 3 : null }));
    return { ev, media, sMuestra, planta, serie };
  }, [fcOk, ensayos, fc.n]);

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border p-0.5 text-sm" role="group" aria-label="Modo de cálculo">
        {(
          [
            ['fcr', 'f′cr de dosificación (C.5.3)'],
            ['ensayos', 'Evaluar resultados de ensayos (C.5.6.3)'],
          ] as const
        ).map(([v, t]) => (
          <button key={v} type="button" aria-pressed={modo === v} onClick={() => setModo(v)} className={`rounded-md px-3 py-1.5 transition-colors ${modo === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t}
          </button>
        ))}
      </div>

      <Grupo titulo="Resistencia especificada">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="f′c especificada" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} ayuda="No puede ser menor de 17 MPa (C.5.1.1)" />
        </div>
      </Grupo>

      {!fcOk && <Aviso tipo="error">Ingresa un f′c positivo.</Aviso>}

      {modo === 'fcr' ? (
        <>
          <Grupo titulo="Registro de ensayos de la planta">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Selector
                etiqueta="Datos disponibles"
                valor={registro}
                onCambio={(v) => setRegistro(v as 'con' | 'sin')}
                opciones={[
                  { value: 'con', label: 'Con registro de ensayos (s y n)' },
                  { value: 'sin', label: 'Sin registro (Tabla C.5.3.2.2)' },
                ]}
              />
              {registro === 'con' && (
                <>
                  <Campo etiqueta="Desviación estándar s de la muestra" unidad="MPa" valor={s.txt} onCambio={s.setTxt} min={0} paso={0.1} />
                  <Campo etiqueta="Número de ensayos consecutivos n" valor={n.txt} onCambio={n.setTxt} min={1} />
                </>
              )}
            </div>
            {registro === 'con' && Number.isFinite(n.n) && n.n < 15 && <Aviso tipo="atencion">Con menos de 15 ensayos no hay factor de modificación: se usa la Tabla C.5.3.2.2 (f′cr sin datos).</Aviso>}
            {registro === 'con' && Number.isFinite(n.n) && n.n !== Math.floor(n.n) && <Aviso tipo="nota">n se redondea hacia abajo ({nEntero}).</Aviso>}
          </Grupo>

          {res && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Valor destacado etiqueta="f′cr requerida" unidad="MPa" valor={fmt(res.fcr, 2)} nota={res.origen === 'tabla-sin-datos' ? 'Tabla C.5.3.2.2' : `Gobierna ${res.detalle?.gobierna}`} />
                {res.origen !== 'tabla-sin-datos' && res.detalle && (
                  <>
                    <Valor etiqueta="Factor de modificación" valor={fmt(res.factor ?? NaN, 3)} nota={res.origen === 'desviacion-completa' ? '30 ensayos o más: sin modificar' : 'Tabla C.5.3.1.2 (interpolado)'} />
                    <Valor etiqueta="s_s usada" unidad="MPa" valor={fmt(res.ss ?? NaN, 3)} nota={`s × factor = ${fmt(res.s ?? NaN, 2)} × ${fmt(res.factor ?? NaN, 3)}`} />
                    <Valor etiqueta="Sobrediseño f′cr − f′c" unidad="MPa" valor={fmt(res.fcr - fc.n, 2)} />
                  </>
                )}
              </div>
              {res.detalle && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Valor etiqueta="(C.5-1) f′c + 1.34 s_s" unidad="MPa" valor={fmt(res.detalle.c51, 2)} estado={res.detalle.gobierna === 'C.5-1' ? 'ok' : 'neutro'} />
                  <Valor etiqueta={res.detalle.ecuacionSegunda === 'C.5-2' ? '(C.5-2) f′c + 2.33 s_s − 3.5' : '(C.5-3) 0.90 f′c + 2.33 s_s'} unidad="MPa" valor={fmt(res.detalle.segunda, 2)} estado={res.detalle.gobierna !== 'C.5-1' ? 'ok' : 'neutro'} />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Referencias: sin registros (Tabla C.5.3.2.2) f′cr = <b className="font-mono">{fmt(fcrSinDatos(fc.n), 2)}</b> MPa
                {fcrSinExperiencia(fc.n) !== null ? (
                  <>
                    ; sin experiencia ni mezclas de prueba (C.5.4.1) f′cr ≥ <b className="font-mono">{fmt(fcrSinExperiencia(fc.n) as number, 2)}</b> MPa.
                  </>
                ) : (
                  <>; C.5.4.1 no se permite con f′c &gt; 35 MPa.</>
                )}
              </p>

              <div className="space-y-2">
                <div className="inline-flex rounded-lg border p-0.5 text-xs" role="group" aria-label="Gráfica">
                  {(
                    [
                      ['ss', 'f′cr vs desviación estándar'],
                      ['n', 'f′cr vs número de ensayos'],
                    ] as const
                  ).map(([v, t]) => (
                    <button key={v} type="button" aria-pressed={grafica === v} onClick={() => setGrafica(v)} className={`rounded-md px-2.5 py-1 transition-colors ${grafica === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {grafica === 'ss' ? (
                  <ChartContainer config={configFcr} className="h-72 w-full">
                    <LineChart data={curvaSs} margin={{ left: 4, right: 16, top: 12, bottom: 20 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="ss" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => Number(v).toFixed(1)} label={{ value: 's_s (MPa)', position: 'insideBottom', offset: -10, fontSize: 12 }} />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} width={34} label={{ value: 'MPa', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_l, p) => `s_s = ${Number(p?.[0]?.payload?.ss).toFixed(2)} MPa`} formatter={(v, name) => <span className="font-mono">{String(name)}: {Number(v).toFixed(2)} MPa</span>} />} />
                      <Legend />
                      <Line dataKey="c51" name="C.5-1" stroke="var(--color-c51)" dot={false} strokeWidth={1.5} />
                      <Line dataKey="segunda" name={fc.n > 35 ? 'C.5-3' : 'C.5-2'} stroke="var(--color-segunda)" dot={false} strokeWidth={1.5} />
                      <Line dataKey="fcr" name="f′cr (mayor)" stroke="var(--color-fcr)" dot={false} strokeWidth={3} strokeOpacity={0.85} />
                      <ReferenceLine y={fc.n} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "f′c", position: 'insideTopLeft', fontSize: 11 }} />
                      {res.ss !== undefined && <ReferenceLine x={res.ss} stroke="var(--chart-5)" strokeDasharray="4 4" label={{ value: 's_s actual', position: 'top', fontSize: 11 }} />}
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <ChartContainer config={configN} className="h-72 w-full">
                    <LineChart data={curvaN} margin={{ left: 4, right: 16, top: 12, bottom: 20 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="n" type="number" domain={[10, 40]} label={{ value: 'Número de ensayos n', position: 'insideBottom', offset: -10, fontSize: 12 }} />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} width={34} label={{ value: 'MPa', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_l, p) => `n = ${p?.[0]?.payload?.n}`} formatter={(v, name) => <span className="font-mono">{String(name)}: {Number(v).toFixed(2)} MPa</span>} />} />
                      <Legend />
                      <Line dataKey="fcr" name="f′cr (s dada)" stroke="var(--color-fcr)" dot={false} strokeWidth={2.5} type="stepAfter" />
                      <Line dataKey="sinDatos" name="Sin datos (C.5.3.2.2)" stroke="var(--color-sinDatos)" dot={false} strokeDasharray="5 4" />
                      <ReferenceLine x={15} stroke="var(--muted-foreground)" strokeDasharray="3 3" label={{ value: 'n = 15', position: 'top', fontSize: 11 }} />
                    </LineChart>
                  </ChartContainer>
                )}
                <p className="text-xs text-muted-foreground">
                  {grafica === 'ss'
                    ? 'La curva gruesa es el mayor de las dos ecuaciones; el codo ocurre donde se cruzan (s_s ≈ 3.5 MPa con f′c ≤ 35 MPa).'
                    : `Con la s dada, cada ensayo adicional entre 15 y 30 reduce el factor de modificación (de ${fmt(factorModificacionDesviacion(15) as number, 2)} a 1.00) y con él f′cr. Con n < 15 se usa la tabla sin datos.`}
                </p>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <Grupo titulo="Resultados de ensayos de resistencia (MPa, en orden cronológico)">
            <textarea
              className="h-24 w-full rounded-md border bg-background p-2 font-mono text-sm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label="Resultados de ensayos de resistencia"
            />
            <p className="text-xs text-muted-foreground">Separa con espacios, comas, punto y coma o saltos de línea. Cada valor es un <em>ensayo</em>: promedio de al menos 2 cilindros de 150×300 mm o 3 de 100×200 mm (C.5.6.2.4).</p>
          </Grupo>
          {fcOk && ensayos.length === 0 && <Aviso tipo="error">No se leyó ningún resultado.</Aviso>}
          {analisis && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Valor destacado etiqueta="Nivel de resistencia (C.5.6.3.3)" valor={analisis.ev.datosInsuficientes ? 'Faltan datos' : analisis.ev.satisfactorio ? 'Satisfactorio' : 'No satisfactorio'} estado={analisis.ev.datosInsuficientes ? 'neutro' : analisis.ev.satisfactorio ? 'ok' : 'mal'} nota={analisis.ev.datosInsuficientes ? 'Se requieren al menos 3 ensayos' : undefined} />
                <Valor
                  etiqueta="(a) Promedios de 3 consecutivos ≥ f′c"
                  valor={analisis.ev.datosInsuficientes ? '—' : analisis.ev.cumpleA ? 'Cumple' : 'No cumple'}
                  estado={analisis.ev.datosInsuficientes ? 'neutro' : analisis.ev.cumpleA ? 'ok' : 'mal'}
                  nota={analisis.ev.gruposFallidos.length ? `Grupos que fallan (inicio en el ensayo): ${analisis.ev.gruposFallidos.map((i) => i + 1).join(', ')}` : analisis.ev.promediosMoviles.length ? `Menor promedio: ${fmt(Math.min(...analisis.ev.promediosMoviles), 2)} MPa` : undefined}
                />
                <Valor
                  etiqueta={`(b) Ningún ensayo < ${fmt(analisis.ev.minimoIndividual, 2)} MPa`}
                  valor={analisis.ev.cumpleB ? 'Cumple' : 'No cumple'}
                  estado={analisis.ev.cumpleB ? 'ok' : 'mal'}
                  nota={analisis.ev.individualesFallidos.length ? `Ensayos bajos: #${analisis.ev.individualesFallidos.map((i) => i + 1).join(', #')}: investigar según C.5.6.5` : `Menor ensayo: ${fmt(Math.min(...ensayos), 2)} MPa`}
                />
                <Valor etiqueta="Promedio y n" valor={fmt(analisis.media, 2)} unidad="MPa" nota={`n = ${ensayos.length}`} />
              </div>
              {analisis.planta && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Valor etiqueta="Desviación estándar de estos ensayos" unidad="MPa" valor={fmt(analisis.sMuestra, 3)} />
                  <Valor etiqueta="f′cr que daría este registro" unidad="MPa" valor={fmt(analisis.planta.fcr, 2)} nota={analisis.planta.origen === 'tabla-sin-datos' ? 'n < 15: Tabla C.5.3.2.2' : `${analisis.planta.detalle?.gobierna}, s_s = ${fmt(analisis.planta.ss ?? NaN, 2)}`} />
                  <Valor etiqueta="¿Promedio ≥ f′cr?" valor={analisis.media >= analisis.planta.fcr ? 'Sí' : 'No'} estado={analisis.media >= analisis.planta.fcr ? 'ok' : 'neutro'} nota="Referencia para C.5.5 (reducción de f′cr); requiere además n ≥ 15 y registro válido" />
                </div>
              )}
              <ChartContainer config={configEnsayos} className="h-72 w-full">
                <LineChart data={analisis.serie} margin={{ left: 4, right: 16, top: 12, bottom: 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="i" type="number" domain={[1, Math.max(2, ensayos.length)]} allowDecimals={false} label={{ value: 'Ensayo n.º', position: 'insideBottom', offset: -10, fontSize: 12 }} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} width={34} label={{ value: 'MPa', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v, name) => <span className="font-mono">{String(name)}: {Number(v).toFixed(2)} MPa</span>} />} />
                  <Legend />
                  <Line dataKey="x" name="Ensayo" stroke="var(--color-x)" strokeWidth={1.5} dot={{ r: 3 }} />
                  <Line dataKey="prom3" name="Promedio de 3" stroke="var(--color-prom3)" strokeWidth={2} dot={false} connectNulls />
                  <ReferenceLine y={fc.n} stroke="var(--chart-5)" strokeDasharray="5 4" label={{ value: "f′c", position: 'insideTopLeft', fontSize: 11 }} />
                  <ReferenceLine y={minimoIndividual(fc.n)} stroke="var(--destructive, #dc2626)" strokeDasharray="2 3" label={{ value: 'mínimo individual', position: 'insideBottomLeft', fontSize: 11 }} />
                </LineChart>
              </ChartContainer>
            </>
          )}
        </>
      )}

      <PieCalc>
        Ecuaciones C.5-1 a C.5-3 y Tablas C.5.3.1.2 y C.5.3.2.2 (C-40 y C-41); criterios de C.5.6.3.3 (C-42). No se verifican los requisitos de representatividad del registro (similitud de materiales, f′c dentro de 7 MPa, 45 días, menos de 12 meses). La desviación estándar de la muestra usa n − 1 (definición estadística usual).
      </PieCalc>
    </div>
  );
}
