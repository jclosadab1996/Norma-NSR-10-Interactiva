import { useMemo } from 'react';
import { beta1 } from '@/lib/nsr10/concreto';
import { asMinimo, epsilonLimiteCompresion, flexionViga, type ResultadoViga } from '@/lib/nsr10/flexionConcreto';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';

const CLASES = { compresion: 'controlada por compresión', transicion: 'zona de transición', traccion: 'controlada por tracción' } as const;

/** Esquema de la sección con el bloque de compresión y diagrama de deformaciones unitarias (SVG). */
function Esquema({ b, h, d, dPrime, r, tieneComp }: { b: number; h: number; d: number; dPrime: number; r: ResultadoViga; tieneComp: boolean }) {
  const alto = 220;
  const esc = alto / h;
  const ancho = Math.max(40, Math.min(110, b * esc));
  const x0 = 30;
  const yTop = 14;
  const yd = yTop + d * esc;
  const yc = yTop + Math.min(r.c, h * 1.2) * esc;
  const ya = yTop + Math.min(r.a, h) * esc;
  // Diagrama de deformaciones a la derecha.
  const xe = x0 + ancho + 90;
  const refe = Math.max(Math.abs(r.epsT), 0.003);
  const k = 85 / refe; // px por unidad de deformación
  const xCero = xe + 20 + 0.003 * k; // línea de deformación nula (eje neutro) a la derecha del extremo comprimido
  const xTop = xCero - 0.003 * k;
  const xBot = xCero + r.epsT * k;
  const ancho2 = Math.max(xBot, xCero) + 100;
  const barras = 4;
  const paso = (ancho - 20) / (barras - 1);
  return (
    <svg viewBox={`0 0 ${Math.max(330, ancho2)} ${alto + 40}`} className="mx-auto h-auto w-full max-w-lg" role="img" aria-label="Sección transversal y diagrama de deformaciones unitarias">
      <title>Sección, bloque de compresión y deformaciones</title>
      {/* sección */}
      <rect x={x0} y={yTop} width={ancho} height={alto} fill="var(--muted)" stroke="currentColor" strokeWidth={1.5} />
      <rect x={x0} y={yTop} width={ancho} height={Math.max(0, ya - yTop)} fill="var(--chart-1)" fillOpacity={0.35} />
      <line x1={x0 - 6} x2={x0 + ancho + 6} y1={yc} y2={yc} stroke="currentColor" strokeDasharray="5 3" />
      {Array.from({ length: barras }).map((_, i) => (
        <circle key={i} cx={x0 + 10 + i * paso} cy={yd} r={4.5} fill="currentColor" />
      ))}
      {tieneComp && Array.from({ length: 2 }).map((_, i) => <circle key={i} cx={x0 + 12 + i * (ancho - 24)} cy={yTop + dPrime * esc} r={3.5} fill="currentColor" />)}
      <text x={x0 + ancho + 10} y={yc + 4} fontSize={10} fill="currentColor">c (eje neutro)</text>
      <text x={x0 - 4} y={Math.max(ya - 3, yTop + 10)} fontSize={10} textAnchor="end" fill="currentColor">a</text>
      <text x={x0 + ancho / 2} y={alto + yTop + 14} fontSize={10} textAnchor="middle" fill="currentColor">b × h</text>
      {/* deformaciones */}
      <line x1={xCero} x2={xCero} y1={yTop - 6} y2={yTop + alto + 4} stroke="currentColor" strokeOpacity={0.4} />
      <polygon points={`${xTop},${yTop} ${xCero},${yc} ${xBot},${yd}`} fill="var(--chart-2)" fillOpacity={0.25} stroke="var(--chart-2)" strokeWidth={2} />
      <text x={xTop - 4} y={yTop - 3} fontSize={10} textAnchor="end" fill="currentColor">εcu = 0.003</text>
      <text x={xBot + (r.epsT >= 0 ? 4 : -4)} y={yd + 12} fontSize={10} textAnchor={r.epsT >= 0 ? 'start' : 'end'} fill="currentColor">εt = {fmt(r.epsT, 4)}</text>
      <text x={xCero + 3} y={yc - 3} fontSize={10} fill="currentColor">0</text>
    </svg>
  );
}

