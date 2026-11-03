import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { PerfilSuelo } from '@/data/tablas';
import { coeficienteFv, parametroS, periodosUmbral, sad } from '@/lib/nsr10';
import { Aviso, Campo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';
import { OPCIONES_PERFIL } from './sitio';

const config = { sad: { label: 'Sad (g)', color: 'var(--chart-2)' } } satisfies ChartConfig;

export default function UmbralDano() {
  const ad = useNum(0.08);
  const t = useNum(0.8);
  const [perfil, setPerfil] = useState<PerfilSuelo>('D');

  const okAd = Number.isFinite(ad.n) && ad.n > 0 && ad.n <= 0.2;
  const fv = okAd ? coeficienteFv(perfil, ad.n) : null; // A.12.3.1: Fv con Av = Ad
  const p = okAd && fv !== null ? { ad: ad.n, fv } : null;
  const per = fv !== null ? periodosUmbral(fv) : null;
  const tMax = per ? Math.max(4, Math.ceil(per.tld * 1.3)) : 4;
  const datos = useMemo(() => {
    if (!p || !per) return [];
    const ts = new Set<number>();
    for (let k = 0; k <= 240; k++) ts.add((k / 240) * tMax);
    [0.25, per.tcd, per.tld].forEach((x) => x < tMax && ts.add(x));
    return [...ts].sort((a, b) => a - b).map((x) => ({ t: x, sad: sad(x, p) }));
  }, [p?.ad, p?.fv, tMax]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etiqueta="Ad" valor={ad.txt} onCambio={ad.setTxt} min={0.01} max={0.15} paso={0.01} ayuda="Aceleración pico del umbral de daño (Apéndice A-4 o Tabla A.12.2-2)" />
        <Selector etiqueta="Perfil de suelo" valor={perfil} onCambio={(v) => setPerfil(v as PerfilSuelo)} opciones={OPCIONES_PERFIL} />
        <Campo etiqueta="Período T" unidad="s" valor={t.txt} onCambio={t.setTxt} min={0.05} max={10} paso={0.05} />
      </div>
      {perfil === 'F' && <Aviso tipo="atencion">Perfil F: requiere estudio de sitio (A.2.10).</Aviso>}
      {!okAd && <Aviso tipo="error">Ad debe estar entre 0.01 y 0.15 aproximadamente.</Aviso>}

      {p && per && fv !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Valor etiqueta="Fv (con Av = Ad)" valor={fmt(fv, 2)} nota="A.12.3.1" />
            <Valor etiqueta="S = 1.25·Fv" valor={fmt(parametroS(fv), 3)} />
            <Valor etiqueta="TCd = 0.5·S" unidad="s" valor={fmt(per.tcd, 3)} />
            <Valor etiqueta="TLd = 2.4·S" unidad="s" valor={fmt(per.tld, 2)} />
            <Valor destacado etiqueta="Sad(T)" unidad="g" valor={fmt(Number.isFinite(t.n) ? sad(t.n, p) : NaN, 4)} nota="A.12.3" />
          </div>
          <div className="rounded-xl border p-3">
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" type="number" domain={[0, tMax]} tickFormatter={(v) => Number(v).toFixed(1)} label={{ value: 'T (s)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <YAxis tickFormatter={(v) => Number(v).toFixed(2)} label={{ value: 'Sad (g)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `T = ${Number(pl?.[0]?.payload?.t ?? 0).toFixed(3)} s`} formatter={(v) => <span className="font-mono">Sad = {Number(v).toFixed(4)} g</span>} />} />
                <Line type="linear" dataKey="sad" stroke="var(--color-sad)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <ReferenceLine x={0.25} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: '0.25', position: 'top', fontSize: 11 }} />
                <ReferenceLine x={per.tcd} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: 'TCd', position: 'top', fontSize: 11 }} />
                <ReferenceLine x={per.tld} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: 'TLd', position: 'top', fontSize: 11 }} />
              </LineChart>
            </ChartContainer>
          </div>
        </>
      )}
      <PieCalc>Espectro elástico con 2 % de amortiguamiento para verificar el umbral de daño de edificaciones de los grupos de uso III y IV (A.12).</PieCalc>
    </div>
  );
}
