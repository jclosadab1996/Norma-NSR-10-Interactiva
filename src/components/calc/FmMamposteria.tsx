import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ETIQUETA_UNIDAD, KP, KR, RELACION_MURETE, TABLA_D371, type OrigenEstadistico, type TipoUnidad } from '@/data/materialesMamposteria';
import {
  esValorTabulado,
  esfuerzoMurete,
  fmDesdeRm,
  fmEstadistico,
  fmInyectado,
  fmMuestraMuretes,
  factorEsbeltezMurete,
  limitesMorteroRelleno,
  resistenciaRm,
  verificarAceptacion,
} from '@/lib/nsr10/resistenciaMamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';

const config = {
  factor: { label: 'Factor de corrección (Tabla D.3.7-1)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const OPCIONES_UNIDAD = (Object.keys(ETIQUETA_UNIDAD) as TipoUnidad[]).map((k) => ({ value: k, label: ETIQUETA_UNIDAD[k] }));
const OPCIONES_ORIGEN = [
  { value: 'previo', label: 'Muretes preliminares a la obra (D.3.7.4)' },
  { value: 'historico', label: 'Registros históricos de obras anteriores (D.3.7.3)' },
];
const OPCIONES_RELLENO = [
  { value: 'no', label: 'Sin inyectar — Ec. D.3.7-2' },
  { value: 'si', label: 'Celdas inyectadas con mortero de relleno — Ec. D.3.7-3' },
];

/** Convierte un texto con números separados por comas, espacios o saltos de línea en una lista (ignora lo no numérico). */
function listaNumeros(texto: string): number[] {
  return texto
    .split(/[\s;]+/)
    .map((t) => t.replace(/^,+|,+$/g, ''))
    // «5.2,5.8» (coma entre valores con punto decimal) se separa; «5,2» se lee como decimal con coma
    .flatMap((t) => (t.includes('.') && t.includes(',') ? t.split(',') : [t]))
    .filter((t) => t !== '')
    .map((t) => parseNum(t))
    .filter((x) => Number.isFinite(x));
}

function MuretesTab() {
  const area = useNum(40000);
  const p1 = useNum(200);
  const p2 = useNum(220);
  const p3 = useNum(240);
  const alto = useNum(600);
  const ancho = useNum(190);

  const cargas = [p1.n, p2.n, p3.n];
  const ok = [area.n, alto.n, ancho.n, ...cargas].every((x) => Number.isFinite(x) && x > 0);
  const relacion = alto.n / ancho.n;
  const res = useMemo(() => {
    if (!ok) return null;
    const esf = cargas.map((p) => esfuerzoMurete(p, area.n));
    return { esf, r: fmMuestraMuretes(esf, relacion) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, p1.n, p2.n, p3.n, area.n, relacion]);

  const datos = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const x = RELACION_MURETE.min + (i * (RELACION_MURETE.max - RELACION_MURETE.min)) / 35;
        return { x, factor: factorEsbeltezMurete(x) };
      }),
    [],
  );
  const r = res?.r;
  const factorOk = r && r.relacionValida;

  return (
    <div className="space-y-4">
      <Grupo titulo="Tres muretes de la misma muestra (D.3.7.2.2)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Carga última murete 1" unidad="kN" valor={p1.txt} onCambio={p1.setTxt} min={0.1} />
          <Campo etiqueta="Carga última murete 2" unidad="kN" valor={p2.txt} onCambio={p2.setTxt} min={0.1} />
          <Campo etiqueta="Carga última murete 3" unidad="kN" valor={p3.txt} onCambio={p3.setTxt} min={0.1} />
          <Campo etiqueta="Área neta de la mampostería" unidad="mm²" valor={area.txt} onCambio={area.setTxt} min={1} ayuda="Carga última / área neta (D.3.7.2.3)" />
          <Campo etiqueta="Altura del murete h" unidad="mm" valor={alto.txt} onCambio={alto.setTxt} min={300} ayuda="Mínimo 300 mm (D.3.7.2.4)" />
          <Campo etiqueta="Espesor (ancho) del murete t" unidad="mm" valor={ancho.txt} onCambio={ancho.setTxt} min={1} />
        </div>
        <p className="text-xs text-muted-foreground">
          Relación h/t = {fmt(relacion, 2)} (válida entre {RELACION_MURETE.min} y {RELACION_MURETE.max}).
        </p>
      </Grupo>

      {!ok && <Aviso tipo="error">Todos los datos deben ser números positivos.</Aviso>}

      {r && res && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Esfuerzos de los muretes" valor={res.esf.map((x) => fmt(x, 2)).join(' · ')} unidad="MPa" />
            <Valor etiqueta="Promedio" valor={fmt(r.promedio, 3)} unidad="MPa" nota={`Tope 1.25 × menor = ${fmt(r.tope, 3)} MPa`} />
            <Valor
              etiqueta="Promedio limitado"
              valor={fmt(r.promedioLimitado, 3)}
              unidad="MPa"
              estado={r.limitado ? 'mal' : 'neutro'}
              nota={r.limitado ? 'El promedio excedía el 125 % del menor: se limitó (D.3.7.2.2)' : 'No excede el 125 % del menor'}
            />
            <Valor
              etiqueta="Factor de esbeltez"
              valor={factorOk ? fmt(r.factor, 3) : '—'}
              nota={!factorOk ? 'h/t fuera de 1.5–5: el murete no cumple D.3.7.2.4' : esValorTabulado(relacion) ? 'Valor tabulado' : 'Interpolado (no lo indica la norma)'}
            />
          </div>
          <Valor destacado etiqueta="f′m de la muestra = promedio limitado × factor" valor={factorOk ? fmt(r.fm, 2) : '—'} unidad="MPa" />
          {!r.completa && <Aviso tipo="atencion">La norma exige el ensayo de 3 muretes de igual procedencia por muestra (D.3.7.2.2).</Aviso>}
        </>
      )}

      <div className="rounded-xl border p-3">
        <p className="mb-1 px-1 text-sm font-medium">Factor de corrección por esbeltez (Tabla D.3.7-1, interpolado linealmente entre puntos)</p>
        <ChartContainer config={config} className="aspect-[16/8] w-full">
          <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="x" type="number" domain={[1.5, 5]} ticks={[1.5, 2, 2.5, 3, 4, 5]} label={{ value: 'relación altura/espesor del murete', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
            <YAxis domain={[0.8, 1.3]} tickFormatter={(v) => Number(v).toFixed(2)} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `h/t = ${Number(pl?.[0]?.payload?.x ?? 0).toFixed(2)}`} />} />
            <Line name="Factor de corrección" dataKey="factor" stroke="var(--color-factor)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            {TABLA_D371.map((p) => (
              <ReferenceDot key={p.relacion} x={p.relacion} y={p.factor} r={3.5} fill="var(--color-factor)" stroke="none" />
            ))}
            {factorOk && <ReferenceDot x={relacion} y={r.factor} r={6} fill="var(--chart-2)" stroke="var(--foreground)" />}
          </LineChart>
        </ChartContainer>
        <p className="mt-1 px-1 text-xs text-muted-foreground">Puntos pequeños: valores de la tabla. Punto grande: tu murete. Un murete más esbelto resiste menos por pandeo, y por eso su valor se «sube» para referirlo al ensayo estándar (h/t = 2).</p>
      </div>
    </div>
  );
}

