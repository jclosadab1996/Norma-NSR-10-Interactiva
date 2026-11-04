import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { AIRE_INCORPORADO, LIMITES_F3, REQUISITOS_EXPOSICION, buscarClase, type ClaseExposicion } from '@/data/durabilidad';
import { claseSulfato, contenidoAire, fcDeDiseno, requisitosExposicion } from '@/lib/nsr10/durabilidad';
import Selector from './Selector';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';

const OPC_F = (['F0', 'F1', 'F2', 'F3'] as const).map((c) => ({ value: c, label: `${c} — ${buscarClase(c).severidad}` }));
const OPC_S = (['S0', 'S1', 'S2', 'S3'] as const).map((c) => ({ value: c, label: `${c} — ${buscarClase(c).severidad}` }));
const OPC_P = (['P0', 'P1'] as const).map((c) => ({ value: c, label: `${c} — ${buscarClase(c).severidad}` }));
const OPC_C = (['C0', 'C1', 'C2'] as const).map((c) => ({ value: c, label: `${c} — ${buscarClase(c).severidad}` }));
const OPC_TMN = AIRE_INCORPORADO.map((f) => ({ value: String(f.tamanoMm), label: `${f.tamanoMm} mm` }));

const config = { fc: { label: "f′c mínimo (MPa)", color: 'var(--chart-1)' } } satisfies ChartConfig;

