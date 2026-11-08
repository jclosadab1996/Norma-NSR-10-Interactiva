import { useMemo, useState } from 'react';
import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS_PULGADA } from '@/data/materialesConcreto';
import { ESBELTEZ_MAXIMA_MURO, type TipoInyeccion, type TipoMamposteriaBorde, type TipoRefuerzoCortante } from '@/data/muroMamposteria';
import { moduloRuptura, type EntradaRuptura } from '@/lib/nsr10/mamposteria';
import { resumenMuroEnPlano } from '@/lib/nsr10/muroEnPlano';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const BARRAS = BARRAS_PULGADA.filter((b) => ['No. 2', 'No. 3', 'No. 4', 'No. 5', 'No. 6', 'No. 7', 'No. 8'].includes(b.designacion));
const OPCIONES_BARRA = BARRAS.map((b) => ({ value: b.designacion, label: `${b.designacion} (${b.diametroPulgadas}) — ${b.area} mm²` }));
const area = (d: string) => BARRAS.find((b) => b.designacion === d)?.area ?? 0;

const OPCIONES_ETA = [
  { value: 'embebido', label: 'Elementos horizontales embebidos: η = 0.70 (D.5.8.4.3)' },
  { value: 'junta', label: 'Refuerzo de junta: η = 0.35 (D.5.8.4.3)' },
];
const OPCIONES_INYECCION = [
  { value: 'inyectada-total', label: 'Todas las celdas inyectadas: α = 1.8' },
  { value: 'inyectada-solo-refuerzo', label: 'Solo celdas con refuerzo inyectadas: α = 3.0' },
  { value: 'cavidad-reforzada', label: 'Cavidad reforzada: α = 3.0' },
];
const OPCIONES_BORDE = [
  { value: 'reforzada', label: 'Reforzada: borde si σ > 0.20 f′m' },
  { value: 'cavidad-reforzada', label: 'Cavidad reforzada: borde si σ > 0.20 f′m' },
  { value: 'parcialmente-reforzada', label: 'Parcialmente reforzada: borde si σ > 0.30 f′m' },
];
const OPCIONES_UNIDAD = [
  { value: 'perforacion-vertical', label: 'Unidades de perforación vertical' },
  { value: 'maciza', label: 'Unidades macizas' },
];
const OPCIONES_MORTERO = [
  { value: 'cemento-cal|HMS', label: 'Cemento y cal, tipo H, M o S' },
  { value: 'cemento-cal|N', label: 'Cemento y cal, tipo N' },
  { value: 'cemento-mamposteria|HMS', label: 'Cemento para mampostería, tipo H, M o S' },
  { value: 'cemento-mamposteria|N', label: 'Cemento para mampostería, tipo N' },
];