function EstadisticaTab() {
  const [origen, setOrigen] = useState<OrigenEstadistico>('previo');
  const [texto, setTexto] = useState('5.2, 5.8, 6.1, 5.5, 6.4, 5.9, 5.0, 6.2, 5.7, 5.6, 6.0, 5.4');
  const valores = useMemo(() => listaNumeros(texto), [texto]);
  const res = useMemo(() => (valores.length >= 1 && valores.every((v) => v > 0) ? fmEstadistico(valores, origen) : null), [valores, origen]);

  return (
    <div className="space-y-4">
      <Grupo titulo="Resultados de ensayos de muretes (MPa)">
        <Selector etiqueta="Procedencia de los ensayos" valor={origen} onCambio={(v) => setOrigen(v === 'historico' ? 'historico' : 'previo')} opciones={OPCIONES_ORIGEN} />
        <div className="space-y-1.5">
          <Label htmlFor="fm-lista" className="text-sm font-medium">
            Resultados (separados por coma, espacio o salto de línea)
          </Label>
          <Textarea id="fm-lista" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className="font-mono" />
          <p className="text-xs text-muted-foreground">
            {valores.length} resultado(s) leído(s). En registros históricos cada resultado es una prueba (promedio de 3 o más muretes); en ensayos previos, un murete.
          </p>
        </div>
      </Grupo>

      {!res && <Aviso tipo="error">Escribe al menos un resultado positivo.</Aviso>}
      {res && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Número de ensayos n" valor={String(res.n)} nota={res.numeral} />
            <Valor etiqueta="Promedio" valor={fmt(res.promedio, 3)} unidad="MPa" />
            <Valor etiqueta="Desviación estándar" valor={fmt(res.desviacion, 3)} unidad="MPa" nota="Muestral (n − 1): la norma no la define" />
            <Valor
              etiqueta="Coeficiente de variación"
              valor={`${fmt(res.cv * 100, 1)} %`}
              estado={origen === 'historico' && res.n >= 10 ? (res.cv <= 0.3 ? 'ok' : 'mal') : 'neutro'}
              nota={origen === 'historico' ? 'Debe ser ≤ 30 % (D.3.7.3)' : 'Informativo: D.3.7.4 no fija límite'}
            />
          </div>
          <Valor
            destacado
            etiqueta={res.fraccion !== null ? `f′m = ${fmt(res.fraccion * 100, 0)} % del promedio` : 'f′m'}
            valor={res.fm !== null ? fmt(res.fm, 2) : 'No aplicable'}
            unidad={res.fm !== null ? 'MPa' : undefined}
            estado={res.aplicable ? 'neutro' : 'mal'}
          />
          {res.motivos.map((m) => (
            <Aviso key={m} tipo="atencion">
              {m}
            </Aviso>
          ))}
        </>
      )}
    </div>
  );
}

