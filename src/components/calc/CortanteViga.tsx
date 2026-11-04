import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS_PULGADA } from '@/data/materialesConcreto';
import { FYT_MAX_CORTANTE } from '@/data/cortanteTorsion';
import { lambdaConcreto, type TipoConcreto } from '@/lib/nsr10/concreto';
import { cortanteEnX, verificarCortanteViga } from '@/lib/nsr10/cortante';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  vu: { label: 'Vu (demanda)', color: 'var(--chart-2)' },
  phivn: { label: 'φVn con los estribos dados', color: 'var(--chart-1)' },
  phivc: { label: 'φVc (solo concreto)', color: 'var(--chart-3)' },
  medio: { label: '0.5 φVc (umbral de Av,min)', color: 'var(--muted-foreground)' },
} satisfies ChartConfig;

const OPCIONES_CONCRETO = [
  { value: 'normal', label: 'Peso normal — λ = 1.00' },
  { value: 'liviano-arena-normal', label: 'Liviano con arena de peso normal — λ = 0.85' },
  { value: 'liviano-otros', label: 'Liviano, otros — λ = 0.75' },
];
const OPCIONES_METODO = [
  { value: 'simplificado', label: 'Simplificado (C.11.2.1, Ec. C.11-3)' },
  { value: 'detallado', label: 'Detallado (C.11.2.2, Ec. C.11-5: ρw, Vu d/Mu)' },
];
const OPCIONES_SECCION = [
  { value: 'd', label: 'A una distancia d de la cara del apoyo (C.11.1.3.1)' },
  { value: 'cara', label: 'En la cara del apoyo' },
];
const BARRAS_ESTRIBO = BARRAS_PULGADA.filter((b) => ['No. 2', 'No. 3', 'No. 4', 'No. 5'].includes(b.designacion));
const OPCIONES_BARRA = BARRAS_ESTRIBO.map((b) => ({ value: b.designacion, label: `${b.designacion} (${b.diametroPulgadas}) — ${b.area} mm²` }));

