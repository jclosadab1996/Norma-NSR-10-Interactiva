import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  esfuerzosPermisiblesAcero,
  esfuerzosPermisiblesConcreto,
  friccionPostensado,
  verificarSeccionPreesforzada,
  type EsfuerzosFibras,
} from '@/lib/nsr10/preesforzado';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const TIPOS = [
  { value: 'viga', label: 'Elemento a flexión (viga, vigueta, losa en una dirección)' },
  { value: 'losa2', label: 'Losa preesforzada en dos direcciones (Clase U, ft ≤ 0.50√f′c)' },
] as const;

const UBICACION = [
  { value: 'intermedia', label: 'Sección intermedia (C.18.4.1(a))' },
  { value: 'extremo', label: 'Extremo de elemento simplemente apoyado (C.18.4.1(b))' },
] as const;

const configFriccion = {
  exacta: { label: 'Ec. C.18-1: Ppj e^−(Kℓ+μα)', color: 'var(--chart-1)' },
  aprox: { label: 'Ec. C.18-2: Ppj/(1+Kℓ+μα)', color: 'var(--chart-3)' },
} satisfies ChartConfig;

type Etapa = { id: string; titulo: string; f: EsfuerzosFibras };

/** Diagrama de esfuerzos en SVG: compresión a la derecha del eje, tracción a la izquierda. */
function DiagramaEsfuerzos({ etapas, h, escala, limites }: { etapas: Etapa[]; h: number; escala: number; limites?: { comp?: number; trac?: number }[] }) {
  const W = 220;
  const H = 230;
  const cx = W / 2;
  const top = 26;
  const bot = H - 26;
  const px = (v: number) => cx + (v / escala) * (W / 2 - 24);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {etapas.map((et, i) => {
        const l = limites?.[i];
        const a = et.f.superior;
        const b = et.f.inferior;
        const pts = `${cx},${top} ${px(a)},${top} ${px(b)},${bot} ${cx},${bot}`;
        const cruce = a * b < 0 ? top + ((bot - top) * a) / (a - b) : null;
        const fila = (v: number, y: number) => {
          const tracc = v < 0;
          return (
            <text x={px(v) + (tracc ? -4 : 4)} y={y + (y === top ? -6 : 14)} textAnchor={tracc ? 'end' : 'start'} className="fill-foreground text-[11px] font-mono">
              {v >= 0 ? '+' : '−'}
              {Math.abs(v).toFixed(2)}
            </text>
          );
        };
        return (
          <figure key={et.id} className="rounded-xl border p-2">
            <figcaption className="px-1 pb-1 text-xs font-medium">{et.titulo}</figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Diagrama de esfuerzos: ${et.titulo}. Fibra superior ${a.toFixed(2)} MPa, fibra inferior ${b.toFixed(2)} MPa (compresión positiva)`} className="w-full">
              <rect x={cx - 3} y={top} width={6} height={bot - top} className="fill-muted" />
              <polygon points={pts} fill="var(--chart-1)" fillOpacity={0.3} stroke="var(--chart-1)" strokeWidth={1.5} />
              {cruce !== null && <circle cx={cx} cy={cruce} r={3} className="fill-foreground" />}
              <line x1={cx} y1={top - 8} x2={cx} y2={bot + 8} className="stroke-foreground/60" strokeWidth={1} />
              {l?.comp !== undefined && <line x1={px(l.comp)} y1={top} x2={px(l.comp)} y2={bot} stroke="var(--chart-2)" strokeDasharray="4 3" strokeWidth={1.2} />}
              {l?.trac !== undefined && <line x1={px(-l.trac)} y1={top} x2={px(-l.trac)} y2={bot} stroke="var(--chart-4)" strokeDasharray="4 3" strokeWidth={1.2} />}
              {fila(a, top)}
              {fila(b, bot)}
              <text x={6} y={H - 4} className="fill-muted-foreground text-[10px]">
                ← tracción · compresión → (MPa)
              </text>
            </svg>
          </figure>
        );
      })}
      <p className="text-xs text-muted-foreground sm:col-span-3">
        Altura de la sección h = {h} mm. Línea discontinua azul: límite de compresión admisible; naranja: tracción que obliga a refuerzo adherido (solo transferencia). Escala común a las tres etapas.
      </p>
    </div>
  );
}

export default function PreesforzoEsfuerzos() {
  const fc = useNum(35);
  const fci = useNum(28);
  const fpu = useNum(1860);
  const fpy = useNum(1675);
  const maxFab = useNum(0);
  const [tipo, setTipo] = useState<string>('viga');

  const b = useNum(400);
  const h = useNum(800);
  const pi = useNum(1283);
  const pe = useNum(1086);
  const e = useNum(250);
  const mg = useNum(188.2);
  const md = useNum(384.2);
  const mt = useNum(629.2);
  const [ubic, setUbic] = useState<string>('intermedia');

  const aps = useNum(1184.4);
  const fpj = useNum(1400);
  const K = useNum(0.005);
  const mu = useNum(0.2);
  const L = useNum(20);
  const flecha = useNum(0.5);

  const matOk = [fc.n, fci.n].every((v) => Number.isFinite(v) && v > 0);
  const aceroOk = [fpu.n, fpy.n].every((v) => Number.isFinite(v) && v > 0) && fpy.n <= fpu.n;

  const perm = useMemo(() => (matOk ? esfuerzosPermisiblesConcreto(fc.n, fci.n) : null), [matOk, fc.n, fci.n]);
  const acero = useMemo(
    () => (aceroOk ? esfuerzosPermisiblesAcero(fpy.n, fpu.n, Number.isFinite(maxFab.n) && maxFab.n > 0 ? maxFab.n : undefined) : null),
    [aceroOk, fpy.n, fpu.n, maxFab.n],
  );

  const secOk = [b.n, h.n].every((v) => Number.isFinite(v) && v > 0) && [pi.n, pe.n].every((v) => Number.isFinite(v) && v >= 0) && [e.n, mg.n, md.n, mt.n].every(Number.isFinite);
  const ver = useMemo(() => {
    if (!matOk || !secOk) return null;
    return verificarSeccionPreesforzada({
      fc: fc.n,
      fci: fci.n,
      seccion: { A: b.n * h.n, I: (b.n * h.n ** 3) / 12, yt: h.n / 2, yb: h.n / 2 },
      e: e.n,
      Pi: pi.n,
      Pe: pe.n,
      Mg: mg.n,
      Md: md.n,
      Mt: mt.n,
      extremoSimple: ubic === 'extremo',
      losaDosDirecciones: tipo === 'losa2',
    });
  }, [matOk, secOk, fc.n, fci.n, b.n, h.n, e.n, pi.n, pe.n, mg.n, md.n, mt.n, ubic, tipo]);

  const escala = useMemo(() => {
    if (!ver) return 1;
    const v = [ver.transferencia, ver.servicioSostenido, ver.servicioTotal].flatMap((f) => [Math.abs(f.superior), Math.abs(f.inferior)]);
    v.push(ver.permisibles.transferencia.compresion, ver.permisibles.servicio.compresionTotal);
    return Math.max(...v, 1) * 1.05;
  }, [ver]);

  const friccionOk = [aps.n, fpj.n, L.n].every((v) => Number.isFinite(v) && v > 0) && [K.n, mu.n, flecha.n].every((v) => Number.isFinite(v) && v >= 0);
  const fric = useMemo(() => {
    if (!friccionOk) return null;
    const ppj = (aps.n * fpj.n) / 1000;
    const N = 40;
    const datos = Array.from({ length: N + 1 }, (_, i) => {
      const x = (L.n * i) / N;
      const alpha = (8 * flecha.n * x) / (L.n * L.n);
      const r = friccionPostensado({ ppj, K: K.n, mu: mu.n, lpx: x, alpha });
      return { x, exacta: r.ppxExacta, aprox: r.aproximadaValida ? r.ppxAproximada : undefined };
    });
    const medio = friccionPostensado({ ppj, K: K.n, mu: mu.n, lpx: L.n / 2, alpha: (4 * flecha.n) / L.n });
    const fin = friccionPostensado({ ppj, K: K.n, mu: mu.n, lpx: L.n, alpha: (8 * flecha.n) / L.n });
    return { ppj, datos, medio, fin };
  }, [friccionOk, aps.n, fpj.n, K.n, mu.n, L.n, flecha.n]);

  const filaVer = ver?.verificaciones ?? [];

  return (
    <div className="space-y-6">
      {/* ───────── Materiales y esfuerzos admisibles ───────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Concreto y acero de preesforzado">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={1} />
            <Campo etiqueta="f′ci (al preesforzar)" unidad="MPa" valor={fci.txt} onCambio={fci.setTxt} min={1} />
            <Campo etiqueta="fpu" unidad="MPa" valor={fpu.txt} onCambio={fpu.setTxt} min={1} />
            <Campo etiqueta="fpy" unidad="MPa" valor={fpy.txt} onCambio={fpy.setTxt} min={1} />
          </div>
          <Campo etiqueta="Máximo del fabricante en el gato (opcional, 0 = no aplica)" unidad="MPa" valor={maxFab.txt} onCambio={maxFab.setTxt} min={0} ayuda="C.18.5.1(a): el gato no excede el menor de 0.94fpy, 0.80fpu y este valor" />
          <Selector etiqueta="Tipo de elemento" valor={tipo} onCambio={setTipo} opciones={TIPOS} />
        </Grupo>

        <div className="space-y-3">
          {!matOk && <Aviso tipo="error">f′c y f′ci deben ser mayores que cero.</Aviso>}
          {!aceroOk && <Aviso tipo="error">Escribe fpu y fpy positivos, con fpy ≤ fpu.</Aviso>}
          {perm && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Valor etiqueta="Compresión en transferencia" valor={fmt(perm.transferencia.compresion, 2)} unidad="MPa" nota={`0.60 f′ci · en extremos simples: ${fmt(perm.transferencia.compresionExtremos, 2)} (0.70 f′ci)`} />
              <Valor etiqueta="Tracción que exige refuerzo adherido" valor={fmt(perm.transferencia.traccionRefuerzo, 3)} unidad="MPa" nota={`0.25√f′c · extremos simples: ${fmt(perm.transferencia.traccionRefuerzoExtremos, 3)} (0.5√f′c)`} />
              <Valor etiqueta="Compresión servicio: preesfuerzo + permanentes" valor={fmt(perm.servicio.compresionSostenida, 2)} unidad="MPa" nota="0.45 f′c · C.18.4.2(a)" />
              <Valor etiqueta="Compresión servicio: todas las cargas" valor={fmt(perm.servicio.compresionTotal, 2)} unidad="MPa" nota="0.60 f′c · C.18.4.2(b)" />
              <Valor etiqueta="Límite de ft, Clase U" valor={fmt(perm.servicio.traccionClaseU, 3)} unidad="MPa" nota={tipo === 'losa2' ? `Losa en dos direcciones: ft ≤ ${fmt(0.5 * Math.sqrt(fc.n), 3)} (0.50√f′c)` : '0.62√f′c · C.18.3.3(a)'} />
              <Valor etiqueta="Límite de ft, Clase T" valor={fmt(perm.servicio.traccionClaseT, 3)} unidad="MPa" nota="1.0√f′c · por encima: Clase C" />
            </div>
          )}
          {acero && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Valor destacado etiqueta="Tendón en el gato" valor={fmt(acero.gato, 1)} unidad="MPa" nota={`Controla ${acero.gatoControla} · C.18.5.1(a)`} />
              <Valor destacado etiqueta="Tendón tras la transferencia" valor={fmt(acero.transferencia, 1)} unidad="MPa" nota={`Controla ${acero.transferenciaControla} · C.18.5.1(b)`} />
              <Valor destacado etiqueta="En anclajes y acoples (postensado)" valor={fmt(acero.anclajes, 1)} unidad="MPa" nota="0.70 fpu · C.18.5.1(c)" />
            </div>
          )}
        </div>
      </div>

      {/* ───────── Verificación de la sección ───────── */}
      <Grupo titulo="Verificación de una sección rectangular (teoría elástica, sección no fisurada)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Ancho b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={1} />
          <Campo etiqueta="Altura h" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={1} />
          <Campo etiqueta="Excentricidad e del tendón bajo el centroide" unidad="mm" valor={e.txt} onCambio={e.setTxt} ayuda="Positiva si el tendón queda debajo del centroide" />
          <Selector etiqueta="Ubicación de la sección" valor={ubic} onCambio={setUbic} opciones={UBICACION} />
          <Campo etiqueta="Pi: fuerza inicial (tras pérdidas inmediatas)" unidad="kN" valor={pi.txt} onCambio={pi.setTxt} min={0} />
          <Campo etiqueta="Pe: fuerza efectiva (todas las pérdidas)" unidad="kN" valor={pe.txt} onCambio={pe.setTxt} min={0} />
          <Campo etiqueta="Mg: peso propio" unidad="kN·m" valor={mg.txt} onCambio={mg.setTxt} />
          <Campo etiqueta="Md: cargas permanentes (incluye Mg)" unidad="kN·m" valor={md.txt} onCambio={md.setTxt} />
          <Campo etiqueta="Mt: todas las cargas de servicio" unidad="kN·m" valor={mt.txt} onCambio={mt.setTxt} />
        </div>
        {!secOk && <Aviso tipo="error">Revisa b, h, Pi, Pe, e y los momentos: deben ser números válidos.</Aviso>}
      </Grupo>

      {ver && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Valor
              destacado
              etiqueta="Clase de flexión (C.18.3.3)"
              valor={`Clase ${ver.clase}`}
              estado={ver.clase === 'C' ? 'mal' : 'ok'}
              nota={`ft = ${fmt(ver.ft, 3)} MPa${tipo === 'losa2' ? ' (losa en dos direcciones: exige Clase U)' : ver.clase === 'C' ? ' · con Clase C los esfuerzos se calculan con la sección fisurada transformada (C.18.3.4)' : ''}`}
            />
            <Valor etiqueta="¿Cumple compresión y clase?" valor={ver.cumple ? 'Sí' : 'No'} estado={ver.cumple ? 'ok' : 'mal'} nota="Verificaciones de la tabla inferior" />
            <Valor
              etiqueta="Refuerzo adherido adicional en transferencia (C.18.4.1(c))"
              valor={ver.requiereRefuerzoTransferencia ? 'Requerido' : 'No requerido'}
              estado={ver.requiereRefuerzoTransferencia ? 'mal' : 'ok'}
              nota={`Tracción máxima en transferencia: ${fmt(Math.max(-ver.transferencia.superior, -ver.transferencia.inferior, 0), 3)} MPa`}
            />
          </div>

          <DiagramaEsfuerzos
            h={h.n}
            escala={escala}
            etapas={[
              { id: 't', titulo: 'Transferencia (Pi + Mg)', f: ver.transferencia },
              { id: 's', titulo: 'Servicio sostenido (Pe + Md)', f: ver.servicioSostenido },
              { id: 'T', titulo: 'Servicio total (Pe + Mt)', f: ver.servicioTotal },
            ]}
            limites={[
              { comp: ubic === 'extremo' ? ver.permisibles.transferencia.compresionExtremos : ver.permisibles.transferencia.compresion, trac: ubic === 'extremo' ? ver.permisibles.transferencia.traccionRefuerzoExtremos : ver.permisibles.transferencia.traccionRefuerzo },
              { comp: ver.permisibles.servicio.compresionSostenida },
              { comp: ver.permisibles.servicio.compresionTotal },
            ]}
          />

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Verificación</th>
                  <th className="px-3 py-2 text-right">Actuante (MPa)</th>
                  <th className="px-3 py-2 text-right">Límite (MPa)</th>
                  <th className="px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filaVer.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="px-3 py-2">
                      {v.descripcion} <span className="text-xs text-muted-foreground">({v.ref})</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(v.valor, 3)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(v.limite, 3)}</td>
                    <td className={`px-3 py-2 font-medium ${v.cumple ? 'text-ok' : 'text-danger'}`}>{v.cumple ? 'cumple' : 'no cumple'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {acero && Number.isFinite(pi.n) && Number.isFinite(aps.n) && (
            <p className="text-xs text-muted-foreground">
              Esfuerzo en el tendón tras la transferencia con Aps = {fmt(aps.n, 1)} mm²: fpi = Pi/Aps = {fmt((pi.n * 1000) / aps.n, 1)} MPa frente a {fmt(acero.transferencia, 1)} MPa admisibles (C.18.5.1(b)) →{' '}
              {(pi.n * 1000) / aps.n <= acero.transferencia ? 'cumple' : 'excede'}. Ajusta Aps en el panel de fricción.
            </p>
          )}
        </div>
      )}

      {/* ───────── Fricción ───────── */}
      <Grupo titulo="Pérdida por fricción en un tendón postensado parabólico (Ecs. C.18-1 y C.18-2)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Área del acero Aps" unidad="mm²" valor={aps.txt} onCambio={aps.setTxt} min={1} />
          <Campo etiqueta="Esfuerzo en el gato fpj" unidad="MPa" valor={fpj.txt} onCambio={fpj.setTxt} min={1} />
          <Campo etiqueta="Longitud del tendón ℓ" unidad="m" valor={L.txt} onCambio={L.setTxt} min={0.1} />
          <Campo etiqueta="Flecha de la parábola e (en el centro)" unidad="m" valor={flecha.txt} onCambio={flecha.setTxt} min={0} ayuda="α(x) = 8 e x / ℓ² (rad), tendón simétrico gateado desde un extremo" />
          <Campo etiqueta="K: desviación accidental" unidad="1/m" valor={K.txt} onCambio={K.setTxt} min={0} paso={0.001} ayuda="Debe determinarse experimentalmente (C.18.6.2.2)" />
          <Campo etiqueta="μp: curvatura" valor={mu.txt} onCambio={mu.setTxt} min={0} paso={0.01} ayuda="Debe determinarse experimentalmente (C.18.6.2.2)" />
        </div>
        {!friccionOk && <Aviso tipo="error">Revisa los datos del tendón: Aps, fpj y ℓ positivos; K, μ y e no negativos.</Aviso>}
      </Grupo>

      {fric && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Fuerza en el gato Ppj" valor={fmt(fric.ppj, 1)} unidad="kN" nota={acero ? (fpj.n <= acero.gato ? `fpj ≤ ${fmt(acero.gato, 1)} MPa admisibles` : `fpj excede ${fmt(acero.gato, 1)} MPa admisibles`) : undefined} estado={acero ? (fpj.n <= acero.gato ? 'ok' : 'mal') : 'neutro'} />
            <Valor destacado etiqueta="Ppx a mitad del tendón" valor={fmt(fric.medio.ppxExacta, 1)} unidad="kN" nota={`Pérdida ${fmt(fric.medio.perdidaPct, 2)} % · exponente ${fmt(fric.medio.exponente, 4)}`} />
            <Valor destacado etiqueta="Ppx en el extremo opuesto" valor={fmt(fric.fin.ppxExacta, 1)} unidad="kN" nota={`Pérdida ${fmt(fric.fin.perdidaPct, 2)} % · exponente ${fmt(fric.fin.exponente, 4)}`} />
            <Valor etiqueta="Ec. C.18-2 en el extremo opuesto" valor={fric.fin.aproximadaValida ? fmt(fric.fin.ppxAproximada, 1) : '—'} unidad={fric.fin.aproximadaValida ? 'kN' : undefined} nota={fric.fin.aproximadaValida ? 'Válida: exponente ≤ 0.3' : 'No válida: exponente > 0.3'} />
          </div>
          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Fuerza en el tendón a lo largo de su longitud</p>
            <ChartContainer config={configFriccion} className="aspect-[16/8] w-full">
              <LineChart data={fric.datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="x" type="number" domain={[0, L.n]} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'ℓpx (m)', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'Ppx (kN)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `ℓpx = ${Number(pl?.[0]?.payload?.x).toFixed(2)} m`} formatter={(v, n) => <span className="font-mono">{String(n) === 'exacta' ? 'C.18-1' : 'C.18-2'}: {Number(v).toFixed(1)} kN</span>} />} />
                <Line type="monotone" dataKey="exacta" stroke="var(--color-exacta)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="aprox" stroke="var(--color-aprox)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls={false} />
                <ReferenceDot x={L.n / 2} y={fric.medio.ppxExacta} r={5} fill="var(--chart-2)" stroke="var(--background)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
            <p className="px-1 text-xs text-muted-foreground">La curva discontinua (C.18-2) solo se dibuja donde Kℓpx + μp αpx ≤ 0.3.</p>
          </div>
        </div>
      )}

      <PieCalc>
        Límites de C.18.3.3, C.18.4.1, C.18.4.2 y C.18.5.1; fricción con C.18-1 y C.18-2. Los esfuerzos de fibra (P/A ± Pe·y/I ∓ M·y/I) son estática elemental (no son texto de la norma) y suponen sección no fisurada, válida para Clases U y T (C.18.3.4). Las pérdidas por acortamiento elástico, flujo plástico, retracción y relajación no las evalúa esta herramienta: ingrese la fuerza efectiva Pe ya calculada.
      </PieCalc>
    </div>
  );
}
