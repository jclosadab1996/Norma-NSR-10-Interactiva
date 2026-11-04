import { useState } from 'react';
import { empujeMuro, presionesEnProfundidad, puntosCriticos, subpresion, type ParametrosEmpuje } from '@/lib/nsr10/empuje';
import { GAMMA_AGUA_DULCE } from '@/lib/nsr10/cargasVivas';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';

/** Diagrama de presiones horizontales sobre el muro (SVG) con sobrecarga y nivel freático. */
function Diagrama({ p }: { p: ParametrosEmpuje }) {
  const W = 560;
  const Ht = 360;
  const x0 = 70; // cara del muro en el lado del suelo
  const yTop = 56;
  const yBase = 292;
  const yDe = (z: number) => yTop + (z / p.alturaM) * (yBase - yTop);
  const pts = puntosCriticos(p).map((z) => presionesEnProfundidad(z, p));
  const pmax = Math.max(...pts.map((q) => q.total), 1e-6);
  const s = 270 / pmax;
  const r = empujeMuro(p);
  const zw = p.nivelFreaticoM !== null && p.nivelFreaticoM < p.alturaM ? Math.max(0, p.nivelFreaticoM) : null;

  const poligonoSuelo = [`${x0},${yDe(0)}`, ...pts.map((q) => `${x0 + s * q.empujeSuelo},${yDe(q.z)}`), `${x0},${yDe(p.alturaM)}`].join(' ');
  const ptsAgua = pts.filter((q) => zw !== null && q.z >= zw);
  const poligonoAgua =
    zw !== null && ptsAgua.length > 1
      ? [
          ...ptsAgua.map((q) => `${x0 + s * q.empujeSuelo},${yDe(q.z)}`),
          ...[...ptsAgua].reverse().map((q) => `${x0 + s * q.total},${yDe(q.z)}`),
        ].join(' ')
      : null;
  const yR = yBase - (Number.isFinite(r.total.alturaDesdeBase) ? (r.total.alturaDesdeBase / p.alturaM) * (yBase - yTop) : 0);
  const xTotalBase = x0 + s * r.base.total;

  return (
    <svg viewBox={`0 0 ${W} ${Ht}`} className="h-auto w-full" role="img" aria-label="Diagrama de presiones horizontales sobre un muro de sótano">
      <defs>
        <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {/* suelo */}
      <rect x={x0} y={yTop} width={W - x0 - 10} height={yBase - yTop} fill="var(--chart-2)" fillOpacity={0.08} />
      {/* muro y losa */}
      <rect x={x0 - 16} y={yTop - 12} width={16} height={yBase - yTop + 12 + 14} className="fill-muted-foreground/60" />
      <rect x={x0 - 16} y={yBase} width={W - x0 - 10 + 16} height={14} className="fill-muted-foreground/60" />
      <text x={x0 - 8} y={yTop - 18} textAnchor="middle" className="fill-muted-foreground text-[11px]">muro</text>
      {/* sobrecarga */}
      {Array.from({ length: 9 }, (_, k) => (
        <line key={k} x1={x0 + 14 + k * 28} y1={yTop - 26} x2={x0 + 14 + k * 28} y2={yTop - 3} stroke="currentColor" className="text-foreground" strokeWidth={1.4} markerEnd="url(#flecha)" />
      ))}
      <text x={x0 + 14 + 9 * 28} y={yTop - 14} className="fill-foreground text-[12px]">q = {fmt(p.sobrecarga, 1)} kN/m²</text>
      <line x1={x0} y1={yTop} x2={W - 10} y2={yTop} className="stroke-foreground" strokeWidth={1.2} />
      {/* presiones */}
      <polygon points={poligonoSuelo} fill="var(--chart-1)" fillOpacity={0.35} stroke="var(--chart-1)" strokeWidth={1.8} />
      {poligonoAgua && <polygon points={poligonoAgua} fill="var(--chart-5)" fillOpacity={0.3} stroke="var(--chart-5)" strokeWidth={1.8} />}
      {/* nivel freático */}
      {zw !== null && (
        <g>
          <line x1={x0} y1={yDe(zw)} x2={W - 10} y2={yDe(zw)} stroke="var(--chart-5)" strokeWidth={1.6} strokeDasharray="6 4" />
          <path d={`M${W - 70} ${yDe(zw) - 12} l8 0 l-4 8 z`} fill="var(--chart-5)" />
          <text x={W - 20} y={yDe(zw) - 14} textAnchor="end" className="fill-foreground text-[11px]">N. F. a {fmt(zw, 2)} m</text>
        </g>
      )}
      {/* valores en puntos críticos */}
      {pts.map((q) => (
        <g key={q.z}>
          <circle cx={x0 + s * q.empujeSuelo} cy={yDe(q.z)} r={2.8} fill="var(--chart-1)" />
          <text x={x0 + s * q.total + 8} y={yDe(q.z) + (q.z === 0 ? 14 : q.z === p.alturaM ? -4 : 14)} className="fill-foreground font-mono text-[11px]">
            {q.z === 0 || q.z === p.alturaM ? `σh = ${fmt(q.total, 1)} kPa` : `σh = ${fmt(q.total, 1)}`}
          </text>
        </g>
      ))}
      {/* resultante */}
      {Number.isFinite(r.total.alturaDesdeBase) && (
        <g className="text-foreground">
          <line x1={xTotalBase + 120} y1={yR} x2={x0 + 4} y2={yR} stroke="currentColor" strokeWidth={2.2} markerEnd="url(#flecha)" strokeDasharray="1 0" />
          <text x={xTotalBase + 122} y={yR + 4} className="fill-foreground text-[11px] font-semibold">R = {fmt(r.total.fuerza, 1)} kN/m</text>
        </g>
      )}
      {/* subpresión */}
      {zw !== null &&
        Array.from({ length: 7 }, (_, k) => (
          <line key={k} x1={x0 + 40 + k * 60} y1={yBase + 40} x2={x0 + 40 + k * 60} y2={yBase + 16} stroke="var(--chart-5)" strokeWidth={1.6} markerEnd="url(#flecha)" className="text-[var(--chart-5)]" />
        ))}
      {zw !== null && (
        <text x={x0 + 40} y={yBase + 56} className="fill-foreground text-[11px]">
          subpresión u = {fmt(subpresion(p.alturaM, zw, p.gammaW), 1)} kPa (B.5.2)
        </text>
      )}
      {/* cota */}
      <line x1={22} y1={yTop} x2={22} y2={yBase} className="stroke-muted-foreground" strokeWidth={1} markerStart="url(#flecha)" markerEnd="url(#flecha)" />
      <text x={20} y={(yTop + yBase) / 2} textAnchor="middle" transform={`rotate(-90 20 ${(yTop + yBase) / 2})`} className="fill-muted-foreground text-[11px]">
        H = {fmt(p.alturaM, 2)} m
      </text>
    </svg>
  );
}

