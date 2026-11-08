import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { REDUCCION_TEXTO_CEMENTO_MAMPOSTERIA } from '@/data/esfuerzosAdmisiblesMamposteria';
import {
  evaluarEsfuerzos,
  type ElementoD1,
  type EntradaEvaluacion,
  type EntradaFt,
  type TipoAcero,
  type QuienTomaCortante,
} from '@/lib/nsr10/esfuerzosAdmisiblesMamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';

const OPCIONES_ELEMENTO = [
  { value: 'muro-reforzado', label: 'Muro de mampostería reforzada' },
  { value: 'muro-no-reforzado', label: 'Muro de mampostería no reforzada' },
  { value: 'columna-reforzada', label: 'Columna reforzada' },
  { value: 'columna-no-reforzada', label: 'Columna no reforzada' },
  { value: 'viga', label: 'Viga / dintel (elemento a flexión)' },
];

const OPCIONES_ACERO = [
  { value: 'corrugada', label: 'Barras corrugadas' },
  { value: 'lisa', label: 'Barras lisas' },
  { value: 'alambre', label: 'Alambres' },
];

const OPCIONES_DIRECCION = [
  { value: 'perpendicular-junta-horizontal', label: 'Perpendicular a las juntas horizontales' },
  { value: 'perpendicular-junta-vertical', label: 'Perpendicular a la junta vertical' },
];

const OPCIONES_UNIDAD = [
  { value: 'maciza', label: 'Unidades macizas' },
  { value: 'perforacion-vertical', label: 'Unidades de perforación vertical' },
];

const OPCIONES_MORTERO = [
  { value: 'cemento-cal', label: 'Cemento pórtland y cal' },
  { value: 'cemento-mamposteria', label: 'Cemento para mampostería' },
];

const OPCIONES_CLASE = [
  { value: 'HMS', label: 'Tipo H, M o S' },
  { value: 'N', label: 'Tipo N' },
];

const OPCIONES_QUIEN = [
  { value: 'mamposteria', label: 'La mampostería toma todo el cortante (D-1.5-13 y -14)' },
  { value: 'refuerzo', label: 'El refuerzo toma todo el cortante (D-1.5-15 y -16)' },
];

const OPCIONES_VIGA = [
  { value: 'sin', label: 'Sin refuerzo de cortante (D-1.5-9)' },
  { value: 'con', label: 'Refuerzo toma todo el cortante (D-1.5-10)' },
];

const configBarras = { razon: { label: 'Actuante / admisible', color: 'var(--chart-1)' } } satisfies ChartConfig;
const configInter = { limite: { label: 'fa/Fa + fb/Fb = 1', color: 'var(--chart-1)' } } satisfies ChartConfig;

const ETIQUETA_CORTA: Record<string, string> = {
  axial: 'Fa (compresión axial)',
  flexion: 'Fb (compresión por flexión)',
  traccion: 'Ft (tracción por flexión)',
  cortante: 'Fv (cortante)',
  'acero-traccion': 'Fs (acero a tracción)',
  'acero-compresion': 'Fs (acero a compresión)',
};

const opt = (x: number): number | undefined => (Number.isFinite(x) ? x : undefined);