export default function FlexionViga() {
  const b = useNum(300);
  const h = useNum(500);
  const d = useNum(440);
  const fc = useNum(28);
  const fy = useNum(420);
  const As = useNum(1530);
  const Ap = useNum(0);
  const dp = useNum(60);
  const Mu = useNum(0);

  const r = useMemo(() => {
    const vals = [b.n, h.n, d.n, fc.n, fy.n, As.n];
    if (vals.some((v) => !Number.isFinite(v) || v <= 0)) return null;
    const aprime = Number.isFinite(Ap.n) && Ap.n > 0 ? Ap.n : 0;
    if (aprime > 0 && !(Number.isFinite(dp.n) && dp.n > 0 && dp.n < d.n)) return null;
    return flexionViga({ b: b.n, h: h.n, d: d.n, fc: fc.n, fy: fy.n, As: As.n, Aprime: aprime || undefined, dPrime: aprime ? dp.n : undefined });
  }, [b.n, h.n, d.n, fc.n, fy.n, As.n, Ap.n, dp.n]);

  const tieneComp = Number.isFinite(Ap.n) && Ap.n > 0;
  const asmin = Number.isFinite(b.n + d.n + fc.n + fy.n) ? asMinimo(fc.n, fy.n, b.n, d.n) : NaN;
  const MuOk = Number.isFinite(Mu.n) && Mu.n > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Sección y materiales">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={100} max={2000} />
            <Campo etiqueta="h" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={150} max={3000} />
            <Campo etiqueta="d" unidad="mm" valor={d.txt} onCambio={d.setTxt} min={100} max={3000} ayuda="Altura útil al refuerzo de tracción" />
            <Campo etiqueta="f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} max={100} />
            <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="As (tracción)" unidad="mm²" valor={As.txt} onCambio={As.setTxt} min={1} />
            <Campo etiqueta="A′s (compresión)" unidad="mm²" valor={Ap.txt} onCambio={Ap.setTxt} min={0} ayuda="0 si no hay" />
            <Campo etiqueta="d′" unidad="mm" valor={dp.txt} onCambio={dp.setTxt} min={20} ayuda="Cara superior al refuerzo A′s" />
            <Campo etiqueta="Mu (opcional)" unidad="kN·m" valor={Mu.txt} onCambio={Mu.setTxt} min={0} ayuda="Para verificar φMn ≥ Mu" />
          </div>
        </Grupo>
      </div>

      {!r && <Aviso tipo="error">Revisa los datos: todos deben ser positivos, d′ &lt; d, y la sección debe poder equilibrarse.</Aviso>}
      {r && d.n > h.n && <Aviso tipo="atencion">d es mayor que h: revisa la geometría.</Aviso>}

      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="β₁" valor={fmt(beta1(fc.n), 3)} nota="C.10.2.7.3" />
            <Valor etiqueta="a = β₁c" unidad="mm" valor={fmt(r.a, 1)} nota="C.10.2.7.1" />
            <Valor etiqueta="c" unidad="mm" valor={fmt(r.c, 1)} nota="eje neutro" />
            <Valor etiqueta="εt" valor={fmt(r.epsT, 5)} nota={`${CLASES[r.clase]} · límite compresión ${fmt(epsilonLimiteCompresion(fy.n), 4)}`} />
            <Valor etiqueta="φ" valor={fmt(r.phi, 3)} nota="C.9.3.2" />
            <Valor etiqueta="Mn" unidad="kN·m" valor={fmt(r.Mn, 1)} />
            <Valor destacado etiqueta="φMn" unidad="kN·m" valor={fmt(r.phiMn, 1)} estado={MuOk ? (r.phiMn >= Mu.n ? 'ok' : 'mal') : 'neutro'} nota={MuOk ? `Mu / φMn = ${fmt(Mu.n / r.phiMn, 3)}` : undefined} />
            {r.fsPrime !== null && <Valor etiqueta="f′s (compresión)" unidad="MPa" valor={fmt(r.fsPrime, 0)} nota={r.fsPrime >= fy.n - 1e-6 ? 'en fluencia' : 'elástico'} />}
          </div>

          <div className="rounded-xl border p-3">
            <Esquema b={b.n} h={h.n} d={d.n} dPrime={tieneComp ? dp.n : 0} r={r} tieneComp={tieneComp} />
          </div>

          <div className="space-y-2">
            {!r.cumpleEpsMin && <Aviso tipo="error">εt &lt; 0.004: no cumple C.10.3.5 para elementos no preesforzados en flexión. Aumenta la sección o agrega refuerzo de compresión.</Aviso>}
            {r.cumpleEpsMin && r.clase !== 'traccion' && <Aviso tipo="atencion">La sección está en la zona de transición (0.004 ≤ εt &lt; 0.005): φ se reduce linealmente (C.9.3.2).</Aviso>}
            {As.n < asmin ? (
              <Aviso tipo="atencion">As = {fmt(As.n, 0)} mm² es menor que As,min = {fmt(asmin, 0)} mm² (Ec. C.10-3, C.10.5.1), salvo que se cumpla C.10.5.3 (As ≥ 4/3 del requerido).</Aviso>
            ) : (
              <Aviso tipo="nota">As,min (Ec. C.10-3) = {fmt(asmin, 0)} mm²: se cumple. Cuantía ρ = {fmt(As.n / (b.n * d.n), 4)}.</Aviso>
            )}
            {tieneComp && dp.n >= r.c && <Aviso tipo="atencion">d′ ≥ c: el refuerzo A′s queda en la zona traccionada y no trabaja a compresión.</Aviso>}
          </div>
        </>
      )}
      <PieCalc>Equilibrio de la sección con εcu = 0.003, bloque rectangular de 0.85 f′c y acero elastoplástico (C.10.2); φ según C.9.3.2. Se descuenta el concreto desplazado por A′s.</PieCalc>
    </div>
  );
}
