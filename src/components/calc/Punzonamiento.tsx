import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS_PULGADA } from '@/data/materialesConcreto';
import { FYT_MAX_CORTANTE, REFUERZO_CORTANTE_LOSAS } from '@/data/cortanteTorsion';
import { lambdaConcreto, type TipoConcreto } from '@/lib/nsr10/concreto';
import { perimetroExteriorMinimo, verificarPunzonamiento, type TipoRefuerzoPunzonamiento, type UbicacionColumna } from '@/lib/nsr10/punzonamiento';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = { vc: { label: 'Vc (kN)', color: 'var(--chart-1)' } } satisfies ChartConfig;

const OPCIONES_UBICACION = [
  { value: 'interior', label: 'Interior — 4 lados, αs = 40' },
  { value: 'borde', label: 'De borde — 3 lados, αs = 30' },
  { value: 'esquina', label: 'De esquina — 2 lados, αs = 20' },
];
const OPCIONES_CONCRETO = [
  { value: 'normal', label: 'Peso normal — λ = 1.00' },
  { value: 'liviano-arena-normal', label: 'Liviano con arena normal — λ = 0.85' },
  { value: 'liviano-otros', label: 'Liviano, otros — λ = 0.75' },
];
const OPCIONES_REFUERZO = [
  { value: 'ninguno', label: 'Sin refuerzo de cortante' },
  { value: 'estribos', label: 'Estribos (C.11.11.3)' },
  { value: 'pernos', label: 'Pernos con cabeza (C.11.11.5)' },
];
const BARRAS = BARRAS_PULGADA.filter((b) => ['No. 3', 'No. 4', 'No. 5'].includes(b.designacion));
const OPCIONES_BARRA = BARRAS.map((b) => ({ value: b.designacion, label: `${b.designacion} (${b.diametroPulgadas}) — ${b.area} mm²` }));

