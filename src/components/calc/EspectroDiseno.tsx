import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { curvaEspectro, mesetaSa, periodosEspectro, sa, sd, sv, type ParametrosEspectro } from '@/lib/nsr10';
import { Aviso, Campo, PieCalc, Valor, fmt, useNum } from './ui';
import { useSitio } from './sitio';
import { useState } from 'react';

const config = { sa: { label: 'Sa (g)', color: 'var(--chart-1)' } } satisfies ChartConfig;

export default function EspectroDiseno() {
  const { sitio, campos } = useSitio();
  const t = useNum(1.0);
  const [ramaT0, setRamaT0] = useState(false);

  const p: ParametrosEspectro | null = sitio.valido ? { aa: sitio.aa, av: sitio.av, fa: sitio.fa!, fv: sitio.fv!, i: sitio.i } : null;
  const per = p ? periodosEspectro(p) : null;
  const tMax = per ? Math.max(4, Math.ceil(per.tl * 1.4)) : 4;
  const datos = useMemo(() => (p ? curvaEspectro(p, tMax, 240, { ramaInicialT0: ramaT0 }) : []), [p?.aa, p?.av, p?.fa, p?.fv, p?.i, tMax, ramaT0]);
  const tOk = Number.isFinite(t.n) && t.n >= 0;

  return (
    <div className="space-y-5">
      {campos}

      {sitio.perfil === 'F' && (
        <Aviso tipo="atencion">Perfil F: la norma exige un estudio de sitio (A.2.10); aquí no se puede calcular el espectro.</Aviso>
      )}
      {!sitio.valido && sitio.perfil !== 'F' && <Aviso tipo="error">Revisa Aa y Av (entre 0.05 y 0.50).</Aviso>}

      {p && per && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Valor etiqueta="Fa" valor={fmt(p.fa, 2)} />
            <Valor etiqueta="Fv" valor={fmt(p.fv, 2)} />
            <Valor etiqueta="T0" unidad="s" valor={fmt(per.t0, 3)} nota="A.2.6-6" />
            <Valor etiqueta="TC" unidad="s" valor={fmt(per.tc, 3)} nota="A.2.6-2" />
            <Valor etiqueta="TL" unidad="s" valor={fmt(per.tl, 2)} nota="A.2.6-4" />
            <Valor destacado etiqueta="Meseta Sa" unidad="g" valor={fmt(mesetaSa(p), 3)} nota="2.5·Aa·Fa·I" />
          </div>

          <div className="rounded-xl border p-3">
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" type="number" domain={[0, tMax]} tickFormatter={(v) => Number(v).toFixed(1)} label={{ value: 'T (s)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <YAxis tickFormatter={(v) => Number(v).toFixed(2)} label={{ value: 'Sa (g)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `T = ${Number(pl?.[0]?.payload?.t ?? 0).toFixed(3)} s`} formatter={(v) => <span className="font-mono">Sa = {Number(v).toFixed(3)} g</span>} />} />
                <Line type="linear" dataKey="sa" stroke="var(--color-sa)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <ReferenceLine x={per.tc} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: 'TC', position: 'top', fontSize: 11 }} />
                <ReferenceLine x={per.tl} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: 'TL', position: 'top', fontSize: 11 }} />
                {ramaT0 && <ReferenceLine x={per.t0} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: 'T0', position: 'top', fontSize: 11 }} />}
                {tOk && t.n <= tMax && <ReferenceDot x={t.n} y={sa(t.n, p, { ramaInicialT0: ramaT0 })} r={6} fill="var(--chart-2)" stroke="var(--background)" strokeWidth={2} />}
              </LineChart>
            </ChartContainer>
            <div className="mt-1 flex items-center gap-2 px-1">
              <Switch id="rama-t0" checked={ramaT0} onCheckedChange={setRamaT0} />
              <Label htmlFor="rama-t0" className="text-xs font-normal text-muted-foreground">
                Mostrar rama inicial T &lt; T0 (A.2.6.1.3: solo análisis dinámico, modos diferentes al fundamental)
              </Label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,14rem)_1fr]">
            <Campo etiqueta="Período T a evaluar" unidad="s" valor={t.txt} onCambio={t.setTxt} min={0} max={20} paso={0.1} />
            {tOk && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Valor destacado etiqueta="Sa(T)" unidad="g" valor={fmt(sa(t.n, p, { ramaInicialT0: ramaT0 }), 4)} nota="A.2.6.1" />
                <Valor etiqueta="Sv(T)" unidad="m/s" valor={fmt(sv(t.n, p), 4)} nota="A.2.6.2" />
                <Valor etiqueta="Sd(T)" unidad="m" valor={fmt(sd(t.n, p), 4)} nota="A.2.6.3" />
              </div>
            )}
          </div>
        </>
      )}
      <PieCalc>Espectro elástico con 5 % de amortiguamiento crítico; incluye el coeficiente de importancia I.</PieCalc>
    </div>
  );
}
