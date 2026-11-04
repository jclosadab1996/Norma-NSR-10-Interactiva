import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cortanteDosDireccionesZapata, disenarZapataCuadrada, interfazColumnaZapata, type ResultadoZapata } from '@/lib/nsr10/cimentaciones';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  vu: { label: 'Vu (punzonamiento)', color: 'var(--chart-2)' },
  phivc: { label: 'φVc (punzonamiento)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const OPCIONES_FY = [
  { value: '280', label: 'Grado 280 (fy = 280 MPa)' },
  { value: '420', label: 'Grado 420 (fy = 420 MPa)' },
  { value: '500', label: 'fy = 500 MPa' },
];

/** Esquema en planta: zapata, columna, sección crítica a d/2 y secciones críticas de cortante en una dirección y momento. */
function Esquema({ B, c, d }: { B: number; c: number; d: number }) {
  const W = 260;
  const m = 14;
  const esc = (W - 2 * m) / (B * 1000);
  const x0 = m;
  const y0 = m;
  const cc = c * esc;
  const dd = d * esc;
  const cx = x0 + (B * 1000 * esc) / 2;
  const cy = y0 + (B * 1000 * esc) / 2;
  const crit = cc + dd;
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="mx-auto w-full max-w-[280px]" role="img" aria-label="Esquema en planta de la zapata con la columna y las secciones críticas">
      <rect x={x0} y={y0} width={B * 1000 * esc} height={B * 1000 * esc} fill="var(--muted)" stroke="var(--foreground)" strokeWidth={1.5} />
      <rect x={cx - crit / 2} y={cy - crit / 2} width={crit} height={crit} fill="none" stroke="var(--chart-2)" strokeWidth={1.5} strokeDasharray="5 3" />
      <rect x={cx - cc / 2} y={cy - cc / 2} width={cc} height={cc} fill="var(--foreground)" opacity={0.75} />
      <line x1={cx + cc / 2 + dd} x2={cx + cc / 2 + dd} y1={y0} y2={y0 + B * 1000 * esc} stroke="var(--chart-1)" strokeWidth={1.5} strokeDasharray="2 3" />
      <line x1={cx + cc / 2} x2={cx + cc / 2} y1={y0} y2={y0 + B * 1000 * esc} stroke="var(--chart-3)" strokeWidth={1.5} strokeDasharray="2 3" />
      <text x={x0 + 4} y={W - 3} fontSize={9} fill="var(--muted-foreground)">B = {fmt(B, 2)} m</text>
      <text x={cx + cc / 2 + 3} y={y0 + 10} fontSize={8} fill="var(--chart-3)">cara (Mu)</text>
      <text x={cx + cc / 2 + dd + 3} y={y0 + 22} fontSize={8} fill="var(--chart-1)">d (1 dir.)</text>
      <text x={cx - crit / 2} y={cy - crit / 2 - 3} fontSize={8} fill="var(--chart-2)">d/2 (2 dir.)</text>
    </svg>
  );
}