/** Esquema en planta de la sección crítica (C.11.11.1.2): perímetro a d/2 de las caras de la columna. */
function EsquemaSeccionCritica({ c1, c2, d, ubicacion }: { c1: number; c2: number; d: number; ubicacion: UbicacionColumna }) {
  const m = d / 2;
  const pad = 1.4 * Math.max(c1, c2, d);
  const bordeIzq = ubicacion !== 'interior';
  const bordeSup = ubicacion === 'esquina';
  const xMin = bordeIzq ? 0 : -pad;
  const yMin = bordeSup ? 0 : -pad;
  const xMax = c1 + pad;
  const yMax = c2 + pad;
  const W = xMax - xMin;
  const H = yMax - yMin;
  const mg = Math.max(W, H) * 0.14;
  const fs = Math.max(W, H) * 0.042;
  const sw = Math.max(W, H) * 0.006;
  const camino =
    ubicacion === 'interior'
      ? `M ${-m} ${-m} L ${c1 + m} ${-m} L ${c1 + m} ${c2 + m} L ${-m} ${c2 + m} Z`
      : ubicacion === 'borde'
        ? `M 0 ${-m} L ${c1 + m} ${-m} L ${c1 + m} ${c2 + m} L 0 ${c2 + m}`
        : `M 0 ${c2 + m} L ${c1 + m} ${c2 + m} L ${c1 + m} 0`;
  return (
    <svg viewBox={`${xMin - mg} ${yMin - mg} ${W + 2 * mg} ${H + 2 * mg}`} role="img" aria-label="Esquema en planta de la columna y su sección crítica de punzonamiento" className="mx-auto h-auto max-h-72 w-full">
      <rect x={xMin} y={yMin} width={W} height={H} fill="var(--muted)" stroke="var(--border)" strokeWidth={sw} />
      {bordeIzq && <line x1={0} y1={yMin} x2={0} y2={yMax} stroke="var(--foreground)" strokeWidth={sw * 2.2} />}
      {bordeSup && <line x1={0} y1={0} x2={xMax} y2={0} stroke="var(--foreground)" strokeWidth={sw * 2.2} />}
      <rect x={0} y={0} width={c1} height={c2} fill="var(--foreground)" fillOpacity={0.55} stroke="var(--foreground)" strokeWidth={sw} />
      <path d={camino} fill="var(--primary)" fillOpacity={0.12} stroke="var(--primary)" strokeWidth={sw * 1.6} strokeDasharray={`${sw * 5} ${sw * 3}`} />
      <text x={c1 / 2} y={c2 / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill="var(--background)" fontWeight={600}>
        {c1}×{c2}
      </text>
      <text x={c1 + m} y={-m - fs * 0.5 + (ubicacion === 'esquina' ? c2 + 2 * m + fs * 1.8 : 0)} textAnchor="end" fontSize={fs} fill="var(--primary)">
        sección crítica a d/2 = {fmt(m, 0)} mm
      </text>
      {bordeIzq && (
        <text x={-fs * 0.5} y={c2 / 2} textAnchor="end" fontSize={fs} fill="var(--foreground)">
          borde libre
        </text>
      )}
    </svg>
  );
}

export default function Punzonamiento() {
  const fc = useNum(28);
  const d = useNum(300);
  const c1 = useNum(400);
  const c2 = useNum(400);
  const vu = useNum(1000);
  const [ubicacion, setUbicacion] = useState<UbicacionColumna>('interior');
  const [tipo, setTipo] = useState<TipoConcreto>('normal');
  const [refuerzo, setRefuerzo] = useState<TipoRefuerzoPunzonamiento>('ninguno');
  const [barra, setBarra] = useState('No. 3');
  const ramas = useNum(8);
  const s = useNum(100);
  const fyt = useNum(420);

  const barraSel = BARRAS.find((b) => b.designacion === barra) ?? BARRAS[0];
  const Av = ramas.n * barraSel.area;
  const lambda = lambdaConcreto(tipo);

  const baseOk = [fc.n, d.n, c1.n, c2.n, vu.n].every((x) => Number.isFinite(x) && x > 0);
  const refOk = refuerzo === 'ninguno' || [ramas.n, s.n, fyt.n].every((x) => Number.isFinite(x) && x > 0);

  const r = useMemo(() => {
    if (!baseOk || !refOk) return null;
    return verificarPunzonamiento({
      fc: fc.n,
      d: d.n,
      c1: c1.n,
      c2: c2.n,
      ubicacion,
      Vu: vu.n,
      lambda,
      refuerzo,
      Av: refuerzo === 'ninguno' ? undefined : Av,
      s: refuerzo === 'ninguno' ? undefined : s.n,
      fyt: refuerzo === 'ninguno' ? undefined : Math.min(fyt.n, FYT_MAX_CORTANTE),
      dbCortante: refuerzo === 'ninguno' ? undefined : barraSel.diametro,
    });
  }, [baseOk, refOk, fc.n, d.n, c1.n, c2.n, ubicacion, vu.n, lambda, refuerzo, Av, s.n, fyt.n, barraSel.diametro]);

  const boExt = r && baseOk ? perimetroExteriorMinimo({ Vu: vu.n, d: d.n, fc: fc.n, lambda }) : NaN;
  const datosBarras = r
    ? [
        { nombre: 'C.11-31 (β)', vc: r.vcA, gob: r.gobierna === 'C.11-31' },
        { nombre: 'C.11-32 (αs)', vc: r.vcB, gob: r.gobierna === 'C.11-32' },
        { nombre: 'C.11-33', vc: r.vcC, gob: r.gobierna === 'C.11-33' },
      ]
    : [];
  const estado = (b: boolean) => (b ? 'ok' : 'mal');

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,18rem)]">
        <Grupo titulo="Columna, losa o zapata">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Ubicación de la columna" valor={ubicacion} onCambio={(v) => setUbicacion(v as UbicacionColumna)} opciones={OPCIONES_UBICACION} className="sm:col-span-2" />
            <Campo
              etiqueta={ubicacion === 'interior' ? 'Lado c1 de la columna' : 'Lado c1 (perpendicular al borde)'}
              unidad="mm"
              valor={c1.txt}
              onCambio={c1.setTxt}
              min={100}
              ayuda={ubicacion === 'interior' ? undefined : 'Columna al ras del borde libre de la losa'}
            />
            <Campo etiqueta={ubicacion === 'interior' ? 'Lado c2 de la columna' : 'Lado c2 (paralelo al borde)'} unidad="mm" valor={c2.txt} onCambio={c2.setTxt} min={100} />
            <Campo etiqueta="Altura efectiva d" unidad="mm" valor={d.txt} onCambio={d.setTxt} min={50} ayuda="Promedio de las dos capas de refuerzo en la zona crítica" />
            <Campo etiqueta="Resistencia del concreto f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} max={100} />
            <Selector etiqueta="Tipo de concreto (λ)" valor={tipo} onCambio={(v) => setTipo(v as TipoConcreto)} opciones={OPCIONES_CONCRETO} />
            <Campo etiqueta="Cortante mayorado Vu en la sección crítica" unidad="kN" valor={vu.txt} onCambio={vu.setTxt} min={1} ayuda="Sin momento no balanceado. En zapata: Pu − qu·(área dentro de bo)" />
          </div>
        </Grupo>
        <div className="rounded-xl border p-3">
          {baseOk ? <EsquemaSeccionCritica c1={c1.n} c2={c2.n} d={d.n} ubicacion={ubicacion} /> : <p className="text-sm text-muted-foreground">Completa las dimensiones para ver el esquema.</p>}
          <p className="mt-1 text-center text-xs text-muted-foreground">Planta: columna (oscuro) y sección crítica (línea discontinua)</p>
        </div>
      </div>

      <Grupo titulo="Refuerzo de cortante (opcional)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Selector etiqueta="Tipo" valor={refuerzo} onCambio={(v) => setRefuerzo(v as TipoRefuerzoPunzonamiento)} opciones={OPCIONES_REFUERZO} className="lg:col-span-2" />
          {refuerzo !== 'ninguno' && (
            <>
              <Selector etiqueta="Barra o perno" valor={barra} onCambio={setBarra} opciones={OPCIONES_BARRA} />
              <Campo etiqueta="Ramas por línea periférica" valor={ramas.txt} onCambio={ramas.setTxt} min={2} paso={1} ayuda="Total en una línea paralela al perímetro de la columna" />
              <Campo etiqueta="Separación entre líneas s" unidad="mm" valor={s.txt} onCambio={s.setTxt} min={20} />
              <Campo etiqueta="fy del refuerzo de cortante" unidad="MPa" valor={fyt.txt} onCambio={fyt.setTxt} max={FYT_MAX_CORTANTE} ayuda="No mayor de 420 MPa (C.11.4.2)" />
            </>
          )}
        </div>
        {refuerzo !== 'ninguno' && (
          <p className="text-xs text-muted-foreground">
            Av = {fmt(Av, 0)} mm² por línea. La primera línea va a ≤ d/2 de la cara de la columna; entre líneas, ≤ d/2 (estribos) o ≤ 0.75d / 0.5d (pernos); entre ramas adyacentes ≤ 2d.
          </p>
        )}
      </Grupo>

      {(!baseOk || !refOk) && <Aviso tipo="error">Todos los valores deben ser positivos.</Aviso>}

      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Perímetro crítico bo" unidad="mm" valor={fmt(r.bo, 0)} nota={`β = ${fmt(r.beta, 2)} · αs = ${r.alphaS}`} />
            <Valor etiqueta="Vc = menor de las 3 expresiones" unidad="kN" valor={fmt(r.Vc, 1)} nota={`Gobierna ${r.gobierna}`} />
            <Valor etiqueta="φVc (sin refuerzo)" unidad="kN" valor={fmt(r.phiVcSinRefuerzo, 1)} estado={refuerzo === 'ninguno' ? estado(r.cumple) : 'neutro'} nota={`φ = ${r.phi}`} />
            <Valor destacado etiqueta={refuerzo === 'ninguno' ? 'φVn = φVc' : 'φVn = φ(Vc + Vs)'} unidad="kN" valor={fmt(r.phiVn, 1)} estado={estado(r.cumple)} nota={`Vu/φVn = ${fmt(r.relacion, 2)}`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Ec. C.11-31" unidad="kN" valor={fmt(r.vcA, 1)} nota="0.17 (1 + 2/β) λ √f′c bo d" />
            <Valor etiqueta="Ec. C.11-32" unidad="kN" valor={fmt(r.vcB, 1)} nota="0.083 (αs d/bo + 2) λ √f′c bo d" />
            <Valor etiqueta="Ec. C.11-33" unidad="kN" valor={fmt(r.vcC, 1)} nota="0.33 λ √f′c bo d" />
            <Valor etiqueta="Verificación" valor={r.cumple ? 'Cumple φVn ≥ Vu' : 'No cumple'} estado={estado(r.cumple)} />
          </div>

          {refuerzo !== 'ninguno' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Valor etiqueta="Vc con refuerzo" unidad="kN" valor={fmt(r.VcUsado, 1)} nota={`Máx. ${refuerzo === 'estribos' ? '0.17' : '0.25'} λ √f′c bo d`} />
              <Valor etiqueta="Vs = Av fy d / s" unidad="kN" valor={fmt(r.Vs, 1)} nota="Ec. C.11-15" />
              <Valor etiqueta="Vn máximo" unidad="kN" valor={fmt(r.VnMax, 1)} nota={refuerzo === 'estribos' ? '0.5 √f′c bo d' : '0.66 √f′c bo d'} estado={estado(r.Vn <= r.VnMax + 1e-9 && r.VcUsado + r.Vs <= r.VnMax + 1e-9)} />
              <Valor
                etiqueta="Perímetro exterior mínimo bo,ext"
                unidad="mm"
                valor={fmt(boExt, 0)}
                nota={ubicacion === 'interior' ? `A ≈ ${fmt((boExt - 2 * (c1.n + c2.n)) / 8, 0)} mm de la cara de la columna` : 'Vu/(φ 0.17 λ √f′c d): el refuerzo se extiende hasta ahí'}
              />
            </div>
          )}

          {refuerzo === 'pernos' && r.avFySobreBoS !== undefined && r.avFySobreBoSMin !== undefined && (
            <Aviso tipo={r.avFySobreBoS >= r.avFySobreBoSMin ? 'nota' : 'atencion'}>
              Av fy/(bo s) = {fmt(r.avFySobreBoS, 3)} MPa; mínimo 0.17 √f′c = {fmt(r.avFySobreBoSMin, 3)} MPa (C.11.11.5.1).
            </Aviso>
          )}
          {r.avisos.map((a) => (
            <Aviso key={a} tipo="atencion">
              {a}
            </Aviso>
          ))}
          {refuerzo === 'estribos' && d.n < REFUERZO_CORTANTE_LOSAS.dMinMm && <Aviso tipo="error">No se permite refuerzo de cortante con d &lt; 150 mm.</Aviso>}

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Las tres expresiones de Vc (kN): la menor gobierna</p>
            <ChartContainer config={config} className="aspect-[16/6] w-full">
              <BarChart data={datosBarras} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" />
                <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(val) => <span className="font-mono">{Number(val).toFixed(1)} kN</span>} />} />
                <Bar dataKey="vc" radius={4} isAnimationActive={false}>
                  {datosBarras.map((f) => (
                    <Cell key={f.nombre} fill={f.gob ? 'var(--chart-1)' : 'var(--chart-4)'} fillOpacity={f.gob ? 1 : 0.45} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </>
      )}
      <Aviso>
        No incluye la transferencia de momento no balanceado (C.11.11.7): ese caso exige sumar el esfuerzo γv Mu c/Jc al de Vu/(bo d). Tampoco cubre losas preesforzadas (C.11.11.2.2), cabezas de cortante
        (C.11.11.4) ni aberturas (C.11.11.6).
      </Aviso>
      <PieCalc>
        Sección crítica a d/2 con cuatro lados rectos (C.11.11.1.2 y C.11.11.1.3); en bordes y esquinas se supone la columna al ras del borde libre (convención mía). √f′c limitada a 8.3 MPa
        (C.11.1.2); φ = 0.75 (C.9.3.2.3).
      </PieCalc>
    </div>
  );
}
