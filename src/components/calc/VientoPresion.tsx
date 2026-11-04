import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { TABLA_B652_CONSTANTES } from '@/data/vientoAnalitico';
import { factorImportanciaViento, kz, presionVelocidad, type Exposicion, type GrupoUsoViento } from '@/lib/nsr10/viento';
import { G_RIGIDA, presionSPRFV, presionesEdificioRigido, type Cerramiento } from '@/lib/nsr10/vientoPresiones';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const configBarras = {
  pMax: { label: 'Máxima presión (hacia la superficie)', color: 'var(--chart-1)' },
  pMin: { label: 'Máxima succión (hacia afuera)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const configPerfil = {
  mas: { label: 'Con +GCpi', color: 'var(--chart-1)' },
  menos: { label: 'Con −GCpi', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const OPCIONES_EXPOSICION = [
  { value: 'B', label: 'B — urbano, suburbano o boscoso' },
  { value: 'C', label: 'C — terreno abierto con pocas obstrucciones' },
  { value: 'D', label: 'D — terreno plano sin obstrucciones, superficies de agua' },
] as const;
const OPCIONES_GRUPO = (['I', 'II', 'III', 'IV'] as const).map((g) => ({
  value: g,
  label: `Grupo ${g} — I = ${factorImportanciaViento(g).toFixed(2)}`,
}));
const OPCIONES_CERRAMIENTO = [
  { value: 'cerrado', label: 'Cerrado — GCpi = ±0.18' },
  { value: 'parcial', label: 'Parcialmente cerrado — GCpi = ±0.55' },
  { value: 'abierto', label: 'Abierto — GCpi = 0.00' },
] as const;
const OPCIONES_DIRECCION = [
  { value: 'normal', label: 'Normal (perpendicular) a la cumbrera' },
  { value: 'paralela', label: 'Paralelo a la cumbrera' },
] as const;

/** Formatea uno o varios Cp. */
const fmtCp = (cps: number[]) => cps.map((c) => c.toFixed(2)).join(' / ');

export default function VientoPresion() {
  const v = useNum(30);
  const [exposicion, setExposicion] = useState<Exposicion>('B');
  const [grupo, setGrupo] = useState<GrupoUsoViento>('II');
  const kzt = useNum(1);
  const kd = useNum(0.85);
  const h = useNum(12);
  const l = useNum(20);
  const b = useNum(40);
  const theta = useNum(15);
  const [cerramiento, setCerramiento] = useState<Cerramiento>('cerrado');
  const [direccion, setDireccion] = useState<'normal' | 'paralela'>('normal');
  const zAb = useNum(12);

  const zg = TABLA_B652_CONSTANTES[exposicion].zg;
  const entradasOk =
    [v.n, kzt.n, kd.n, h.n, l.n, b.n, theta.n].every(Number.isFinite) &&
    v.n > 0 && kzt.n > 0 && kd.n > 0 && h.n > 0 && h.n <= zg && l.n > 0 && b.n > 0 && theta.n >= 0 && theta.n <= 90 &&
    (cerramiento !== 'parcial' || (Number.isFinite(zAb.n) && zAb.n > 0 && zAb.n <= zg));

  const iViento = factorImportanciaViento(grupo);

  const calc = useMemo(() => {
    if (!entradasOk) return null;
    const qAt = (z: number) => presionVelocidad({ V: v.n, Kz: kz(exposicion, z), Kzt: kzt.n, Kd: kd.n, I: iViento });
    const qh = qAt(h.n);
    const qiPositiva = cerramiento === 'parcial' ? qAt(zAb.n) : qh;
    const res = presionesEdificioRigido({
      qh, qzBarlovento: qh, qiPositiva, g: G_RIGIDA, cerramiento, L: l.n, B: b.n, h: h.n, theta: theta.n, direccion,
    });
    // Perfil del muro a barlovento: p(z) con q = qz variable (B.6.5-15, Cp = 0.8).
    const n = 12;
    const perfil = Array.from({ length: n + 1 }, (_, i) => {
      const z = (h.n * i) / n;
      const qz = qAt(Math.max(z, 0));
      return {
        z: Number(z.toFixed(2)),
        mas: presionSPRFV({ q: qz, g: G_RIGIDA, cp: 0.8, qi: qiPositiva, gcpi: res.gcpiPositivo }),
        menos: presionSPRFV({ q: qz, g: G_RIGIDA, cp: 0.8, qi: qh, gcpi: res.gcpiNegativo }),
      };
    });
    return { qh, kh: kz(exposicion, h.n), qiPositiva, res, perfil };
  }, [entradasOk, v.n, exposicion, iViento, kzt.n, kd.n, h.n, l.n, b.n, theta.n, cerramiento, direccion, zAb.n]);

  const datosBarras = calc?.res.filas.map((f) => ({ superficie: f.nombre.replace('Cubierta, franja', 'Cub. franja'), pMax: f.pMax, pMin: f.pMin })) ?? [];
  const esBajo = h.n <= 18 && h.n <= Math.min(l.n, b.n);

  return (
    <div className="space-y-5">
      <Grupo titulo="Viento y sitio">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Velocidad básica V" unidad="m/s" valor={v.txt} onCambio={v.setTxt} min={10} max={80} paso={1} ayuda="Figura B.6.5-1 (ver calculadora de exposición)" />
          <Selector etiqueta="Exposición" valor={exposicion} onCambio={(x) => setExposicion(x as Exposicion)} opciones={OPCIONES_EXPOSICION} />
          <Selector etiqueta="Grupo de uso (I)" valor={grupo} onCambio={(x) => setGrupo(x as GrupoUsoViento)} opciones={OPCIONES_GRUPO} />
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Kzt" valor={kzt.txt} onCambio={kzt.setTxt} min={1} max={3} paso={0.05} />
            <Campo etiqueta="Kd" valor={kd.txt} onCambio={kd.setTxt} min={0.8} max={1} paso={0.05} ayuda="0.85 edificios" />
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Edificio">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Altura media h" unidad="m" valor={h.txt} onCambio={h.setTxt} min={2} max={zg} paso={0.5} ayuda="Para θ ≤ 10° use la altura del alero" />
          <Campo etiqueta="L (paralela al viento)" unidad="m" valor={l.txt} onCambio={l.setTxt} min={1} paso={1} />
          <Campo etiqueta="B (normal al viento)" unidad="m" valor={b.txt} onCambio={b.setTxt} min={1} paso={1} />
          <Campo etiqueta="Ángulo de cubierta θ" unidad="°" valor={theta.txt} onCambio={theta.setTxt} min={0} max={90} paso={1} />
          <Selector etiqueta="Dirección del viento" valor={direccion} onCambio={(x) => setDireccion(x as 'normal' | 'paralela')} opciones={OPCIONES_DIRECCION} />
          <Selector etiqueta="Clasificación del cerramiento" valor={cerramiento} onCambio={(x) => setCerramiento(x as Cerramiento)} opciones={OPCIONES_CERRAMIENTO} />
          {cerramiento === 'parcial' && (
            <Campo etiqueta="Altura de la abertura más alta" unidad="m" valor={zAb.txt} onCambio={zAb.setTxt} min={0.5} max={zg} paso={0.5} ayuda="Para qi con presión interna positiva" />
          )}
        </div>
      </Grupo>

      {!entradasOk && <Aviso tipo="error">Revisa los datos: valores positivos, h ≤ zg ({zg} m) y 0° ≤ θ ≤ 90°.</Aviso>}
      {cerramiento === 'abierto' && <Aviso tipo="atencion">Edificio abierto: GCpi = 0. Para cubiertas libres (sin muros) el SPRFV usa los coeficientes netos CN de B.6.5.13, no los de esta calculadora.</Aviso>}
      {entradasOk && h.n > 18 && <Aviso tipo="nota">h &gt; 18 m: el método de B.6.5.12.2.1 es el aplicable al SPRFV; verifica que la estructura sea rígida (frecuencia ≥ 1 Hz) o use Gf (B.6.5.8.2).</Aviso>}
      {entradasOk && theta.n >= 10 && theta.n <= 90 && direccion === 'normal' && (
        <Aviso tipo="nota">Se usa G = 0.85 (B.6.5.8.1). Cp de la Figura B.6.5-3 interpolado en h/L = {fmt(h.n / l.n, 2)} y θ = {fmt(theta.n, 0)}°.</Aviso>
      )}
      {calc?.res.advertencias.map((a, i) => (
        <Aviso key={i} tipo="atencion">{a}</Aviso>
      ))}

      {calc && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Kh (a la altura h)" valor={fmt(calc.kh, 3)} nota="B.6.5.6 / Tabla B.6.5-3" />
            <Valor destacado etiqueta="qh = 0.613·Kh·Kzt·Kd·V²·I" unidad="N/m²" valor={fmt(calc.qh, 0)} nota="B.6.5-13" />
            <Valor etiqueta="GCpi" valor={cerramiento === 'abierto' ? '0.00' : `± ${fmt(calc.res.gcpiPositivo, 2)}`} nota="Figura B.6.5-2" />
            <Valor etiqueta="h/L · L/B" valor={`${fmt(h.n / l.n, 2)} · ${fmt(l.n / b.n, 2)}`} nota={esBajo ? 'Edificio bajo: también aplica GCpf (B.6.5-16)' : undefined} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="px-2 py-1.5 text-left">Superficie</th>
                  <th className="px-2 py-1.5 text-right">q usada</th>
                  <th className="px-2 py-1.5 text-right">Cp</th>
                  <th className="px-2 py-1.5 text-right">p con +GCpi (N/m²)</th>
                  <th className="px-2 py-1.5 text-right">p con −GCpi (N/m²)</th>
                  <th className="px-2 py-1.5 text-right">Envolvente (N/m²)</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {calc.res.filas.map((f) => (
                  <tr key={f.clave} className="border-t align-top">
                    <td className="px-2 py-1 text-left font-sans">{f.nombre}</td>
                    <td className="px-2 py-1 text-right">{f.q === 'qz' ? `qz(h) = ${fmt(calc.qh, 0)}` : `qh = ${fmt(calc.qh, 0)}`}</td>
                    <td className="px-2 py-1 text-right">{fmtCp(f.cps)}</td>
                    <td className="px-2 py-1 text-right">{f.casos.map((c) => fmt(c.pConGcpiMas, 0)).join(' / ')}</td>
                    <td className="px-2 py-1 text-right">{f.casos.map((c) => fmt(c.pConGcpiMenos, 0)).join(' / ')}</td>
                    <td className="px-2 py-1 text-right font-semibold">{fmt(f.pMin, 0)} a {fmt(f.pMax, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium">Envolvente de presión por superficie (N/m²)</p>
              <ChartContainer config={configBarras} className="aspect-[4/3] w-full">
                <BarChart data={datosBarras} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis type="category" dataKey="superficie" tickLine={false} width={104} fontSize={11} />
                  <XAxis type="number" tickFormatter={(x) => Number(x).toFixed(0)} />
                  <ReferenceLine x={0} stroke="var(--foreground)" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(val) => <span className="font-mono">{Number(val).toFixed(0)} N/m²</span>} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="pMax" fill="var(--color-pMax)" radius={2} />
                  <Bar dataKey="pMin" fill="var(--color-pMin)" radius={2} />
                </BarChart>
              </ChartContainer>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Muro a barlovento: presión según la altura z (N/m²)</p>
              <ChartContainer config={configPerfil} className="aspect-[4/3] w-full">
                <LineChart data={calc.perfil} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid />
                  <XAxis type="number" domain={['auto', 'auto']} tickFormatter={(x) => Number(x).toFixed(0)} />
                  <YAxis type="number" dataKey="z" domain={[0, 'dataMax']} width={36} label={{ value: 'z (m)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(val) => <span className="font-mono">{Number(val).toFixed(0)} N/m²</span>} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="mas" stroke="var(--color-mas)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="menos" stroke="var(--color-menos)" dot={false} strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </>
      )}
      <PieCalc>
        p = q·G·Cp − qi·(GCpi) (B.6.5-15) con G = 0.85; positiva = hacia la superficie. Muro a barlovento con qz variable con la altura; el resto con qh.
        Las dos condiciones de GCpi se combinan algebraicamente (B.6.5.12.1.2). Para componentes y revestimientos use p = qh[(GCp) − (GCpi)] (B.6.5-20).
      </PieCalc>
    </div>
  );
}