function MaterialesTab() {
  const [tipo, setTipo] = useState<TipoUnidad>('concreto');
  const [inyectado, setInyectado] = useState<'si' | 'no'>('no');
  const h = useNum(190);
  const fcu = useNum(10);
  const fcp = useNum(12.5);
  const r = useNum(0.55);
  const fcr = useNum(12.5);

  const ok = [h.n, fcu.n, fcp.n].every((x) => Number.isFinite(x) && x > 0);
  const okInyec = inyectado === 'no' || (Number.isFinite(r.n) && r.n > 0 && r.n <= 1 && Number.isFinite(fcr.n) && fcr.n > 0);
  const kp = KP[tipo];
  const kr = KR[tipo];

  const rm = ok ? resistenciaRm({ h: h.n, fcu: fcu.n, fcp: fcp.n, kp }) : null;
  const sin = rm ? fmDesdeRm(rm.Rm) : NaN;
  const iny = ok && okInyec && inyectado === 'si' ? fmInyectado({ h: h.n, fcu: fcu.n, fcp: fcp.n, kp, r: r.n, kr, fcr: fcr.n }) : null;
  const fm = iny ? iny.fm : sin;
  const lim = Number.isFinite(fm) ? limitesMorteroRelleno(fm) : null;

  return (
    <div className="space-y-4">
      <Grupo titulo="Materiales especificados">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Tipo de unidad" valor={tipo} onCambio={(v) => setTipo(v as TipoUnidad)} opciones={OPCIONES_UNIDAD} ayuda={`kp = ${kp} · kr = ${kr}`} />
          <Campo etiqueta="Altura de la unidad h" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={20} ayuda="En mm para la Ec. D.3.7-1" />
          <Campo etiqueta="f′cu de la unidad (área neta)" unidad="MPa" valor={fcu.txt} onCambio={fcu.setTxt} min={1} />
          <Campo etiqueta="f′cp del mortero de pega" unidad="MPa" valor={fcp.txt} onCambio={fcp.setTxt} min={1} ayuda="H 22.5 · M 17.5 · S 12.5 · N 7.5" />
          <Selector etiqueta="Celdas" valor={inyectado} onCambio={(v) => setInyectado(v === 'si' ? 'si' : 'no')} opciones={OPCIONES_RELLENO} className="sm:col-span-2" />
          {inyectado === 'si' && (
            <>
              <Campo etiqueta="r = área neta / área bruta" valor={r.txt} onCambio={r.setTxt} min={0.05} max={1} ayuda="Adimensional" />
              <Campo etiqueta="f′cr del mortero de relleno" unidad="MPa" valor={fcr.txt} onCambio={fcr.setTxt} min={1} />
            </>
          )}
        </div>
      </Grupo>

      {!ok && <Aviso tipo="error">h, f′cu y f′cp deben ser positivos.</Aviso>}
      {ok && !okInyec && <Aviso tipo="error">Con celdas inyectadas, r debe estar entre 0 y 1 y f′cr debe ser positivo.</Aviso>}

      {rm && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="2h/(75+3h) · f′cu" valor={fmt(rm.terminoUnidad, 3)} unidad="MPa" />
            <Valor etiqueta="50kp/(75+3h) · f′cp" valor={fmt(rm.terminoMortero, 3)} unidad="MPa" />
            <Valor etiqueta="Rm (Ec. D.3.7-1)" valor={fmt(rm.Rm, 3)} unidad="MPa" estado={rm.gobiernaLimite ? 'mal' : 'neutro'} nota={rm.gobiernaLimite ? `Gobierna el límite 0.8 f′cu = ${fmt(rm.limite, 2)} MPa` : `Límite 0.8 f′cu = ${fmt(rm.limite, 2)} MPa`} />
            <Valor etiqueta="f′m = 0.75 Rm (Ec. D.3.7-2)" valor={fmt(sin, 2)} unidad="MPa" destacado={inyectado === 'no'} />
          </div>
          {iny && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Valor etiqueta="0.75[r·Rm + 0.9 kr (1−r) f′cr]" valor={fmt(iny.sinTope, 3)} unidad="MPa" />
              <Valor etiqueta="Tope 0.94 Rm" valor={fmt(iny.tope, 3)} unidad="MPa" estado={iny.gobiernaTope ? 'mal' : 'neutro'} nota={iny.gobiernaTope ? 'El tope gobierna: más relleno no sube f′m' : undefined} />
              <Valor destacado etiqueta="f′m inyectado (Ec. D.3.7-3)" valor={fmt(iny.fm, 2)} unidad="MPa" />
            </div>
          )}
          {lim && (
            <Aviso tipo={lim.contradiccion ? 'atencion' : 'nota'}>
              Mortero de relleno (D.3.5.3): f′cr entre {fmt(lim.minimo, 2)} y {fmt(lim.maximo, 2)} MPa (1.25 a 1.5 f′m, nunca menos de 12.5 MPa).
              {lim.contradiccion ? ' Con este f′m el piso de 12.5 MPa supera a 1.5 f′m: el texto de la norma se contradice; prima el mínimo absoluto de 12.5 MPa (interpretación).' : ''}
            </Aviso>
          )}
        </>
      )}
    </div>
  );
}

