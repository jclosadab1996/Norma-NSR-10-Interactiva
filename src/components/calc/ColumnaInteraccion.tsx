import { useMemo, useState } from 'react';
import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { limitesRefuerzoColumna } from '@/lib/nsr10/flexionConcreto';
import { armaduraPerimetral, curvaInteraccion, verificarPunto } from '@/lib/nsr10/columnaInteraccion';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

/** Áreas nominales de las barras (Tabla C.3.5.3-2, PDF p.329, C-27). */
const BARRAS = [
  { value: '199', label: 'No. 5 (199 mm²)' },
  { value: '284', label: 'No. 6 (284 mm²)' },
  { value: '387', label: 'No. 7 (387 mm²)' },
  { value: '510', label: 'No. 8 (510 mm²)' },
  { value: '645', label: 'No. 9 (645 mm²)' },
  { value: '819', label: 'No. 10 (819 mm²)' },
  { value: '1006', label: 'No. 11 (1006 mm²)' },
] as const;

const TIPOS = [
  { value: 'estribos', label: 'Estribos (φ = 0.65; Ec. C.10-2)' },
  { value: 'espiral', label: 'Espiral (φ = 0.75; Ec. C.10-1)' },
] as const;

const config = {
  nominal: { label: 'Nominal (Pn, Mn)', color: 'var(--chart-3)' },
  diseno: { label: 'Diseño (φPn, φMn)', color: 'var(--chart-1)' },
  demanda: { label: 'Demanda (Pu, Mu)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const sinPunto = () => <g />;

export default function ColumnaInteraccion() {
  const b = useNum(400);
  const h = useNum(400);
  const fc = useNum(28);
  const fy = useNum(420);
  const dp = useNum(60);
  const nb = useNum(3);
  const nf = useNum(3);
  const [barra, setBarra] = useState('387');
  const [tipo, setTipo] = useState('estribos');
  const pu = useNum(1500);
  const mu = useNum(150);

  const datos = useMemo(() => {
    const v = [b.n, h.n, fc.n, fy.n, dp.n, nb.n, nf.n];
    if (v.some((x) => !Number.isFinite(x) || x <= 0) || dp.n * 2 >= h.n || nb.n < 2 || nf.n < 2) return null;
    const arm = armaduraPerimetral(h.n, dp.n, nb.n, nf.n, Number(barra));
    const col = { b: b.n, h: h.n, fc: fc.n, fy: fy.n, capas: arm.capas, espiral: tipo === 'espiral' };
    const curva = curvaInteraccion(col, 70);
    return { arm, col, curva, lim: limitesRefuerzoColumna(b.n * h.n) };
  }, [b.n, h.n, fc.n, fy.n, dp.n, nb.n, nf.n, barra, tipo]);

  const demandaOk = Number.isFinite(pu.n) && Number.isFinite(mu.n);
  const ver = datos && demandaOk ? verificarPunto(datos.curva, pu.n, mu.n) : null;

  const nominal = datos?.curva.puntos.map((p) => ({ M: p.Mn, P: p.Pn })) ?? [];
  const diseno = datos?.curva.puntos.map((p) => ({ M: p.phiMn, P: p.phiPn })) ?? [];
  const demanda = demandaOk ? [{ M: Math.abs(mu.n), P: pu.n }] : [];
  const cuantia = datos ? datos.arm.Ast / (b.n * h.n) : NaN;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Sección y materiales">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={200} max={2000} />
            <Campo etiqueta="h (en el plano de flexión)" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={200} max={2000} />
            <Campo etiqueta="d′ al centroide" unidad="mm" valor={dp.txt} onCambio={dp.setTxt} min={30} ayuda="Cara a centro de la barra extrema" />
            <Campo etiqueta="f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} max={100} />
            <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo longitudinal (perimetral)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Barra" valor={barra} onCambio={setBarra} opciones={BARRAS} />
            <Selector etiqueta="Confinamiento" valor={tipo} onCambio={setTipo} opciones={TIPOS} />
            <Campo etiqueta="Barras en cada cara extrema (ancho b)" valor={nb.txt} onCambio={nb.setTxt} min={2} max={12} ayuda="Incluye esquinas" />
            <Campo etiqueta="Filas de barras a lo largo de h" valor={nf.txt} onCambio={nf.setTxt} min={2} max={10} ayuda="Las intermedias llevan 2 barras" />
          </div>
        </Grupo>
      </div>

      <Grupo titulo="Demanda a verificar (flexión en el plano de h)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Pu (compresión +)" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} />
          <Campo etiqueta="Mu" unidad="kN·m" valor={mu.txt} onCambio={mu.setTxt} ayuda="Ya incluye magnificación por esbeltez si aplica (C.10.10)" />
        </div>
      </Grupo>

      {!datos && <Aviso tipo="error">Revisa los datos: valores positivos, 2d′ &lt; h, al menos 2 barras por cara y 2 filas.</Aviso>}

      {datos && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Ast" unidad="mm²" valor={fmt(datos.arm.Ast, 0)} nota={`${datos.arm.nBarras} barras · ρ = ${fmt(cuantia * 100, 2)} %`} />
            <Valor etiqueta="P0" unidad="kN" valor={fmt(datos.curva.P0, 0)} nota="0.85f′c(Ag − Ast) + fy Ast" />
            <Valor etiqueta="φPn,max" unidad="kN" valor={fmt(datos.curva.phiPnMax, 0)} nota={tipo === 'espiral' ? 'Ec. C.10-1' : 'Ec. C.10-2'} />
            <Valor etiqueta="Balanceado" valor={`${fmt(datos.curva.balanceado.Pn, 0)} kN`} nota={`Mn = ${fmt(datos.curva.balanceado.Mn, 0)} kN·m`} />
          </div>

          <div className="rounded-xl border p-3">
            <ChartContainer config={config} className="aspect-[16/10] w-full">
              <ScatterChart margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="M" name="M" domain={[0, 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'M (kN·m)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <YAxis type="number" dataKey="P" name="P" tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'P (kN)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ZAxis range={[60, 60]} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, n) => <span className="font-mono">{n} = {Number(v).toFixed(1)}</span>} />} />
                <Scatter name="Nominal" data={nominal} line={{ stroke: 'var(--color-nominal)', strokeWidth: 2, strokeDasharray: '6 4' }} shape={sinPunto} isAnimationActive={false} legendType="none" />
                <Scatter name="Diseño" data={diseno} line={{ stroke: 'var(--color-diseno)', strokeWidth: 2.5 }} shape={sinPunto} isAnimationActive={false} legendType="none" />
                <Scatter name="Demanda" data={demanda} fill={ver?.cumple ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))'} isAnimationActive={false} legendType="none" />
              </ScatterChart>
            </ChartContainer>
            <div className="mt-1 flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
              <span><span className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed align-middle" style={{ borderColor: 'var(--chart-3)' }} />Nominal (Pn, Mn)</span>
              <span><span className="mr-1 inline-block h-0 w-5 border-t-2 align-middle" style={{ borderColor: 'var(--chart-1)' }} />Diseño (φPn recortada en φPn,max, φMn)</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: ver?.cumple ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))' }} />(Mu, Pu)</span>
            </div>
          </div>

          {ver && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Valor
                destacado
                etiqueta="Verificación"
                valor={ver.cumple ? 'Cumple' : 'No cumple'}
                estado={ver.cumple ? 'ok' : 'mal'}
                nota={
                  ver.motivo === 'Pu-excede-tope'
                    ? 'Pu supera φPn,max (C.10.3.6)'
                    : ver.motivo === 'Pu-excede-traccion'
                      ? 'Tracción mayor que la de diseño'
                      : `Mu / φMn = ${fmt(ver.razon, 3)}`
                }
              />
              <Valor etiqueta="φMn disponible con Pu" unidad="kN·m" valor={ver.phiMnDisponible === null ? '—' : fmt(ver.phiMnDisponible, 1)} />
              <Valor etiqueta="Excentricidad e = Mu/Pu" unidad="mm" valor={ver.excentricidad === null ? '—' : fmt(ver.excentricidad, 0)} />
            </div>
          )}

          <div className="space-y-2">
            {datos.arm.Ast < datos.lim.min && <Aviso tipo="error">Ast = {fmt(datos.arm.Ast, 0)} mm² es menor que 0.01 Ag = {fmt(datos.lim.min, 0)} mm² (C.10.9.1).</Aviso>}
            {datos.arm.Ast > datos.lim.max && <Aviso tipo="error">Ast = {fmt(datos.arm.Ast, 0)} mm² excede 0.04 Ag = {fmt(datos.lim.max, 0)} mm² (C.10.9.1); en DMO/DES el máximo es menor (C.21).</Aviso>}
            {tipo === 'espiral' && datos.arm.nBarras < 6 && <Aviso tipo="error">Con espiral se exigen al menos 6 barras longitudinales (C.10.9.2).</Aviso>}
            {tipo === 'estribos' && datos.arm.nBarras < 4 && <Aviso tipo="error">Con estribos se exigen al menos 4 barras longitudinales (C.10.9.2).</Aviso>}
          </div>
        </>
      )}
      <PieCalc>Compatibilidad de deformaciones con εcu = 0.003 y bloque de 0.85 f′c (C.10.2); φ varía con εt (C.9.3.2) y φPn se recorta en φPn,max (C.10.3.6). Sección con refuerzo simétrico; no incluye esbeltez.</PieCalc>
    </div>
  );
}
