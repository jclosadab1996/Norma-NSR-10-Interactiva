import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { LIMITES_DISENO_DIRECTO, TABLA_C13633_VANO_FINAL } from '@/data/losasConcreto';
import { disenoDirectoPanel, lnMinimo, type TipoVanoFinal } from '@/lib/nsr10/losasConcreto';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  columna: { label: 'Franja de columna', color: 'var(--chart-1)' },
  central: { label: 'Franjas centrales', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const OPCIONES_VANO = [
  { value: 'interior', label: 'Vano interior (0.65 / 0.35)' },
  ...TABLA_C13633_VANO_FINAL.map((c) => ({ value: c.id, label: `Vano final, col. (${c.columna}): ${c.descripcion}` })),
];

export default function LosaDosDirecciones() {
  const l1 = useNum(6);
  const l2 = useNum(6);
  const ln = useNum(5.5);
  const qu = useNum(12);
  const alfa = useNum(0);
  const bt = useNum(0);
  const [vano, setVano] = useState<'interior' | TipoVanoFinal>('interior');

  const final = vano !== 'interior';
  const entradasOk = [l1.n, l2.n, ln.n, qu.n].every((x) => Number.isFinite(x) && x > 0) && Number.isFinite(alfa.n) && alfa.n >= 0 && Number.isFinite(bt.n) && bt.n >= 0;
  const l2l1 = l2.n / l1.n;
  const enRango = l2l1 >= 0.5 && l2l1 <= 2;

  const r = useMemo(() => {
    if (!entradasOk || !enRango) return null;
    try {
      return disenoDirectoPanel({ qu: qu.n, l1: l1.n, l2: l2.n, ln: ln.n, vano, alfaF1: alfa.n, betaT: bt.n });
    } catch {
      return null;
    }
  }, [entradasOk, enRango, qu.n, l1.n, l2.n, ln.n, vano, alfa.n, bt.n]);

  const filas = r
    ? [
        ...(r.total.negExterior !== null && r.pct.negExterior !== null && r.franjaColumna.negExterior !== null && r.franjaCentral.negExterior !== null
          ? [{ id: 'negExt', nombre: 'Negativo exterior', total: r.total.negExterior, pct: r.pct.negExterior, col: r.franjaColumna.negExterior, cen: r.franjaCentral.negExterior, vig: r.vigas.momentos.negExterior ?? 0 }]
          : []),
        { id: 'pos', nombre: 'Positivo', total: r.total.positivo, pct: r.pct.positivo, col: r.franjaColumna.positivo, cen: r.franjaCentral.positivo, vig: r.vigas.momentos.positivo },
        { id: 'negInt', nombre: final ? 'Negativo interior' : 'Negativo (ambos apoyos)', total: r.total.negInterior, pct: r.pct.negInterior, col: r.franjaColumna.negInterior, cen: r.franjaCentral.negInterior, vig: r.vigas.momentos.negInterior },
      ]
    : [];

  const lnMin = lnMinimo(l1.n);

  return (
    <div className="space-y-5">
      <Grupo titulo="Panel y carga (método de diseño directo, C.13.6)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Luz ℓ1 en la dirección de análisis (centro a centro)" unidad="m" valor={l1.txt} onCambio={l1.setTxt} min={1} paso={0.1} />
          <Campo etiqueta="Luz transversal ℓ2 (centro a centro)" unidad="m" valor={l2.txt} onCambio={l2.setTxt} min={1} paso={0.1} ayuda="ℓ2/ℓ1 debe estar entre 0.5 y 2.0 (C.13.6.1.2 y tablas de C.13.6.4)" />
          <Campo etiqueta="Luz libre ℓn (cara a cara)" unidad="m" valor={ln.txt} onCambio={ln.setTxt} min={1} paso={0.1} ayuda="No se usa menor que 0.65 ℓ1 (C.13.6.2.5)" />
          <Campo etiqueta="Carga mayorada qu" unidad="kN/m²" valor={qu.txt} onCambio={qu.setTxt} min={0.1} paso={0.5} ayuda="Uniforme sobre todo el panel; L ≤ 2D sin mayorar (C.13.6.1.5)" />
          <Campo etiqueta="αf1 de las vigas en la dirección ℓ1" valor={alfa.txt} onCambio={alfa.setTxt} min={0} paso={0.1} ayuda="0 si la losa no tiene vigas (Ec. C.13-3)" />
          {final && <Campo etiqueta="βt de la viga de borde" valor={bt.txt} onCambio={bt.setTxt} min={0} paso={0.1} ayuda="Ec. C.13-5; 0 si no hay viga de borde" />}
          <Selector etiqueta="Tipo de vano" valor={vano} onCambio={(v) => setVano(v as 'interior' | TipoVanoFinal)} opciones={OPCIONES_VANO} className="sm:col-span-2 lg:col-span-3" />
        </div>
      </Grupo>

      {!entradasOk && <Aviso tipo="error">Revisa los datos: luces y carga positivas; αf1 y βt no negativos.</Aviso>}
      {entradasOk && !enRango && <Aviso tipo="error">ℓ2/ℓ1 = {fmt(l2l1, 2)} está fuera del rango 0.5 a 2.0 de las tablas de C.13.6.4: el método de diseño directo no aplica.</Aviso>}
      {entradasOk && ln.n < lnMin && <Aviso tipo="atencion">ℓn = {fmt(ln.n, 2)} m es menor que 0.65 ℓ1 = {fmt(lnMin, 2)} m: se usa 0.65 ℓ1 en la Ec. C.13-4 (C.13.6.2.5).</Aviso>}
      {entradasOk && Math.max(l1.n, l2.n) / Math.min(l1.n, l2.n) > LIMITES_DISENO_DIRECTO.relacionLucesMax && <Aviso tipo="atencion">La relación entre luz mayor y menor excede 2 (C.13.6.1.2).</Aviso>}

      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor destacado etiqueta="Mo = qu ℓ2 ℓn² / 8" unidad="kN·m" valor={fmt(r.Mo, 2)} nota={`ℓn usada = ${fmt(r.lnUsado, 2)} m (C.13-4)`} />
            <Valor etiqueta="ℓ2/ℓ1" valor={fmt(r.l2l1, 3)} />
            <Valor etiqueta="αf1 ℓ2/ℓ1" valor={fmt(r.alfaL, 3)} nota="Entra en C.13.6.4 y C.13.6.5" />
            <Valor etiqueta="Ancho franja de columna" unidad="m" valor={fmt(r.anchoColumna, 2)} nota={`Central: ${fmt(r.anchoCentral, 2)} m (autor)`} />
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Sección</th>
                  <th className="p-2 text-right">Total (kN·m)</th>
                  <th className="p-2 text-right">% columna</th>
                  <th className="p-2 text-right">Franja de columna</th>
                  <th className="p-2 text-right">Franjas centrales</th>
                  <th className="p-2 text-right">Vigas ({fmt(r.vigas.fraccion * 100, 1)} %)</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filas.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="p-2 font-sans">{f.nombre}</td>
                    <td className="p-2 text-right">{fmt(f.total, 2)}</td>
                    <td className="p-2 text-right">{fmt(f.pct, 1)}</td>
                    <td className="p-2 text-right">{fmt(f.col, 2)}</td>
                    <td className="p-2 text-right">{fmt(f.cen, 2)}</td>
                    <td className="p-2 text-right">{fmt(f.vig, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Distribución del momento estático total en franjas (kN·m)</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <BarChart data={filas.map((f) => ({ nombre: f.nombre, columna: Number(f.col.toFixed(2)), central: Number(f.cen.toFixed(2)) }))} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'M (kN·m)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(2)} kN·m</span>} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="columna" stackId="m" fill="var(--color-columna)" isAnimationActive={false} />
                <Bar dataKey="central" stackId="m" fill="var(--color-central)" isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            La suma de las dos barras de cada sección es el momento total del pórtico en esa sección. Los momentos son los del ancho completo ℓ2 del pórtico; para obtener
            kN·m por metro basta dividir entre el ancho de cada franja (franja de columna {fmt(r.anchoColumna, 2)} m; franjas centrales {fmt(r.anchoCentral, 2)} m, dato del autor).
          </p>
        </>
      )}
      <PieCalc>Mo (C.13-4), reparto (C.13.6.3), porcentajes de franja de columna interpolados linealmente (C.13.6.4.1, .2, .4) y vigas (C.13.6.5). No verifica todas las limitaciones de C.13.6.1.</PieCalc>
    </div>
  );
}