export default function CortanteViga() {
  const fc = useNum(28);
  const fyt = useNum(420);
  const bw = useNum(300);
  const d = useNum(500);
  const h = useNum(550);
  const [barra, setBarra] = useState('No. 3');
  const ramas = useNum(2);
  const s = useNum(110);
  const vuCara = useNum(330);
  const ln = useNum(6);
  const [seccion, setSeccion] = useState<'d' | 'cara'>('d');
  const [tipo, setTipo] = useState<TipoConcreto>('normal');
  const [metodo, setMetodo] = useState<'simplificado' | 'detallado'>('simplificado');
  const as = useNum(1500);
  const nu = useNum(0);

  const areaBarra = BARRAS_ESTRIBO.find((b) => b.designacion === barra)?.area ?? 71;
  const Av = ramas.n * areaBarra;
  const lambda = lambdaConcreto(tipo);

  const basicosOk = [fc.n, fyt.n, bw.n, d.n, s.n, vuCara.n, ln.n, ramas.n].every((x) => Number.isFinite(x) && x > 0) && h.n > d.n;
  const detalleOk = metodo === 'simplificado' || (Number.isFinite(as.n) && as.n > 0);
  const nuN = Number.isFinite(nu.n) ? nu.n : 0;

  const calc = useMemo(() => {
    if (!basicosOk || !detalleOk) return null;
    const dm = d.n / 1000;
    const vuD = cortanteEnX(vuCara.n, ln.n, dm);
    const Vu = seccion === 'd' ? vuD : vuCara.n;
    const rhoW = as.n / (bw.n * d.n);
    // Momento a distancia x de la cara con carga uniforme y apoyos simples: M(x) = Vu,cara·x − (Vu,cara/ln)·x².
    const x = seccion === 'd' ? dm : 0;
    const MuSec = vuCara.n * x - (vuCara.n / ln.n) * x * x;
    const r = verificarCortanteViga({
      fc: fc.n,
      fyt: fyt.n,
      bw: bw.n,
      d: d.n,
      h: h.n,
      Av,
      s: s.n,
      Vu,
      lambda,
      metodo,
      rhoW,
      Mu: Math.max(MuSec, 1e-6),
      Nu: nuN || undefined,
      Ag: nuN ? bw.n * h.n : undefined,
    });
    return { r, Vu, vuD, rhoW, MuSec };
  }, [basicosOk, detalleOk, fc.n, fyt.n, bw.n, d.n, h.n, Av, s.n, vuCara.n, ln.n, seccion, lambda, metodo, as.n, nuN]);

  const datos = useMemo(() => {
    if (!calc || !(ln.n > 0)) return [];
    const mitad = ln.n / 2;
    const n = 40;
    return Array.from({ length: n + 1 }, (_, i) => {
      const x = (mitad * i) / n;
      return {
        x,
        vu: cortanteEnX(vuCara.n, ln.n, x),
        phivn: calc.r.phiVn,
        phivc: calc.r.phiVc,
        medio: 0.5 * calc.r.phiVc,
      };
    });
  }, [calc, ln.n, vuCara.n]);

  const r = calc?.r;
  const ok = (b: boolean | undefined) => (b === undefined ? 'neutro' : b ? 'ok' : 'mal');

  return (
    <div className="space-y-5">
      <Grupo titulo="Sección y materiales">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Ancho del alma bw" unidad="mm" valor={bw.txt} onCambio={bw.setTxt} min={100} />
          <Campo etiqueta="Altura efectiva d" unidad="mm" valor={d.txt} onCambio={d.setTxt} min={100} />
          <Campo etiqueta="Altura total h" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={100} ayuda="Solo se usa con fuerza axial (Mm, Ag)" />
          <Campo etiqueta="Resistencia del concreto f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} max={100} />
          <Campo etiqueta="fyt de los estribos" unidad="MPa" valor={fyt.txt} onCambio={fyt.setTxt} min={200} max={FYT_MAX_CORTANTE} ayuda="No mayor de 420 MPa (C.11.4.2)" />
          <Selector etiqueta="Tipo de concreto (λ)" valor={tipo} onCambio={(v) => setTipo(v as TipoConcreto)} opciones={OPCIONES_CONCRETO} />
        </div>
      </Grupo>

      <Grupo titulo="Estribos provistos">
        <div className="grid gap-3 sm:grid-cols-3">
          <Selector etiqueta="Barra del estribo" valor={barra} onCambio={setBarra} opciones={OPCIONES_BARRA} />
          <Campo etiqueta="Número de ramas" valor={ramas.txt} onCambio={ramas.setTxt} min={2} max={8} paso={1} ayuda="Un estribo cerrado simple tiene 2 ramas" />
          <Campo etiqueta="Separación s" unidad="mm" valor={s.txt} onCambio={s.setTxt} min={30} />
        </div>
        <p className="text-xs text-muted-foreground">
          Av = {fmt(Av, 0)} mm² ({ramas.txt} × {areaBarra} mm²).
        </p>
      </Grupo>

      <Grupo titulo="Demanda (viga con carga uniforme, apoyos simples)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Vu en la cara del apoyo" unidad="kN" valor={vuCara.txt} onCambio={vuCara.setTxt} min={1} />
          <Campo etiqueta="Luz libre ln" unidad="m" valor={ln.txt} onCambio={ln.setTxt} min={1} ayuda="Solo define el diagrama: Vu varía linealmente hasta 0 a ln/2" />
          <Selector etiqueta="Sección de verificación" valor={seccion} onCambio={(v) => setSeccion(v === 'cara' ? 'cara' : 'd')} opciones={OPCIONES_SECCION} />
          <Selector etiqueta="Método de Vc" valor={metodo} onCambio={(v) => setMetodo(v === 'detallado' ? 'detallado' : 'simplificado')} opciones={OPCIONES_METODO} className="sm:col-span-2" />
          <Campo etiqueta="Fuerza axial Nu (opcional)" unidad="kN" valor={nu.txt} onCambio={nu.setTxt} ayuda="+ compresión, − tracción (con tracción, Vc = 0 en el método simplificado)" />
          {metodo === 'detallado' && <Campo etiqueta="Área de acero longitudinal As" unidad="mm²" valor={as.txt} onCambio={as.setTxt} min={1} ayuda="ρw = As/(bw d); Mu sale de la misma carga uniforme" />}
        </div>
      </Grupo>

      {!basicosOk && <Aviso tipo="error">Revisa los datos: todos deben ser positivos y h debe ser mayor que d.</Aviso>}
      {basicosOk && !detalleOk && <Aviso tipo="error">Indica el área de acero longitudinal As para el método detallado.</Aviso>}

      {r && calc && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Vu de verificación" unidad="kN" valor={fmt(calc.Vu, 1)} nota={seccion === 'd' ? `Vu a d = ${fmt(calc.vuD, 1)} kN` : 'En la cara'} />
            <Valor etiqueta="Vc" unidad="kN" valor={fmt(r.Vc, 1)} nota={metodo === 'detallado' ? `Ec. ${r.Vcdetalle?.ecuacion}` : 'Ec. C.11-3'} />
            <Valor etiqueta="Vs = Av fyt d / s" unidad="kN" valor={fmt(r.Vs, 1)} nota={`Máx. 0.66 √f′c bw d = ${fmt(r.VsMax, 1)} kN`} estado={ok(r.seccionSuficiente)} />
            <Valor destacado etiqueta="φVn = φ(Vc + Vs)" unidad="kN" valor={fmt(r.phiVn, 1)} nota={`φ = ${r.phi}`} estado={ok(r.cumpleResistencia)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Resistencia φVn ≥ Vu" valor={r.cumpleResistencia ? 'Cumple' : 'No cumple'} nota={`Relación Vu/φVn = ${fmt(calc.Vu / r.phiVn, 2)}`} estado={ok(r.cumpleResistencia)} />
            <Valor
              etiqueta="Av,min (Ec. C.11-13)"
              unidad="mm²"
              valor={fmt(r.AvMin, 1)}
              nota={r.requiereAvMin ? (r.cumpleAvMin ? 'Exigido: Av provisto cumple' : 'Exigido: Av provisto NO cumple') : 'No exigido (Vu ≤ 0.5 φVc)'}
              estado={r.requiereAvMin ? ok(r.cumpleAvMin) : 'neutro'}
            />
            <Valor etiqueta="s máxima" unidad="mm" valor={fmt(r.sMax, 0)} nota={r.sMaxReducida ? 'Reducida a la mitad (Vs > 0.33 √f′c bw d)' : 'Menor de d/2 y 600 mm'} estado={ok(r.cumpleSeparacion)} />
            <Valor
              etiqueta="s requerida por resistencia"
              unidad="mm"
              valor={Number.isFinite(r.sRequerida) ? fmt(r.sRequerida, 0) : '—'}
              nota={Number.isFinite(r.sRequerida) ? `Separación adoptable ≤ ${fmt(Math.floor(r.sAdoptable / 5) * 5, 0)} mm (múltiplo de 5)` : 'El concreto resiste: no hace falta Vs'}
            />
          </div>

          {r.avisos.map((a) => (
            <Aviso key={a} tipo="atencion">
              {a}
            </Aviso>
          ))}
          {metodo === 'detallado' && r.Vcdetalle && (
            <Aviso>
              Vu d/Mu = {fmt(r.Vcdetalle.vudSobreMu, 3)} con ρw = {fmt(calc.rhoW, 4)}; Mu = {fmt(calc.MuSec, 1)} kN·m en la sección. {r.Vcdetalle.gobiernaMaximo ? 'Gobierna el máximo 0.29 λ √f′c bw d.' : ''}
            </Aviso>
          )}

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Cortante mayorado frente a la resistencia a lo largo de media luz (kN)</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="x" type="number" domain={[0, ln.n / 2]} tickFormatter={(x) => Number(x).toFixed(1)} label={{ value: 'distancia desde la cara del apoyo (m)', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'kN', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `x = ${Number(pl?.[0]?.payload?.x ?? 0).toFixed(2)} m`} formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(1)} kN</span>} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line name="Vu (demanda)" dataKey="vu" stroke="var(--color-vu)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line name="φVn con los estribos dados" dataKey="phivn" stroke="var(--color-phivn)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="φVc (solo concreto)" dataKey="phivc" stroke="var(--color-phivc)" strokeWidth={1.75} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
                <Line name="0.5 φVc (umbral de Av,min)" dataKey="medio" stroke="var(--color-medio)" strokeWidth={1.25} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
                {d.n / 1000 < ln.n / 2 && <ReferenceLine x={d.n / 1000} stroke="var(--foreground)" strokeDasharray="3 3" label={{ value: 'd', position: 'top', fontSize: 11 }} />}
              </LineChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">
              Donde Vu supera φVc hacen falta estribos (C.11.4.7.1); donde Vu supera 0.5 φVc se exige además Av,min (C.11.4.6.1). Con la separación constante dada, φVn es una recta: el tramo donde la curva de Vu
              queda por debajo es el que tiene capacidad sobrante, y allí se podría abrir la separación sin pasar de s máx.
            </p>
          </div>
        </>
      )}
      <PieCalc>
        Estribos perpendiculares al eje, vigas con carga uniforme y φ = 0.75 (C.9.3.2.3); no incluye DMO/DES (C.9.3.4), torsión ni vigas altas. Vc con √f′c limitada a 8.3 MPa (C.11.1.2). La
        demanda a lo largo de la luz es una idealización mía (carga uniforme).
      </PieCalc>
    </div>
  );
}
