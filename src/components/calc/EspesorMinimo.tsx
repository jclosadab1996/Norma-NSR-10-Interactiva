import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  APOYOS_C95A,
  ELEMENTOS_C95A,
  TABLA_C95A,
  WC_LIVIANO_MAX,
  WC_LIVIANO_MIN,
  type ApoyoUnaDireccion,
  type ElementoUnaDireccion,
} from '@/data/resistenciaServicioC9';
import { alturaMinimaUnaDireccion } from '@/lib/nsr10/resistenciaServicio';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  losa: { label: 'Losa maciza en una dirección', color: 'var(--chart-1)' },
  viga: { label: 'Viga o losa nervada en una dirección', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const ELEMENTOS = (Object.keys(ELEMENTOS_C95A) as ElementoUnaDireccion[]).map((k) => ({ value: k, label: ELEMENTOS_C95A[k] }));
const APOYOS = (Object.keys(APOYOS_C95A) as ApoyoUnaDireccion[]).map((k) => ({ value: k, label: APOYOS_C95A[k] }));
const CONCRETOS = [
  { value: 'normal', label: 'Peso normal' },
  { value: 'liviano', label: `Liviano estructural (${WC_LIVIANO_MIN}–${WC_LIVIANO_MAX} kg/m³)` },
] as const;

/** Redondeo a múltiplos de 5 mm hacia arriba (auxiliar: solo para sugerir una altura práctica). */
const aMultiplo5 = (mm: number) => Math.ceil(mm / 5 - 1e-9) * 5;

export default function EspesorMinimo() {
  const [elemento, setElemento] = useState<string>('viga-nervada');
  const [apoyo, setApoyo] = useState<string>('ambos-extremos');
  const [concreto, setConcreto] = useState<string>('normal');
  const luz = useNum(7.5);
  const fy = useNum(420);
  const wc = useNum(1700);
  const hDada = useNum(400);

  const luzOk = Number.isFinite(luz.n) && luz.n > 0;
  const fyOk = Number.isFinite(fy.n) && fy.n > 0;
  const liviano = concreto === 'liviano';
  const wcOk = !liviano || (Number.isFinite(wc.n) && wc.n >= WC_LIVIANO_MIN && wc.n <= WC_LIVIANO_MAX);
  const valido = luzOk && fyOk && wcOk;
  const hDadaOk = Number.isFinite(hDada.n) && hDada.n > 0;

  const calc = (el: ElementoUnaDireccion, ap: ApoyoUnaDireccion) =>
    alturaMinimaUnaDireccion({ elemento: el, apoyo: ap, luzMm: luz.n * 1000, fy: fy.n, wc: liviano ? wc.n : undefined });

  const res = valido ? calc(elemento as ElementoUnaDireccion, apoyo as ApoyoUnaDireccion) : null;

  const filas = useMemo(
    () =>
      valido
        ? (Object.keys(APOYOS_C95A) as ApoyoUnaDireccion[]).map((ap) => {
            const a = calc('losa-maciza', ap);
            const b = calc('viga-nervada', ap);
            return { apoyo: APOYOS_C95A[ap], ap, losa: a.hMm, viga: b.hMm, divL: a.divisor, divV: b.divisor };
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [valido, luz.n, fy.n, wc.n, liviano],
  );

  const cumple = res && hDadaOk ? hDada.n >= res.hMm : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Elemento y apoyo">
          <Selector etiqueta="Tipo de elemento" valor={elemento} onCambio={setElemento} opciones={ELEMENTOS} />
          <Selector etiqueta="Condición de apoyo" valor={apoyo} onCambio={setApoyo} opciones={APOYOS} />
          <Campo
            etiqueta="Luz ℓ"
            unidad="m"
            valor={luz.txt}
            onCambio={luz.setTxt}
            min={0.1}
            paso={0.1}
            ayuda="Luz de cálculo según C.8.9; en voladizo, la longitud del voladizo."
          />
        </Grupo>
        <Grupo titulo="Materiales (notas de la Tabla C.9.5(a))">
          <Campo etiqueta="fy del refuerzo" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={1} max={550} paso={10} ayuda="Se multiplica por (0.4 + fy/700) si fy ≠ 420 MPa." />
          <Selector etiqueta="Concreto" valor={concreto} onCambio={setConcreto} opciones={CONCRETOS} />
          {liviano && (
            <Campo
              etiqueta="Densidad wc"
              unidad="kg/m³"
              valor={wc.txt}
              onCambio={wc.setTxt}
              min={WC_LIVIANO_MIN}
              max={WC_LIVIANO_MAX}
              paso={10}
              ayuda="Se multiplica por (1.65 − 0.0003 wc), no menos de 1.09."
            />
          )}
          <Campo etiqueta="Altura dada h (para verificar)" unidad="mm" valor={hDada.txt} onCambio={hDada.setTxt} min={1} paso={10} />
        </Grupo>
      </div>

      {!luzOk && <Aviso tipo="error">Escribe una luz mayor que cero.</Aviso>}
      {!fyOk && <Aviso tipo="error">Escribe un fy mayor que cero.</Aviso>}
      {liviano && !wcOk && <Aviso tipo="error">La nota (a) de la tabla solo cubre {WC_LIVIANO_MIN} ≤ wc ≤ {WC_LIVIANO_MAX} kg/m³.</Aviso>}
      {fyOk && fy.n > 550 && <Aviso tipo="atencion">C.9.4 limita fy y fyt de diseño a 550 MPa (salvo preesforzado y espirales).</Aviso>}

      {res && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Valor etiqueta="Divisor de la tabla" valor={`ℓ / ${res.divisor}`} nota="Tabla C.9.5(a), grado 420, peso normal" />
            <Valor etiqueta="h de la tabla" unidad="mm" valor={fmt(res.hTablaMm, 0)} />
            <Valor etiqueta="Factor fy" valor={fmt(res.factorFy, 3)} nota="0.4 + fy/700" />
            <Valor
              etiqueta="Factor concreto liviano"
              valor={fmt(res.factorLiviano, 3)}
              nota={liviano ? `1.65 − 0.0003·${wc.n}` : 'peso normal: 1.000'}
            />
            <Valor destacado etiqueta="h mínima" unidad="mm" valor={fmt(res.hMm, 0)} nota={`Sugerencia práctica: ${aMultiplo5(res.hMm)} mm (auxiliar)`} />
          </div>

          {cumple !== null && (
            <Valor
              etiqueta="Verificación de la altura dada"
              estado={cumple ? 'ok' : 'mal'}
              valor={cumple ? `h = ${fmt(hDada.n, 0)} mm ≥ ${fmt(res.hMm, 0)} mm: cumple` : `h = ${fmt(hDada.n, 0)} mm < ${fmt(res.hMm, 0)} mm: no cumple`}
              nota={
                cumple
                  ? 'Se puede omitir el cálculo de deflexiones (C.9.5.2.1), siempre que el elemento no soporte ni esté ligado a elementos susceptibles de dañarse.'
                  : 'Aumenta h o calcula las deflexiones con C.9.5.2.2 a C.9.5.2.6 y compáralas con la Tabla C.9.5(b).'
              }
            />
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Condición de apoyo</th>
                  <th className="px-3 py-2 text-right font-medium">Losa maciza: ℓ/n</th>
                  <th className="px-3 py-2 text-right font-medium">h (mm)</th>
                  <th className="px-3 py-2 text-right font-medium">Viga / nervada: ℓ/n</th>
                  <th className="px-3 py-2 text-right font-medium">h (mm)</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.ap} className={f.ap === apoyo ? 'bg-primary/10' : ''}>
                    <td className="px-3 py-1.5">{f.apoyo}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{TABLA_C95A['losa-maciza'][f.ap]}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${f.ap === apoyo && elemento === 'losa-maciza' ? 'font-semibold' : ''}`}>{fmt(f.losa, 0)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{TABLA_C95A['viga-nervada'][f.ap]}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${f.ap === apoyo && elemento === 'viga-nervada' ? 'font-semibold' : ''}`}>{fmt(f.viga, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Altura mínima según el apoyo (misma luz, mismo fy y concreto)</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <BarChart data={filas} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="apoyo" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'h (mm)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => <span className="font-mono">{String(n) === 'losa' ? 'Losa maciza' : 'Viga o nervada'}: {Number(v).toFixed(0)} mm</span>} />} />
                <Bar dataKey="losa" fill="var(--color-losa)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="viga" fill="var(--color-viga)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
        </>
      )}

      <PieCalc>
        Tabla C.9.5(a) con sus notas (a) y (b). Solo para elementos en una dirección no preesforzados que no soporten ni estén ligados a divisiones u otros elementos susceptibles de dañarse por deflexiones grandes.
      </PieCalc>
    </div>
  );
}

