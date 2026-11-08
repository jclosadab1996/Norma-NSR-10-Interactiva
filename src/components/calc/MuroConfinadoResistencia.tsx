import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { FC_MINIMO_CONFINAMIENTO, PHI_CONFINADO, PHI_CORTANTE_TITULO_C } from '@/data/muroConfinadoDiseno';
import { curvaInteraccionMuro } from '@/lib/nsr10/mamposteria';
import { analizarMuroConfinado, phiConfinadoFn } from '@/lib/nsr10/muroConfinadoResistencia';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  p: { label: 'φPn–φMn', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const OPCIONES_PHI = [
  { value: 'literal', label: `φ = ${PHI_CONFINADO.cortante} (D.10.7.2 d, lectura literal)` },
  { value: 'c', label: `φ = ${PHI_CORTANTE_TITULO_C} (C.9.3.2.3, alternativa del proyecto)` },
];

export default function MuroConfinadoResistencia() {
  const fm = useNum(6);
  const fc = useNum(21);
  const fy = useNum(420);
  const t = useNum(150);
  const lw = useNum(3000);
  const bc = useNum(200);
  const hp = useNum(2500);
  const lc = useNum(3000);
  const hPrime = useNum(2400);
  const frac = useNum(1);
  const astCol = useNum(516);
  const pu = useNum(600);
  const puSim = useNum(150);
  const mu = useNum(360);
  const vu = useNum(60);
  const dCol = useNum(160);
  const avCol = useNum(64);
  const sCol = useNum(100);
  const bwViga = useNum(150);
  const dViga = useNum(160);
  const avViga = useNum(64);
  const sViga = useNum(100);
  const astViga = useNum(284);
  const fyt = useNum(420);
  const [phiSel, setPhiSel] = useState('literal');

  const r = useMemo(() => {
    const pos = [fm.n, fc.n, fy.n, t.n, lw.n, bc.n, hp.n, lc.n, hPrime.n, frac.n, astCol.n, dCol.n, bwViga.n, dViga.n, fyt.n, sCol.n, sViga.n];
    const noNeg = [pu.n, puSim.n, mu.n, vu.n, avCol.n, avViga.n, astViga.n];
    if (pos.some((x) => !Number.isFinite(x) || x <= 0) || noNeg.some((x) => !Number.isFinite(x) || x < 0)) return null;
    if (frac.n > 1 || bc.n * 2 >= lw.n + bc.n || astCol.n >= bc.n * t.n) return null;
    return analizarMuroConfinado({
      fm: fm.n, fc: fc.n, fy: fy.n, t: t.n, lw: lw.n, bc: bc.n, hp: hp.n, lc: lc.n, hPrime: hPrime.n, fraccionAe: frac.n,
      AstColumna: astCol.n, Pu: pu.n, PuSimultanea: puSim.n, Mu: mu.n, Vu: vu.n,
      columnaCortante: { d: dCol.n, Av: avCol.n, s: sCol.n, fyt: fyt.n },
      vigaCortante: { bw: bwViga.n, d: dViga.n, Av: avViga.n, s: sViga.n, fyt: fyt.n },
      AstViga: astViga.n,
      phiCortanteElementos: phiSel === 'c' ? PHI_CORTANTE_TITULO_C : PHI_CONFINADO.cortante,
    });
  }, [fm.n, fc.n, fy.n, t.n, lw.n, bc.n, hp.n, lc.n, hPrime.n, frac.n, astCol.n, pu.n, puSim.n, mu.n, vu.n, dCol.n, avCol.n, sCol.n, fyt.n, bwViga.n, dViga.n, avViga.n, sViga.n, astViga.n, phiSel]);

  const curva = useMemo(() => {
    if (!r) return null;
    const c = curvaInteraccionMuro(r.flexo.sec, phiConfinadoFn(), { hPrime: hPrime.n, t: t.n }, 40);
    return [{ m: 0, p: c.puntos[0].phiPn }, ...c.puntos.map((p) => ({ m: p.phiMn, p: p.phiPn }))];
  }, [r, hPrime.n, t.n]);

  const g = r?.geometria;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Materiales y geometría del muro">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={3} max={40} />
            <Campo etiqueta="f′c columnas y vigas" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={FC_MINIMO_CONFINAMIENTO} max={60} ayuda="mín. 17.5 (D.10.4.1)" />
            <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={600} />
            <Campo etiqueta="Espesor t" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={110} />
            <Campo etiqueta="Longitud ℓw (c-c columnas)" unidad="mm" valor={lw.txt} onCambio={lw.setTxt} min={500} />
            <Campo etiqueta="Ancho columna bc" unidad="mm" valor={bc.txt} onCambio={bc.setTxt} min={100} ayuda="en la dirección del muro" />
            <Campo etiqueta="Altura paño hp (c-c vigas)" unidad="mm" valor={hp.txt} onCambio={hp.setTxt} min={500} />
            <Campo etiqueta="Luz paño ℓc (c-c columnas)" unidad="mm" valor={lc.txt} onCambio={lc.setTxt} min={500} ayuda="= ℓw si solo hay dos columnas" />
            <Campo etiqueta="Altura efectiva h′" unidad="mm" valor={hPrime.txt} onCambio={hPrime.setTxt} min={500} ayuda="D.5.4.3" />
            <Campo etiqueta="Ae mampostería / área bruta" valor={frac.txt} onCambio={frac.setTxt} min={0.1} max={1} paso={0.05} ayuda="1 = maciza o inyectada" />
          </div>
        </Grupo>
        <Grupo titulo="Solicitaciones mayoradas">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Pu máxima (gravedad)" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} min={0} ayuda="D.10.7.4" />
            <Campo etiqueta="Pu simultánea con Mu y Vu" unidad="kN" valor={puSim.txt} onCambio={puSim.setTxt} min={0} />
            <Campo etiqueta="Mu en el plano" unidad="kN·m" valor={mu.txt} onCambio={mu.setTxt} min={0} />
            <Campo etiqueta="Vu en el plano" unidad="kN" valor={vu.txt} onCambio={vu.setTxt} min={0} />
          </div>
        </Grupo>
        <Grupo titulo="Columnas de confinamiento">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Ast por columna" unidad="mm²" valor={astCol.txt} onCambio={astCol.setTxt} min={1} />
            <Campo etiqueta="d (cortante)" unidad="mm" valor={dCol.txt} onCambio={dCol.setTxt} min={50} />
            <Campo etiqueta="Av estribos (ramas)" unidad="mm²" valor={avCol.txt} onCambio={avCol.setTxt} min={0} />
            <Campo etiqueta="s estribos" unidad="mm" valor={sCol.txt} onCambio={sCol.setTxt} min={20} />
          </div>
        </Grupo>
        <Grupo titulo="Viga de confinamiento">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Ast longitudinal" unidad="mm²" valor={astViga.txt} onCambio={astViga.setTxt} min={0} />
            <Campo etiqueta="bw" unidad="mm" valor={bwViga.txt} onCambio={bwViga.setTxt} min={100} />
            <Campo etiqueta="d" unidad="mm" valor={dViga.txt} onCambio={dViga.setTxt} min={50} />
            <Campo etiqueta="Av estribos (ramas)" unidad="mm²" valor={avViga.txt} onCambio={avViga.setTxt} min={0} />
            <Campo etiqueta="s estribos" unidad="mm" valor={sViga.txt} onCambio={sViga.setTxt} min={20} />
            <Campo etiqueta="fyt estribos" unidad="MPa" valor={fyt.txt} onCambio={fyt.setTxt} min={240} max={420} />
            <Selector etiqueta="φ de cortante en columna y viga" valor={phiSel} onCambio={setPhiSel} opciones={OPCIONES_PHI} className="sm:col-span-3" />
          </div>
        </Grupo>
      </div>

      {!r && <Aviso tipo="error">Revisa los datos: valores positivos (cargas ≥ 0), 0 &lt; Ae/área bruta ≤ 1, y la columna debe caber en el muro (2 bc &lt; ℓw + bc) con Ast menor que su sección.</Aviso>}

      {r && g && curva && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Ae" unidad="mm²" valor={fmt(g.Ae, 0)} nota="incluye las columnas (D.5.4.1)" />
            <Valor etiqueta="b = Ae/L" unidad="mm" valor={fmt(g.b, 1)} nota={`L = ${fmt(g.Ltotal, 0)} mm; Amv = ${fmt(g.Amv, 0)} mm²`} />
            <Valor etiqueta="φPnc / φPnt (columna)" unidad="kN" valor={`${fmt(r.columna.phiPnc, 1)} / ${fmt(r.columna.phiPnt, 1)}`} nota="Ecs. D.10.7-1 y D.10.7-2" />
            <Valor etiqueta="φPn muro" unidad="kN" valor={fmt(r.axial.phiPn, 1)} nota={`Re = ${fmt(r.axial.Re, 3)}; h′/t = ${fmt(r.axial.esbeltez, 1)}`} />
            <Valor etiqueta="Puc / Put (dos columnas)" unidad="kN" valor={`${fmt(r.dosColumnas.Puc, 1)} / ${fmt(r.dosColumnas.Put, 1)}`} nota={`ΔPu = Mu/ℓw = ${fmt(r.dosColumnas.deltaPu, 1)} kN`} />
            <Valor etiqueta="φVn muro" unidad="kN" valor={fmt(r.cortante.phiVn, 1)} nota={r.cortante.topeRige ? 'rige el tope √f′m Amv/6' : 'Ec. D.10.7-18'} />
            <Valor etiqueta="Pud / φPnd (biela)" unidad="kN" valor={`${fmt(r.biela.Pud, 1)} / ${fmt(r.biela.phiPnd, 1)}`} nota={`h′ diagonal = ${fmt(r.biela.hDiagonal, 0)} mm; Re = ${fmt(r.biela.Re, 3)}`} />
            <Valor etiqueta="Vuc columna / viga" unidad="kN" valor={`${fmt(r.cortanteElementos.columna, 1)} / ${fmt(r.cortanteElementos.viga, 1)}`} nota={`Put viga = ${fmt(r.viga.Put, 1)} kN`} />
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Sección</th>
                  <th className="px-3 py-2">Verificación</th>
                  <th className="px-3 py-2 text-right">Demanda</th>
                  <th className="px-3 py-2 text-right">Capacidad</th>
                  <th className="px-3 py-2 text-right">Razón</th>
                  <th className="px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {r.filas.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{f.seccion}</td>
                    <td className="px-3 py-2">{f.titulo}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(f.demanda, 1)} {f.unidad}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(f.capacidad, 1)} {f.unidad}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number.isFinite(f.razon) ? fmt(f.razon, 2) : '—'}</td>
                    <td className={`px-3 py-2 font-semibold ${f.cumple ? 'text-ok' : 'text-danger'}`}>{f.cumple ? 'Cumple' : 'No cumple'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Diagrama de interacción de diseño del muro (D.10.7.6.2)</p>
            <ChartContainer config={config} className="aspect-[16/9] w-full">
              <LineChart data={curva} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="m" type="number" domain={[0, 'dataMax']} tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'φMn (kN·m)', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                <YAxis dataKey="p" type="number" tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'φPn (kN)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v) => <span className="font-mono">φPn = {Number(v).toFixed(0)} kN</span>} />} />
                <Line dataKey="p" stroke="var(--color-p)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <ReferenceDot x={Math.abs(mu.n)} y={puSim.n} r={5} fill={r.flexo.verificacion.cumple ? 'var(--ok, var(--chart-2))' : 'var(--danger, var(--chart-5))'} stroke="none" />
              </LineChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">El punto es (Mu, Pu simultánea). φ = 0.65 con Pn &gt; 0 y 0.85 en flexión pura y tracción (esquema del proyecto).</p>
          </div>

          <div className="space-y-2">
            {r.cumpleTodo ? <Aviso tipo="nota">El muro cumple todas las verificaciones de D.10.7 incluidas aquí.</Aviso> : <Aviso tipo="error">Hay verificaciones que no cumplen: revisa las filas marcadas «No cumple».</Aviso>}
            {!r.axial.esbeltezAdmisible && <Aviso tipo="error">h′/t excede 25 (D.5.4.3.1).</Aviso>}
            {r.biela.esbeltez > 30 && <Aviso tipo="atencion">La biela tiene h′/t &gt; 30: Re sigue la rama de Euler (D.10.7-4).</Aviso>}
          </div>
        </>
      )}
      <PieCalc>
        Muro con dos columnas iguales de borde (D.10.7.4 a D.10.7.10). La diagonal h′ = √(ℓc² + hp²), el ancho b = Ae/L, la lectura Put = 0 cuando D.10.7-6 es positiva y la
        alternativa φ = 0.75 en el cortante de los elementos son interpretaciones del proyecto. La flexión fuera del plano de las columnas se diseña con el Título C.
      </PieCalc>
    </div>
  );
}
