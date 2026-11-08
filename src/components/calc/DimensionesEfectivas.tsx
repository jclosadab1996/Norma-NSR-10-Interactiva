import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { EM_MAX_MPA, ER_MAX_MPA, RELACION_ESBELTEZ_MAX } from '@/data/dimensionesMamposteria';
import {
  anchoAletaMaximo,
  anchoEfectivoParalelo,
  anchoEfectivoPerpendicular,
  coeficienteMachones,
  dimensionesEfectivas,
  distanciaMaximaApoyosViga,
  type Aparejo,
  type ApoyoLateral,
  type TipoMamposteria,
} from '@/lib/nsr10/dimensionesMamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';

const config = {
  c1: { label: 'espesor machón / muro = 1.0', color: 'var(--chart-3)' },
  c2: { label: 'espesor machón / muro = 2.0', color: 'var(--chart-2)' },
  c3: { label: 'espesor machón / muro = 3.0', color: 'var(--chart-1)' },
  tuyo: { label: 'tu muro (interpolado)', color: 'var(--foreground)' },
} satisfies ChartConfig;

const OPC_TIPO = [
  { value: 'concreto', label: 'Mampostería de concreto — Em = 900 f′m (D.5.2-2)' },
  { value: 'arcilla', label: 'Mampostería de arcilla — Em = 750 f′m (D.5.2-3)' },
];
const OPC_MACHONES = [
  { value: 'no', label: 'Sin machones: t = espesor real (D.5.4.2(a))' },
  { value: 'si', label: 'Con machones: t = espesor × Tabla D.5.4-1 (D.5.4.2(b))' },
];
const OPC_APOYO = [
  { value: 'ambos', label: 'Soportado arriba y abajo: h′ = distancia libre (D.5.4.3(a))' },
  { value: 'voladizo', label: 'Libre en un extremo: h′ = 2 × dimensión (D.5.4.3(b))' },
];
const OPC_APAREJO = [
  { value: 'trabado', label: 'Aparejo trabado: 6 × ancho nominal' },
  { value: 'petaca', label: 'Aparejo en petaca: 3 × ancho nominal' },
];

const okEstado = (b: boolean | undefined) => (b === undefined ? 'neutro' : b ? 'ok' : 'mal');