export default function EmpujeTierra() {
  const alt = useNum(3.5);
  const k = useNum(0.5);
  const gam = useNum(18);
  const gsat = useNum(20);
  const q = useNum(10);
  const zw = useNum(1.5);
  const [hayNF, setHayNF] = useState(true);

  const ok =
    [alt.n, k.n, gam.n, gsat.n, q.n].every((x) => Number.isFinite(x)) &&
    alt.n > 0 &&
    k.n > 0 &&
    gam.n > 0 &&
    gsat.n >= gam.n &&
    q.n >= 0 &&
    (!hayNF || (Number.isFinite(zw.n) && zw.n >= 0));
  const p: ParametrosEmpuje | null = ok
    ? { alturaM: alt.n, k: k.n, gamma: gam.n, gammaSat: gsat.n, sobrecarga: q.n, nivelFreaticoM: hayNF ? zw.n : null, gammaW: GAMMA_AGUA_DULCE }
    : null;
  const r = p ? empujeMuro(p) : null;
  const nfDentro = p && p.nivelFreaticoM !== null && p.nivelFreaticoM < p.alturaM;
  const u = p && p.nivelFreaticoM !== null ? subpresion(p.alturaM, p.nivelFreaticoM, p.gammaW) : 0;

  return (
    <div className="space-y-5">
      <Aviso tipo="atencion">
        La NSR-10 no da valores de K: el coeficiente de empuje (activo si el muro puede girar y trasladarse; en reposo o mayor si no) lo elige el <strong>ingeniero geotecnista</strong> (B.5.1.2, Título H).
        Los valores iniciales de la calculadora son <strong>solo un ejemplo</strong>.
      </Aviso>

      <Grupo titulo="Datos del muro y del suelo">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Altura de muro enterrado H" unidad="m" valor={alt.txt} onCambio={alt.setTxt} min={0.5} max={30} paso={0.1} />
          <Campo etiqueta="Coeficiente de empuje K" valor={k.txt} onCambio={k.setTxt} min={0.05} max={5} paso={0.05} ayuda="Dado por el geotecnista (activo, reposo…)." />
          <Campo etiqueta="Sobrecarga q en superficie" unidad="kN/m²" valor={q.txt} onCambio={q.setTxt} min={0} paso={1} ayuda="Cargas vivas + muertas sobre el suelo adyacente (B.5.1.1)." />
          <Campo etiqueta="Peso unitario del suelo γ" unidad="kN/m³" valor={gam.txt} onCambio={gam.setTxt} min={5} max={30} paso={0.5} ayuda="Sobre el nivel freático." />
          <Campo etiqueta="Peso unitario saturado γsat" unidad="kN/m³" valor={gsat.txt} onCambio={gsat.setTxt} min={5} max={30} paso={0.5} ayuda="Bajo el nivel freático; se usa γ′ = γsat − γw." />
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={hayNF} onChange={(e) => setHayNF(e.target.checked)} />
              Hay nivel freático
            </label>
            {hayNF && <Campo etiqueta="Profundidad del nivel freático" unidad="m" valor={zw.txt} onCambio={zw.setTxt} min={0} paso={0.1} ayuda="Medida desde la superficie del terreno." />}
          </div>
        </div>
      </Grupo>

      {!p && <Aviso tipo="error">Revisa los datos: valores positivos y γsat ≥ γ.</Aviso>}
      {p && r && (
        <>
          {hayNF && !nfDentro && <Aviso tipo="nota">El nivel freático está por debajo de la base del muro: no hay presión hidrostática sobre el muro ni subpresión en la losa.</Aviso>}

          <div className="rounded-xl border p-3">
            <Diagrama p={p} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
              <span><span className="mr-1 inline-block h-2.5 w-4 align-middle" style={{ background: 'var(--chart-1)', opacity: 0.5 }} />K·(q + peso del suelo)</span>
              <span><span className="mr-1 inline-block h-2.5 w-4 align-middle" style={{ background: 'var(--chart-5)', opacity: 0.5 }} />presión hidrostática (total)</span>
              <span>Presiones en kPa = kN/m².</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="σh en la superficie" unidad="kPa" valor={fmt(r.superficie.total, 2)} nota="K·q" />
            <Valor etiqueta="σh en la base" unidad="kPa" valor={fmt(r.base.total, 2)} nota={`suelo ${fmt(r.base.empujeSuelo, 1)} + agua ${fmt(r.base.hidrostatica, 1)}`} />
            <Valor etiqueta="γ′ sumergido" unidad="kN/m³" valor={fmt(r.gammaSumergido, 2)} nota="γsat − γw (γw = 9.8)" />
            <Valor etiqueta="Subpresión en la losa" unidad="kPa" valor={fmt(u, 2)} nota="u = γw·h (B.5.2)" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Valor etiqueta="Por sobrecarga" unidad="kN/m" valor={fmt(r.sobrecarga.fuerza, 2)} nota={`a ${fmt(r.sobrecarga.alturaDesdeBase, 2)} m de la base`} />
            <Valor etiqueta="Por el suelo" unidad="kN/m" valor={fmt(r.suelo.fuerza, 2)} nota={`a ${fmt(r.suelo.alturaDesdeBase, 2)} m de la base`} />
            <Valor etiqueta="Por el agua" unidad="kN/m" valor={fmt(r.agua.fuerza, 2)} nota={r.agua.fuerza > 0 ? `a ${fmt(r.agua.alturaDesdeBase, 2)} m de la base` : 'Sin agua sobre el muro'} />
            <Valor destacado etiqueta="Empuje total R" unidad="kN/m" valor={fmt(r.total.fuerza, 2)} nota={`a ${fmt(r.total.alturaDesdeBase, 2)} m de la base`} />
            <Valor etiqueta="Momento en la base" unidad="kN·m/m" valor={fmt(r.total.momentoBase, 2)} />
          </div>
        </>
      )}
      <PieCalc>
        σh = K·σ′v + u con σ′v = q + γ·z sobre el nivel freático y γ′ bajo él (B.5.1.1). Fuerzas por metro de longitud de muro. Los factores de seguridad y la verificación de flotación los fija el Título H.
      </PieCalc>
    </div>
  );
}