export default function ZapataDiseno() {
  const p = useNum(1500);
  const pu = useNum(2000);
  const qa = useNum(200);
  const c = useNum(400);
  const fc = useNum(21);
  const [fy, setFy] = useState('420');
  const fcCol = useNum(21);

  const ok = [p.n, pu.n, qa.n, c.n, fc.n, fcCol.n].every((x) => Number.isFinite(x) && x > 0) && c.n >= 150;
  const resultado = useMemo<{ r: ResultadoZapata } | { error: string } | null>(() => {
    if (!ok) return null;
    try {
      return { r: disenarZapataCuadrada({ Pservicio: p.n, Pu: pu.n, qaNeta: qa.n, c: c.n, fc: fc.n, fy: Number(fy) }) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo diseñar' };
    }
  }, [ok, p.n, pu.n, qa.n, c.n, fc.n, fy]);

  const r = resultado && 'r' in resultado ? resultado.r : null;

  const curva = useMemo(() => {
    if (!r) return [];
    const filas: { d: number; vu: number; phivc: number }[] = [];
    for (let d = 100; d <= 900; d += 20) {
      const v = cortanteDosDireccionesZapata({ Pu: pu.n, B: r.B, L: r.B, c1: c.n, c2: c.n, d, fc: fc.n });
      filas.push({ d, vu: Number(v.Vu.toFixed(1)), phivc: Number(v.phiVc.toFixed(1)) });
    }
    return filas;
  }, [r, pu.n, c.n, fc.n]);

  const interfaz = useMemo(() => {
    if (!r) return null;
    return interfazColumnaZapata({ Pu: pu.n, c1: c.n, c2: c.n, h: r.h, B: r.B * 1000, L: r.B * 1000, fcColumna: fcCol.n, fcZapata: fc.n, fy: Number(fy) });
  }, [r, pu.n, c.n, fcCol.n, fc.n, fy]);

  return (
    <div className="space-y-5">
      <Grupo titulo="Cargas, suelo y materiales (zapata cuadrada, columna cuadrada centrada)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Carga de servicio P (D + L)" unidad="kN" valor={p.txt} onCambio={p.setTxt} min={1} ayuda="No mayorada: con ella se halla el área (C.15.2.2)" />
          <Campo etiqueta="Carga mayorada Pu" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} min={1} ayuda="Combinación C.9.2.1 gobernante" />
          <Campo etiqueta="Presión admisible neta del suelo" unidad="kPa" valor={qa.txt} onCambio={qa.setTxt} min={10} ayuda="qa menos el peso de zapata y relleno (estudio geotécnico, Título H)" />
          <Campo etiqueta="Lado de la columna c" unidad="mm" valor={c.txt} onCambio={c.setTxt} min={150} paso={50} />
          <Campo etiqueta="f′c de la zapata" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17.5} max={70} />
          <Selector etiqueta="Acero de refuerzo" valor={fy} onCambio={setFy} opciones={OPCIONES_FY} />
          <Campo etiqueta="f′c de la columna" unidad="MPa" valor={fcCol.txt} onCambio={fcCol.setTxt} min={17.5} max={70} ayuda="Para el aplastamiento en la base (C.15.8)" />
        </div>
      </Grupo>

      {!ok && <Aviso tipo="error">Revisa los datos: todos deben ser positivos y la columna de al menos 150 mm.</Aviso>}
      {resultado && 'error' in resultado && <Aviso tipo="error">{resultado.error}</Aviso>}

      {r && interfaz && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor destacado etiqueta="Lado B de la zapata" unidad="m" valor={fmt(r.B, 2)} nota={`Calculado ${fmt(r.Bcalculado, 3)} m con P/qa (C.15.2.2)`} />
            <Valor etiqueta="Presión de servicio" unidad="kPa" valor={fmt(r.quServicio, 1)} estado={r.quServicio <= qa.n + 1e-9 ? 'ok' : 'mal'} nota={`≤ ${fmt(qa.n, 0)} kPa`} />
            <Valor etiqueta="Presión neta mayorada qu" unidad="kPa" valor={fmt(r.qu, 1)} nota="Pu / B² (autor)" />
            <Valor etiqueta="Voladizo v" unidad="m" valor={fmt(r.voladizo, 3)} nota="Desde la cara de la columna" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="d mín. cortante 1 dirección" unidad="mm" valor={fmt(r.dUnaDireccion, 0)} nota="φVc = φ0.17√f′c b d (C.11-3)" />
            <Valor etiqueta="d mín. punzonamiento" unidad="mm" valor={fmt(r.dDosDirecciones, 0)} nota={`Gobierna ${r.cortanteDos.gobierna} (C.11.11.2.1)`} />
            <Valor destacado etiqueta="d adoptado" unidad="mm" valor={fmt(r.d, 0)} nota="Múltiplo de 10 mm y d ≥ 150 mm (C.15.7)" />
            <Valor etiqueta="Altura total h" unidad="mm" valor={fmt(r.h, 0)} nota="d + 75 mm (contra el suelo) + 8 mm (autor)" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Vu / φVc (1 dirección)" valor={`${fmt(r.cortanteUna.Vu, 0)} / ${fmt(r.cortanteUna.phiVc, 0)} kN`} estado={r.cortanteUna.cumple ? 'ok' : 'mal'} />
            <Valor etiqueta="Vu / φVc (2 direcciones)" valor={`${fmt(r.cortanteDos.Vu, 0)} / ${fmt(r.cortanteDos.phiVc, 0)} kN`} estado={r.cortanteDos.cumple ? 'ok' : 'mal'} nota={`bo = ${fmt(r.cortanteDos.bo, 0)} mm`} />
            <Valor etiqueta="Mu en la cara de la columna" unidad="kN·m" valor={fmt(r.Mu, 1)} nota="qu B v² / 2 (C.15.4.2(a))" />
            <Valor destacado etiqueta="As por dirección (todo el ancho)" unidad="mm²" valor={fmt(r.flexion.As, 0)} nota={r.flexion.As > r.flexion.AsFlexion ? `Gobierna el mínimo C.7.12.2.1 (${fmt(r.flexion.AsMin, 0)})` : `Flexión; mínimo ${fmt(r.flexion.AsMin, 0)}`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="φBn aplastamiento (gobierna)" unidad="kN" valor={fmt(interfaz.phiBn, 0)} estado={interfaz.cumpleAplastamiento ? 'ok' : 'neutro'} nota={`Columna ${fmt(interfaz.phiBnColumna, 0)} · zapata ${fmt(interfaz.phiBnZapata, 0)} (√(A2/A1) = ${fmt(interfaz.factorZapata, 2)})`} />
            <Valor etiqueta="Exceso sobre aplastamiento" unidad="kN" valor={fmt(interfaz.exceso, 0)} nota="Debe pasar por dowels (C.15.8.1.2)" />
            <Valor etiqueta="As dowels por exceso" unidad="mm²" valor={fmt(interfaz.AsPorExceso, 0)} nota="exceso / (0.65 fy) (autor)" />
            <Valor destacado etiqueta="As en la interfaz" unidad="mm²" valor={fmt(interfaz.As, 0)} nota={`Mínimo 0.005 Ag = ${fmt(interfaz.AsMinimo, 0)} (C.15.8.2.1)`} />
          </div>

          {(r.flexion.epsilonT < 0.005 || !r.cortanteUna.cumple || !r.cortanteDos.cumple) && <Aviso tipo="atencion">Alguna verificación no cumple con el d adoptado: revisa los datos.</Aviso>}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
            <div className="rounded-xl border p-3">
              <p className="mb-1 px-1 text-sm font-medium">Planta con las secciones críticas</p>
              <Esquema B={r.B} c={c.n} d={r.d} />
            </div>
            <div className="rounded-xl border p-3">
              <p className="mb-1 px-1 text-sm font-medium">Punzonamiento: Vu y φVc contra la altura útil d (kN)</p>
              <ChartContainer config={config} className="aspect-[16/9] w-full">
                <LineChart data={curva} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" type="number" domain={[100, 900]} label={{ value: 'd (mm)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                  <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'kN', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `d = ${pl?.[0]?.payload?.d} mm`} formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(1)} kN</span>} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" name="Vu (punzonamiento)" dataKey="vu" stroke="var(--color-vu)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" name="φVc (punzonamiento)" dataKey="phivc" stroke="var(--color-phivc)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <ReferenceDot x={Math.min(900, Math.max(100, r.d))} y={r.cortanteDos.phiVc} r={6} fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
              <p className="px-1 text-xs text-muted-foreground">Donde las curvas se cruzan está el d mínimo por punzonamiento. El punto marca el d adoptado.</p>
            </div>
          </div>
        </>
      )}
      <PieCalc>Carga axial centrada; no incluye momentos en la columna, zapatas rectangulares, pilotes ni verificación de longitud de desarrollo (C.15.6). La altura h usa 75 mm de recubrimiento contra el suelo (C.7.7.1) más 8 mm de medio diámetro de barra (supuesto).</PieCalc>
    </div>
  );
}