function AceptacionTab() {
  const [texto, setTexto] = useState('11.8, 12.6, 9.7');
  const esp = useNum(12);
  const valores = useMemo(() => listaNumeros(texto), [texto]);
  const ok = valores.length >= 1 && Number.isFinite(esp.n) && esp.n > 0;
  const r = ok ? verificarAceptacion(valores, esp.n) : null;

  return (
    <div className="space-y-4">
      <Grupo titulo="Serie de resultados (mortero de pega, de relleno, unidades o muretes)">
        <Campo etiqueta="Resistencia especificada" unidad="MPa" valor={esp.txt} onCambio={esp.setTxt} min={0.1} ayuda="f′cp, f′cr, f′cu o f′m según la serie que evalúes" />
        <div className="space-y-1.5">
          <Label htmlFor="acep-lista" className="text-sm font-medium">
            Resultados de ensayo (MPa)
          </Label>
          <Textarea id="acep-lista" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} className="font-mono" />
          <p className="text-xs text-muted-foreground">{valores.length} resultado(s) leído(s).</p>
        </div>
      </Grupo>

      {!ok && <Aviso tipo="error">Indica la resistencia especificada y al menos un resultado.</Aviso>}
      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Promedio" valor={fmt(r.promedio, 2)} unidad="MPa" estado={r.cumplePromedio ? 'ok' : 'mal'} nota={`Debe ser ≥ ${fmt(r.especificada, 2)} MPa`} />
            <Valor etiqueta="Menor valor individual" valor={fmt(r.minimo, 2)} unidad="MPa" estado={r.cumpleIndividual ? 'ok' : 'mal'} nota={`Debe ser ≥ 80 % = ${fmt(r.umbralIndividual, 2)} MPa`} />
            <Valor etiqueta="Valores bajo el 80 %" valor={String(r.nBajos)} estado={r.nBajos === 0 ? 'ok' : 'mal'} />
            <Valor destacado etiqueta="D.3.8.2.1" valor={r.cumple ? 'Satisfactoria' : 'No satisfactoria'} estado={r.cumple ? 'ok' : 'mal'} />
          </div>
          {!r.cumple && (
            <Aviso tipo="atencion">
              D.3.8.2.2: tomar de inmediato las medidas para aumentar el promedio de las siguientes evaluaciones.
              {r.requiereD3823 && ' Como hay resultados bajo el 80 %, aplica D.3.8.2.3: verificar que la capacidad de carga no se haya comprometido y, si hace falta, extraer 3 porciones por lote afectado (promedio ≥ 80 % de la especificada); si la duda persiste, D.3.8.2.4 (prueba de carga, Capítulo C.20).'}
            </Aviso>
          )}
        </>
      )}
    </div>
  );
}