export default function DimensionesEfectivas() {
  const [tipo, setTipo] = useState<TipoMamposteria>('concreto');
  const fm = useNum(10);
  const fcr = useNum(16);
  const t = useNum(140);
  const [machones, setMachones] = useState<'no' | 'si'>('si');
  const esp = useNum(3150);
  const espMachon = useNum(350);
  const dim = useNum(3000);
  const [apoyo, setApoyo] = useState<ApoyoLateral>('ambos');
  const [hTxt, setHTxt] = useState('');
  const hJust = { txt: hTxt, setTxt: setHTxt, n: parseNum(hTxt) };
  const [aparejo, setAparejo] = useState<Aparejo>('trabado');
  const sepRef = useNum(800);
  const [inyectadas, setInyectadas] = useState<'no' | 'si'>('no');
  const ae = useNum(252000);
  const lw = useNum(3000);

  const okMat = fm.n > 0 && Number.isFinite(fm.n);
  const okEsp = t.n > 0 && dim.n > 0 && (machones === 'no' || (esp.n > 0 && espMachon.n > 0));
  const mostrarFcr = Number.isFinite(fcr.n) && fcr.n > 0;

  const r = useMemo(() => {
    if (!okMat || !okEsp) return null;
    return dimensionesEfectivas({
      tipo,
      fm: fm.n,
      fcr: mostrarFcr ? fcr.n : undefined,
      espesorMuro: t.n,
      machones: machones === 'si' ? { espaciamiento: esp.n, espesor: espMachon.n } : undefined,
      dimensionVertical: dim.n,
      apoyo,
      hJustificada: Number.isFinite(hJust.n) ? hJust.n : undefined,
    });
  }, [okMat, okEsp, tipo, fm.n, fcr.n, mostrarFcr, t.n, machones, esp.n, espMachon.n, dim.n, apoyo, hJust.n]);

  const ancho = useMemo(() => {
    if (!(t.n > 0) || !(sepRef.n > 0)) return null;
    return anchoEfectivoPerpendicular({ aparejo, anchoNominal: t.n, separacionRefuerzo: sepRef.n, todasInyectadas: inyectadas === 'si', anchoSolido: sepRef.n });
  }, [aparejo, t.n, sepRef.n, inyectadas]);

  const bParalelo = ae.n > 0 && lw.n > 0 ? anchoEfectivoParalelo(ae.n, lw.n) : NaN;

  const relEsp = machones === 'si' && esp.n > 0 && espMachon.n > 0 ? esp.n / espMachon.n : NaN;
  const relEspesor = machones === 'si' && t.n > 0 && espMachon.n > 0 ? espMachon.n / t.n : NaN;

  const datos = useMemo(() => {
    const pts: Record<string, number>[] = [];
    for (let x = 6; x <= 20.0001; x += 0.5) {
      const fila: Record<string, number> = {
        x,
        c1: coeficienteMachones(x, 1).coef,
        c2: coeficienteMachones(x, 2).coef,
        c3: coeficienteMachones(x, 3).coef,
      };
      if (Number.isFinite(relEspesor)) fila.tuyo = coeficienteMachones(x, relEspesor).coef;
      pts.push(fila);
    }
    return pts;
  }, [relEspesor]);

  const datosEm = useMemo(() => {
    const out: { fm: number; concreto: number; arcilla: number }[] = [];
    for (let x = 0; x <= 30; x += 1) {
      out.push({ fm: x, concreto: Math.min(900 * x, EM_MAX_MPA), arcilla: Math.min(750 * x, EM_MAX_MPA) });
    }
    return out;
  }, []);

  const coefActual = Number.isFinite(relEsp) && Number.isFinite(relEspesor) ? coeficienteMachones(relEsp, relEspesor) : null;

  return (
    <div className="space-y-5">
      <Grupo titulo="1. Módulos de elasticidad y de cortante (D.5.2)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Tipo de mampostería" valor={tipo} onCambio={(v) => setTipo(v === 'arcilla' ? 'arcilla' : 'concreto')} opciones={OPC_TIPO} className="sm:col-span-2" />
          <Campo etiqueta="Resistencia de la mampostería f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={1} max={40} />
          <Campo etiqueta="Mortero de relleno f′cr (opcional)" unidad="MPa" valor={fcr.txt} onCambio={fcr.setTxt} min={1} ayuda="Déjalo vacío si no hay mortero de relleno" />
        </div>
      </Grupo>

      <Grupo titulo="2. Espesor efectivo t (D.5.4.2) y altura efectiva h′ (D.5.4.3)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Espesor del muro" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={60} />
          <Selector etiqueta="Arriostramiento por machones" valor={machones} onCambio={(v) => setMachones(v === 'si' ? 'si' : 'no')} opciones={OPC_MACHONES} className="sm:col-span-2" />
          {machones === 'si' && (
            <>
              <Campo etiqueta="Espaciamiento entre machones" unidad="mm" valor={esp.txt} onCambio={esp.setTxt} min={1} ayuda="Se divide por el espesor del machón (lectura literal de la Tabla D.5.4-1)" />
              <Campo etiqueta="Espesor del machón" unidad="mm" valor={espMachon.txt} onCambio={espMachon.setTxt} min={1} ayuda="Dimensión total, incluido el muro (≥ espesor del muro)" />
            </>
          )}
          <Campo etiqueta="Dimensión vertical (libre entre apoyos, o desde el apoyo)" unidad="mm" valor={dim.txt} onCambio={dim.setTxt} min={1} />
          <Selector etiqueta="Apoyo lateral" valor={apoyo} onCambio={(v) => setApoyo(v === 'voladizo' ? 'voladizo' : 'ambos')} opciones={OPC_APOYO} className="sm:col-span-2" />
          <Campo etiqueta="h′ menor, justificada (opcional)" unidad="mm" valor={hJust.txt} onCambio={hJust.setTxt} ayuda="D.5.4.3(c): solo si se justifica apropiadamente" />
        </div>
      </Grupo>

      {(!okMat || !okEsp) && <Aviso tipo="error">Revisa los datos: f′m, el espesor y la dimensión vertical deben ser positivos (y los de machones, si se activan).</Aviso>}

      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor
              etiqueta="Em (mampostería)"
              unidad="MPa"
              valor={fmt(r.Em.valor, 0)}
              nota={r.Em.topeActivo ? `Gobierna el tope de ${EM_MAX_MPA} MPa (sin tope: ${fmt(r.Em.sinTope, 0)})` : tipo === 'concreto' ? 'Ec. D.5.2-2' : 'Ec. D.5.2-3'}
            />
            <Valor etiqueta="Gm = 0.4 Em" unidad="MPa" valor={fmt(r.Gm, 0)} nota="Ec. D.5.2-5" />
            <Valor
              etiqueta="Er (mortero de relleno)"
              unidad="MPa"
              valor={r.Er ? fmt(r.Er.valor, 0) : '—'}
              nota={r.Er ? (r.Er.topeActivo ? `Gobierna el tope de ${ER_MAX_MPA} MPa` : 'Ec. D.5.2-4') : 'Sin f′cr'}
            />
            <Valor etiqueta="Gr = 0.5 Er" unidad="MPa" valor={r.Gr ? fmt(r.Gr, 0) : '—'} nota="Ec. D.5.2-6" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Es" unidad="MPa" valor="200 000" nota={`Ec. D.5.2-1 · n = Es/Em = ${fmt(r.n, 2)} (autoría del proyecto)`} />
            <Valor
              etiqueta="Coeficiente de machones"
              valor={r.machones ? fmt(r.machones.coef, 3) : '1.000'}
              nota={r.machones ? `Tabla D.5.4-1 con s/tp = ${fmt(relEsp, 2)} y tp/t = ${fmt(relEspesor, 2)}` : 'Sin machones'}
            />
            <Valor destacado etiqueta="Espesor efectivo t" unidad="mm" valor={fmt(r.t, 1)} nota="D.5.4.2" />
            <Valor etiqueta="Altura efectiva h′" unidad="mm" valor={fmt(r.hEf, 0)} nota="D.5.4.3" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor
              destacado
              etiqueta="h′/t"
              valor={fmt(r.esbeltez.relacion, 2)}
              nota={r.esbeltez.cumple ? `≤ ${RELACION_ESBELTEZ_MAX}: cumple D.5.4.3.1` : `Excede ${RELACION_ESBELTEZ_MAX} (D.5.4.3.1)`}
              estado={okEstado(r.esbeltez.cumple)}
            />
            <Valor etiqueta="h′ máxima con este t" unidad="mm" valor={fmt(r.esbeltez.hMaxima, 0)} nota={`${RELACION_ESBELTEZ_MAX} × t`} />
            <Valor etiqueta="Ancho de aleta máximo" unidad="mm" valor={fmt(anchoAletaMaximo(t.n), 0)} nota="6 × espesor del muro intersectado (D.5.3.2.1)" />
            <Valor etiqueta="Apoyos laterales de viga (si b = t)" unidad="mm" valor={fmt(distanciaMaximaApoyosViga(t.n), 0)} nota="32 × ancho efectivo (D.5.4.6)" />
          </div>
          {coefActual?.fueraDeTabla && (
            <Aviso tipo="atencion">
              La relación espesor del machón / espesor del muro ({fmt(relEspesor, 2)}) queda fuera de las columnas 1.0–3.0 de la Tabla D.5.4-1: la norma no da valores allí; se usó el de la columna más cercana (criterio del proyecto).
            </Aviso>
          )}
          {machones === 'si' && relEsp > 20 && <Aviso>Con espaciamiento/espesor del machón de 20 o más el coeficiente es 1.0: los machones no aportan al espesor efectivo.</Aviso>}
          {machones === 'si' && Number.isFinite(relEspesor) && relEspesor < 1 && (
            <Aviso tipo="atencion">El espesor del machón es menor que el del muro: revisa que se mida como dimensión total desde la cara opuesta del muro.</Aviso>
          )}
          {!r.esbeltez.cumple && <Aviso tipo="error">h′/t supera 25: aumenta el espesor, añade machones o apoyos laterales, o justifica una h′ menor (D.5.4.3(c)).</Aviso>}
        </>
      )}

      {machones === 'si' && Number.isFinite(relEsp) && Number.isFinite(relEspesor) && (
        <div className="rounded-xl border p-3">
          <p className="mb-1 px-1 text-sm font-medium">Tabla D.5.4-1: coeficiente según el espaciamiento de machones</p>
          <ChartContainer config={config} className="aspect-[16/8] w-full">
            <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" type="number" domain={[6, 20]} ticks={[6, 8, 10, 15, 20]} label={{ value: 'espaciamiento / espesor del machón', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
              <YAxis domain={[1, 2]} tickFormatter={(v) => Number(v).toFixed(1)} label={{ value: 'coeficiente', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `s/tp = ${Number(pl?.[0]?.payload?.x ?? 0).toFixed(1)}`} formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(3)}</span>} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line name="espesor machón / muro = 1.0" dataKey="c1" stroke="var(--color-c1)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
              <Line name="espesor machón / muro = 2.0" dataKey="c2" stroke="var(--color-c2)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
              <Line name="espesor machón / muro = 3.0" dataKey="c3" stroke="var(--color-c3)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
              <Line name="tu muro (interpolado)" dataKey="tuyo" stroke="var(--color-tuyo)" strokeWidth={2.5} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
              {coefActual && <ReferenceDot x={coefActual.relEspaciamientoUsada} y={coefActual.coef} r={5} fill="var(--foreground)" stroke="var(--background)" />}
            </LineChart>
          </ChartContainer>
          <p className="mt-1 px-1 text-xs text-muted-foreground">Las líneas de color son las columnas de la tabla (valores en 6, 8, 10, 15 y 20, unidos linealmente como pide la nota (*)); el punto es tu muro. Esquema del proyecto.</p>
        </div>
      )}

      <Grupo titulo="3. Ancho efectivo b (D.5.4.4) y área para cortante (D.5.4.5)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Aparejo" valor={aparejo} onCambio={(v) => setAparejo(v === 'petaca' ? 'petaca' : 'trabado')} opciones={OPC_APAREJO} />
          <Campo etiqueta="Separación del refuerzo vertical (c-c)" unidad="mm" valor={sepRef.txt} onCambio={sepRef.setTxt} min={1} ayuda="Usa el espesor del muro del grupo 2 como ancho nominal" />
          <Selector
            etiqueta="¿Todas las celdas inyectadas?"
            valor={inyectadas}
            onCambio={(v) => setInyectadas(v === 'si' ? 'si' : 'no')}
            opciones={[
              { value: 'no', label: 'No: aplicar las reducciones' },
              { value: 'si', label: 'Sí: sección sólida, sin reducción' },
            ]}
          />
          <Campo etiqueta="Área efectiva Ae del muro" unidad="mm²" valor={ae.txt} onCambio={ae.setTxt} min={1} ayuda="Para b paralelo al plano: b = Ae/ℓw" />
          <Campo etiqueta="Longitud del muro ℓw" unidad="mm" valor={lw.txt} onCambio={lw.setTxt} min={1} />
        </div>
      </Grupo>

      {ancho && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Valor
            destacado
            etiqueta="b, flexión perpendicular al plano"
            unidad="mm"
            valor={fmt(ancho.b, 0)}
            nota={ancho.solida ? 'Sección sólida: sin reducción (D.5.4.4.1)' : `Mayor entre ${aparejo === 'trabado' ? '6' : '3'} t = ${fmt(ancho.nVecesAncho, 0)} y la separación = ${fmt(ancho.separacion, 0)} mm`}
          />
          <Valor
            etiqueta="Lectura como tope (informativa)"
            unidad="mm"
            valor={ancho.solida ? '—' : fmt(ancho.bSiSeLeyeraComoTope, 0)}
            nota="El menor de ambos: posible errata del texto «la mayor»; ver capítulo D.5a (autoría del proyecto)"
          />
          <Valor etiqueta="b, flexión paralela al plano" unidad="mm" valor={fmt(bParalelo, 1)} nota="b = Ae/ℓw (D.5.4.4.2)" />
          <Valor etiqueta="Amv = b ℓw (paralela)" unidad="mm²" valor={Number.isFinite(bParalelo) ? fmt(bParalelo * lw.n, 0) : '—'} nota="Con b promedio, Amv = Ae; con celdas inyectadas en los extremos, b se toma en la zona central del alma (D.5.4.5.2)" />
        </div>
      )}
      {!ancho && <Aviso tipo="error">Indica un espesor y una separación de refuerzo positivos.</Aviso>}

      <div className="rounded-xl border p-3">
        <p className="mb-1 px-1 text-sm font-medium">Em frente a f′m con los topes de D.5.2 (MPa)</p>
        <ChartContainer config={{ concreto: { label: 'Concreto: 900 f′m', color: 'var(--chart-1)' }, arcilla: { label: 'Arcilla: 750 f′m', color: 'var(--chart-2)' } } satisfies ChartConfig} className="aspect-[16/7] w-full">
          <LineChart data={datosEm} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="fm" type="number" domain={[0, 30]} label={{ value: "f′m (MPa)", position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
            <YAxis tickFormatter={(v) => String(Number(v) / 1000)} label={{ value: 'Em (GPa)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `f′m = ${Number(pl?.[0]?.payload?.fm ?? 0)} MPa`} formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(0)} MPa</span>} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line name="Concreto: 900 f′m" dataKey="concreto" stroke="var(--color-concreto)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line name="Arcilla: 750 f′m" dataKey="arcilla" stroke="var(--color-arcilla)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {okMat && <ReferenceDot x={Math.min(fm.n, 30)} y={r ? r.Em.valor : 0} r={5} fill="var(--foreground)" stroke="var(--background)" />}
          </LineChart>
        </ChartContainer>
        <p className="mt-1 px-1 text-xs text-muted-foreground">Las rectas se cortan en 20 000 MPa, tope de las Ec. D.5.2-2 y D.5.2-3 (se alcanza con f′m ≈ 22.2 MPa en concreto y 26.7 MPa en arcilla).</p>
      </div>

      <PieCalc>
        Valores por defecto de la calculadora y de los gráficos: ilustrativos. Em, Er y G salen de las ecuaciones supletorias de D.5.2, válidas «en ausencia de valores experimentales»; la norma prefiere ensayos de murete (D.3.7.2) y cilindros (C.8.5).
        La relación modular n y la lectura informativa de b son aportes del proyecto.
      </PieCalc>
    </div>
  );
}

