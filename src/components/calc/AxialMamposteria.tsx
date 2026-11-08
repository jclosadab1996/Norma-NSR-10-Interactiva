import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ESBELTEZ_MAXIMA_MURO } from '@/data/muroMamposteria';
import { factorEsbeltez, phiMuro, resistenciaAxial } from '@/lib/nsr10/mamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const OPCIONES_PHI = [
  { value: 'gravedad', label: 'Gravedad (solo o con fuerzas fuera del plano): φ = 0.80 (D.5.1.5.1 a)' },
  { value: 'paralelo', label: 'Compresión con fuerzas en el plano: φ = 0.60 (D.5.1.5.2 b)' },
];

const config = {
  re: { label: 'Re (Ec. D.5.5-2)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** Curva Re frente a h′/t entre 0 y 40. */
const CURVA = Array.from({ length: 81 }, (_, i) => {
  const r = i * 0.5;
  return { r, re: factorEsbeltez(r, 1) };
});

export default function AxialMamposteria() {
  const fm = useNum(10);
  const b = useNum(1000);
  const t = useNum(150);
  const frac = useNum(1);
  const ast = useNum(258);
  const fy = useNum(420);
  const h = useNum(2400);
  const pu = useNum(500);
  const [phiSel, setPhiSel] = useState('paralelo');

  const phi = phiSel === 'gravedad' ? phiMuro('fuera-flexion') : phiMuro('en-compresion');
  const Ae = b.n * t.n * frac.n;

  const r = useMemo(() => {
    const v = [fm.n, b.n, t.n, frac.n, fy.n, h.n];
    if (v.some((x) => !Number.isFinite(x) || x <= 0) || !Number.isFinite(ast.n) || ast.n < 0 || frac.n > 1 || ast.n >= Ae) return null;
    return resistenciaAxial({ fm: fm.n, Ae, Ast: ast.n, fy: fy.n, hPrime: h.n, t: t.n, phi, Pu: Number.isFinite(pu.n) && pu.n > 0 ? pu.n : undefined });
  }, [fm.n, Ae, ast.n, fy.n, h.n, t.n, phi, pu.n, b.n, frac.n]);

  const ratio = h.n / t.n;
  const puOk = Number.isFinite(pu.n) && pu.n > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Muro o columna">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={3} max={40} />
            <Campo etiqueta="Longitud / ancho b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={100} ayuda="1000 mm = franja de 1 m" />
            <Campo etiqueta="Espesor efectivo t" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={80} max={600} ayuda="D.5.4.2" />
            <Campo etiqueta="Ae / (b·t)" valor={frac.txt} onCambio={frac.setTxt} min={0.1} max={1} paso={0.05} ayuda="1.0 = celdas inyectadas (D.5.4.1)" />
            <Campo etiqueta="Altura efectiva h′" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={100} ayuda="D.5.4.3" />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo, carga y φ">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ast (refuerzo vertical)" unidad="mm²" valor={ast.txt} onCambio={ast.setTxt} min={0} />
            <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
            <Campo etiqueta="Pu (opcional)" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} min={0} ayuda="Para verificar Pu ≤ φPn" />
            <Selector etiqueta="Coeficiente φ" valor={phiSel} onCambio={setPhiSel} opciones={OPCIONES_PHI} />
          </div>
        </Grupo>
      </div>

      {!r && <Aviso tipo="error">Revisa los datos: valores positivos, 0 &lt; Ae/(b·t) ≤ 1 y Ast menor que Ae.</Aviso>}

      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Ae" unidad="mm²" valor={fmt(Ae, 0)} nota="D.5.4.1" />
            <Valor etiqueta="Po" unidad="kN" valor={fmt(r.Po, 1)} nota={r.limitada ? 'rige el tope f′m Ae (D.5.5-1)' : '0.80 f′m (Ae − Ast) + Ast fy'} />
            <Valor etiqueta="h′/t" valor={fmt(r.esbeltez, 2)} estado={r.esbeltezAdmisible ? 'neutro' : 'mal'} nota={r.esbeltezAdmisible ? `≤ ${ESBELTEZ_MAXIMA_MURO} (D.5.4.3.1)` : `excede ${ESBELTEZ_MAXIMA_MURO} (D.5.4.3.1)`} />
            <Valor etiqueta="Re" valor={fmt(r.Re, 4)} nota={r.esbeltez <= 30 ? '1 − [h′/(42t)]²' : '[21t/h′]²'} />
            <Valor etiqueta="Pn = 0.80 Po Re" unidad="kN" valor={fmt(r.Pn, 1)} nota="Ec. D.5.5-3" />
            <Valor destacado etiqueta={`φPn (φ = ${fmt(phi, 2)})`} unidad="kN" valor={fmt(r.phiPn, 1)} estado={puOk ? (r.cumple ? 'ok' : 'mal') : 'neutro'} nota={puOk && r.razon !== null ? `Pu / φPn = ${fmt(r.razon, 3)}` : 'Ec. D.5.5-4'} />
            <Valor etiqueta="φPn por metro de muro" unidad="kN/m" valor={fmt((r.phiPn * 1000) / b.n, 1)} />
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Factor de esbeltez Re frente a h′/t</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={CURVA} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="r" type="number" domain={[0, 40]} ticks={[0, 10, 20, 25, 30, 40]} label={{ value: 'h′/t', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                <YAxis domain={[0, 1]} tickFormatter={(x) => Number(x).toFixed(1)} label={{ value: 'Re', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v) => <span className="font-mono">Re = {Number(v).toFixed(3)}</span>} />} />
                <Line dataKey="re" stroke="var(--color-re)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <ReferenceLine x={ESBELTEZ_MAXIMA_MURO} stroke="var(--muted-foreground)" strokeDasharray="4 3" label={{ value: '25', position: 'top', fontSize: 11 }} />
                <ReferenceLine x={30} stroke="var(--muted-foreground)" strokeDasharray="2 3" label={{ value: '30', position: 'top', fontSize: 11 }} />
                {ratio <= 40 && <ReferenceDot x={ratio} y={r.Re} r={5} fill={r.esbeltezAdmisible ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))'} stroke="none" />}
              </LineChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">Dos ramas: parábola 1 − (h′/42t)² hasta h′/t = 30 y pandeo de Euler (21t/h′)² después. La línea de 25 es el límite de D.5.4.3.1 en muros estructurales (esquema del proyecto).</p>
          </div>

          <div className="space-y-2">
            {!r.esbeltezAdmisible && <Aviso tipo="error">h′/t = {fmt(r.esbeltez, 1)} excede 25: no es admisible en muros estructurales (D.5.4.3.1).</Aviso>}
            {puOk && r.cumple === false && <Aviso tipo="error">Pu supera φPn: aumenta f′m, el espesor o el refuerzo, o reduce h′.</Aviso>}
            {puOk && r.cumple === true && <Aviso tipo="nota">Se cumple Pu ≤ φPn (Ec. D.5.5-4) con holgura de {fmt((1 - (r.razon ?? 0)) * 100, 0)} %.</Aviso>}
          </div>
        </>
      )}
      <PieCalc>
        Compresión axial sin excentricidad (D.5.5). La norma no dice expresamente cuál φ rige para la compresión pura bajo gravedad: se ofrecen el de D.5.1.5.1 (0.80, gravedad) y el de D.5.1.5.2 (0.60, fuerzas en el plano); la elección es interpretación del
        proyecto.
      </PieCalc>
    </div>
  );
}
