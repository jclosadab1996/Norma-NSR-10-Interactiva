import { useMemo, useState } from 'react';
import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS_PULGADA } from '@/data/materialesConcreto';
import { ESBELTEZ_MAXIMA_MURO, ESBELTEZ_MAX_CARGA_ALTA, FRACCION_RHO_B_FUERA_PLANO } from '@/data/muroMamposteria';
import { efectosCargaLateral, resumenMuroFueraPlano } from '@/lib/nsr10/muroFueraPlanoResumen';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const BARRAS = BARRAS_PULGADA.filter((b) => ['No. 3', 'No. 4', 'No. 5', 'No. 6', 'No. 7', 'No. 8'].includes(b.designacion));
const OPCIONES_BARRA = BARRAS.map((b) => ({ value: b.designacion, label: `${b.designacion} (${b.diametroPulgadas}) — ${b.area} mm²` }));
const OPCIONES_CARGA = [
  { value: 'mu', label: 'Mu dado (kN·m por franja)' },
  { value: 'q', label: 'Carga lateral uniforme q (franja apoyada arriba y abajo)' },
];

const config = {
  nominal: { label: 'Nominal (Pn, Mn)', color: 'var(--chart-3)' },
  diseno: { label: 'Diseño (φPn, φ Re Mn)', color: 'var(--chart-1)' },
  demanda: { label: 'Demanda (Pu, Mu)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const sinPunto = () => <g />;

export default function MuroFueraPlano() {
  const fm = useNum(10);
  const fy = useNum(420);
  const t = useNum(150);
  const b = useNum(1000);
  const frac = useNum(1);
  const h = useNum(2800);
  const [barra, setBarra] = useState('No. 4');
  const sep = useNum(800);
  const d = useNum(75);
  const [modo, setModo] = useState('mu');
  const pu = useNum(40);
  const mu = useNum(4);
  const q = useNum(1.2);
  const vu = useNum(0);

  const areaBarra = BARRAS.find((x) => x.designacion === barra)?.area ?? 129;
  const usaQ = modo === 'q';

  const base = [fm.n, fy.n, t.n, b.n, frac.n, h.n, sep.n, d.n];
  const baseOk = base.every((x) => Number.isFinite(x) && x > 0) && frac.n <= 1 && d.n < t.n;
  const cargasOk = Number.isFinite(pu.n) && (usaQ ? Number.isFinite(q.n) && q.n >= 0 : Number.isFinite(mu.n));

  const efq = useMemo(() => (usaQ && baseOk && Number.isFinite(q.n) ? efectosCargaLateral(q.n, b.n, h.n) : null), [usaQ, baseOk, q.n, b.n, h.n]);
  const MuUsado = usaQ ? (efq ? efq.Mu : NaN) : Math.abs(mu.n);
  const VuUsado = usaQ ? (efq ? efq.Vu : 0) : Number.isFinite(vu.n) && vu.n > 0 ? vu.n : 0;

  const r = useMemo(() => {
    if (!baseOk || !cargasOk || !Number.isFinite(MuUsado)) return null;
    return resumenMuroFueraPlano({
      fm: fm.n,
      fy: fy.n,
      t: t.n,
      b: b.n,
      fraccionAe: frac.n,
      hPrime: h.n,
      areaBarra,
      sep: sep.n,
      d: d.n,
      Pu: pu.n,
      Mu: MuUsado,
      Vu: VuUsado > 0 ? VuUsado : undefined,
    });
  }, [baseOk, cargasOk, MuUsado, VuUsado, fm.n, fy.n, t.n, b.n, frac.n, h.n, areaBarra, sep.n, d.n, pu.n]);

  const re = r?.fuera.Re ?? 1;
  const nominal = r ? [{ M: 0, P: r.curva.PnMax }, ...r.curva.puntos.map((p) => ({ M: p.Mn, P: p.Pn }))] : [];
  const diseno = r ? [{ M: 0, P: r.curva.puntos[0].phiPn }, ...r.curva.puntos.map((p) => ({ M: p.phi * re * p.Mn, P: p.phiPn }))] : [];
  const demanda = r ? [{ M: MuUsado, P: pu.n }] : [];

  const f = r?.fuera;
  const menor = f?.caso === 'menor';
  const okFlexion = f?.cumple ?? null;
  const unidadM = `kN·m por franja de ${fmt(b.n, 0)} mm`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Materiales y geometría de la franja">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={3} max={40} />
            <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
            <Campo etiqueta="Espesor t" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={80} max={600} ayuda="D.5.4.2" />
            <Campo etiqueta="Ancho de franja b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={100} ayuda="1000 mm = por metro de muro (D.5.4.4.1)" />
            <Campo etiqueta="Ae / (b·t)" valor={frac.txt} onCambio={frac.setTxt} min={0.1} max={1} paso={0.05} ayuda="1.0 = celdas inyectadas (D.5.4.1)" />
            <Campo etiqueta="Altura efectiva h′" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={500} ayuda="D.5.4.3" />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo vertical (una capa)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Barra" valor={barra} onCambio={setBarra} opciones={OPCIONES_BARRA} />
            <Campo etiqueta="Separación" unidad="mm" valor={sep.txt} onCambio={sep.setTxt} min={100} ayuda="Se reparte en la franja b" />
            <Campo etiqueta="Posición d" unidad="mm" valor={d.txt} onCambio={d.setTxt} min={20} ayuda="Cara comprimida al refuerzo; al centro, d = t/2" />
            <Valor etiqueta="As en la franja" unidad="mm²" valor={r ? fmt(r.As, 1) : '—'} nota={`${fmt(areaBarra, 0)}·b / s`} />
          </div>
        </Grupo>
      </div>

      <Grupo titulo="Cargas mayoradas sobre la franja">
        <div className="grid gap-3 sm:grid-cols-4">
          <Campo etiqueta="Pu (compresión +)" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} ayuda="En la sección bajo estudio" />
          <Selector className="sm:col-span-2" etiqueta="Acción lateral" valor={modo} onCambio={setModo} opciones={OPCIONES_CARGA} />
          {usaQ ? (
            <Campo etiqueta="q mayorada" unidad="kN/m²" valor={q.txt} onCambio={q.setTxt} min={0} ayuda="Presión sobre el muro" />
          ) : (
            <Campo etiqueta="Mu" unidad="kN·m" valor={mu.txt} onCambio={mu.setTxt} ayuda="Fuera del plano" />
          )}
          {!usaQ && <Campo etiqueta="Vu (opcional)" unidad="kN" valor={vu.txt} onCambio={vu.setTxt} min={0} ayuda="0 = no verificar" />}
        </div>
        {usaQ && efq && (
          <p className="text-xs text-muted-foreground">
            Franja simplemente apoyada (esquema del proyecto, no texto de la norma): Mu = q·b·h′²/8 = {fmt(efq.Mu, 3)} kN·m y Vu = q·b·h′/2 = {fmt(efq.Vu, 2)} kN.
          </p>
        )}
      </Grupo>

      {!r && <Aviso tipo="error">Revisa los datos: valores positivos, 0 &lt; Ae/(b·t) ≤ 1 y posición d menor que el espesor t.</Aviso>}

      {r && f && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="h′/t" valor={fmt(f.esbeltez, 2)} estado={f.esbeltezAdmisible ? 'neutro' : 'mal'} nota={f.esbeltezAdmisible ? `≤ ${ESBELTEZ_MAXIMA_MURO} (D.5.4.3.1)${menor ? '' : `; ≤ ${ESBELTEZ_MAX_CARGA_ALTA} (D.5.7.3)`}` : `excede ${ESBELTEZ_MAXIMA_MURO} (D.5.4.3.1)`} />
            <Valor etiqueta="Re" valor={fmt(f.Re, 4)} nota="Ec. D.5.5-2" />
            <Valor etiqueta="0.10 f′m Ae" unidad="kN" valor={fmt(f.umbralPu, 1)} nota={`Pu = ${fmt(pu.n, 1)} kN → ${menor ? 'menor: aplica D.5.7.2' : 'mayor: aplica D.5.7.3'}`} />
            <Valor etiqueta="φ (flexión)" valor={fmt(f.phi, 2)} nota="D.5.1.5.1 a" />
            {menor && f.Ase !== null && f.a !== null && (
              <>
                <Valor etiqueta="Ase" unidad="mm²" valor={fmt(f.Ase, 1)} nota="(As fy + Pu)/fy — Ec. D.5.7-3" />
                <Valor etiqueta="a" unidad="mm" valor={fmt(f.a, 2)} nota="(As fy + Pu)/(0.80 f′m b) — Ec. D.5.7-4" />
              </>
            )}
            <Valor etiqueta="ρ = As/(b d)" valor={fmt(f.rho, 5)} estado={menor ? (f.cumpleCuantia ? 'ok' : 'mal') : 'neutro'} nota={menor ? `0.5 ρb = ${fmt(FRACCION_RHO_B_FUERA_PLANO * f.rhoB, 5)} (D.5.7.2)` : `ρb = ${fmt(f.rhoB, 5)} (el límite 0.5 ρb es solo de D.5.7.2)`} />
            <Valor etiqueta="Pn (axial, sin excentricidad)" unidad="kN" valor={fmt(r.axial.Pn, 1)} nota={`0.80 Po Re — Ec. D.5.5-3 (Po = ${fmt(r.axial.Po, 0)} kN)`} />
            <Valor etiqueta="φPn (axial)" unidad="kN" valor={fmt(r.axial.phiPn, 1)} estado={pu.n > 0 ? (r.axial.cumple ? 'ok' : 'mal') : 'neutro'} nota={pu.n > 0 && r.axial.razon !== null ? `Pu/φPn = ${fmt(r.axial.razon, 3)} — Ec. D.5.5-4` : 'Ec. D.5.5-4'} />
            <Valor etiqueta={menor ? 'Mn = Ase fy (d − a/2)' : 'Mn del diagrama en Pn = Pu/φ'} unidad="kN·m" valor={fmt(f.Mn, 3)} nota={menor ? `Ec. D.5.7-2 · ${unidadM}` : `Pn = ${fmt(r.Pn, 1)} kN · D.5.7.3 y D.5.1.6`} />
            <Valor destacado etiqueta="φ Re Mn" unidad="kN·m" valor={fmt(f.phiReMn, 3)} estado={okFlexion === null ? 'neutro' : okFlexion ? 'ok' : 'mal'} nota={f.razon !== null ? `Mu/(φ Re Mn) = ${fmt(f.razon, 3)} — ${menor ? 'Ec. D.5.7-1' : 'Ec. D.5.7-5'}` : 'Pu fuera del diagrama'} />
            <Valor etiqueta="Vn = Amv √f′m / 6" unidad="kN" valor={fmt(r.Vn, 1)} nota="Ec. D.5.7-7 (Amv = Ae, D.5.4.5.1)" />
            <Valor etiqueta="φVn (φ = 0.60)" unidad="kN" valor={fmt(r.phiVn, 1)} estado={r.cumpleV === null ? 'neutro' : r.cumpleV ? 'ok' : 'mal'} nota={r.razonV !== null ? `Vu/φVn = ${fmt(r.razonV, 3)} — Ec. D.5.7-6` : 'D.5.1.5.1 b'} />
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Diagrama de interacción de la franja</p>
            <ChartContainer config={config} className="aspect-[16/10] w-full">
              <ScatterChart margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="M" name="M" domain={[0, 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'M (kN·m por franja)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} height={40} />
                <YAxis type="number" dataKey="P" name="P" tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'P (kN)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ZAxis range={[60, 60]} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <ReferenceLine y={f.umbralPu} stroke="var(--muted-foreground)" strokeDasharray="4 3" label={{ value: '0.10 f′m Ae', position: 'insideTopRight', fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, n) => <span className="font-mono">{n} = {Number(v).toFixed(2)}</span>} />} />
                <Scatter name="Nominal" data={nominal} line={{ stroke: 'var(--color-nominal)', strokeWidth: 2, strokeDasharray: '6 4' }} shape={sinPunto} isAnimationActive={false} legendType="none" />
                <Scatter name="Diseño" data={diseno} line={{ stroke: 'var(--color-diseno)', strokeWidth: 2.5 }} shape={sinPunto} isAnimationActive={false} legendType="none" />
                <Scatter name="Demanda" data={demanda} fill={okFlexion ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))'} isAnimationActive={false} legendType="none" />
              </ScatterChart>
            </ChartContainer>
            <div className="mt-1 flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
              <span><span className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed align-middle" style={{ borderColor: 'var(--chart-3)' }} />Nominal (Pn, Mn)</span>
              <span><span className="mr-1 inline-block h-0 w-5 border-t-2 align-middle" style={{ borderColor: 'var(--chart-1)' }} />Diseño (φPn, φ Re Mn)</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: okFlexion ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))' }} />(Mu, Pu)</span>
            </div>
            <p className="mt-1 px-1 text-xs text-muted-foreground">
              Por debajo de la línea 0.10 f′m Ae se usan las Ecs. D.5.7-2 a D.5.7-4 (Pn = Pu); por encima, el diagrama con Pn = Pu/φ (D.5.7.3; autoría del proyecto). El diagrama se calcula respecto del centroide t/2 (esquema del proyecto).
            </p>
          </div>

          <div className="space-y-2">
            <Valor
              destacado
              etiqueta={`Verificación — ${menor ? 'Pu < 0.10 f′m Ae (D.5.7.2)' : 'Pu > 0.10 f′m Ae (D.5.7.3)'}`}
              valor={r.cumpleTodo ? 'Cumple' : 'No cumple'}
              estado={r.cumpleTodo ? 'ok' : 'mal'}
              nota={`Flexión ${okFlexion === null ? 'sin resultado' : okFlexion ? 'cumple' : 'no cumple'} · cuantía ${menor ? (f.cumpleCuantia ? 'cumple' : 'no cumple') : 'no se exige'} · esbeltez ${f.esbeltezAdmisible ? 'cumple' : 'no cumple'} · axial ${pu.n <= 0 ? 'n/a' : r.axial.cumple ? 'cumple' : 'no cumple'} · cortante ${r.cumpleV === null ? 'no verificado' : r.cumpleV ? 'cumple' : 'no cumple'}`}
            />
            {!f.esbeltezAdmisible && <Aviso tipo="error">h′/t = {fmt(f.esbeltez, 1)} excede el límite de {ESBELTEZ_MAXIMA_MURO} en muros estructurales (D.5.4.3.1).</Aviso>}
            {menor && f.cumpleCuantia === false && <Aviso tipo="error">ρ = {fmt(f.rho, 5)} excede 0.5 ρb = {fmt(FRACCION_RHO_B_FUERA_PLANO * f.rhoB, 5)} (D.5.7.2): reduce el refuerzo o aumenta la sección.</Aviso>}
            {okFlexion === null && <Aviso tipo="error">Pu queda fuera del diagrama de interacción de la sección: no hay resistencia a flexión para esa carga axial.</Aviso>}
            {okFlexion === false && <Aviso tipo="error">Mu supera φ Re Mn: aumenta el refuerzo, f′m o el espesor, o reduce h′.</Aviso>}
            {Math.abs(d.n - t.n / 2) > 1 && <Aviso tipo="nota">El refuerzo no está al centro del muro (d ≠ t/2): D.5.7-2 toma momentos respecto del refuerzo y el diagrama respecto del centroide, por lo que pueden diferir.</Aviso>}
          </div>
        </>
      )}
      <PieCalc>
        Muro fuera de su plano por franja (D.5.7): Mu ≤ φ Re Mn con φ = 0.80; cuantía ≤ 0.5 ρb solo con Pu &lt; 0.10 f′m Ae; cortante Vn = Amv √f′m / 6 con φ = 0.60. Las funciones son las del ejemplo 4 del capítulo D.5b (`mamposteria.ts`); ρb y la lectura de Mn en D.5.7.3 son autoría del proyecto.
      </PieCalc>
    </div>
  );
}
