import { useMemo, useState } from 'react';
import { BARRAS_METRICAS, BARRAS_PULGADA, GANCHOS, buscarBarra, type BarraRefuerzo, type TipoGancho } from '@/data/refuerzoDetalles';
import {
  alturaUtilAproximada,
  diametroMinimoDoblado,
  ganchoEstandar,
  recubrimientoMinimo,
  toleranciaColocacion,
  verificarCapa,
} from '@/lib/nsr10/refuerzoDetalles';
import Selector, { type Opcion } from './Selector';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';

type Sistema = 'pulgada' | 'metrico';
type Elemento = 'viga' | 'columna';
type Ambiente = 'interior' | 'intemperie' | 'suelo';

const listaBarras = (s: Sistema): readonly BarraRefuerzo[] => (s === 'pulgada' ? BARRAS_PULGADA : BARRAS_METRICAS);
const opcionesBarras = (s: Sistema): Opcion[] =>
  listaBarras(s).map((b) => ({ value: b.id, label: s === 'pulgada' ? `${b.designacion} (${b.diametroPulgada}) — ${b.db} mm` : `${b.designacion} — ${b.db} mm` }));

const ETIQUETA_GANCHO: Record<TipoGancho, string> = {
  'estandar-180': 'Barra: gancho de 180° (C.7.1.1)',
  'estandar-90': 'Barra: gancho de 90° (C.7.1.2)',
  'estribo-90': 'Estribo: gancho de 90° (C.7.1.3 a, b)',
  'estribo-135': 'Estribo: gancho de 135° (C.7.1.3 c)',
  'sismico-135': 'Estribo DMO/DES: gancho sísmico de 135° (C.7.1.4)',
  'sismico-suplementario-90': 'Gancho suplementario de 90° (C.7.1.4)',
};

// ---------------------------------------------------------------------------------------------
// Esquema de la sección (viga o columna) con una capa de barras
// ---------------------------------------------------------------------------------------------

