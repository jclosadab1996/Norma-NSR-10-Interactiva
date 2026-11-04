import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS, buscarBarra } from '@/data/refuerzoDetalles';
import { DES_COLUMNA, DMO_COLUMNA, MATERIALES_C211 } from '@/data/sismoConcreto';
import {
  ashRequerido,
  geometriaNucleo,
  longitudLoColumna,
  separacionFueraDeLo,
  separacionMaximaColumna,
  separacionPorAshProvisto,
  separacionSoDES,
  type GradoColumna,
} from '@/lib/nsr10/sismoConcreto';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const OPCIONES_GRADO = [
  { value: 'DES', label: 'DES — pórtico especial (C.21.6)' },
  { value: 'DMO', label: 'DMO — pórtico intermedio (C.21.3.5)' },
];

const OPCIONES_BARRA = BARRAS.map((b) => ({ value: b.id, label: `${b.designacion} (db = ${b.db} mm)` }));

const config = {
  b: { label: 'Ash requerida, dirección b', color: 'var(--chart-1)' },
  h: { label: 'Ash requerida, dirección h', color: 'var(--chart-2)' },
  prov: { label: 'Ash provista', color: 'var(--chart-3)' },
} satisfies ChartConfig;

/** Posiciones (0–1) de n ramas repartidas con igual separación entre los ejes de las ramas extremas. */
const posiciones = (n: number) => Array.from({ length: n }, (_, i) => (n === 1 ? 0.5 : i / (n - 1)));

/** Esquema de la sección con el núcleo confinado, el estribo, las ramas y las barras longitudinales. */
function Esquema({ b, h, r, dbe, nParaH, nParaB }: { b: number; h: number; r: number; dbe: number; nParaH: number; nParaB: number }) {
  const W = 300;
  const escala = Math.min((W - 70) / b, (W - 70) / h);
  const bw = b * escala;
  const hw = h * escala;
  const x0 = (W - bw) / 2 + 8;
  const y0 = (W - hw) / 2 - 4;
  const rr = r * escala;
  const t = Math.max(1.6, dbe * escala);
  const xi = x0 + rr;
  const yi = y0 + rr;
  const wi = bw - 2 * rr;
  const hi = hw - 2 * rr;
  const nx = Math.max(2, nParaH); // ramas paralelas a h repartidas a lo ancho
  const ny = Math.max(2, nParaB); // ramas paralelas a b repartidas a lo alto
  const bar = Math.max(3, 2.2 * t);
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="mx-auto h-auto w-full max-w-[300px] text-foreground" role="img" aria-label="Sección de la columna con el estribo de confinamiento y las barras longitudinales">
      <rect x={x0} y={y0} width={bw} height={hw} className="fill-muted stroke-foreground" strokeWidth={1.4} />
      {/* núcleo confinado (hasta el borde externo del estribo) */}
      <rect x={xi} y={yi} width={wi} height={hi} fill="none" className="stroke-primary" strokeWidth={t} />
      {/* ramas interiores */}
      {posiciones(nx).slice(1, -1).map((p, i) => (
        <line key={`v${i}`} x1={xi + p * wi} x2={xi + p * wi} y1={yi} y2={yi + hi} className="stroke-primary" strokeWidth={t * 0.8} />
      ))}
      {posiciones(ny).slice(1, -1).map((p, i) => (
        <line key={`h${i}`} x1={xi} x2={xi + wi} y1={yi + p * hi} y2={yi + p * hi} className="stroke-primary" strokeWidth={t * 0.8} />
      ))}
      {/* barras longitudinales: arriba/abajo en las ramas paralelas a h; a los lados en las paralelas a b */}
      {posiciones(nx).flatMap((p, i) => [
        <circle key={`t${i}`} cx={xi + p * wi} cy={yi + t} r={bar} className="fill-foreground" />,
        <circle key={`b${i}`} cx={xi + p * wi} cy={yi + hi - t} r={bar} className="fill-foreground" />,
      ])}
      {posiciones(ny).slice(1, -1).flatMap((p, i) => [
        <circle key={`l${i}`} cx={xi + t} cy={yi + p * hi} r={bar} className="fill-foreground" />,
        <circle key={`r${i}`} cx={xi + wi - t} cy={yi + p * hi} r={bar} className="fill-foreground" />,
      ])}
      {/* cotas */}
      <g className="fill-muted-foreground text-[10px]" fontFamily="inherit">
        <text x={x0 + bw / 2} y={y0 + hw + 16} textAnchor="middle">b = {fmt(b, 0)} mm</text>
        <text x={x0 - 6} y={y0 + hw / 2} textAnchor="middle" transform={`rotate(-90 ${x0 - 6} ${y0 + hw / 2})`}>h = {fmt(h, 0)} mm</text>
        <text x={x0 + bw / 2} y={y0 - 6} textAnchor="middle">núcleo bc = {fmt(b - 2 * r, 0)} × {fmt(h - 2 * r, 0)} mm (borde externo del estribo)</text>
      </g>
    </svg>
  );
}