export default function FmMamposteria() {
  return (
    <div className="space-y-5">
      <Tabs defaultValue="muretes">
        <TabsList className="flex-wrap">
          <TabsTrigger value="muretes">Muretes (D.3.7.2)</TabsTrigger>
          <TabsTrigger value="estadistica">Estadística (D.3.7.3–4)</TabsTrigger>
          <TabsTrigger value="materiales">Materiales (D.3.7.5–6)</TabsTrigger>
          <TabsTrigger value="aceptacion">Aceptación (D.3.8)</TabsTrigger>
        </TabsList>
        <TabsContent value="muretes" className="pt-3">
          <MuretesTab />
        </TabsContent>
        <TabsContent value="estadistica" className="pt-3">
          <EstadisticaTab />
        </TabsContent>
        <TabsContent value="materiales" className="pt-3">
          <MaterialesTab />
        </TabsContent>
        <TabsContent value="aceptacion" className="pt-3">
          <AceptacionTab />
        </TabsContent>
      </Tabs>
      <PieCalc>
        Tabla D.3.7-1 interpolada linealmente entre sus valores (la norma no lo indica), desviación muestral y tramo n = 10 de D.3.7.4 asignado al 80 %: son interpretaciones del proyecto. Los valores de D.3.7.5–6 solo sirven para el diseño previo, no para el control de calidad (D.3.7.1.1).
      </PieCalc>
    </div>
  );
}
