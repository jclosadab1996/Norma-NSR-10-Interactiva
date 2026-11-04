import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  FORMAS_TOPOGRAFICAS,
  REGIONES_VELOCIDAD_BASICA,
  TABLA_B652_CONSTANTES,
  TABLA_B653_KZ,
  TABLA_B654_KD,
  type FormaTopografica,
} from '@/data/vientoAnalitico';
import { factorImportanciaViento, factorTopografico, kz, kzTabla, presionVelocidad, type Exposicion, type GrupoUsoViento } from '@/lib/nsr10/viento';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const configKz = {
  B: { label: 'Exposición B', color: 'var(--chart-1)' },
  C: { label: 'Exposición C', color: 'var(--chart-2)' },
  D: { label: 'Exposición D', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const Z_MAX_TABLA = TABLA_B653_KZ[TABLA_B653_KZ.length - 1].z;
const EXPOSICIONES: readonly Exposicion[] = ['B', 'C', 'D'];

const OPCIONES_EXPOSICION = [
  { value: 'B', label: 'B — urbano, suburbano o boscoso' },
  { value: 'C', label: 'C — terreno abierto con pocas obstrucciones' },
  { value: 'D', label: 'D — terreno plano sin obstrucciones, superficies de agua' },
] as const;
const OPCIONES_GRUPO = (['I', 'II', 'III', 'IV'] as const).map((g) => ({ value: g, label: `Grupo ${g} — I = ${factorImportanciaViento(g).toFixed(2)}` }));
const OPCIONES_KD = TABLA_B654_KD.map((f) => ({ value: f.id, label: `${f.tipo} — Kd = ${f.kd.toFixed(2)}` }));
const OPCIONES_REGION = [
  ...REGIONES_VELOCIDAD_BASICA.map((r) => ({ value: String(r.region), label: `Región ${r.region} — ${r.ms} m/s (${r.kmh} km/h)` })),
  { value: 'manual', label: 'Otro valor (escribir V)' },
];
const OPCIONES_CASO = [
  { value: '2', label: 'Caso 2 — SPRFV en general' },
  { value: '1', label: 'Caso 1 — componentes y revestimientos' },
];
const OPCIONES_TOPO = [{ value: 'ninguna', label: 'Sin efecto topográfico (Kzt = 1.0)' }, ...FORMAS_TOPOGRAFICAS.map((f) => ({ value: f.id as string, label: f.nombre }))];
const OPCIONES_LADO = [
  { value: 'barlovento', label: 'Barlovento de la cresta' },
  { value: 'sotavento', label: 'Sotavento de la cresta' },
];

export default function VientoExposicion() {
  const v = useNum(28);
  const [exposicion, setExposicion] = useState<Exposicion>('C');
  const [caso, setCaso] = useState<'1' | '2'>('2');
  const z = useNum(20);
  const [grupo, setGrupo] = useState<GrupoUsoViento>('II');
  const [kdId, setKdId] = useState('edificio-sprfv');
  const [topo, setTopo] = useState('ninguna');
  const [lado, setLado] = useState<'barlovento' | 'sotavento'>('barlovento');
  const hColina = useNum(60);
  const lhColina = useNum(150);
  const xColina = useNum(0);

  const kd = TABLA_B654_KD.find((f) => f.id === kdId)?.kd ?? 0.85;
  const iViento = factorImportanciaViento(grupo);
  const regionActual = REGIONES_VELOCIDAD_BASICA.find((r) => r.ms === v.n)?.region;
  const zg = TABLA_B652_CONSTANTES[exposicion].zg;
  const casoN = caso === '1' ? 1 : 2;

  const entradasOk = Number.isFinite(v.n) && v.n > 0 && Number.isFinite(z.n) && z.n >= 0 && z.n <= zg;

  const topografia = useMemo(() => {
    if (topo === 'ninguna') return null;
    if (![hColina.n, lhColina.n, xColina.n].every(Number.isFinite) || hColina.n <= 0 || lhColina.n <= 0 || !Number.isFinite(z.n) || z.n < 0) return null;
    return factorTopografico({ forma: topo as FormaTopografica, exposicion, H: hColina.n, Lh: lhColina.n, x: xColina.n, z: z.n, lado });
  }, [topo, exposicion, hColina.n, lhColina.n, xColina.n, z.n, lado]);
  const kzt = topografia ? topografia.kzt : 1;

  const kzCalc = entradasOk ? kz(exposicion, z.n, casoN) : NaN;
  const kzEnTabla = entradasOk && z.n <= Z_MAX_TABLA ? kzTabla(exposicion, z.n, casoN) : NaN;
  const qz = entradasOk ? presionVelocidad({ V: v.n, Kz: kzCalc, Kzt: kzt, Kd: kd, I: iViento }) : NaN;

  // Perfil hasta 152 m (última altura tabulada de la Tabla B.6.5-3).
  const datos = useMemo(() => {
    if (!(v.n > 0)) return [];
    const n = 76;
    const filas: Record<string, number>[] = [];
    for (let i = 0; i <= n; i++) {
      const zi = (Z_MAX_TABLA * i) / n;
      const fila: Record<string, number> = { z: zi };
      for (const e of EXPOSICIONES) {
        const k = kz(e, zi, casoN);
        fila[`k${e}`] = k;
        fila[`q${e}`] = presionVelocidad({ V: v.n, Kz: k, Kzt: kzt, Kd: kd, I: iViento });
      }
      filas.push(fila);
    }
    return filas;
  }, [v.n, kzt, kd, iViento, casoN]);

  return (
    <div className="space-y-5">
      <Grupo titulo="Viento y edificación">
        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            etiqueta="Región del mapa de viento (Fig. B.6.4-1)"
            valor={regionActual ? String(regionActual) : 'manual'}
            onCambio={(r) => {
              const reg = REGIONES_VELOCIDAD_BASICA.find((x) => String(x.region) === r);
              if (reg) v.setTxt(String(reg.ms));
            }}
            opciones={OPCIONES_REGION}
          />
          <Campo etiqueta="Velocidad básica V" unidad="m/s" valor={v.txt} onCambio={v.setTxt} min={5} max={60} paso={1} ayuda="B.6.5.4: 17, 22, 28, 33 o 36 m/s según el mapa" />
          <Selector etiqueta="Categoría de exposición (B.6.5.6)" valor={exposicion} onCambio={(e) => setExposicion(e as Exposicion)} opciones={OPCIONES_EXPOSICION} />
          <Campo etiqueta="Altura z sobre el terreno" unidad="m" valor={z.txt} onCambio={z.setTxt} min={0} max={zg} paso={0.5} ayuda={`La ecuación de Kz vale hasta zg = ${zg} m`} />
          <Selector etiqueta="Grupo de uso → factor de importancia I (B.6.5.5)" valor={grupo} onCambio={(g) => setGrupo(g as GrupoUsoViento)} opciones={OPCIONES_GRUPO} />
          <Selector etiqueta="Tipo de estructura → Kd (B.6.5.4.4)" valor={kdId} onCambio={setKdId} opciones={OPCIONES_KD} />
          <Selector
            etiqueta="Caso de la Tabla B.6.5-3"
            valor={caso}
            onCambio={(c) => setCaso(c === '1' ? '1' : '2')}
            opciones={OPCIONES_CASO}
            ayuda="Solo cambia Kz en exposición B con z menor de 9 m"
          />
        </div>
      </Grupo>

      <Grupo titulo="Efecto topográfico (B.6.5.7, opcional)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Forma del accidente topográfico" valor={topo} onCambio={setTopo} opciones={OPCIONES_TOPO} className="sm:col-span-2 lg:col-span-3" />
          {topo !== 'ninguna' && (
            <>
              <Campo etiqueta="Altura H de la colina o escarpe" unidad="m" valor={hColina.txt} onCambio={hColina.setTxt} min={1} />
              <Campo etiqueta="Distancia Lh a media altura" unidad="m" valor={lhColina.txt} onCambio={lhColina.setTxt} min={1} ayuda="Barlovento, desde la cresta hasta donde el terreno tiene H/2" />
              <Campo etiqueta="Distancia x desde la cresta" unidad="m" valor={xColina.txt} onCambio={xColina.setTxt} min={0} />
              <Selector etiqueta="Lado de la cresta" valor={lado} onCambio={(l) => setLado(l === 'sotavento' ? 'sotavento' : 'barlovento')} opciones={OPCIONES_LADO} />
            </>
          )}
        </div>
        {topografia && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Valor etiqueta="K1" valor={fmt(topografia.k1, 3)} />
              <Valor etiqueta="K2" valor={fmt(topografia.k2, 3)} />
              <Valor etiqueta="K3" valor={fmt(topografia.k3, 3)} />
              <Valor destacado etiqueta="Kzt" valor={fmt(topografia.kzt, 3)} nota="B.6.5-1" />
            </div>
            {topografia.avisos.map((a) => (
              <Aviso key={a} tipo="atencion">
                {a}
              </Aviso>
            ))}
            <Aviso>Las condiciones (a), (b) y (c) de B.6.5.7.1 (colina aislada, sobresale el doble del terreno circundante, edificio en la mitad superior) las debe juzgar el diseñador.</Aviso>
          </>
        )}
      </Grupo>

      {!entradasOk && <Aviso tipo="error">Revisa V (positiva) y z (entre 0 y {zg} m para la exposición {exposicion}).</Aviso>}

      {entradasOk && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Valor etiqueta="Kz (ecuación)" valor={fmt(kzCalc, 3)} nota="Nota 2, Tabla B.6.5-3" />
            <Valor etiqueta="Kz (tabla, interpolado)" valor={fmt(kzEnTabla, 3)} nota={Number.isFinite(kzEnTabla) ? 'Tabla B.6.5-3' : `z > ${Z_MAX_TABLA} m: fuera de la tabla`} />
            <Valor etiqueta="Kzt" valor={fmt(kzt, 3)} />
            <Valor destacado etiqueta="qz" unidad="N/m²" valor={fmt(qz, 1)} nota="B.6.5-13: 0.613·Kz·Kzt·Kd·V²·I" />
            <Valor destacado etiqueta="qz" unidad="kN/m²" valor={fmt(qz / 1000, 3)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border p-3">
              <p className="mb-1 px-1 text-sm font-medium">Coeficiente de exposición Kz con la altura</p>
              <ChartContainer config={configKz} className="aspect-[16/10] w-full">
                <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="z" type="number" domain={[0, Z_MAX_TABLA]} tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'z (m)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                  <YAxis domain={[0.4, 2]} tickFormatter={(x) => Number(x).toFixed(1)} label={{ value: 'Kz', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `z = ${Number(pl?.[0]?.payload?.z ?? 0).toFixed(1)} m`} formatter={(val, name) => <span className="font-mono">{String(name)}: Kz = {Number(val).toFixed(3)}</span>} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {EXPOSICIONES.map((e) => (
                    <Line key={e} type="monotone" name={`Exposición ${e}`} dataKey={`k${e}`} stroke={`var(--color-${e})`} strokeWidth={e === exposicion ? 3 : 1.75} strokeOpacity={e === exposicion ? 1 : 0.7} dot={false} isAnimationActive={false} />
                  ))}
                  {z.n <= Z_MAX_TABLA && <ReferenceDot x={z.n} y={kzCalc} r={6} fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />}
                </LineChart>
              </ChartContainer>
            </div>

            <div className="rounded-xl border p-3">
              <p className="mb-1 px-1 text-sm font-medium">Presión por velocidad qz con la altura (N/m²)</p>
              <ChartContainer config={configKz} className="aspect-[16/10] w-full">
                <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="z" type="number" domain={[0, Z_MAX_TABLA]} tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'z (m)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                  <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'qz (N/m²)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `z = ${Number(pl?.[0]?.payload?.z ?? 0).toFixed(1)} m`} formatter={(val, name) => <span className="font-mono">{String(name)}: qz = {Number(val).toFixed(1)} N/m²</span>} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {EXPOSICIONES.map((e) => (
                    <Line key={e} type="monotone" name={`Exposición ${e}`} dataKey={`q${e}`} stroke={`var(--color-${e})`} strokeWidth={e === exposicion ? 3 : 1.75} strokeOpacity={e === exposicion ? 1 : 0.7} dot={false} isAnimationActive={false} />
                  ))}
                  {z.n <= Z_MAX_TABLA && <ReferenceDot x={z.n} y={qz} r={6} fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />}
                </LineChart>
              </ChartContainer>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Las curvas usan los mismos V, Kzt, Kd, I y caso que arriba; solo cambia la categoría de exposición. El punto marca la altura z y la exposición elegidas.
          </p>
        </>
      )}
      <PieCalc>Kz con las ecuaciones de la nota 2 de la Tabla B.6.5-3 (z &lt; 4.0 m se evalúa con 4.0 m; caso 1 en exposición B no baja de 9.0 m). qz en N/m² con V en m/s.</PieCalc>
    </div>
  );
}
