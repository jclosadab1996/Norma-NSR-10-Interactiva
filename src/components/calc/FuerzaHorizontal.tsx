import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cortanteBasal, distribuirFuerzas, exponenteK, sa, type ParametrosEspectro } from '@/lib/nsr10';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import { useSitio } from './sitio';

const config = { fx: { label: 'Fx (kN)', color: 'var(--chart-1)' } } satisfies ChartConfig;

export default function FuerzaHorizontal() {
  const { sitio, campos } = useSitio();
  const t = useNum(0.8);
  const pisos = useNum(5);
  const hp = useNum(3);
  const masa = useNum(120);
  const [usarMasaPropia, setUsarMasaPropia] = useState(false);
  const [masas, setMasas] = useState<string[]>([]);

  const n = Math.max(1, Math.min(30, Math.round(pisos.n || 0)));
  const masaPiso = (i: number) => (usarMasaPropia && masas[i] !== undefined ? Number(masas[i].replace(',', '.')) : masa.n);
  const niveles = Array.from({ length: n }, (_, i) => ({ h: (i + 1) * hp.n, m: masaPiso(i) * 1000 }));
  const entradasOk = Number.isFinite(t.n) && t.n > 0 && Number.isFinite(hp.n) && hp.n > 0 && niveles.every((x) => Number.isFinite(x.m) && x.m > 0);

  const p: ParametrosEspectro | null = sitio.valido ? { aa: sitio.aa, av: sitio.av, fa: sitio.fa!, fv: sitio.fv!, i: sitio.i } : null;
  const saT = p && entradasOk ? sa(t.n, p) : NaN;
  const masaTotal = niveles.reduce((s, x) => s + x.m, 0);
  const vs = Number.isFinite(saT) ? cortanteBasal(saT, masaTotal) : NaN; // N
  const filas = Number.isFinite(vs) ? distribuirFuerzas(niveles, vs, t.n) : [];
  const datos = filas.map((f, i) => ({ piso: `P${i + 1}`, fx: f.fx / 1000 }));
  const peso = masaTotal * 9.8;

  return (
    <div className="space-y-5">
      {campos}
      <Grupo titulo="Edificación">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Período T" unidad="s" valor={t.txt} onCambio={t.setTxt} min={0.05} max={10} paso={0.05} ayuda="Calculado según A.4.2 (ver calculadora de período)" />
          <Campo etiqueta="Número de pisos" valor={pisos.txt} onCambio={pisos.setTxt} min={1} max={30} />
          <Campo etiqueta="Altura de piso" unidad="m" valor={hp.txt} onCambio={hp.setTxt} min={2} max={6} paso={0.1} />
          <Campo etiqueta="Masa por piso" unidad="t" valor={masa.txt} onCambio={masa.setTxt} min={1} ayuda="Igual en todos los pisos (1 t = 1000 kg)" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={usarMasaPropia} onChange={(e) => { setUsarMasaPropia(e.target.checked); if (e.target.checked && masas.length === 0) setMasas(Array.from({ length: n }, () => masa.txt)); }} />
          Definir una masa distinta para cada piso
        </label>
        {usarMasaPropia && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: n }, (_, i) => (
              <Campo key={i} etiqueta={`Piso ${i + 1}`} unidad="t" valor={masas[i] ?? masa.txt} onCambio={(v) => { const c = [...masas]; c[i] = v; setMasas(c); }} />
            ))}
          </div>
        )}
      </Grupo>

      {sitio.perfil === 'F' && <Aviso tipo="atencion">Perfil F: requiere estudio de sitio (A.2.10).</Aviso>}
      {!sitio.valido && sitio.perfil !== 'F' && <Aviso tipo="error">Revisa Aa y Av.</Aviso>}
      {sitio.valido && !entradasOk && <Aviso tipo="error">Revisa T, la altura de piso y las masas (valores positivos).</Aviso>}

      {Number.isFinite(vs) && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Valor etiqueta="Sa(T)" unidad="g" valor={fmt(saT, 4)} nota="A.2.6" />
            <Valor etiqueta="Masa total M" unidad="t" valor={fmt(masaTotal / 1000, 1)} />
            <Valor destacado etiqueta="Vs = Sa·g·M" unidad="kN" valor={fmt(vs / 1000, 1)} nota="A.4.3-1" />
            <Valor etiqueta="Vs / W" valor={`${fmt((vs / peso) * 100, 1)} %`} nota="Cortante como % del peso" />
            <Valor etiqueta="k" valor={fmt(exponenteK(t.n), 3)} nota="A.4.3.2" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    {['Piso', 'h (m)', 'm (t)', 'm·hᵏ', 'Cvx', 'Fx (kN)', 'V piso (kN)'].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {[...filas].reverse().map((f, ri) => {
                    const i = filas.length - 1 - ri;
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1 text-left">{i + 1}</td>
                        <td className="px-2 py-1 text-right">{fmt(f.h, 1)}</td>
                        <td className="px-2 py-1 text-right">{fmt(f.m / 1000, 1)}</td>
                        <td className="px-2 py-1 text-right">{(f.mhk / 1000).toFixed(1)}</td>
                        <td className="px-2 py-1 text-right">{fmt(f.cvx, 4)}</td>
                        <td className="px-2 py-1 text-right font-semibold">{fmt(f.fx / 1000, 1)}</td>
                        <td className="px-2 py-1 text-right">{fmt(f.cortantePiso / 1000, 1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-mono text-xs">
                  <tr>
                    <td className="px-2 py-1.5" colSpan={5}>Σ Fx</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{fmt(filas.reduce((s, f) => s + f.fx, 0) / 1000, 1)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <ChartContainer config={config} className="aspect-[4/3] w-full">
              <BarChart data={datos} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <YAxis type="category" dataKey="piso" reversed={false} tickLine={false} width={34} />
                <XAxis type="number" tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'Fx (kN)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{Number(v).toFixed(1)} kN</span>} />} />
                <Bar dataKey="fx" fill="var(--color-fx)" radius={3} />
              </BarChart>
            </ChartContainer>
          </div>
        </>
      )}
      <PieCalc>Fx = Cvx·Vs con Cvx = m_x·h_xᵏ / Σ(m_i·h_iᵏ) (A.4.3-2 y A.4.3-3). Masas en toneladas; g = 9.8 m/s².</PieCalc>
    </div>
  );
}