export default function ConfinamientoColumna() {
  const [grado, setGrado] = useState<GradoColumna>('DES');
  const b = useNum(500);
  const h = useNum(500);
  const rec = useNum(40);
  const fc = useNum(28);
  const fyt = useNum(420);
  const ln = useNum(3.0);
  const s = useNum(100);
  const [idLong, setIdLong] = useState('No.8');
  const [idEst, setIdEst] = useState('No.4');
  const ramasH = useNum(3);
  const ramasB = useNum(3);

  const long = buscarBarra(idLong) ?? BARRAS[0];
  const est = buscarBarra(idEst) ?? BARRAS[0];
  const valido = [b.n, h.n, rec.n, fc.n, fyt.n, ln.n, s.n, ramasH.n, ramasB.n].every((x) => Number.isFinite(x) && x > 0) && 2 * rec.n < Math.min(b.n, h.n);

  const calc = useMemo(() => {
    if (!valido) return null;
    const nH = Math.max(2, Math.round(ramasH.n)); // ramas paralelas a h (repartidas a lo ancho)
    const nB = Math.max(2, Math.round(ramasB.n)); // ramas paralelas a b (repartidas a lo alto)
    const g = geometriaNucleo(b.n, h.n, rec.n, est.db);
    const Ag = b.n * h.n;
    const base = { fc: fc.n, fyt: fyt.n, Ag, Ach: g.Ach };
    // Ash en la dirección b (bc = núcleo a lo ancho) la aportan las ramas paralelas a h; y viceversa.
    const ashB = ashRequerido(grado, { ...base, s: s.n, bc: g.bcB });
    const ashH = ashRequerido(grado, { ...base, s: s.n, bc: g.bcH });
    const provB = nH * est.area;
    const provH = nB * est.area;
    // hx: separación entre ejes de ramas/ganchos (repartidas por igual, hipótesis del autor).
    const hxB = g.ejeB / (nH - 1);
    const hxH = g.ejeH / (nB - 1);
    const hx = Math.max(hxB, hxH);
    const dimMenor = Math.min(b.n, h.n);
    const sMaxGeom = separacionMaximaColumna(grado, { dimensionMenor: dimMenor, dbLongMenor: long.db, dbEstribo: est.db, hx });
    const sPorAshB = separacionPorAshProvisto(grado, provB, { ...base, bc: g.bcB });
    const sPorAshH = separacionPorAshProvisto(grado, provH, { ...base, bc: g.bcH });
    const sPorAsh = Math.min(sPorAshB, sPorAshH);
    const sRecomendada = Math.min(sMaxGeom.s, sPorAsh);
    const lo = longitudLoColumna(grado, Math.max(b.n, h.n), ln.n * 1000);
    const sFuera = separacionFueraDeLo(grado, long.db, s.n);
    const so = grado === 'DES' ? separacionSoDES(hx) : null;
    const dimMinNorma = grado === 'DES' ? DES_COLUMNA.dimensionMin : DMO_COLUMNA.dimensionMin;
    const hxMax = grado === 'DES' ? DES_COLUMNA.hxMax : DMO_COLUMNA.hxMax;
    // Curva Ash,req(s) para el gráfico.
    const curva = Array.from({ length: 31 }, (_, i) => {
      const sv = 50 + (i * 150) / 30;
      return {
        s: Math.round(sv),
        b: ashRequerido(grado, { ...base, s: sv, bc: g.bcB }).ash,
        h: ashRequerido(grado, { ...base, s: sv, bc: g.bcH }).ash,
      };
    });
    return { g, Ag, ashB, ashH, provB, provH, nH, nB, hxB, hxH, hx, sMaxGeom, sPorAshB, sPorAshH, sPorAsh, sRecomendada, lo, sFuera, so, dimMenor, dimMinNorma, hxMax, curva };
  }, [valido, grado, b.n, h.n, rec.n, fc.n, fyt.n, ln.n, s.n, ramasH.n, ramasB.n, est.db, est.area, long.db]);

  const okEstado = (c: boolean) => (c ? 'ok' : 'mal') as 'ok' | 'mal';

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Grupo titulo="Columna y materiales">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector etiqueta="Capacidad de disipación de energía" valor={grado} onCambio={(v) => setGrado(v as GradoColumna)} opciones={OPCIONES_GRADO} />
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Ancho b" unidad="mm" valor={b.txt} onCambio={b.setTxt} />
                <Campo etiqueta="Alto h" unidad="mm" valor={h.txt} onCambio={h.setTxt} />
              </div>
              <Campo etiqueta="Recubrimiento libre al estribo" unidad="mm" valor={rec.txt} onCambio={rec.setTxt} ayuda="Hasta el borde externo del estribo (C.7.7)." />
              <Campo etiqueta="Luz libre de la columna ℓu" unidad="m" valor={ln.txt} onCambio={ln.setTxt} />
              <Campo etiqueta="f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={MATERIALES_C211.fcMin} />
              <Campo etiqueta="fyt del estribo" unidad="MPa" valor={fyt.txt} onCambio={fyt.setTxt} max={MATERIALES_C211.fytMax} ayuda="Se limita a 700 MPa para la cuantía (C.21.1.5.4)." />
            </div>
          </Grupo>
          <Grupo titulo="Refuerzo">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector etiqueta="Barra longitudinal más pequeña (db)" valor={idLong} onCambio={setIdLong} opciones={OPCIONES_BARRA} />
              <Selector etiqueta="Barra del estribo (dbe)" valor={idEst} onCambio={setIdEst} opciones={OPCIONES_BARRA} />
              <Campo etiqueta="Ramas paralelas a h" valor={ramasH.txt} onCambio={ramasH.setTxt} ayuda="Cuentan para Ash en la dirección b (≥ 2)." />
              <Campo etiqueta="Ramas paralelas a b" valor={ramasB.txt} onCambio={ramasB.setTxt} ayuda="Cuentan para Ash en la dirección h (≥ 2)." />
              <Campo etiqueta="Separación provista s" unidad="mm" valor={s.txt} onCambio={s.setTxt} />
            </div>
          </Grupo>
        </div>
        {valido && calc ? (
          <Esquema b={b.n} h={h.n} r={rec.n} dbe={est.db} nParaH={calc.nH} nParaB={calc.nB} />
        ) : (
          <Aviso tipo="error">Revisa los datos: todos deben ser positivos y el recubrimiento menor que la mitad de la dimensión menor.</Aviso>
        )}
      </div>

      {calc && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Ag / Ach" valor={fmt(calc.Ag / calc.g.Ach, 3)} nota={`Ach = ${fmt(calc.g.Ach / 100, 0)} cm²; Ag = ${fmt(calc.Ag / 100, 0)} cm²`} />
            <Valor etiqueta="hx (separación entre ramas)" unidad="mm" valor={fmt(calc.hx, 0)} nota={`≤ ${calc.hxMax} mm`} estado={okEstado(calc.hx <= calc.hxMax)} />
            <Valor etiqueta={`ℓo (longitud de confinamiento)`} unidad="mm" valor={fmt(calc.lo.lo, 0)} nota={`gobierna: ${calc.lo.gobierna}`} />
            <Valor
              etiqueta="Separación máxima permitida"
              unidad="mm"
              valor={fmt(calc.sMaxGeom.s, 0)}
              nota={`${grado === 'DES' ? 's' : 'so'} gobierna: ${calc.sMaxGeom.gobierna}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Grupo titulo={`Ash en la dirección b (bc = ${fmt(calc.g.bcB, 0)} mm)`}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Valor etiqueta={grado === 'DES' ? 'Ec. C.21-7' : 'Ec. C.21-2'} unidad="mm²" valor={fmt(calc.ashB.ashConAg, 0)} />
                <Valor etiqueta={grado === 'DES' ? 'Ec. C.21-8' : 'Ec. C.21-3'} unidad="mm²" valor={fmt(calc.ashB.ashMinimo, 0)} />
                <Valor destacado etiqueta="Ash requerida" unidad="mm²" valor={fmt(calc.ashB.ash, 0)} nota={`rige ${calc.ashB.gobierna}`} />
              </div>
              <Valor
                etiqueta={`Ash provista (${calc.nH} ramas ${est.designacion})`}
                unidad="mm²"
                valor={fmt(calc.provB, 0)}
                estado={okEstado(calc.provB >= calc.ashB.ash - 1e-9)}
                nota={calc.provB >= calc.ashB.ash ? 'Cumple con la s indicada' : 'Insuficiente: reduce s o agrega ramas'}
              />
            </Grupo>
            <Grupo titulo={`Ash en la dirección h (bc = ${fmt(calc.g.bcH, 0)} mm)`}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Valor etiqueta={grado === 'DES' ? 'Ec. C.21-7' : 'Ec. C.21-2'} unidad="mm²" valor={fmt(calc.ashH.ashConAg, 0)} />
                <Valor etiqueta={grado === 'DES' ? 'Ec. C.21-8' : 'Ec. C.21-3'} unidad="mm²" valor={fmt(calc.ashH.ashMinimo, 0)} />
                <Valor destacado etiqueta="Ash requerida" unidad="mm²" valor={fmt(calc.ashH.ash, 0)} nota={`rige ${calc.ashH.gobierna}`} />
              </div>
              <Valor
                etiqueta={`Ash provista (${calc.nB} ramas ${est.designacion})`}
                unidad="mm²"
                valor={fmt(calc.provH, 0)}
                estado={okEstado(calc.provH >= calc.ashH.ash - 1e-9)}
                nota={calc.provH >= calc.ashH.ash ? 'Cumple con la s indicada' : 'Insuficiente: reduce s o agrega ramas'}
              />
            </Grupo>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor
              etiqueta="Separación provista s"
              unidad="mm"
              valor={fmt(s.n, 0)}
              estado={okEstado(s.n <= calc.sMaxGeom.s && s.n <= calc.sPorAsh + 1e-9)}
              nota={s.n <= calc.sMaxGeom.s ? 'Cumple el límite geométrico' : `Excede el límite de ${fmt(calc.sMaxGeom.s, 0)} mm`}
            />
            <Valor destacado etiqueta="s máxima con el refuerzo provisto" unidad="mm" valor={fmt(calc.sRecomendada, 0)} nota={`geométrica ${fmt(calc.sMaxGeom.s, 0)} · por Ash ${fmt(calc.sPorAsh, 0)}`} />
            {grado === 'DES' && calc.so !== null && <Valor etiqueta="so (Ec. C.21-5)" unidad="mm" valor={fmt(calc.so, 0)} nota="100 ≤ so ≤ 150 mm" />}
            <Valor etiqueta="Separación fuera de ℓo" unidad="mm" valor={fmt(calc.sFuera, 0)} nota={grado === 'DES' ? 'menor de 6 db y 150 mm (C.21.6.4.5)' : '≤ 2 s (C.21.3.5.11)'} />
          </div>

          {(calc.dimMenor < calc.dimMinNorma || fc.n < MATERIALES_C211.fcMin || fyt.n > MATERIALES_C211.fytMax || (grado === 'DES' && calc.dimMenor / Math.max(b.n, h.n) < DES_COLUMNA.relacionDimensionesMin) || est.db < 9.5) && (
            <Aviso tipo="atencion">
              {calc.dimMenor < calc.dimMinNorma && <>La dimensión menor ({fmt(calc.dimMenor, 0)} mm) es inferior al mínimo de {calc.dimMinNorma} mm para {grado}. </>}
              {fc.n < MATERIALES_C211.fcMin && <>f′c menor que 21 MPa (C.21.1.4.2). </>}
              {fyt.n > MATERIALES_C211.fytMax && <>fyt superior a 700 MPa: la cuantía se calculó con 700 MPa (C.21.1.5.4). </>}
              {grado === 'DES' && calc.dimMenor / Math.max(b.n, h.n) < DES_COLUMNA.relacionDimensionesMin && <>La relación entre lados es menor que 0.4 (C.21.6.1.2). </>}
              {est.db < 9.5 && <>El estribo debe ser al menos No. 3 (10M) (C.21.3.5.8 y C.7.10.5.1). </>}
            </Aviso>
          )}

          <Grupo titulo="Ash requerida frente a la separación de los estribos">
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={calc.curva} margin={{ left: 4, right: 16, top: 12, bottom: 16 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="s" type="number" domain={[50, 200]} tickLine={false} label={{ value: 's (mm)', position: 'insideBottom', offset: -8 }} />
                <YAxis tickLine={false} width={48} label={{ value: 'Ash (mm²)', angle: -90, position: 'insideLeft' }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => <span className="font-mono">{n}: {Number(v).toFixed(0)} mm²</span>} />} />
                <Line dataKey="b" type="linear" stroke="var(--color-b)" strokeWidth={2} dot={false} />
                <Line dataKey="h" type="linear" stroke="var(--color-h)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                <ReferenceLine y={Math.min(calc.provB, calc.provH)} stroke="var(--color-prov)" strokeWidth={2} label={{ value: 'Ash provista (menor)', position: 'insideTopRight', fontSize: 11 }} />
                <ReferenceLine x={calc.sMaxGeom.s} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: 's máx.', position: 'top', fontSize: 11 }} />
                {s.n >= 50 && s.n <= 200 && <ReferenceDot x={s.n} y={calc.ashB.ash} r={5} fill="var(--color-b)" stroke="none" />}
              </LineChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">
              Donde la línea de Ash provista corta a las curvas está la separación máxima que admite ese refuerzo; la línea vertical marca el límite geométrico de separación.
            </p>
          </Grupo>
        </>
      )}

      <PieCalc>
        Rectangular, estribos cerrados y ganchos suplementarios. Ash se mide con bc a los bordes externos del estribo (Notación C.2); Ach = (b − 2r)(h − 2r). Las ramas se suponen repartidas por igual
        y ℓo usa la mayor dimensión de la sección como «altura del elemento en la cara del nudo» (criterio del autor). Para columnas circulares aplica la cuantía volumétrica ρs (Ecs. C.21-1 y C.21-6).
      </PieCalc>
    </div>
  );
}