export default function EsfuerzosAdmisiblesMamposteria() {
  const [elemento, setElemento] = useState<ElementoD1>('muro-reforzado');
  const fm = useNum(10);
  const fy = useNum(420);
  const [acero, setAcero] = useState<TipoAcero>('corrugada');
  const hp = useNum(2400);
  const t = useNum(150);
  const ae = useNum(450000);
  const ast = useNum(258);
  // tracción por flexión (no reforzada)
  const [dir, setDir] = useState('perpendicular-junta-horizontal');
  const [uni, setUni] = useState('perforacion-vertical');
  const [mor, setMor] = useState('cemento-cal');
  const [cla, setCla] = useState('HMS');
  const pct = useNum(0);
  // cortante
  const [quien, setQuien] = useState<QuienTomaCortante>('mamposteria');
  const [vigaCon, setVigaCon] = useState('sin');
  const mvd = useNum(0.5);
  const fam = useNum(0.3);
  const bw = useNum(150);
  const dd = useNum(2400);
  const jj = useNum(0.8);
  // actuantes
  const P = useNum(400);
  const fb = useNum(1);
  const ft = useNum(0.1);
  const V = useNum(70);
  const fsT = useNum(100);
  const [fsCTxt, setFsCTxt] = useState('');
  const fsCn = parseNum(fsCTxt);
  const inc = useNum(1);

  const esMuro = elemento === 'muro-reforzado' || elemento === 'muro-no-reforzado';
  const esColumna = elemento === 'columna-reforzada' || elemento === 'columna-no-reforzada';
  const reforzado = elemento === 'muro-reforzado' || elemento === 'columna-reforzada' || elemento === 'viga';
  const conAxial = esMuro || esColumna;

  const calculo = useMemo(() => {
    const positivos = [fm.n, ...(conAxial ? [hp.n, t.n, ae.n] : []), ...(reforzado ? [fy.n] : [])];
    if (positivos.some((x) => !Number.isFinite(x) || x <= 0)) return { error: 'Revisa los datos: f′m, h′, t, Ae y fy deben ser números positivos.' } as const;
    if (elemento === 'columna-reforzada' && (!Number.isFinite(ast.n) || ast.n < 0 || ast.n >= ae.n)) return { error: 'Ast debe ser un número no negativo menor que Ae.' } as const;

    let traccion: EntradaFt | undefined;
    if (!reforzado) {
      const p = Number.isFinite(pct.n) ? Math.min(100, Math.max(0, pct.n)) / 100 : 0;
      const horizontal = dir === 'perpendicular-junta-horizontal';
      traccion = {
        direccion: dir as EntradaFt['direccion'],
        unidad: uni === 'maciza' ? 'maciza' : horizontal ? 'perforacion-vertical-sin-rellenar' : p > 0 ? 'perforacion-vertical-rellena' : 'perforacion-vertical-sin-rellenar',
        mortero: mor as EntradaFt['mortero'],
        clase: cla as EntradaFt['clase'],
        fraccionRelleno: uni !== 'maciza' && horizontal ? p : undefined,
      };
    }

    const entrada: EntradaEvaluacion = {
      elemento,
      fm: fm.n,
      hPrime: conAxial ? hp.n : undefined,
      t: conAxial ? t.n : undefined,
      Ae: conAxial ? ae.n : undefined,
      Ast: elemento === 'columna-reforzada' ? ast.n : undefined,
      fy: reforzado ? fy.n : undefined,
      tipoAcero: acero,
      traccion,
      incremento: Number.isFinite(inc.n) && inc.n > 0 ? inc.n : 1,
      cortante: {
        b: opt(bw.n),
        d: opt(dd.n),
        j: opt(jj.n),
        conRefuerzo: vigaCon === 'con',
        quien,
        MVd: Number.isFinite(mvd.n) ? mvd.n : 0,
        fam: Number.isFinite(fam.n) ? fam.n : 0,
      },
      actuantes: {
        P: Number.isFinite(P.n) && conAxial ? P.n * 1000 : undefined,
        fb: opt(fb.n),
        ft: !reforzado ? opt(ft.n) : undefined,
        V: Number.isFinite(V.n) ? V.n * 1000 : undefined,
        fsTraccion: reforzado ? opt(fsT.n) : undefined,
        fsCompresion: reforzado ? opt(fsCn) : undefined,
      },
    };
    return { res: evaluarEsfuerzos(entrada) } as const;
  }, [elemento, fm.n, hp.n, t.n, ae.n, ast.n, fy.n, acero, dir, uni, mor, cla, pct.n, quien, vigaCon, mvd.n, fam.n, bw.n, dd.n, jj.n, P.n, fb.n, ft.n, V.n, fsT.n, fsCn, inc.n, conAxial, reforzado]);

  const res = 'res' in calculo ? calculo.res : null;
  const datosBarras = res ? res.verificaciones.filter((v) => v.razon !== null).map((v) => ({ nombre: v.clave, etiqueta: v.etiqueta, razon: v.razon as number })) : [];
  const axial = res?.verificaciones.find((v) => v.clave === 'axial');
  const flex = res?.verificaciones.find((v) => v.clave === 'flexion');
  const comb = res?.verificaciones.find((v) => v.clave === 'combinada');
  const Fa = axial?.admisible ?? null;
  const Fb = flex?.admisible ?? null;
  const puntoInter = axial?.actuante != null && flex?.actuante != null ? { fa: axial.actuante, fb: flex.actuante } : null;
  const lineaInter = Fa && Fb ? [{ fa: 0, fb: Fb }, { fa: Fa, fb: 0 }] : [];

  const mostrarCortante = elemento === 'viga' || esMuro;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Elemento y materiales">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Tipo de elemento" valor={elemento} onCambio={(v) => setElemento(v as ElementoD1)} opciones={OPCIONES_ELEMENTO} className="sm:col-span-2" />
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={3} max={40} ayuda="D-1.2.3: según D.3.7" />
            {reforzado && <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />}
            {reforzado && <Selector etiqueta="Tipo de acero" valor={acero} onCambio={(v) => setAcero(v as TipoAcero)} opciones={OPCIONES_ACERO} />}
          </div>
        </Grupo>

        {conAxial && (
          <Grupo titulo="Geometría efectiva (D.5.4)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Altura efectiva h′" unidad="mm" valor={hp.txt} onCambio={hp.setTxt} min={100} ayuda="D.5.4.3" />
              <Campo etiqueta="Espesor efectivo t" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={80} max={600} ayuda="D.5.4.2" />
              <Campo etiqueta="Área efectiva Ae" unidad="mm²" valor={ae.txt} onCambio={ae.setTxt} min={1000} ayuda="D.5.4.1 (para fa = P/Ae)" />
              {elemento === 'columna-reforzada' && <Campo etiqueta="Refuerzo longitudinal Ast" unidad="mm²" valor={ast.txt} onCambio={ast.setTxt} min={0} ayuda="Entra en Pa (D-1.5-4)" />}
            </div>
          </Grupo>
        )}

        {!reforzado && (
          <Grupo titulo="Tracción por flexión (Tabla D-1.5-1, aparejo trabado)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector etiqueta="Dirección de la tracción" valor={dir} onCambio={setDir} opciones={OPCIONES_DIRECCION} className="sm:col-span-2" />
              <Selector etiqueta="Tipo de unidad" valor={uni} onCambio={setUni} opciones={OPCIONES_UNIDAD} />
              <Campo
                etiqueta="Celdas inyectadas"
                unidad="%"
                valor={pct.txt}
                onCambio={pct.setTxt}
                min={0}
                max={100}
                ayuda={uni === 'maciza' ? 'No aplica a unidades macizas' : dir === 'perpendicular-junta-horizontal' ? '0 = sin rellenar, 100 = rellenas; intermedio = interpolación (nota 1)' : 'Mayor que 0 = «rellenas y parcialmente rellenas»'}
              />
              <Selector etiqueta="Mortero de pega" valor={mor} onCambio={setMor} opciones={OPCIONES_MORTERO} />
              <Selector etiqueta="Clase de mortero" valor={cla} onCambio={setCla} opciones={OPCIONES_CLASE} />
            </div>
          </Grupo>
        )}

        {mostrarCortante && (
          <Grupo titulo="Cortante (D-1.5.6 y D-1.5.7)">
            <div className="grid gap-3 sm:grid-cols-2">
              {elemento === 'viga' && <Selector etiqueta="Refuerzo de cortante" valor={vigaCon} onCambio={setVigaCon} opciones={OPCIONES_VIGA} className="sm:col-span-2" />}
              {elemento === 'muro-reforzado' && (
                <>
                  <Selector etiqueta="Quién toma el cortante" valor={quien} onCambio={(v) => setQuien(v as QuienTomaCortante)} opciones={OPCIONES_QUIEN} className="sm:col-span-2" />
                  <Campo etiqueta="M/(Vd)" valor={mvd.txt} onCambio={mvd.setTxt} min={0} paso={0.1} ayuda="< 1 o ≥ 1 cambia la ecuación" />
                </>
              )}
              {elemento === 'muro-no-reforzado' && <Campo etiqueta="fam (carga muerta)" unidad="MPa" valor={fam.txt} onCambio={fam.setTxt} min={0} ayuda="Incremento 0.2 fam" />}
              <Campo etiqueta="Ancho b (o bw)" unidad="mm" valor={bw.txt} onCambio={bw.setTxt} min={50} ayuda="Para fv = V/(b j d)" />
              <Campo etiqueta="Altura efectiva d" unidad="mm" valor={dd.txt} onCambio={dd.setTxt} min={50} />
              <Campo etiqueta="Brazo j" valor={jj.txt} onCambio={jj.setTxt} min={0.5} max={1} paso={0.05} ayuda="0.8 si no hay compatibilidad de deformaciones" />
            </div>
          </Grupo>
        )}

        <Grupo titulo="Esfuerzos actuantes bajo cargas de servicio (opcionales)">
          <div className="grid gap-3 sm:grid-cols-2">
            {conAxial && <Campo etiqueta="Carga axial P" unidad="kN" valor={P.txt} onCambio={P.setTxt} min={0} ayuda="fa = P/Ae (compresión)" />}
            <Campo etiqueta="Compresión por flexión fb" unidad="MPa" valor={fb.txt} onCambio={fb.setTxt} min={0} ayuda="De tu análisis elástico (D-1.2.2)" />
            {!reforzado && <Campo etiqueta="Tracción por flexión ft" unidad="MPa" valor={ft.txt} onCambio={ft.setTxt} min={0} />}
            {mostrarCortante && <Campo etiqueta="Cortante V" unidad="kN" valor={V.txt} onCambio={V.setTxt} min={0} ayuda="fv = V/(b j d)" />}
            {reforzado && <Campo etiqueta="Acero a tracción fs" unidad="MPa" valor={fsT.txt} onCambio={fsT.setTxt} min={0} />}
            {reforzado && <Campo etiqueta="Acero a compresión fs" unidad="MPa" valor={fsCTxt} onCambio={setFsCTxt} min={0} ayuda="Vacío = no verificar" />}
            <Campo etiqueta="Factor de incremento (opcional)" valor={inc.txt} onCambio={inc.setTxt} min={1} max={2} paso={0.05} ayuda="1.0 = sin incremento (ver nota D-1.3.4)" />
          </div>
        </Grupo>
      </div>

      {!res && 'error' in calculo && <Aviso tipo="error">{calculo.error}</Aviso>}

      {res && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {res.esbeltez !== null && (
              <Valor etiqueta="h′/t" valor={fmt(res.esbeltez, 2)} estado={res.esbeltezAdmisible === false ? 'mal' : 'neutro'} nota={res.esbeltezAdmisible === false ? 'excede 25 en muros (D.5.4.3.1)' : 'D.5.4.3'} />
            )}
            {res.Re !== null && <Valor etiqueta="Re" valor={fmt(res.Re, 4)} nota="Ec. D-1.5-5" />}
            {res.Pa !== null && <Valor etiqueta="Pa" unidad="kN" valor={fmt(res.Pa / 1000, 1)} nota={`Ec. D-1.5-4 con Fs = ${fmt(res.FsColumna ?? NaN, 0)} MPa`} />}
            {res.verificaciones
              .filter((v) => v.admisible !== null && v.clave !== 'combinada')
              .map((v) => (
                <Valor
                  key={v.clave}
                  etiqueta={ETIQUETA_CORTA[v.clave]}
                  unidad="MPa"
                  valor={fmt(v.admisible as number, 3)}
                  nota={`admisible, ${v.ecuacion}`}
                  destacado={v.cumple === null}
                  estado={v.cumple === null ? 'neutro' : v.cumple ? 'ok' : 'mal'}
                />
              ))}
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs">
                <tr>
                  <th className="px-3 py-2">Verificación</th>
                  <th className="px-3 py-2">Norma</th>
                  <th className="px-3 py-2 text-right">Actuante</th>
                  <th className="px-3 py-2 text-right">Admisible</th>
                  <th className="px-3 py-2 text-right">Razón</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {res.verificaciones.map((v) => (
                  <tr key={v.clave} className="border-t">
                    <td className="px-3 py-2">
                      {v.etiqueta}
                      {v.nota && <span className="block text-xs text-muted-foreground">{v.nota}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{v.ecuacion}</td>
                    <td className="px-3 py-2 text-right font-mono">{v.actuante !== null ? fmt(v.actuante, 3) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{v.admisible !== null ? fmt(v.admisible, 3) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{v.razon !== null ? fmt(v.razon, 3) : '—'}</td>
                    <td className={`px-3 py-2 font-medium ${v.cumple === null ? 'text-muted-foreground' : v.cumple ? 'text-ok' : 'text-danger'}`}>{v.cumple === null ? 'sin dato' : v.cumple ? 'cumple' : 'no cumple'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {datosBarras.length > 0 && (
              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold">Razón esfuerzo actuante / admisible</p>
                <ChartContainer config={configBarras} className="aspect-[4/3] w-full">
                  <BarChart data={datosBarras} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, (max: number) => Math.max(1.2, Math.ceil(max * 10) / 10)]} tickFormatter={(x) => Number(x).toFixed(1)} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{Number(v).toFixed(3)}</span>} />} />
                    <ReferenceLine y={1} stroke="var(--danger, var(--chart-5))" strokeDasharray="4 3" label={{ value: '1.0', position: 'right', fontSize: 11 }} />
                    <Bar dataKey="razon" isAnimationActive={false}>
                      {datosBarras.map((d, i) => (
                        <Cell key={i} fill={d.razon <= 1 ? 'var(--chart-1)' : 'var(--danger, var(--chart-5))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <p className="mt-1 text-xs text-muted-foreground">Cada barra es fa/Fa, fb/Fb, fv/Fv, etc. Por encima de la línea punteada (1.0) el esfuerzo supera el admisible (esquema del proyecto).</p>
              </div>
            )}

            {lineaInter.length > 0 && (
              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold">Interacción fa/Fa + fb/Fb ≤ 1 (Ec. D-1.5-7)</p>
                <ChartContainer config={configInter} className="aspect-[4/3] w-full">
                  <LineChart data={lineaInter} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fa" type="number" domain={[0, (max: number) => Math.max(max, (puntoInter?.fa ?? 0) * 1.15)]} tickFormatter={(x) => Number(x).toFixed(1)} label={{ value: 'fa (MPa)', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                    <YAxis type="number" domain={[0, (max: number) => Math.max(max, (puntoInter?.fb ?? 0) * 1.15)]} tickFormatter={(x) => Number(x).toFixed(1)} label={{ value: 'fb (MPa)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                    <Line dataKey="fb" stroke="var(--color-limite)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    {puntoInter && <ReferenceDot x={puntoInter.fa} y={puntoInter.fb} r={6} fill={comb?.cumple ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))'} stroke="none" />}
                  </LineChart>
                </ChartContainer>
                <p className="mt-1 text-xs text-muted-foreground">
                  La recta va de (0, Fb) a (Fa, 0); el punto es (fa, fb). Bajo la recta, la verificación combinada se cumple (esquema del proyecto).
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {res.cumpleTodo === true && <Aviso tipo="nota">Todas las verificaciones con datos cumplen frente a los esfuerzos admisibles del Apéndice D-1.</Aviso>}
            {res.cumpleTodo === false && <Aviso tipo="error">Al menos una verificación no cumple: revisa las filas marcadas en la tabla (aumenta f′m, la sección o el refuerzo, o reduce las cargas).</Aviso>}
            {res.cumpleTodo === null && <Aviso tipo="nota">Ingresa esfuerzos actuantes para verificar cumple / no cumple; mientras tanto se muestran solo los esfuerzos admisibles.</Aviso>}
            {res.esbeltezAdmisible === false && <Aviso tipo="error">h′/t excede 25: no es admisible en muros estructurales (D.5.4.3.1; D-1.4.1 exige cumplir D.5.4).</Aviso>}
            {elemento === 'columna-reforzada' && <Aviso tipo="nota">En Pa se usa Fs = 0.4 fy ≤ 170 MPa (Ec. D-1.5-21), el de columnas en compresión: es interpretación del proyecto, porque la Ec. D-1.5-4 solo dice «Fs».</Aviso>}
            {esColumna && <Aviso tipo="nota">El apéndice no da esfuerzos cortantes admisibles para columnas: no se verifica cortante.</Aviso>}
            {!reforzado && (
              <Aviso tipo="atencion">
                D-1.5.4 dice que con cemento de mampostería los valores «deben reducirse en un {Math.round(REDUCCION_TEXTO_CEMENTO_MAMPOSTERIA * 100)} %», pero la tabla trae columnas propias que no son exactamente la mitad; la calculadora usa las columnas de la tabla. Estos valores no aplican a elementos sin carga axial (D-1.5.4.2) y no se permite contar con tracción por carga axial (D-1.5.4.1).
              </Aviso>
            )}
          </div>
        </>
      )}

      <PieCalc>
        Verificación por esfuerzos de trabajo (Apéndice D-1): esfuerzos admisibles contra esfuerzos actuantes que tú calculas con un análisis elástico y combinaciones de B.2.3 (E reducido = Fs/R). El factor de incremento es opcional: D-1.3.4 permite
        incrementar los esfuerzos «según B.2.3.4», numeral que no existe en el Título B de este documento, así que no se asume ningún valor.
      </PieCalc>
    </div>
  );
}
