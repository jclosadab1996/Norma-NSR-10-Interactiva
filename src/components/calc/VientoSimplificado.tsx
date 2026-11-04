import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CASO_MINIMO_SPRFV,
  anchoZonaBorde,
  factorImportanciaViento,
  presionNetaComponentes,
  presionesSprfv,
  verificarAlcance,
  type ModoArea,
  type ModoLambda,
  type TipoCubierta,
} from '@/lib/nsr10/vientoSimplificado';
import {
  AREAS_CUBIERTA,
  AREAS_MURO,
  DESCRIPCION_ZONAS_SPRFV,
  PRESION_MINIMA,
  REGIONES_VIENTO,
  ZONAS_SPRFV,
  type CategoriaUso,
  type ExposicionViento,
} from '@/data/vientoSimplificado';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const configSprfv = {
  caso1: { label: 'Caso de carga 1', color: 'var(--chart-1)' },
  caso2: { label: 'Caso de carga 2', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const configComp = {
  pos: { label: 'Presión (+)', color: 'var(--chart-1)' },
  neg: { label: 'Succión (−)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const OPC_VELOCIDAD = REGIONES_VIENTO.map((r) => ({ value: String(r.v), label: `Región ${r.region} — ${r.v} m/s (${r.kmh} km/h)` }));
const OPC_EXPOSICION = [
  { value: 'B', label: 'B — urbano / suburbano / boscoso' },
  { value: 'C', label: 'C — terreno abierto' },
  { value: 'D', label: 'D — plano sin obstrucciones' },
];
const OPC_USO = [
  { value: 'I', label: 'Grupo I — ocupación normal' },
  { value: 'II', label: 'Grupo II — ocupación especial' },
  { value: 'III', label: 'Grupo III — atención a la comunidad' },
  { value: 'IV', label: 'Grupo IV — edificaciones indispensables' },
];
const OPC_CUBIERTA = [
  { value: 'plana', label: 'Plana' },
  { value: 'dos-aguas', label: 'A dos aguas' },
  { value: 'cuatro-aguas', label: 'A cuatro aguas' },
];
const OPC_LAMBDA = [
  { value: 'interpolar', label: 'Interpolar entre alturas tabuladas' },
  { value: 'superior', label: 'Valor de la altura tabulada superior (conservador)' },
];
const OPC_AREA = [
  { value: 'interpolar', label: 'Interpolar entre áreas tabuladas' },
  { value: 'menor', label: 'Usar el área tabulada menor (conservador)' },
];
const OPC_SUPERFICIE = [
  { value: 'muro', label: 'Muros (zonas 4 y 5)' },
  { value: 'cubierta', label: 'Cubierta (zonas 1, 2 y 3)' },
  { value: 'alero', label: 'Alero de cubierta (zonas 2 y 3)' },
];

const f2 = (x: number) => fmt(x, 2);
const signo = (x: number) => (x > 0 ? '+' : '') + f2(x);

export default function VientoSimplificado() {
  const [v, setV] = useState('28');
  const [expo, setExpo] = useState<ExposicionViento>('B');
  const [uso, setUso] = useState<CategoriaUso>('I');
  const [tipo, setTipo] = useState<TipoCubierta>('dos-aguas');
  const [modoLambda, setModoLambda] = useState<ModoLambda>('interpolar');
  const [modoArea, setModoArea] = useState<ModoArea>('interpolar');
  const [superficie, setSuperficie] = useState<'muro' | 'cubierta' | 'alero'>('muro');
  const h = useNum(7);
  const theta = useNum(15);
  const kzt = useNum(1);
  const dimMin = useNum(12);
  const area = useNum(2);

  const velocidad = Number(v);
  const i = factorImportanciaViento(uso);
  const th = tipo === 'plana' ? 0 : theta.n;
  const datosOk = Number.isFinite(h.n) && Number.isFinite(th) && Number.isFinite(kzt.n) && kzt.n >= 1;

  const avisosSprfv = datosOk ? verificarAlcance({ uso: 'sprfv', h: h.n, theta: th, tipo }) : [];
  const avisosComp = datosOk ? verificarAlcance({ uso: 'componentes', h: h.n, theta: th, tipo }) : [];

  const sprfv = useMemo(() => {
    if (!datosOk || avisosSprfv.length > 0) return null;
    try {
      return presionesSprfv({ v: velocidad, theta: th, h: h.n, exposicion: expo, i, kzt: kzt.n, modoLambda });
    } catch {
      return null;
    }
  }, [datosOk, avisosSprfv.length, velocidad, th, h.n, expo, i, kzt.n, modoLambda]);

  const zonasComp: (1 | 2 | 3 | 4 | 5)[] = superficie === 'muro' ? [4, 5] : superficie === 'cubierta' ? [1, 2, 3] : [2, 3];
  const comp = useMemo(() => {
    if (!datosOk || avisosComp.length > 0 || !(area.n > 0)) return null;
    try {
      return zonasComp.map((zona) => ({
        zona,
        r: presionNetaComponentes({
          v: velocidad,
          superficie: superficie === 'muro' ? 'muro' : 'cubierta',
          zona,
          area: area.n,
          h: h.n,
          exposicion: expo,
          i,
          kzt: kzt.n,
          theta: th,
          tipo,
          alero: superficie === 'alero',
          modoArea,
          modoLambda,
        }),
      }));
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosOk, avisosComp.length, area.n, velocidad, superficie, h.n, expo, i, kzt.n, th, tipo, modoArea, modoLambda]);

  const a = Number.isFinite(dimMin.n) && dimMin.n > 0 && h.n > 0 ? anchoZonaBorde(dimMin.n, h.n) : NaN;
  const areaMax = superficie === 'muro' ? AREAS_MURO[AREAS_MURO.length - 1] : AREAS_CUBIERTA[AREAS_CUBIERTA.length - 1];

  const datosGrafSprfv = sprfv
    ? ZONAS_SPRFV.map((z) => ({
        zona: z,
        caso1: Number(sprfv.casos[0].ps[z].toFixed(3)),
        caso2: sprfv.casos[1] ? Number(sprfv.casos[1].ps[z].toFixed(3)) : undefined,
      }))
    : [];
  const datosGrafComp = comp
    ? comp.map(({ zona, r }) => ({ zona: `Zona ${zona}`, pos: Number(r.diseno.pos.toFixed(3)), neg: Number(r.diseno.neg.toFixed(3)) }))
    : [];

  return (
    <div className="space-y-5">
      <Grupo titulo="Datos del proyecto">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Velocidad básica V (Figura B.6.4-1)" valor={v} onCambio={setV} opciones={OPC_VELOCIDAD} ayuda="Solo se tabulan las 5 regiones del mapa." />
          <Selector etiqueta="Exposición (B.6.5.6.3)" valor={expo} onCambio={(x) => setExpo(x as ExposicionViento)} opciones={OPC_EXPOSICION} />
          <Selector etiqueta="Grupo de uso (A.2.5)" valor={uso} onCambio={(x) => setUso(x as CategoriaUso)} opciones={OPC_USO} ayuda={`I de viento = ${fmt(i, 2)} (Tabla B.6.5-1)`} />
          <Campo etiqueta="Altura media de cubierta h" unidad="m" valor={h.txt} onCambio={h.setTxt} min={0.5} max={18} paso={0.1} ayuda="B.6.2: promedio entre cornisa y punto más alto; la cornisa si θ ≤ 10°." />
          <Selector etiqueta="Tipo de cubierta" valor={tipo} onCambio={(x) => setTipo(x as TipoCubierta)} opciones={OPC_CUBIERTA} />
          {tipo !== 'plana' && <Campo etiqueta="Ángulo de cubierta θ" unidad="°" valor={theta.txt} onCambio={theta.setTxt} min={0} max={45} paso={1} />}
          <Campo etiqueta="Factor topográfico Kzt" valor={kzt.txt} onCambio={kzt.setTxt} min={1} max={3} paso={0.05} ayuda="B.6.5.7; 1.0 en terreno sin colinas ni escarpes." />
          <Campo etiqueta="Menor dimensión horizontal" unidad="m" valor={dimMin.txt} onCambio={dimMin.setTxt} min={1} paso={0.5} ayuda="Solo para calcular el ancho a de las zonas de borde." />
          <Selector etiqueta="λ entre alturas tabuladas" valor={modoLambda} onCambio={(x) => setModoLambda(x as ModoLambda)} opciones={OPC_LAMBDA} ayuda="La norma no precisa qué hacer entre alturas tabuladas." />
        </div>
      </Grupo>

      {!datosOk && <Aviso tipo="error">Revisa los datos: h y θ numéricos y Kzt ≥ 1.</Aviso>}

      <Tabs defaultValue="sprfv" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="sprfv" className="px-3 py-1.5">SPRFV — Figura B.6.4-2</TabsTrigger>
          <TabsTrigger value="comp" className="px-3 py-1.5">Componentes y revestimientos — Figura B.6.4-3</TabsTrigger>
        </TabsList>

        <TabsContent value="sprfv" className="space-y-4">
          {avisosSprfv.map((m) => (
            <Aviso key={m} tipo="error">{m}</Aviso>
          ))}
          {sprfv && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Valor etiqueta="λ" valor={fmt(sprfv.lambda, 3)} nota="Altura y exposición" />
                <Valor etiqueta="I" valor={fmt(sprfv.i, 2)} nota="Tabla B.6.5-1" />
                <Valor destacado etiqueta="λ·Kzt·I" valor={fmt(sprfv.factor, 3)} nota="Ec. B.6.4-1" />
                <Valor etiqueta="Ancho a" unidad="m" valor={fmt(a, 2)} nota="Zonas de borde" />
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Zona</th>
                      <th className="px-2 py-1.5 text-left">Descripción</th>
                      {sprfv.casos.map((c) => (
                        <th key={`p10-${c.caso}`} className="px-2 py-1.5 text-right">ps10 caso {c.caso}</th>
                      ))}
                      {sprfv.casos.map((c) => (
                        <th key={`ps-${c.caso}`} className="px-2 py-1.5 text-right">ps caso {c.caso}</th>
                      ))}
                      <th className="px-2 py-1.5 text-right">Mínimo B.6.4.2.1.1</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {ZONAS_SPRFV.map((z) => (
                      <tr key={z} className="border-t">
                        <td className="px-2 py-1 font-sans font-semibold">{z}</td>
                        <td className="px-2 py-1 font-sans text-xs text-muted-foreground">{DESCRIPCION_ZONAS_SPRFV[z]}</td>
                        {sprfv.casos.map((c) => (
                          <td key={`p10-${c.caso}`} className="px-2 py-1 text-right">{signo(c.ps10[z])}</td>
                        ))}
                        {sprfv.casos.map((c) => (
                          <td key={`ps-${c.caso}`} className="px-2 py-1 text-right font-semibold">{signo(c.ps[z])}</td>
                        ))}
                        <td className="px-2 py-1 text-right text-muted-foreground">
                          {z in CASO_MINIMO_SPRFV ? signo(CASO_MINIMO_SPRFV[z as keyof typeof CASO_MINIMO_SPRFV]) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Presiones en kN/m². Positivo = presión sobre la superficie; negativo = succión. Las zonas A–D son presiones horizontales (sobre la proyección
                vertical), las E–H verticales (sobre la proyección horizontal). El caso mínimo de B.6.4.2.1.1 es una condición de carga adicional que se compara con los
                efectos del caso calculado. La fuerza horizontal total no debe ser menor que la obtenida con ps = 0 en las zonas B y D.
              </p>

              <div className="rounded-xl border p-3">
                <ChartContainer config={configSprfv} className="aspect-[16/8] w-full">
                  <BarChart data={datosGrafSprfv} margin={{ left: 4, right: 12, top: 12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="zona" />
                    <YAxis tickFormatter={(x) => Number(x).toFixed(2)} label={{ value: 'ps (kN/m²)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(3)} kN/m²</span>} />} />
                    <Bar dataKey="caso1" fill="var(--color-caso1)" radius={2} isAnimationActive={false} />
                    {sprfv.casos[1] && <Bar dataKey="caso2" fill="var(--color-caso2)" radius={2} isAnimationActive={false} />}
                    {sprfv.casos[1] && <ChartLegend content={<ChartLegendContent />} />}
                  </BarChart>
                </ChartContainer>
              </div>
              {sprfv.casos.length === 1 && th > 20 && th <= 25 && (
                <Aviso tipo="nota">Con θ ≤ 25° solo se verifica el caso de carga 1; el caso 2 aparece para 25° &lt; θ ≤ 45°.</Aviso>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="comp" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Selector etiqueta="Superficie" valor={superficie} onCambio={(x) => setSuperficie(x as 'muro' | 'cubierta' | 'alero')} opciones={OPC_SUPERFICIE} />
            <Campo etiqueta="Área efectiva de viento" unidad="m²" valor={area.txt} onCambio={area.setTxt} min={0.1} max={areaMax} paso={0.5} ayuda="Luz del elemento × ancho efectivo (≥ 1/3 de la luz)." />
            <Selector etiqueta="Entre áreas tabuladas" valor={modoArea} onCambio={(x) => setModoArea(x as ModoArea)} opciones={OPC_AREA} ayuda="Figura B.6.4-3, nota 4." />
          </div>
          {avisosComp.map((m) => (
            <Aviso key={m} tipo="error">{m}</Aviso>
          ))}
          {comp && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Valor etiqueta="λ" valor={fmt(comp[0].r.lambda, 3)} />
                <Valor destacado etiqueta="λ·Kzt·I" valor={fmt(comp[0].r.factor, 3)} nota="Ec. B.6.4-2" />
                <Valor etiqueta="Ancho a" unidad="m" valor={fmt(a, 2)} nota="Zonas finales y esquineras" />
              </div>
              {comp.some((c) => c.r.fuera) && (
                <Aviso tipo="atencion">
                  El área efectiva está fuera del rango tabulado (1 a {areaMax} m²); se usa el valor del extremo más cercano.
                </Aviso>
              )}
              {tipo === 'cuatro-aguas' && th <= 25 && superficie !== 'muro' && (
                <Aviso tipo="nota">Cubierta a cuatro aguas con θ ≤ 25°: la zona 3 se trata como zona 2 (Figura B.6.4-3, nota 3).</Aviso>
              )}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Zona</th>
                      <th className="px-2 py-1.5 text-right">pnet10 (+)</th>
                      <th className="px-2 py-1.5 text-right">pnet10 (−)</th>
                      <th className="px-2 py-1.5 text-right">pnet (+)</th>
                      <th className="px-2 py-1.5 text-right">pnet (−)</th>
                      <th className="px-2 py-1.5 text-right">Diseño (+)</th>
                      <th className="px-2 py-1.5 text-right">Diseño (−)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {comp.map(({ zona, r }) => (
                      <tr key={zona} className="border-t">
                        <td className="px-2 py-1 font-sans font-semibold">
                          {zona}
                          {r.zonaUsada !== zona && <span className="ml-1 text-xs font-normal text-muted-foreground">(tabla zona {r.zonaUsada})</span>}
                        </td>
                        <td className="px-2 py-1 text-right">{superficie === 'alero' ? '—' : signo(r.pnet10.pos)}</td>
                        <td className="px-2 py-1 text-right">{signo(r.pnet10.neg)}</td>
                        <td className="px-2 py-1 text-right">{superficie === 'alero' ? '—' : signo(r.pnet.pos)}</td>
                        <td className="px-2 py-1 text-right">{signo(r.pnet.neg)}</td>
                        <td className="px-2 py-1 text-right font-semibold">{superficie === 'alero' ? '—' : signo(r.diseno.pos)}</td>
                        <td className="px-2 py-1 text-right font-semibold">{signo(r.diseno.neg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                kN/m², normal a la superficie. “Diseño” aplica los mínimos de B.6.4.2.2.1: presión no menor que +{fmt(PRESION_MINIMA, 2)} y succión no menor (en valor absoluto) que {fmt(PRESION_MINIMA, 2)} kN/m².
                {superficie === 'alero' && ' La tabla de aleros solo da succión.'}
              </p>
              <div className="rounded-xl border p-3">
                <ChartContainer config={configComp} className="aspect-[16/7] w-full">
                  <BarChart data={datosGrafComp} margin={{ left: 4, right: 12, top: 12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="zona" />
                    <YAxis tickFormatter={(x) => Number(x).toFixed(2)} label={{ value: 'p de diseño (kN/m²)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(3)} kN/m²</span>} />} />
                    {superficie !== 'alero' && <Bar dataKey="pos" fill="var(--color-pos)" radius={2} isAnimationActive={false} />}
                    <Bar dataKey="neg" fill="var(--color-neg)" radius={2} isAnimationActive={false} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <PieCalc>
        Método 1 (B.6.4) para edificios cerrados, regulares, de h ≤ 18 m: verifica antes las condiciones de B.6.4.1. Presiones de la exposición B a 10 m con I = 1.0 y Kzt = 1.0,
        ajustadas con λ·Kzt·I.
      </PieCalc>
    </div>
  );
}