const config = {
  nominal: { label: 'Nominal (Pn, Mn)', color: 'var(--chart-3)' },
  diseno: { label: 'Diseño (φPn, φMn)', color: 'var(--chart-1)' },
  demanda: { label: 'Demanda (Pu, Mu)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const sinPunto = () => <g />;

const Titulo = ({ children }: { children: string }) => <p className="pt-1 text-sm font-semibold">{children}</p>;

export default function MuroEnPlano() {
  const fm = useNum(10);
  const fy = useNum(420);
  const lw = useNum(3000);
  const t = useNum(150);
  const h = useNum(2600);
  const [barraExt, setBarraExt] = useState('No. 4');
  const nExt = useNum(2);
  const dp = useNum(150);
  const [barraInt, setBarraInt] = useState('No. 4');
  const nInt = useNum(0);
  const [barraH, setBarraH] = useState('No. 3');
  const nH = useNum(1);
  const s = useNum(400);
  const fyH = useNum(420);
  const [eta, setEta] = useState<TipoRefuerzoCortante>('embebido');
  const [inyec, setInyec] = useState<TipoInyeccion>('inyectada-total');
  const [borde, setBorde] = useState<TipoMamposteriaBorde>('reforzada');
  const [unidad, setUnidad] = useState<EntradaRuptura['unidad']>('perforacion-vertical');
  const relleno = useNum(100);
  const [morteroSel, setMorteroSel] = useState('cemento-cal|HMS');
  const pu = useNum(150);
  const mu = useNum(400);
  const vu = useNum(300);

  const [mortero, tipoMortero] = morteroSel.split('|') as [EntradaRuptura['mortero'], EntradaRuptura['tipoMortero']];
  const fr = useMemo(() => {
    const rel = Number.isFinite(relleno.n) ? Math.min(100, Math.max(0, relleno.n)) / 100 : 1;
    return moduloRuptura({ direccion: 'horizontal', unidad, relleno: rel, mortero, tipoMortero });
  }, [unidad, relleno.n, mortero, tipoMortero]);

  const AvDada = nH.n * area(barraH);
  const baseOk =
    [fm.n, fy.n, lw.n, t.n, h.n, nExt.n, dp.n, s.n, fyH.n].every((x) => Number.isFinite(x) && x > 0) &&
    2 * dp.n < lw.n &&
    Number.isFinite(nInt.n) &&
    nInt.n >= 0 &&
    Number.isFinite(nH.n) &&
    nH.n >= 0;
  const cargasOk = [pu.n, mu.n, vu.n].every((x) => Number.isFinite(x));

  const r = useMemo(() => {
    if (!baseOk || !cargasOk) return null;
    return resumenMuroEnPlano({
      fm: fm.n,
      fy: fy.n,
      lw: lw.n,
      t: t.n,
      hPrime: h.n,
      areaExtremo: Math.round(nExt.n) * area(barraExt),
      dPrime: dp.n,
      nIntermedias: Math.round(nInt.n),
      areaIntermedia: area(barraInt),
      Av: AvDada,
      s: s.n,
      fyCortante: fyH.n,
      refuerzoCortante: eta,
      fr,
      tipoInyeccion: inyec,
      tipoBorde: borde,
      Pu: pu.n,
      Mu: Math.abs(mu.n),
      Vu: Math.abs(vu.n),
    });
  }, [baseOk, cargasOk, fm.n, fy.n, lw.n, t.n, h.n, nExt.n, barraExt, dp.n, nInt.n, barraInt, AvDada, s.n, fyH.n, eta, fr, inyec, borde, pu.n, mu.n, vu.n]);

  const nominal = r ? [{ M: 0, P: r.curva.PnMax }, ...r.curva.puntos.map((p) => ({ M: p.Mn, P: p.Pn }))] : [];
  const diseno = r ? [{ M: 0, P: r.curva.puntos[0].phiPn }, ...r.curva.puntos.map((p) => ({ M: p.phiMn, P: p.phiPn }))] : [];
  const demanda = r ? [{ M: Math.abs(mu.n), P: pu.n }] : [];

  const flexOk = r ? r.flexo.cumple : false;
  const c = r?.cortante;
  const det = r?.flexo.detalle ?? null;
  const motivoFlexo =
    r?.flexo.motivo === 'Pu-excede-tope'
      ? `Pu supera φPn,máx = ${fmt(r.flexo.phiPnMax, 0)} kN (D.5.5-4)`
      : r?.flexo.motivo === 'Pu-fuera-diagrama'
        ? 'Pu fuera del diagrama de interacción'
        : r?.flexo.razon !== null && r?.flexo.razon !== undefined
          ? `Mu/φMn = ${fmt(r.flexo.razon, 3)}`
          : undefined;
  const estado = (b: boolean | null | undefined): 'ok' | 'mal' | 'neutro' => (b === null || b === undefined ? 'neutro' : b ? 'ok' : 'mal');
  const txt = (b: boolean | null | undefined) => (b === null || b === undefined ? 'sin resultado' : b ? 'cumple' : 'no cumple');

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Muro y materiales">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={3} max={40} />
            <Campo etiqueta="fy (vertical)" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
            <Campo etiqueta="Longitud ℓw" unidad="mm" valor={lw.txt} onCambio={lw.setTxt} min={500} />
            <Campo etiqueta="Espesor t = b" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={80} max={600} ayuda="Ancho efectivo del alma, D.5.4.4.2" />
            <Campo etiqueta="Altura efectiva h′" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={500} ayuda="Para Re (D.5.4.3)" />
          </div>
        </Grupo>
        <Grupo titulo="Cargas mayoradas (misma combinación)">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Pu (compresión +)" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} />
            <Campo etiqueta="Mu" unidad="kN·m" valor={mu.txt} onCambio={mu.setTxt} ayuda="En la base del muro" />
            <Campo etiqueta="Vu" unidad="kN" valor={vu.txt} onCambio={vu.setTxt} ayuda="Simultáneo con Mu" />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo vertical (simétrico)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Barra en cada extremo" valor={barraExt} onCambio={setBarraExt} opciones={OPCIONES_BARRA} />
            <Campo etiqueta="Barras por extremo" valor={nExt.txt} onCambio={nExt.setTxt} min={1} max={12} />
            <Campo etiqueta="d′ (borde a centroide)" unidad="mm" valor={dp.txt} onCambio={dp.setTxt} min={30} />
            <Campo etiqueta="Barras intermedias" valor={nInt.txt} onCambio={nInt.setTxt} min={0} max={30} ayuda="Distribuidas, equiespaciadas" />
            <Selector className="sm:col-span-2" etiqueta="Barra intermedia" valor={barraInt} onCambio={setBarraInt} opciones={OPCIONES_BARRA} />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo horizontal de cortante">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Barra" valor={barraH} onCambio={setBarraH} opciones={OPCIONES_BARRA} />
            <Campo etiqueta="Barras por hilada" valor={nH.txt} onCambio={nH.setTxt} min={0} max={4} ayuda="Av = nº × área; 0 = sin refuerzo" />
            <Campo etiqueta="Separación s (vertical)" unidad="mm" valor={s.txt} onCambio={s.setTxt} min={100} />
            <Campo etiqueta="fy (horizontal)" unidad="MPa" valor={fyH.txt} onCambio={fyH.setTxt} min={240} max={600} />
            <Selector className="sm:col-span-2" etiqueta="Eficiencia η" valor={eta} onCambio={(v) => setEta(v as TipoRefuerzoCortante)} opciones={OPCIONES_ETA} />
          </div>
        </Grupo>
      </div>

      <Grupo titulo="Mampostería: módulo de ruptura (Tabla D.5.8-1) y tipo (α, borde)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Selector etiqueta="Unidades" valor={unidad} onCambio={(v) => setUnidad(v as EntradaRuptura['unidad'])} opciones={OPCIONES_UNIDAD} />
          <Campo etiqueta="Celdas rellenas" unidad="%" valor={relleno.txt} onCambio={relleno.setTxt} min={0} max={100} ayuda="Interpolación lineal (nota 1)" />
          <Selector etiqueta="Mortero de pega" valor={morteroSel} onCambio={setMorteroSel} opciones={OPCIONES_MORTERO} />
          <Selector etiqueta="Inyección (α de D.5.8-1)" valor={inyec} onCambio={(v) => setInyec(v as TipoInyeccion)} opciones={OPCIONES_INYECCION} />
          <Selector className="sm:col-span-2" etiqueta="Tipo para elementos de borde (D.5.8.5)" valor={borde} onCambio={(v) => setBorde(v as TipoMamposteriaBorde)} opciones={OPCIONES_BORDE} />
        </div>
        <p className="text-xs text-muted-foreground">
          Flexión en el plano: la tracción es perpendicular a las juntas horizontales. fr = <span className="font-mono">{fmt(fr, 2)} MPa</span> (Tabla D.5.8-1).
        </p>
      </Grupo>

      {!r && <Aviso tipo="error">Revisa los datos: valores positivos, 2 d′ &lt; ℓw y número de barras no negativo.</Aviso>}

      {r && c && (
        <>
          <Valor
            destacado
            etiqueta="Verificación global del muro"
            valor={r.cumpleTodo ? 'Cumple' : 'No cumple'}
            estado={r.cumpleTodo ? 'ok' : 'mal'}
            nota={`Flexo-compresión ${txt(r.flexo.cumple)} (D.5.8.3) · flexión mínima ${txt(r.minima.cumple)} (D.5.8.2) · cortante ${txt(c.cumple && c.cumpleMaximo)} (D.5.8.4) · esbeltez ${txt(r.esbeltezAdmisible)} (D.5.4.3.1) · región de articulación ${r.hinge.riesgo ? txt(r.hinge.cumple !== false && r.hinge.cumpleSeparacion) : 'no aplica'} (D.5.8.4.1). Los elementos de borde (D.5.8.5): ${r.borde.res.requiere ? 'se requieren' : 'no se requieren'}.`}
          />

          <Titulo>1. Flexo-compresión: diagrama de interacción (D.5.8.3, D.5.1.6)</Titulo>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Ae / Ast" valor={`${fmt(r.Ae, 0)} / ${fmt(r.Ast, 0)}`} nota="mm² · Ae = t·ℓw (celdas inyectadas)" />
            <Valor etiqueta="Po · Re" valor={`${fmt(r.curva.Po, 0)} kN · ${fmt(r.curva.Re, 4)}`} nota="Ecs. D.5.5-1 y D.5.5-2" />
            <Valor etiqueta="Pn,máx = 0.80 Po Re" unidad="kN" valor={fmt(r.curva.PnMax, 0)} nota={`φPn,máx = ${fmt(r.flexo.phiPnMax, 0)} kN (D.5.5-3/4)`} />
            <Valor etiqueta="Pb (carga balanceada)" unidad="kN" valor={fmt(r.Pb, 0)} nota="Ec. D.5.1-2; umbral de la rampa de φ = menor entre 0.10 f′m Ae y 0.25 Pb" />
            <Valor etiqueta="φ en Pu (rampa)" valor={det ? fmt(det.phi, 3) : '—'} nota="D.5.1.5.2: 0.60 a 0.85 con refuerzo simétrico y fy ≤ 420 MPa" />
            <Valor etiqueta="Pn · c" valor={det ? `${fmt(det.Pn, 1)} kN · ${fmt(det.c, 1)} mm` : '—'} nota="Punto del diagrama con φPn = Pu" />
            <Valor etiqueta="Mn" unidad="kN·m" valor={det ? fmt(det.Mn, 1) : '—'} nota="Equilibrio y compatibilidad (D.5.1.6)" />
            <Valor destacado etiqueta="φMn disponible" unidad="kN·m" valor={r.flexo.phiMnDisponible === null ? '—' : fmt(r.flexo.phiMnDisponible, 1)} estado={flexOk ? 'ok' : 'mal'} nota={`${motivoFlexo ?? ''} — Ec. D.5.8-3`} />
          </div>
          <div className="rounded-xl border p-3">
            <ChartContainer config={config} className="aspect-[16/10] w-full">
              <ScatterChart margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="M" name="M" domain={[0, 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'M (kN·m)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} height={40} />
                <YAxis type="number" dataKey="P" name="P" tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'P (kN)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ZAxis range={[60, 60]} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, n) => <span className="font-mono">{n} = {Number(v).toFixed(1)}</span>} />} />
                <Scatter name="Nominal" data={nominal} line={{ stroke: 'var(--color-nominal)', strokeWidth: 2, strokeDasharray: '6 4' }} shape={sinPunto} isAnimationActive={false} legendType="none" />
                <Scatter name="Diseño" data={diseno} line={{ stroke: 'var(--color-diseno)', strokeWidth: 2.5 }} shape={sinPunto} isAnimationActive={false} legendType="none" />
                <Scatter name="Demanda" data={demanda} fill={flexOk ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))'} isAnimationActive={false} legendType="none" />
              </ScatterChart>
            </ChartContainer>
            <div className="mt-1 flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
              <span><span className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed align-middle" style={{ borderColor: 'var(--chart-3)' }} />Nominal (Pn, Mn)</span>
              <span><span className="mr-1 inline-block h-0 w-5 border-t-2 align-middle" style={{ borderColor: 'var(--chart-1)' }} />Diseño (φPn, φMn), recortado en φ·0.80 Po Re</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: flexOk ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))' }} />(Mu, Pu)</span>
            </div>
            <p className="mt-1 px-1 text-xs text-muted-foreground">(esquema del proyecto) Diagrama por compatibilidad de deformaciones con εmu = 0.003, bloque 0.80 f′m sobre a = 0.85 c y acero elastoplástico.</p>
          </div>

          <Titulo>2. Resistencia mínima a flexión (D.5.8.2)</Titulo>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Mcr = b ℓw² fr / 6" unidad="kN·m" valor={fmt(r.minima.Mcr, 1)} nota={`fr = ${fmt(r.minima.fr, 2)} MPa — Ec. D.5.8-2`} />
            <Valor etiqueta={`α Mcr (α = ${fmt(r.minima.alfa, 1)})`} unidad="kN·m" valor={fmt(r.minima.alfaMcr, 1)} nota="Ec. D.5.8-1" />
            <Valor etiqueta="Mn con Pu" unidad="kN·m" valor={r.minima.Mn === null ? '—' : fmt(r.minima.Mn, 1)} estado={estado(r.minima.cumple)} nota={r.minima.cumple === null ? 'sin punto en el diagrama' : r.minima.cumple ? 'Mn ≥ α Mcr: cumple' : 'Mn < α Mcr: no cumple'} />
            <Valor etiqueta="Mn en flexión pura (Pu = 0)" unidad="kN·m" valor={r.minima.MnPura === null ? '—' : fmt(r.minima.MnPura, 1)} estado={estado(r.minima.cumplePura)} nota="Informativo: la norma no dice a qué Pu evaluar D.5.8-1" />
          </div>

          <Titulo>3. Cortante en el plano: Vn = Vm + Vs (D.5.8.4)</Titulo>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Amv = b ℓw · d = 0.8 ℓw" valor={`${fmt(c.Amv, 0)} mm² · ${fmt(c.d, 0)} mm`} nota="D.5.4.5.2 y D.5.8.4.2" />
            <Valor etiqueta="Mu/(Vu d)" valor={fmt(c.mvd, 4)} nota={c.mvd <= 0.25 ? 'banda ≤ 0.25' : c.mvd >= 1 ? 'banda ≥ 1.00 (tope)' : 'banda intermedia'} />
            <Valor etiqueta="Vm" unidad="kN" valor={fmt(c.Vm, 1)} nota="Tabla D.5.8-2 (incluye 0.25 Pu)" />
            <Valor etiqueta="Vs = ρn fy Amv" unidad="kN" valor={fmt(c.Vs, 1)} nota={`ρn = ${fmt(c.rhoN, 6)} (η = ${fmt(c.eta, 2)}) — Ecs. D.5.8-7/8`} />
            <Valor etiqueta="Vn = Vm + Vs" unidad="kN" valor={fmt(c.Vn, 1)} nota="Ec. D.5.8-5" />
            <Valor etiqueta="Vn máx" unidad="kN" valor={fmt(c.VnMax, 1)} estado={c.cumpleMaximo ? 'ok' : 'mal'} nota={`${c.cumpleMaximo ? 'Vn no excede' : 'Vn EXCEDE'} la Tabla D.5.8-3 (D.5.8.4.4)`} />
            <Valor destacado etiqueta={`φVn (φ = ${fmt(c.phi, 2)})`} unidad="kN" valor={fmt(c.phiVn, 1)} estado={c.cumple ? 'ok' : 'mal'} nota={`Vu/φVn = ${fmt(c.razon, 3)} — Ec. D.5.8-4${c.phi > 0.6 ? ' (φ = 0.85: Vn > V(Mn), D.5.1.5.2 c)' : ''}`} />
            <Valor etiqueta="Av/s necesario" unidad="mm²/mm" valor={c.AvSobreSRequerido === null ? '—' : fmt(c.AvSobreSRequerido, 3)} nota={`Dado: ${fmt(s.n > 0 ? AvDada / s.n : NaN, 3)} · ${c.requiereRefuerzo ? 'Vu ≥ φVm: el refuerzo toma el exceso' : 'Vu < φVm: basta la mampostería'}`} />
          </div>

          <Titulo>4. Articulación plástica en la base (D.5.8.4.1)</Titulo>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="V(Mn) = Mn/(Mu/Vu)" unidad="kN" valor={r.hinge.VMn === null ? '—' : fmt(r.hinge.VMn, 1)} nota={r.hinge.riesgo === null ? 'requiere Mu y Vu distintos de cero' : r.hinge.riesgo ? 'Vn > V(Mn): falla controlada por flexión' : 'Vn ≤ V(Mn): gobierna el cortante'} />
            <Valor etiqueta="s máx = min(3t, 600)" unidad="mm" valor={fmt(r.hinge.sMax, 0)} estado={r.hinge.riesgo ? (r.hinge.cumpleSeparacion ? 'ok' : 'mal') : 'neutro'} nota={`s dada = ${fmt(s.n, 0)} mm; rige desde la base hasta ℓw`} />
            <Valor etiqueta="Vs en la región (Vn = Vs)" unidad="kN" valor={fmt(r.hinge.Vs, 1)} estado={r.hinge.riesgo ? estado(r.hinge.cumple) : 'neutro'} nota={r.hinge.riesgo ? `φ = ${r.hinge.phi === null ? '—' : fmt(r.hinge.phi, 2)}: ${r.hinge.cumple ? 'φVs ≥ V(Mn)' : 'φVs < V(Mn)'} — Ec. D.5.8-6` : 'No hay riesgo de articulación: se usa D.5.8-5'} />
            <Valor etiqueta="s necesaria en la región" unidad="mm" valor={r.hinge.sNecesaria === null ? '—' : fmt(r.hinge.sNecesaria, 0)} nota="Con el Av dado y Vs = V(Mn)/0.85, acotada a s máx" />
          </div>

          <Titulo>5. Elementos de borde (D.5.8.5)</Titulo>
          <div className="grid gap-3 sm:grid-cols-3">
            <Valor etiqueta="σ = Pu/(b ℓw) + 6 Mu/(b ℓw²)" unidad="MPa" valor={fmt(r.borde.sigma, 3)} nota="Sección no fisurada, elástica (D.5.8.5 b)" />
            <Valor etiqueta={`Límite ${borde === 'parcialmente-reforzada' ? '0.30' : '0.20'} f′m`} unidad="MPa" valor={fmt(r.borde.res.limite, 2)} estado={r.borde.res.requiere ? 'mal' : 'ok'} nota={r.borde.res.requiere ? 'σ excede: se requieren elementos de borde' : 'σ no excede: no se requieren'} />
            <Valor etiqueta="Se pueden suspender donde σ <" unidad="MPa" valor={fmt(r.borde.res.limiteSuspension, 2)} nota="0.15 f′m, pero no antes de ℓw desde la base (D.5.8.5 a)" />
          </div>
          {r.borde.res.requiere && <Aviso tipo="atencion">Elementos de borde: estribos No. 3 ó 10M cada 200 mm en celdas de al menos 100 × 100 mm (D.5.8.5 c); en cavidad reforzada aplica C.21.9.6.</Aviso>}

          <div className="space-y-2">
            {!r.esbeltezAdmisible && <Aviso tipo="error">h′/t = {fmt(r.esbeltez, 1)} excede {ESBELTEZ_MAXIMA_MURO} (D.5.4.3.1).</Aviso>}
            {!r.flexo.cumple && <Aviso tipo="error">Flexo-compresión: {motivoFlexo}. Aumenta el refuerzo vertical, f′m o la longitud del muro.</Aviso>}
            {r.minima.cumple === false && <Aviso tipo="error">Mn &lt; α Mcr (D.5.8.2): el muro quedaría con muy poco refuerzo al agrietarse; aumenta el refuerzo vertical.</Aviso>}
            {!c.cumple && <Aviso tipo="error">Vu supera φVn: aumenta el refuerzo horizontal (Av/s necesario arriba) o la sección.</Aviso>}
            {!c.cumpleMaximo && <Aviso tipo="error">Vn excede el máximo de la Tabla D.5.8-3: aumenta f′m o el área Amv; más refuerzo no ayuda.</Aviso>}
            {r.hinge.riesgo && !r.hinge.cumpleSeparacion && <Aviso tipo="error">En la región de articulación (base hasta ℓw), s debe ser ≤ min(3t, 600) = {fmt(r.hinge.sMax, 0)} mm (D.5.8.4.1).</Aviso>}
            {r.hinge.riesgo && r.hinge.cumple === false && <Aviso tipo="atencion">En la región de articulación Vn = Vs: con el refuerzo dado, φVs no alcanza V(Mn); reduce s o aumenta Av (D.5.8-6).</Aviso>}
            {Number.isFinite(pu.n) && pu.n < 0 && <Aviso tipo="atencion">Pu negativa (tracción): para Vm se toma Pu = 0; la norma no desarrolla ese caso.</Aviso>}
          </div>
        </>
      )}
      <PieCalc>
        Muro en su plano (D.5.8): refuerzo vertical simétrico concentrado en los extremos más barras intermedias; φ con rampa de D.5.1.5.2 b (umbral = menor entre 0.10 f′m Ae y 0.25 Pb, interpretación del proyecto). El diagrama de interacción por compatibilidad de deformaciones y la elección de la carga axial para D.5.8-1 son autoría del proyecto. Reproduce los ejemplos 5 a 7 del capítulo D.5b (`mamposteria.ts`, `muroEnPlano.ts`).
      </PieCalc>
    </div>
  );
}
