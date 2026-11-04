import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { beta1, lambdaConcreto, lambdaPorHendimiento, moduloElasticidad, moduloRotura, WC_MAX, WC_MIN, type TipoConcreto } from '@/lib/nsr10/concreto';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const configEc = {
  normal: { label: 'Ec = 4700 √f′c', color: 'var(--chart-1)' },
  conWc: { label: 'Ec = wc^1.5 · 0.043 · √f′c', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const configBeta = { beta: { label: 'β1', color: 'var(--chart-2)' } } satisfies ChartConfig;

const TIPOS = [
  { value: 'normal', label: 'Peso normal (λ = 1.0)' },
  { value: 'liviano-arena-normal', label: 'Liviano con arena de peso normal (λ = 0.85)' },
  { value: 'liviano-otros', label: 'Liviano, otros (λ = 0.75)' },
  { value: 'hendimiento', label: 'Se especifica fct por hendimiento' },
] as const;

const MODOS_EC = [
  { value: 'normal', label: 'Densidad normal: 4700 √f′c' },
  { value: 'wc', label: 'General con densidad wc (1440–2560 kg/m³)' },
] as const;

const FC_MIN = 14;
const FC_MAX = 80;

export default function PropiedadesConcreto() {
  const fc = useNum(28);
  const wc = useNum(2300);
  const fct = useNum(2.5);
  const [tipo, setTipo] = useState<string>('normal');
  const [modoEc, setModoEc] = useState<string>('normal');

  const fcOk = Number.isFinite(fc.n) && fc.n > 0;
  const wcOk = Number.isFinite(wc.n) && wc.n >= WC_MIN && wc.n <= WC_MAX;
  const usaWc = modoEc === 'wc';

  const lambda = useMemo(() => {
    if (!fcOk) return NaN;
    if (tipo === 'hendimiento') return Number.isFinite(fct.n) && fct.n > 0 ? lambdaPorHendimiento(fct.n, fc.n) : NaN;
    return lambdaConcreto(tipo as TipoConcreto);
  }, [tipo, fc.n, fct.n, fcOk]);

  const ecNormal = fcOk ? moduloElasticidad(fc.n) : NaN;
  const ecWc = fcOk && wcOk ? moduloElasticidad(fc.n, wc.n) : NaN;
  const ec = usaWc ? ecWc : ecNormal;
  const fr = fcOk && Number.isFinite(lambda) ? moduloRotura(fc.n, lambda) : NaN;
  const b1 = fcOk ? beta1(fc.n) : NaN;

  const datos = useMemo(() => {
    const filas: { fc: number; normal: number; conWc?: number; beta: number }[] = [];
    for (let f = FC_MIN; f <= FC_MAX; f += 1) {
      filas.push({
        fc: f,
        normal: moduloElasticidad(f) / 1000,
        conWc: wcOk ? moduloElasticidad(f, wc.n) / 1000 : undefined,
        beta: beta1(f),
      });
    }
    return filas;
  }, [wcOk, wc.n]);

  const dentro = fcOk && fc.n >= FC_MIN && fc.n <= FC_MAX;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Concreto">
          <Campo etiqueta="Resistencia a la compresión f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={1} paso={1} />
          <Selector etiqueta="Tipo de concreto (factor λ)" valor={tipo} onCambio={setTipo} opciones={TIPOS} />
          {tipo === 'hendimiento' && (
            <Campo
              etiqueta="Resistencia a la tracción por hendimiento fct"
              unidad="MPa"
              valor={fct.txt}
              onCambio={fct.setTxt}
              min={0.1}
              ayuda="λ = fct / (0.56 √f′c), no mayor que 1.0 (C.8.6.1)"
            />
          )}
        </Grupo>
        <Grupo titulo="Módulo de elasticidad Ec">
          <Selector etiqueta="Ecuación de Ec (C.8.5.1)" valor={modoEc} onCambio={setModoEc} opciones={MODOS_EC} />
          {usaWc && (
            <Campo etiqueta="Densidad del concreto wc" unidad="kg/m³" valor={wc.txt} onCambio={wc.setTxt} min={WC_MIN} max={WC_MAX} paso={10} />
          )}
        </Grupo>
      </div>

      {!fcOk && <Aviso tipo="error">Escribe un f′c mayor que cero.</Aviso>}
      {usaWc && !wcOk && <Aviso tipo="error">La ecuación general de Ec vale para {WC_MIN} ≤ wc ≤ {WC_MAX} kg/m³.</Aviso>}
      {tipo === 'hendimiento' && fcOk && !Number.isFinite(lambda) && <Aviso tipo="error">Escribe un fct mayor que cero.</Aviso>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Valor destacado etiqueta="Ec" unidad="MPa" valor={fmt(ec, 0)} nota={usaWc ? 'wc^1.5 · 0.043 · √f′c' : '4700 √f′c'} />
        <Valor etiqueta="Ec (otra ecuación)" unidad="MPa" valor={fmt(usaWc ? ecNormal : ecWc, 0)} nota={usaWc ? '4700 √f′c (comparación)' : 'con wc = ' + (wcOk ? wc.n : '—') + ' kg/m³ (comparación)'} />
        <Valor etiqueta="fr = 0.62 λ √f′c" unidad="MPa" valor={fmt(fr, 3)} nota={`λ = ${fmt(lambda, 3)} · Ec. C.9-10`} />
        <Valor destacado etiqueta="β1" valor={fmt(b1, 3)} nota="C.10.2.7.3" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-3">
          <p className="mb-1 px-1 text-sm font-medium">Ec en función de f′c</p>
          <ChartContainer config={configEc} className="aspect-[16/10] w-full">
            <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fc" type="number" domain={[FC_MIN, FC_MAX]} label={{ value: 'f′c (MPa)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
              <YAxis tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'Ec (GPa)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `f′c = ${pl?.[0]?.payload?.fc} MPa`} formatter={(v, n) => <span className="font-mono">{String(n) === 'normal' ? '4700√f′c' : 'con wc'}: {Number(v).toFixed(2)} GPa</span>} />} />
              <Line type="monotone" dataKey="normal" stroke="var(--color-normal)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              {wcOk && <Line type="monotone" dataKey="conWc" stroke="var(--color-conWc)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />}
              {dentro && Number.isFinite(ec) && <ReferenceDot x={fc.n} y={ec / 1000} r={6} fill="var(--chart-2)" stroke="var(--background)" strokeWidth={2} />}
            </LineChart>
          </ChartContainer>
          <p className="px-1 text-xs text-muted-foreground">Línea discontinua: ecuación general con wc = {wcOk ? wc.n : '—'} kg/m³.</p>
        </div>

        <div className="rounded-xl border p-3">
          <p className="mb-1 px-1 text-sm font-medium">β1 en función de f′c</p>
          <ChartContainer config={configBeta} className="aspect-[16/10] w-full">
            <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fc" type="number" domain={[FC_MIN, FC_MAX]} label={{ value: 'f′c (MPa)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
              <YAxis domain={[0.6, 0.9]} tickFormatter={(v) => Number(v).toFixed(2)} label={{ value: 'β1', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `f′c = ${pl?.[0]?.payload?.fc} MPa`} formatter={(v) => <span className="font-mono">β1 = {Number(v).toFixed(3)}</span>} />} />
              <Line type="linear" dataKey="beta" stroke="var(--color-beta)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              {dentro && Number.isFinite(b1) && <ReferenceDot x={fc.n} y={b1} r={6} fill="var(--chart-1)" stroke="var(--background)" strokeWidth={2} />}
            </LineChart>
          </ChartContainer>
          <p className="px-1 text-xs text-muted-foreground">0.85 hasta 28 MPa; baja 0.05 por cada 7 MPa y no menos de 0.65.</p>
        </div>
      </div>

      <PieCalc>Ec según C.8.5.1, fr según la Ec. C.9-10 y β1 según C.10.2.7.3.</PieCalc>
    </div>
  );
}
