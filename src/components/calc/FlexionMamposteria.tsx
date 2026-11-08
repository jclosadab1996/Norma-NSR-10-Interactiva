import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { EPS_MU } from '@/data/muroMamposteria';
import { flexionDobleArmadura, flexionSimple, phiMuro, type ResultadoDobleArmadura, type ResultadoFlexionSimple } from '@/lib/nsr10/mamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const OPCIONES_PHI = [
  { value: 'fuera', label: 'Fuerzas perpendiculares al plano / dinteles: φ = 0.80 (D.5.1.5.1 a)' },
  { value: 'en', label: 'Fuerzas paralelas al plano: φ = 0.85 (D.5.1.5.2 a)' },
];

const config = {
  phimn: { label: 'φMn', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** Esquema de la sección, deformaciones y bloque de compresión (SVG, esquema del proyecto). */
function Esquema({ b, d, dPrime, a, c, tieneComp, epsPrime }: { b: number; d: number; dPrime: number; a: number; c: number; tieneComp: boolean; epsPrime: number }) {
  const h = d + Math.max(dPrime, 40);
  const alto = 200;
  const esc = alto / h;
  const ancho = Math.max(50, Math.min(110, b * esc));
  const x0 = 24;
  const y0 = 14;
  const yc = y0 + Math.min(c, h) * esc;
  const ya = y0 + Math.min(a, h) * esc;
  const yd = y0 + d * esc;
  const epsT = (EPS_MU * (d - c)) / c;
  const k = 70 / Math.max(EPS_MU, Math.abs(epsT)); // px por unidad de deformación
  const xT = x0 + ancho + 110; // línea de deformación nula
  const xb = xT + 110;
  const xTen = xT - Math.abs(epsT) * k;
  return (
    <svg viewBox={`0 0 ${xb + 130} ${alto + 40}`} className="mx-auto h-auto w-full max-w-xl" role="img" aria-label="Sección, deformaciones y bloque rectangular de esfuerzos">
      <title>Sección, deformaciones y bloque rectangular</title>
      <rect x={x0} y={y0} width={ancho} height={alto} fill="var(--muted)" stroke="currentColor" strokeWidth={1.5} />
      <rect x={x0} y={y0} width={ancho} height={Math.max(0, ya - y0)} fill="var(--chart-1)" fillOpacity={0.35} />
      <line x1={x0 - 4} x2={x0 + ancho + 4} y1={yc} y2={yc} stroke="currentColor" strokeDasharray="5 3" />
      <circle cx={x0 + ancho / 2} cy={yd} r={4.5} fill="currentColor" />
      {tieneComp && <circle cx={x0 + ancho / 2} cy={y0 + dPrime * esc} r={3.5} fill="currentColor" />}
      <text x={x0 + ancho / 2} y={y0 + alto + 14} fontSize={10} textAnchor="middle" fill="currentColor">b = {fmt(b, 0)}</text>
      <text x={x0 - 3} y={ya - 2} fontSize={10} textAnchor="end" fill="currentColor">a</text>
      <text x={x0 + ancho + 4} y={yc + 3} fontSize={10} fill="currentColor">c</text>
      {/* deformaciones */}
      <line x1={xT} x2={xT} y1={y0 - 4} y2={y0 + alto + 2} stroke="currentColor" strokeOpacity={0.4} />
      <polygon points={`${xT},${y0} ${xT + EPS_MU * k},${y0} ${xT},${yc} ${xTen},${yd}`} fill="var(--chart-2)" fillOpacity={0.25} stroke="var(--chart-2)" strokeWidth={1.5} />
      <text x={xT + EPS_MU * k + 3} y={y0 + 8} fontSize={10} fill="currentColor">εmu = 0.003</text>
      <text x={xTen + 20} y={yd + 12} fontSize={10} textAnchor="end" fill="currentColor">εs = {fmt(epsT, 4)}</text>
      {tieneComp && <text x={xT + 4} y={y0 + dPrime * esc - 3} fontSize={10} fill="currentColor">ε′s = {fmt(epsPrime, 4)}</text>}
      {/* bloque de esfuerzos */}
      <rect x={xb} y={y0} width={40} height={Math.max(0, ya - y0)} fill="var(--chart-1)" fillOpacity={0.45} stroke="var(--chart-1)" />
      <text x={xb + 44} y={(y0 + ya) / 2 + 3} fontSize={10} fill="currentColor">0.80 f′m</text>
      <line x1={xb + 20} x2={xb + 20} y1={yd} y2={yd - 22} stroke="currentColor" strokeWidth={2} />
      <polygon points={`${xb + 15},${yd - 16} ${xb + 20},${yd - 24} ${xb + 25},${yd - 16}`} fill="currentColor" />
      <text x={xb + 28} y={yd + 3} fontSize={10} fill="currentColor">T = As fy</text>
    </svg>
  );
}

export default function FlexionMamposteria() {
  const fm = useNum(10);
  const fy = useNum(420);
  const b = useNum(150);
  const d = useNum(340);
  const as = useNum(258);
  const asp = useNum(0);
  const dp = useNum(50);
  const mu = useNum(20);
  const [dir, setDir] = useState('fuera');
  const phi = dir === 'fuera' ? phiMuro('fuera-flexion') : phiMuro('en-flexion');

  const tieneComp = Number.isFinite(asp.n) && asp.n > 0;
  const base = [fm.n, fy.n, b.n, d.n, as.n];
  const validos = base.every((x) => Number.isFinite(x) && x > 0) && (!tieneComp || (Number.isFinite(dp.n) && dp.n > 0 && dp.n < d.n && asp.n < as.n));

  const res = useMemo(() => {
    if (!validos) return null;
    const Mu = Number.isFinite(mu.n) && mu.n > 0 ? mu.n : undefined;
    const simple: ResultadoFlexionSimple = flexionSimple({ fm: fm.n, fy: fy.n, b: b.n, d: d.n, As: as.n, phi, Mu });
    const doble: ResultadoDobleArmadura | null = tieneComp ? flexionDobleArmadura({ fm: fm.n, fy: fy.n, b: b.n, d: d.n, dPrime: dp.n, As: as.n, AsPrime: asp.n, phi, Mu }) : null;
    return { simple, doble };
  }, [validos, fm.n, fy.n, b.n, d.n, as.n, asp.n, dp.n, phi, mu.n, tieneComp]);

  const curva = useMemo(() => {
    if (!validos) return [];
    const asMax = 1.3 * as.n + 200;
    return Array.from({ length: 41 }, (_, i) => {
      const A = (asMax * (i + 0.001)) / 40;
      return { As: A, phimn: flexionSimple({ fm: fm.n, fy: fy.n, b: b.n, d: d.n, As: A, phi }).phiMn };
    });
  }, [validos, fm.n, fy.n, b.n, d.n, as.n, phi]);

  const activo = res ? (res.doble ?? res.simple) : null;
  const Mn = activo ? activo.Mn : NaN;
  const phiMn = activo ? activo.phiMn : NaN;
  const MuOk = Number.isFinite(mu.n) && mu.n > 0;
  const asLimite = res ? res.simple.rhoLimite * b.n * d.n : NaN;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Sección y materiales">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={3} max={40} />
            <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
            <Campo etiqueta="Ancho efectivo b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={50} ayuda="D.5.4.4" />
            <Campo etiqueta="Altura útil d" unidad="mm" valor={d.txt} onCambio={d.setTxt} min={50} ayuda="Cara comprimida a As" />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo y demanda">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="As (tracción)" unidad="mm²" valor={as.txt} onCambio={as.setTxt} min={1} />
            <Campo etiqueta="A′s (compresión)" unidad="mm²" valor={asp.txt} onCambio={asp.setTxt} min={0} ayuda="0 si no hay" />
            <Campo etiqueta="d′" unidad="mm" valor={dp.txt} onCambio={dp.setTxt} min={20} ayuda="Cara comprimida a A′s" />
            <Campo etiqueta="Mu (opcional)" unidad="kN·m" valor={mu.txt} onCambio={mu.setTxt} min={0} />
            <Selector className="sm:col-span-2" etiqueta="Coeficiente φ" valor={dir} onCambio={setDir} opciones={OPCIONES_PHI} />
          </div>
        </Grupo>
      </div>

      {!res && <Aviso tipo="error">Revisa los datos: valores positivos y, si hay A′s, d′ &lt; d y A′s &lt; As.</Aviso>}

      {res && activo && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="a" unidad="mm" valor={fmt(res.doble ? res.doble.a : res.simple.a, 1)} nota={res.doble ? 'bloque de As1 (D.5.6-3)' : 'As fy / (0.80 f′m b)'} />
            <Valor etiqueta="c = a/0.85" unidad="mm" valor={fmt(res.doble ? res.doble.c : res.simple.c, 1)} />
            <Valor etiqueta="ρ = As/(b d)" valor={fmt(res.simple.rho, 5)} nota={`ρb = ${fmt(res.simple.rhoB, 5)}`} />
            <Valor etiqueta="0.75 ρb" valor={fmt(res.simple.rhoLimite, 5)} estado={res.simple.cumpleCuantia ? 'ok' : 'mal'} nota={res.simple.cumpleCuantia ? 'ρ < 0.75 ρb (D.5.6.2)' : 'ρ ≥ 0.75 ρb'} />
            <Valor etiqueta="εs (acero de tracción)" valor={fmt(res.simple.epsS, 4)} nota={res.simple.fluye ? 'en fluencia' : 'no fluye'} />
            <Valor etiqueta="Mn" unidad="kN·m" valor={fmt(Mn, 2)} nota={res.doble ? (res.doble.fluyeCompresion ? 'Ec. D.5.6-4' : 'A′s no fluye: equilibrio completo') : 'Ec. D.5.6-2'} />
            <Valor destacado etiqueta={`φMn (φ = ${fmt(phi, 2)})`} unidad="kN·m" valor={fmt(phiMn, 2)} estado={MuOk ? (phiMn >= mu.n ? 'ok' : 'mal') : 'neutro'} nota={MuOk ? `Mu / φMn = ${fmt(mu.n / phiMn, 3)}` : undefined} />
            {res.doble && <Valor etiqueta="ε′s (compresión)" valor={fmt(res.doble.epsPrimeS, 5)} estado={res.doble.fluyeCompresion ? 'ok' : 'mal'} nota={res.doble.fluyeCompresion ? 'A′s en fluencia' : `no fluye (< ${fmt(fy.n / 200000, 4)}): D.5.6-4 no aplica tal cual`} />}
          </div>

          <div className="rounded-xl border p-3">
            <Esquema b={b.n} d={d.n} dPrime={tieneComp ? dp.n : 0} a={res.doble ? res.doble.a : res.simple.a} c={res.doble ? res.doble.c : res.simple.c} tieneComp={tieneComp} epsPrime={res.doble ? res.doble.epsPrimeS : 0} />
            <p className="mt-1 text-center text-xs text-muted-foreground">(esquema del proyecto) Sección, deformaciones y bloque rectangular 0.80 f′m sobre a = 0.85 c</p>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">φMn frente al refuerzo de tracción (armadura simple)</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={curva} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="As" type="number" domain={[0, 'dataMax']} tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'As (mm²)', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                <YAxis tickFormatter={(x) => Number(x).toFixed(0)} label={{ value: 'φMn (kN·m)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v) => <span className="font-mono">φMn = {Number(v).toFixed(2)} kN·m</span>} />} />
                {Number.isFinite(asLimite) && <ReferenceArea x1={asLimite} x2={1.3 * as.n + 200} fill="var(--danger, var(--chart-5))" fillOpacity={0.08} />}
                <Line dataKey="phimn" stroke="var(--color-phimn)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <ReferenceDot x={as.n} y={res.simple.phiMn} r={5} fill="var(--chart-2)" stroke="none" />
              </LineChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">La zona sombreada es As ≥ 0.75 ρb b d, donde la Ec. D.5.6-2 deja de ser aplicable (D.5.6.2). Con refuerzo creciente la curva se aplana: el bloque crece y el brazo de palanca se reduce.</p>
          </div>

          {!res.simple.cumpleCuantia && <Aviso tipo="atencion">ρ ≥ 0.75 ρb: la fórmula D.5.6-2 no es aplicable; aumenta la sección o usa refuerzo de compresión comprobado.</Aviso>}
          {res.doble && !res.doble.fluyeCompresion && <Aviso tipo="atencion">El refuerzo de compresión no fluye (ε′s &lt; εy): la norma exige probar la fluencia para usar D.5.6-4; se muestra el Mn del equilibrio completo (autoría del proyecto).</Aviso>}
        </>
      )}
      <PieCalc>
        Flexión sin carga axial (D.5.6): bloque rectangular 0.80 f′m sobre a = 0.85 c, εmu = 0.003, acero elastoplástico. Las funciones son las mismas de los ejemplos del capítulo D.5b (`mamposteria.ts`). Para muros con carga axial use las calculadoras de muros en y fuera de su plano.
      </PieCalc>
    </div>
  );
}