export default function RecubrimientoDurabilidad() {
  const [f, setF] = useState<ClaseExposicion>('F0');
  const [modoS, setModoS] = useState<'clase' | 'ensayo'>('clase');
  const [s, setS] = useState<ClaseExposicion>('S0');
  const [p, setP] = useState<ClaseExposicion>('P0');
  const [c, setC] = useState<ClaseExposicion>('C1');
  const suelo = useNum(0.35);
  const agua = useNum(0);
  const fcEst = useNum(28);
  const [liviano, setLiviano] = useState(false);
  const [preesforzado, setPreesforzado] = useState(false);
  const [tmn, setTmn] = useState('19');
  const [reducirAire, setReducirAire] = useState(false);

  const claseS = useMemo<ClaseExposicion>(() => {
    if (modoS === 'clase') return s;
    return claseSulfato(Number.isFinite(suelo.n) ? suelo.n : undefined, Number.isFinite(agua.n) && agua.n > 0 ? agua.n : undefined);
  }, [modoS, s, suelo.n, agua.n]);

  const clases = [f, claseS, p, c] as ClaseExposicion[];
  const req = useMemo(() => requisitosExposicion(clases), [f, claseS, p, c]); // eslint-disable-line react-hooks/exhaustive-deps
  const fcOk = Number.isFinite(fcEst.n) && fcEst.n > 0;
  const diseno = fcOk ? fcDeDiseno(fcEst.n, req.fcMin) : null;
  const aire = req.aireRequerido ? contenidoAire(Number(tmn), req.claseAire === 'F1' ? 'F1' : 'F2', diseno?.fc, reducirAire) : null;
  const clorMax = preesforzado ? req.cloruroMaxPreesforzado : req.cloruroMaxReforzado;

  const datos = REQUISITOS_EXPOSICION.map((r) => ({ clase: r.clase, fc: r.fcMin, aMc: r.aMcMax, activa: clases.includes(r.clase) }));

  return (
    <div className="space-y-5">
      <Grupo titulo="1. Clases de exposición (Tabla C.4.2.1)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Selector etiqueta="F — Congelamiento y deshielo" valor={f} onCambio={(v) => setF(v as ClaseExposicion)} opciones={OPC_F} ayuda={buscarClase(f).condicion} />
          {modoS === 'clase' ? (
            <Selector etiqueta="S — Sulfatos" valor={s} onCambio={(v) => setS(v as ClaseExposicion)} opciones={OPC_S} ayuda={buscarClase(s).condicion} />
          ) : (
            <div className="space-y-3">
              <Campo etiqueta="SO₄ en el suelo" unidad="% peso" valor={suelo.txt} onCambio={suelo.setTxt} min={0} paso={0.05} />
              <Campo etiqueta="SO₄ en el agua" unidad="ppm" valor={agua.txt} onCambio={agua.setTxt} min={0} ayuda="0 si no se midió" />
            </div>
          )}
          <Selector etiqueta="P — Baja permeabilidad" valor={p} onCambio={(v) => setP(v as ClaseExposicion)} opciones={OPC_P} ayuda={buscarClase(p).condicion} />
          <Selector etiqueta="C — Protección del refuerzo" valor={c} onCambio={(v) => setC(v as ClaseExposicion)} opciones={OPC_C} ayuda={buscarClase(c).condicion} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={modoS === 'ensayo'} onChange={(e) => setModoS(e.target.checked ? 'ensayo' : 'clase')} />
          Obtener la clase de sulfato a partir del contenido de SO₄ medido (suelo y/o agua)
        </label>
        {modoS === 'ensayo' && <p className="text-sm text-muted-foreground">Clase de sulfato resultante: <b className="font-mono">{claseS}</b> (gobierna la más severa entre suelo y agua).</p>}
      </Grupo>

      <Grupo titulo="2. Datos del elemento">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="f′c por resistencia estructural" unidad="MPa" valor={fcEst.txt} onCambio={fcEst.setTxt} min={17} ayuda="El de los cálculos (C.4.1.1 (c))" />
          <Selector etiqueta="Tamaño máx. nominal del agregado" valor={tmn} onCambio={setTmn} opciones={OPC_TMN} ayuda="Solo para el aire (F1 a F3)" />
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={preesforzado} onChange={(e) => setPreesforzado(e.target.checked)} />
              Concreto preesforzado
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={liviano} onChange={(e) => setLiviano(e.target.checked)} />
              Concreto de peso liviano
            </label>
          </div>
        </div>
      </Grupo>

      {!fcOk && <Aviso tipo="error">Ingresa un f′c estructural positivo.</Aviso>}
      {liviano && <Aviso tipo="atencion">Concreto liviano: los límites de a/mc de C.4 no se aplican (C.4.1.2); sí rigen el f′c mínimo y los demás requisitos.</Aviso>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Valor
          destacado
          etiqueta="f′c de diseño"
          unidad="MPa"
          valor={diseno ? fmt(diseno.fc, 0) : '—'}
          nota={diseno ? (diseno.gobierna === 'durabilidad' ? `Gobierna la durabilidad (${req.claseFc})` : diseno.gobierna === 'estructural' ? 'Gobierna la resistencia estructural' : 'Gobierna el mínimo de 17 MPa') : undefined}
        />
        <Valor etiqueta="f′c mínimo por durabilidad" unidad="MPa" valor={fmt(req.fcMin, 0)} nota={`Clase ${req.claseFc}`} />
        <Valor
          etiqueta="Relación a/mc máxima"
          valor={liviano ? 'No aplica' : req.aMcMax === null ? 'N/A' : fmt(req.aMcMax, 2)}
          nota={liviano ? 'C.4.1.2' : req.claseAMc ? `Gobierna ${req.claseAMc}` : 'Ninguna clase la limita'}
        />
        <Valor etiqueta={`Cloruros solubles máx. (${preesforzado ? 'preesforzado' : 'reforzado'})`} unidad="% del cemento" valor={clorMax === null ? '—' : fmt(clorMax, 2)} nota={req.claseCloruro ? `Clase ${req.claseCloruro}; ver nota ‼ de la Tabla C.4.3.1` : undefined} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border p-3 text-sm">
          <p className="mb-1 font-semibold">Materiales cementantes (sulfatos)</p>
          {req.cementos ? (
            <ul className="space-y-0.5 text-sm">
              <li>ASTM C150: <b>{req.cementos.c150}</b></li>
              <li>ASTM C595: <b>{req.cementos.c595}</b></li>
              <li>ASTM C1157: <b>{req.cementos.c1157}</b></li>
              <li>Cloruro de calcio: <b>{req.cementos.cloruroCalcio}</b></li>
            </ul>
          ) : (
            <p className="text-muted-foreground">{req.claseSulfato === 'S0' ? 'S0: sin restricción en el tipo de cemento ni en el cloruro de calcio.' : 'Sin clase S asignada.'}</p>
          )}
          {req.claseSulfato && req.claseSulfato !== 'S0' && <p className="mt-1 text-xs text-muted-foreground">† ‡ § son notas de la Tabla C.4.3.1: otros cementos con C₃A limitado, o puzolana/escoria ensayada (C.4.5.1).</p>}
          {preesforzado && <p className="mt-1 text-xs text-muted-foreground">Preesforzado: tampoco se permite cloruro de calcio ni aditivos con cloruros (C.3.6.4).</p>}
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <p className="mb-1 font-semibold">Congelamiento y deshielo</p>
          {aire ? (
            <>
              <p>
                Aire incorporado (Tabla C.4.4.1, {tmn} mm): <b className="font-mono">{fmt(aire.tabla, 1)} %</b>
                {aire.reducido && <> → <b className="font-mono">{fmt(aire.objetivo, 1)} %</b> (reducido 1 punto)</>} · tolerancia ±1.5 % → <b className="font-mono">{fmt(aire.minimo, 1)}–{fmt(aire.maximo, 1)} %</b>
              </p>
              {diseno && diseno.fc > 35 && (
                <label className="mt-1 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={reducirAire} onChange={(e) => setReducirAire(e.target.checked)} />
                  f′c &gt; 35 MPa: aplicar la reducción permitida de 1 % (C.4.4.1)
                </label>
              )}
              {req.limitesF3 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  <li className="font-medium">F3: máximos sobre el total de cementantes (Tabla C.4.4.2)</li>
                  {LIMITES_F3.map((l) => (
                    <li key={l.id}>
                      {l.material}: <b>{l.maxPct} %</b>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No se exige aire incorporado (F0).</p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">f′c mínimo por clase de exposición (Tabla C.4.3.1); en color, las clases asignadas</p>
        <ChartContainer config={config} className="h-56 w-full">
          <BarChart data={datos} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="clase" tickLine={false} />
            <YAxis domain={[0, 40]} tickLine={false} width={32} label={{ value: 'MPa', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(v, _n, item) => (
                    <span className="font-mono">
                      {String(item?.payload?.clase)}: f′c ≥ {Number(v)} MPa · a/mc {item?.payload?.aMc === null ? 'N/A' : Number(item?.payload?.aMc).toFixed(2)}
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="fc" radius={3}>
              {datos.map((d) => (
                <Cell key={d.clase} fill={d.activa ? 'var(--chart-1)' : 'var(--chart-3)'} fillOpacity={d.activa ? 1 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <PieCalc>
        Requisitos de las Tablas C.4.3.1, C.4.4.1 y C.4.4.2 (C-36 y C-37). Cuando hay varias clases se toma el requisito más restrictivo (interpretación habitual de C.4.3.1). Los recubrimientos mínimos del refuerzo están en C.7.7 y no se calculan aquí.
      </PieCalc>
    </div>
  );
}