function SeccionSVG(props: { b: number; h: number; rec: number; de: number; db: number; n: number; libre: number | null; ok: boolean; columna: boolean }) {
  const { b, h, rec, de, db, n, libre, ok, columna } = props;
  const maxPx = 260;
  const k = maxPx / Math.max(b, h);
  const W = b * k;
  const H = h * k;
  const m = 34; // margen para cotas
  const xCentro = (i: number) => {
    if (n === 1) return (rec + de + (b - 2 * rec - 2 * de) / 2) * k;
    const paso = libre !== null ? db + libre : 0;
    return (rec + de + db / 2 + i * paso) * k;
  };
  const filas = columna ? [rec + de + db / 2, h - rec - de - db / 2] : [h - rec - de - db / 2];
  const fuera = libre !== null && libre < 0;
  const colorBarra = ok ? 'var(--chart-1)' : 'var(--chart-4)';
  const sw = Math.max(1.5, de * k);
  return (
    <svg viewBox={`0 0 ${W + 2 * m} ${H + 2 * m}`} className="mx-auto w-full max-w-sm" role="img" aria-label="Esquema de la sección con recubrimiento, estribo y barras">
      <g transform={`translate(${m} ${m})`}>
        <rect x={0} y={0} width={W} height={H} className="fill-muted stroke-foreground" strokeWidth={1.5} />
        {/* estribo: línea al centro de la barra del estribo */}
        <rect
          x={(rec + de / 2) * k}
          y={(rec + de / 2) * k}
          width={Math.max(0, (b - 2 * rec - de) * k)}
          height={Math.max(0, (h - 2 * rec - de) * k)}
          rx={Math.max(2, 2 * de * k)}
          fill="none"
          stroke="var(--chart-3)"
          strokeWidth={sw}
        />
        {!fuera &&
          filas.flatMap((y, r) =>
            Array.from({ length: n }, (_, i) => <circle key={`${r}-${i}`} cx={xCentro(i)} cy={y * k} r={(db * k) / 2} fill={colorBarra} stroke="currentColor" strokeWidth={0.6} />),
          )}
        {/* cota del recubrimiento (izquierda) */}
        <line x1={0} y1={H / 2} x2={rec * k} y2={H / 2} stroke="var(--chart-2)" strokeWidth={2} />
        <text x={(rec * k) / 2} y={H / 2 - 5} textAnchor="middle" fontSize={10} className="fill-foreground">
          {fmt(rec, 0)}
        </text>
        {/* cota b */}
        <line x1={0} y1={H + 16} x2={W} y2={H + 16} stroke="currentColor" strokeWidth={0.8} />
        <text x={W / 2} y={H + 28} textAnchor="middle" fontSize={11} className="fill-foreground">
          b = {fmt(b, 0)} mm
        </text>
        {/* cota libre entre las dos primeras barras */}
        {libre !== null && libre > 0 && n >= 2 && (
          <>
            <line x1={xCentro(0) + (db * k) / 2} y1={filas[filas.length - 1] * k + (db * k) / 2 + 8} x2={xCentro(1) - (db * k) / 2} y2={filas[filas.length - 1] * k + (db * k) / 2 + 8} stroke={ok ? 'var(--ok)' : 'var(--danger)'} strokeWidth={2} />
            <text x={(xCentro(0) + xCentro(1)) / 2} y={filas[filas.length - 1] * k - (db * k) / 2 - 4} textAnchor="middle" fontSize={10} className="fill-foreground">
              s = {fmt(libre, 0)}
            </text>
          </>
        )}
        {/* cota h */}
        <text x={W + 8} y={H / 2} fontSize={11} className="fill-foreground" dominantBaseline="middle">
          h = {fmt(h, 0)}
        </text>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Esquema del gancho (a escala del diámetro de doblado y de la extensión)
// ---------------------------------------------------------------------------------------------

function GanchoSVG(props: { angulo: number; db: number; D: number; ext: number }) {
  const { angulo, db, D, ext } = props;
  const r = (D + db) / 2; // radio al eje de la barra
  const rad = (angulo * Math.PI) / 180;
  const recta = 2 * r + 2 * db; // tramo recto inicial para el dibujo
  // Barra horizontal hacia +x, curva hacia abajo (centro del arco bajo la barra)
  const x0 = -recta;
  const y0 = 0;
  const cx = 0;
  const cy = r;
  const xf = cx + r * Math.sin(rad);
  const yf = cy - r * Math.cos(rad);
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const xe = xf + ext * dx;
  const ye = yf + ext * dy;
  const largeArc = angulo > 180 ? 1 : 0;
  const xs = [x0, 0, xf, xe, cx - r - db, cx + r + db];
  const ys = [y0 - db, yf, ye, cy + r + db, y0 + db];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const W = 300;
  const k = Math.min((W - 40) / (maxX - minX), 130 / (maxY - minY));
  const tx = (x: number) => 20 + (x - minX) * k;
  const ty = (y: number) => 20 + (y - minY) * k;
  const sw = Math.max(3, db * k);
  const d = `M ${tx(x0)} ${ty(y0)} L ${tx(0)} ${ty(0)} A ${r * k} ${r * k} 0 ${largeArc} 1 ${tx(xf)} ${ty(yf)} L ${tx(xe)} ${ty(ye)}`;
  return (
    <svg viewBox={`0 0 ${W} ${Math.max(60, (maxY - minY) * k + 40)}`} className="mx-auto w-full max-w-xs" role="img" aria-label={`Esquema de un gancho de ${angulo} grados`}>
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={sw} strokeLinecap="butt" />
      <circle cx={tx(cx)} cy={ty(cy)} r={2} className="fill-foreground" />
      <text x={tx(cx)} y={ty(cy) + 14} textAnchor="middle" fontSize={10} className="fill-foreground">
        D = {fmt(D, 0)} mm
      </text>
      <text x={tx(xe)} y={ty(ye) + (dy >= 0 ? 14 : -6)} textAnchor="middle" fontSize={10} className="fill-foreground">
        ext. = {fmt(ext, 0)} mm
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------

export default function DetallesRefuerzo() {
  const [sistema, setSistema] = useState<Sistema>('pulgada');
  const [barraId, setBarraId] = useState('No.6');
  const [estriboId, setEstriboId] = useState('No.3');
  const [elemento, setElemento] = useState<Elemento>('viga');
  const [ambiente, setAmbiente] = useState<Ambiente>('interior');
  const [tipoGancho, setTipoGancho] = useState<TipoGancho>('estandar-90');
  const n = useNum(4);
  const b = useNum(300);
  const h = useNum(500);
  const agregado = useNum(19);
  const recManual = useNum(0);

  const cambiarSistema = (s: Sistema) => {
    setSistema(s);
    setBarraId(s === 'pulgada' ? 'No.6' : '20M');
    setEstriboId(s === 'pulgada' ? 'No.3' : '10M');
  };

  const barra = buscarBarra(barraId) ?? listaBarras(sistema)[0];
  const estribo = buscarBarra(estriboId) ?? listaBarras(sistema)[0];

  const r = useMemo(() => {
    const el = 'viga-columna' as const;
    const recP = recubrimientoMinimo(ambiente, el, barra);
    const recE = recubrimientoMinimo(ambiente, el, estribo);
    // El recubrimiento especificado se mide hasta el estribo (C.2): se toma el mayor de los dos requisitos (criterio propio, conservador).
    const recNorma = Math.max(recP.mm, recE.mm);
    const recManualOk = recManual.n > 0;
    const rec = recManualOk ? recManual.n : recNorma;
    const cap = verificarCapa({
      b: b.n,
      recubrimiento: rec,
      dEstribo: estribo.db,
      n: Math.round(n.n),
      db: barra.db,
      tipo: elemento === 'viga' ? 'flexion' : 'compresion',
      tamanoAgregado: agregado.n > 0 ? agregado.n : undefined,
    });
    const d = alturaUtilAproximada(h.n, rec, estribo.db, barra.db);
    const tol = d > 0 ? toleranciaColocacion(d, rec) : null;
    const dobl = diametroMinimoDoblado(barra);
    const doblE = diametroMinimoDoblado(estribo, true);
    const ganchos = GANCHOS.map((g) => ({ g, res: ganchoEstandar(g.id, g.esEstribo ? estribo : barra) }));
    return { recP, recE, recNorma, rec, recManualOk, cap, d, tol, dobl, doblE, ganchos, el };
  }, [ambiente, barra, estribo, b.n, h.n, n.n, elemento, agregado.n, recManual.n]);

  const gSel = useMemo(() => {
    const def = GANCHOS.find((g) => g.id === tipoGancho)!;
    return ganchoEstandar(tipoGancho, def.esEstribo ? estribo : barra);
  }, [tipoGancho, barra, estribo]);
  const gSelBarra = GANCHOS.find((g) => g.id === tipoGancho)!.esEstribo ? estribo : barra;

  const datosValidos = b.n > 0 && h.n > 0 && Number.isInteger(n.n) && n.n >= 1;
  const cap = r.cap;
  const estado = !datosValidos ? 'neutro' : cap.cumple ? 'ok' : 'mal';

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border p-0.5 text-sm" role="group" aria-label="Sistema de designación de barras">
        {(
          [
            ['pulgada', 'Barras No. (octavos de pulgada)'],
            ['metrico', 'Barras métricas (M)'],
          ] as const
        ).map(([v, t]) => (
          <button key={v} type="button" aria-pressed={sistema === v} onClick={() => cambiarSistema(v)} className={`rounded-md px-3 py-1.5 transition-colors ${sistema === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Grupo titulo="1. Elemento y barras">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector
                etiqueta="Elemento"
                valor={elemento}
                onCambio={(v) => setElemento(v as Elemento)}
                opciones={[
                  { value: 'viga', label: 'Viga (flexión): libre ≥ db y 25 mm' },
                  { value: 'columna', label: 'Columna (compresión): libre ≥ 1.5db y 40 mm' },
                ]}
              />
              <Selector
                etiqueta="Exposición"
                valor={ambiente}
                onCambio={(v) => setAmbiente(v as Ambiente)}
                opciones={[
                  { value: 'interior', label: 'No expuesto a intemperie ni suelo' },
                  { value: 'intemperie', label: 'Expuesto a suelo o intemperie' },
                  { value: 'suelo', label: 'Contra el suelo, permanente' },
                ]}
              />
              <Selector etiqueta="Barra longitudinal" valor={barraId} onCambio={setBarraId} opciones={opcionesBarras(sistema)} />
              <Campo etiqueta="Barras en la capa" valor={n.txt} onCambio={n.setTxt} min={1} max={20} ayuda="Número entero" />
              <Selector etiqueta="Estribo" valor={estriboId} onCambio={setEstriboId} opciones={opcionesBarras(sistema)} />
              <Campo etiqueta="Ancho del elemento b" unidad="mm" valor={b.txt} onCambio={b.setTxt} min={100} />
              <Campo etiqueta="Altura h" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={100} ayuda="Para estimar d y las tolerancias" />
              <Campo etiqueta="Agregado grueso (tamaño máx.)" unidad="mm" valor={agregado.txt} onCambio={agregado.setTxt} min={0} ayuda="C.3.3.2(c): ≤ 3/4 de la distancia libre" />
              <Campo etiqueta="Recubrimiento propio (opcional)" unidad="mm" valor={recManual.txt} onCambio={recManual.setTxt} min={0} ayuda="0 = usar el mínimo de C.7.7.1" />
            </div>
          </Grupo>
        </div>

        <div className="space-y-2">
          {datosValidos ? (
            <SeccionSVG b={b.n} h={h.n} rec={r.rec} de={estribo.db} db={barra.db} n={Math.round(n.n)} libre={cap.libre} ok={cap.cumple} columna={elemento === 'columna'} />
          ) : (
            <Aviso tipo="error">Revisa b, h y el número de barras (entero positivo).</Aviso>
          )}
          <p className="text-center text-xs text-muted-foreground">Esquema a escala: recubrimiento (naranja), estribo (verde), barras (azul).</p>
        </div>
      </div>

      {datosValidos && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor
              destacado
              etiqueta="Recubrimiento mínimo C.7.7.1 (hasta el estribo)"
              unidad="mm"
              valor={fmt(r.recNorma, 0)}
              nota={`${r.recP.norma}: ${r.recP.fila}${r.recE.mm !== r.recP.mm ? `; estribo: ${r.recE.mm} mm` : ''}${r.recManualOk ? ` · en el esquema se usa ${fmt(r.rec, 0)} mm` : ''}`}
            />
            <Valor
              etiqueta="Distancia libre entre barras"
              unidad="mm"
              valor={cap.libre === null ? '—' : fmt(cap.libre, 1)}
              estado={estado}
              nota={`Mínima: ${fmt(cap.minima, 1)} mm (${elemento === 'viga' ? 'C.7.6.1' : 'C.7.6.3'})`}
            />
            <Valor etiqueta="Máx. de barras en la capa" valor={String(cap.nMax)} nota={`Ancho interior entre estribos: ${fmt(cap.anchoInterior, 1)} mm`} />
            <Valor etiqueta={`Ancho mínimo para ${Math.round(n.n)} barras`} unidad="mm" valor={fmt(cap.anchoMinimo, 0)} estado={b.n >= cap.anchoMinimo - 1e-9 ? 'ok' : 'mal'} nota={`b actual = ${fmt(b.n, 0)} mm`} />
          </div>
          {!cap.cumple && <Aviso tipo="error">No cumple la distancia libre mínima: usa menos barras, barras más delgadas, dos capas (libre entre capas ≥ 25 mm, C.7.6.2) o aumenta b.</Aviso>}
          {cap.agregadoCumple === false && cap.agregadoMaximoPermitido !== null && (
            <Aviso tipo="atencion">Con esa distancia libre, el agregado máximo permitido por C.3.3.2(c) es {fmt(cap.agregadoMaximoPermitido, 1)} mm (3/4 de la distancia libre).</Aviso>
          )}
          {r.tol && (
            <p className="text-sm text-muted-foreground">
              d ≈ <span className="font-mono">{fmt(r.d, 0)}</span> mm (una capa, estimación propia) → tolerancia en d de ±{r.tol.tolD} mm; el recubrimiento puede quedar hasta {fmt(r.tol.tolRecubrimiento, 1)} mm menor (C.7.5.2.1): mínimo aceptable en obra {fmt(r.tol.recubrimientoMinimoObra, 1)} mm.
            </p>
          )}
          {elemento === 'viga' && n.n > 5 && <Aviso>Con tantas barras en una capa suele convenir una segunda capa, con distancia libre entre capas de al menos 25 mm y barras alineadas verticalmente (C.7.6.2).</Aviso>}
        </>
      )}

      <Grupo titulo="2. Ganchos y diámetro de doblado">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <Selector etiqueta="Tipo de gancho" valor={tipoGancho} onCambio={(v) => setTipoGancho(v as TipoGancho)} opciones={GANCHOS.map((g) => ({ value: g.id, label: ETIQUETA_GANCHO[g.id] }))} />
            <p className="text-xs text-muted-foreground">
              Se usa {GANCHOS.find((g) => g.id === tipoGancho)!.esEstribo ? `el estribo (${estribo.designacion})` : `la barra longitudinal (${barra.designacion})`}. {gSel.seccion}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Valor destacado etiqueta="Extensión en el extremo libre" unidad="mm" valor={fmt(gSel.extensionMm, 1)} nota={`${gSel.extensionFactor}db = ${fmt(gSel.extensionFactor * gSelBarra.db, 1)} mm${gSel.minimoAbsolutoMm ? `; mínimo ${gSel.minimoAbsolutoMm} mm` : ''}`} />
              <Valor etiqueta="Diámetro interior de doblado mín." unidad="mm" valor={gSel.diametroDobladoMm === null ? '—' : fmt(gSel.diametroDobladoMm, 1)} nota={gSel.diametroDobladoMm === null ? 'No cubierto por la Tabla C.7.2' : `${fmt(gSel.diametroDobladoMm / gSelBarra.db, 0)}db`} />
              <Valor etiqueta="Longitud desarrollada del gancho" unidad="mm" valor={gSel.longitudDesarrolladaMm === null ? '—' : fmt(gSel.longitudDesarrolladaMm, 0)} nota="Cálculo propio: arco al eje + extensión" />
              <Valor etiqueta="Ángulo del doblez" unidad="°" valor={String(gSel.angulo)} />
            </div>
            {!gSel.valido && <Aviso tipo="error">La norma no define este gancho para esa barra.</Aviso>}
            {gSel.advertencias.map((a) => (
              <Aviso key={a} tipo="atencion">
                {a}
              </Aviso>
            ))}
          </div>
          <div>
            {gSel.diametroDobladoMm !== null ? (
              <GanchoSVG angulo={gSel.angulo} db={gSelBarra.db} D={gSel.diametroDobladoMm} ext={gSel.extensionMm} />
            ) : (
              <p className="text-sm text-muted-foreground">Sin esquema: no hay diámetro de doblado definido para esta barra.</p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-2 py-1.5 text-left">Gancho</th>
                <th className="px-2 py-1.5 text-right">Extensión (mm)</th>
                <th className="px-2 py-1.5 text-right">D mín. (mm)</th>
                <th className="px-2 py-1.5 text-right">Longitud desarrollada (mm)</th>
              </tr>
            </thead>
            <tbody>
              {r.ganchos.map(({ g, res }) => (
                <tr key={g.id} className="border-t">
                  <td className="px-2 py-1">
                    {ETIQUETA_GANCHO[g.id]} <span className="text-xs text-muted-foreground">({g.esEstribo ? estribo.designacion : barra.designacion})</span>
                  </td>
                  <td className="px-2 py-1 text-right font-mono">{res.valido ? fmt(res.extensionMm, 1) : '—'}</td>
                  <td className="px-2 py-1 text-right font-mono">{res.diametroDobladoMm === null ? '—' : fmt(res.diametroDobladoMm, 1)}</td>
                  <td className="px-2 py-1 text-right font-mono">{res.valido && res.longitudDesarrolladaMm !== null ? fmt(res.longitudDesarrolladaMm, 0) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Doblado mínimo de la barra longitudinal {barra.designacion}: {r.dobl.mm === null ? 'no cubierto por la Tabla C.7.2' : `${fmt(r.dobl.mm, 1)} mm (${r.dobl.factor}db)`}; del estribo {estribo.designacion}: {r.doblE.mm === null ? '—' : `${fmt(r.doblE.mm, 1)} mm (${r.doblE.factor}db)`}.
        </p>
      </Grupo>

      <PieCalc>
        Recubrimientos de C.7.7.1 (concreto construido en sitio, no preesforzado), separaciones de C.7.6 y ganchos de C.7.1 y C.7.2. El recubrimiento se mide hasta el estribo (definición de C.2) y se toma el mayor de los requisitos de la barra y del estribo (criterio propio). La longitud desarrollada del gancho y d son estimaciones geométricas propias.
      </PieCalc>
    </div>
  );
}
