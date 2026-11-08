import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TABLA_D10_3_1, type TipoUnidadConfinada } from '@/data/muroConfinado';
import { BARRAS } from '@/data/refuerzoDetalles';
import {
  densidadPorNivel,
  separacionMaximaColumnas,
  todasCumplen,
  verificarColumna,
  verificarMuroUnidades,
  verificarViga,
  type ConvencionN,
  type Verif,
  type ZonaSismica,
} from '@/lib/nsr10/muroConfinadoRefuerzo';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  requerida: { label: 'Am mínima (D.10.3-1)', color: 'var(--chart-3)' },
  provistaX: { label: 'Am provista X', color: 'var(--chart-1)' },
  provistaY: { label: 'Am provista Y', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const OPC_CONVENCION = [
  { value: 'literal', label: 'N = niveles por encima del nivel considerado (texto de D.10.0)' },
  { value: 'incluye-nivel', label: 'N = niveles por encima + 1 (cuenta el propio nivel; lectura del proyecto)' },
];
const OPC_UNIDAD = TABLA_D10_3_1.map((f) => ({ value: f.id, label: `${f.tipo} — f′cu ≥ ${f.fcuMin} MPa` }));
const OPC_BARRAS = [...BARRAS.filter((b) => ['No.2', 'No.3', 'No.4', 'No.5', 'No.6', '6M', '8M', '10M', '12M', '16M', '20M'].includes(b.id))].map((b) => ({
  value: b.id,
  label: `${b.designacion}${b.diametroPulgada ? ` (${b.diametroPulgada})` : ''} — ${b.db} mm, ${b.area} mm²`,
}));
const OPC_ZONA = [
  { value: 'alta', label: 'Amenaza sísmica alta' },
  { value: 'intermedia', label: 'Amenaza sísmica intermedia' },
  { value: 'baja', label: 'Amenaza sísmica baja' },
];
const OPC_SI_NO = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Sí' },
];

/** Lista de verificaciones con estado. */
function TablaVerif({ items }: { items: readonly Verif[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Requisito</th>
            <th className="px-3 py-2 font-medium">Norma</th>
            <th className="px-3 py-2 font-medium">Exigido</th>
            <th className="px-3 py-2 font-medium">Provisto</th>
            <th className="px-3 py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.id} className="border-t align-top">
              <td className="px-3 py-1.5">{v.descripcion}</td>
              <td className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">{v.norma}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{v.requerido}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{v.provisto}</td>
              <td className={v.cumple === false ? 'px-3 py-1.5 font-semibold text-danger' : 'px-3 py-1.5 font-semibold text-ok'}>{v.cumple === false ? 'No cumple' : 'Cumple'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Veredicto({ items, nombre }: { items: readonly Verif[]; nombre: string }) {
  const ok = todasCumplen(items);
  const malos = items.filter((v) => v.cumple === false).length;
  return ok ? (
    <Aviso tipo="nota">{nombre}: cumple todos los requisitos mínimos verificados. Recuerda que D.10.7 puede exigir más refuerzo por resistencia.</Aviso>
  ) : (
    <Aviso tipo="error">
      {nombre}: no cumple {malos} requisito{malos === 1 ? '' : 's'}; corrige las filas marcadas «No cumple».
    </Aviso>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Densidad de muros                                               */
/* ------------------------------------------------------------------ */
function PanelDensidad() {
  const aa = useNum(0.25);
  const ap = useNum(100);
  const pisos = useNum(3);
  const lx = useNum(12);
  const tx = useNum(120);
  const ly = useNum(10);
  const ty = useNum(120);
  const [conv, setConv] = useState<ConvencionN>('literal');

  const nPisos = Math.round(pisos.n);
  const okBase = [aa.n, ap.n, lx.n, tx.n, ly.n, ty.n].every((x) => Number.isFinite(x) && x > 0) && nPisos >= 1 && nPisos <= 30;
  const AmX = (lx.n * tx.n) / 1000;
  const AmY = (ly.n * ty.n) / 1000;

  const filas = useMemo(() => {
    if (!okBase) return null;
    const x = densidadPorNivel({ pisos: nPisos, Aa: aa.n, Ap: ap.n, Am: AmX, convencion: conv });
    const y = densidadPorNivel({ pisos: nPisos, Aa: aa.n, Ap: ap.n, Am: AmY, convencion: conv });
    return x.map((f, i) => ({ x: f, y: y[i] }));
  }, [okBase, nPisos, aa.n, ap.n, AmX, AmY, conv]);

  const datos = (filas ?? []).map(({ x }) => ({
    nivel: `Piso ${x.nivel}`,
    requerida: Number(x.Amin.toFixed(3)),
    provistaX: Number(AmX.toFixed(3)),
    provistaY: Number(AmY.toFixed(3)),
  }));
  const hayCero = filas?.some(({ x }) => x.Amin === 0);

  return (
    <div className="space-y-4">
      <Grupo titulo="Edificación (D.10.3.4)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Aa (Título A)" valor={aa.txt} onCambio={aa.setTxt} min={0.05} max={0.5} paso={0.05} ayuda="Coeficiente de aceleración pico efectiva" />
          <Campo etiqueta="Ap (área de piso)" unidad="m²" valor={ap.txt} onCambio={ap.setTxt} min={1} ayuda="Igual en todos los niveles (simplificación)" />
          <Campo etiqueta="Número de pisos" valor={pisos.txt} onCambio={pisos.setTxt} min={1} max={30} />
          <Campo etiqueta="Dirección X: longitud total de muros" unidad="m" valor={lx.txt} onCambio={lx.setTxt} min={0} ayuda="Suma de muros confinados que actúan en X" />
          <Campo etiqueta="Dirección X: espesor" unidad="mm" valor={tx.txt} onCambio={tx.setTxt} min={110} />
          <div />
          <Campo etiqueta="Dirección Y: longitud total de muros" unidad="m" valor={ly.txt} onCambio={ly.setTxt} min={0} />
          <Campo etiqueta="Dirección Y: espesor" unidad="mm" valor={ty.txt} onCambio={ty.setTxt} min={110} />
          <div />
        </div>
        <Selector etiqueta="Convención de N" valor={conv} onCambio={(v) => setConv(v === 'incluye-nivel' ? 'incluye-nivel' : 'literal')} opciones={OPC_CONVENCION} ayuda="Con N literal, el último nivel tiene N = 0 y Am mínima = 0." />
      </Grupo>

      {!filas && <Aviso tipo="error">Revisa los datos: valores positivos y entre 1 y 30 pisos.</Aviso>}

      {filas && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Am provista, dirección X" unidad="m²" valor={fmt(AmX, 3)} nota="longitud × espesor (con columnas)" />
            <Valor etiqueta="Am provista, dirección Y" unidad="m²" valor={fmt(AmY, 3)} />
            <Valor etiqueta="Densidad Am/Ap en X" valor={fmt((AmX / ap.n) * 100, 2) + ' %'} />
            <Valor etiqueta="Densidad Am/Ap en Y" valor={fmt((AmY / ap.n) * 100, 2) + ' %'} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Nivel (desde la base)</th>
                  <th className="px-3 py-2 font-medium">N</th>
                  <th className="px-3 py-2 font-medium">Am mínima (m²)</th>
                  <th className="px-3 py-2 font-medium">Mín. Am/Ap</th>
                  <th className="px-3 py-2 font-medium">Dirección X</th>
                  <th className="px-3 py-2 font-medium">Dirección Y</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ x, y }) => (
                  <tr key={x.nivel} className="border-t">
                    <td className="px-3 py-1.5">Piso {x.nivel}</td>
                    <td className="px-3 py-1.5 font-mono">{x.N}</td>
                    <td className="px-3 py-1.5 font-mono">{fmt(x.Amin, 3)}</td>
                    <td className="px-3 py-1.5 font-mono">{fmt(x.densidadMin * 100, 2)} %</td>
                    <td className={x.cumple ? 'px-3 py-1.5 font-semibold text-ok' : 'px-3 py-1.5 font-semibold text-danger'}>{x.cumple ? 'Cumple' : 'No cumple'}</td>
                    <td className={y.cumple ? 'px-3 py-1.5 font-semibold text-ok' : 'px-3 py-1.5 font-semibold text-danger'}>{y.cumple ? 'Cumple' : 'No cumple'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Am mínima por nivel frente a la Am provista</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <BarChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nivel" />
                <YAxis tickFormatter={(x) => Number(x).toFixed(1)} label={{ value: 'm²', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="requerida" fill="var(--color-requerida)" radius={3} isAnimationActive={false} />
                <Bar dataKey="provistaX" fill="var(--color-provistaX)" radius={3} isAnimationActive={false} />
                <Bar dataKey="provistaY" fill="var(--color-provistaY)" radius={3} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">Los niveles inferiores cargan más pisos y exigen más muro (esquema del proyecto).</p>
          </div>

          {hayCero && conv === 'literal' && (
            <Aviso tipo="atencion">
              Con N = «niveles por encima» el último nivel tiene N = 0 y la Ec. D.10.3-1 no exige muro. El texto de la norma no aclara si se quiso contar el propio nivel; prueba la otra convención para ver el efecto.
            </Aviso>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Muro y unidades                                                 */
/* ------------------------------------------------------------------ */
function PanelMuro() {
  const [tipo, setTipo] = useState<TipoUnidadConfinada>('bloque-vertical');
  const fcu = useNum(6);
  const t = useNum(120);
  const h = useNum(2400);
  const pisos = useNum(3);
  const nivel = useNum(1);
  const pu = useNum(60);
  const ae = useNum(480000);
  const fm = useNum(4);
  const horizontal = tipo === 'bloque-horizontal-arcilla';

  const items = useMemo(() => {
    if (![fcu.n, t.n, h.n].every((x) => Number.isFinite(x) && x > 0)) return null;
    return verificarMuroUnidades({
      tipoUnidad: tipo,
      fcu: fcu.n,
      espesor: t.n,
      alturaLibre: h.n,
      ...(horizontal && Number.isFinite(pisos.n) && Number.isFinite(nivel.n) ? { pisosTotales: pisos.n, nivelDesdeArriba: nivel.n } : {}),
      ...(horizontal && Number.isFinite(pu.n) && Number.isFinite(ae.n) && Number.isFinite(fm.n) ? { Pu: pu.n * 1000, Ae: ae.n, fm: fm.n } : {}),
    });
  }, [tipo, fcu.n, t.n, h.n, horizontal, pisos.n, nivel.n, pu.n, ae.n, fm.n]);

  return (
    <div className="space-y-4">
      <Grupo titulo="Unidad y muro (D.10.3.2 y D.10.3.3)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Selector etiqueta="Tipo de unidad" valor={tipo} onCambio={(v) => setTipo(TABLA_D10_3_1.find((f) => f.id === v)?.id ?? 'bloque-vertical')} opciones={OPC_UNIDAD} className="sm:col-span-2 lg:col-span-2" />
          <Campo etiqueta="f′cu de la unidad" unidad="MPa" valor={fcu.txt} onCambio={fcu.setTxt} min={1} ayuda="Sobre área neta en bloque de perforación vertical" />
          <Campo etiqueta="Espesor nominal del muro" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={110} />
          <Campo etiqueta="Altura libre del muro" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={500} />
        </div>
        {horizontal && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Campo etiqueta="Pisos de la edificación" valor={pisos.txt} onCambio={pisos.setTxt} min={1} />
            <Campo etiqueta="Piso del muro (1 = superior)" valor={nivel.txt} onCambio={nivel.setTxt} min={1} />
            <Campo etiqueta="Pu sobre el muro" unidad="kN" valor={pu.txt} onCambio={pu.setTxt} min={0} />
            <Campo etiqueta="Ae" unidad="mm²" valor={ae.txt} onCambio={ae.setTxt} min={1} />
            <Campo etiqueta="f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={1} />
          </div>
        )}
      </Grupo>
      {!items && <Aviso tipo="error">Revisa los datos: valores positivos.</Aviso>}
      {items && (
        <>
          <TablaVerif items={items} />
          <Veredicto items={items} nombre="Muro y unidad" />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Columna de confinamiento                                        */
/* ------------------------------------------------------------------ */
function PanelColumna() {
  const bc = useNum(120);
  const hc = useNum(200);
  const t = useNum(120);
  const fc = useNum(21);
  const nb = useNum(4);
  const [barra, setBarra] = useState('No.3');
  const [estribo, setEstribo] = useState('No.2');
  const sc = useNum(150);
  const se = useNum(100);
  const ramas = useNum(120);
  const luz = useNum(2400);
  const [zona, setZona] = useState<ZonaSismica>('alta');
  const sepCol = useNum(3000);
  const distVigas = useNum(2400);

  const r = useMemo(() => {
    if (![bc.n, hc.n, t.n, fc.n, nb.n, sc.n].every((x) => Number.isFinite(x) && x > 0)) return null;
    return verificarColumna({
      ancho: bc.n,
      largo: hc.n,
      espesorMuro: t.n,
      fc: fc.n,
      nBarras: Math.round(nb.n),
      barraId: barra,
      estriboId: estribo,
      sepEstribos: sc.n,
      zona,
      sepEstribosExtremo: Number.isFinite(se.n) ? se.n : undefined,
      sepRamas: Number.isFinite(ramas.n) ? ramas.n : undefined,
      luz: Number.isFinite(luz.n) && luz.n > 0 ? luz.n : undefined,
    });
  }, [bc.n, hc.n, t.n, fc.n, nb.n, sc.n, se.n, ramas.n, luz.n, barra, estribo, zona]);

  const ubic = useMemo(() => {
    if (!(t.n > 0) || !(distVigas.n > 0)) return null;
    const s = separacionMaximaColumnas(t.n, distVigas.n);
    return { s, ok: Number.isFinite(sepCol.n) ? sepCol.n <= s.max : null };
  }, [t.n, distVigas.n, sepCol.n]);

  const items: Verif[] = r ? [...r.verificaciones] : [];
  if (ubic && ubic.ok !== null) {
    items.push({
      id: 'ubic',
      norma: 'D.10.5.3(c)',
      descripcion: 'Separación entre columnas intermedias',
      requerido: `≤ ${fmt(ubic.s.max, 0)} mm (rige ${ubic.s.rige === 'espesor' ? '35 t' : ubic.s.rige === 'altura' ? '1.5 × distancia entre vigas' : '4 m'})`,
      provisto: `${fmt(sepCol.n, 0)} mm`,
      cumple: ubic.ok,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Sección y materiales">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Dimensión en el espesor del muro" unidad="mm" valor={bc.txt} onCambio={bc.setTxt} min={110} />
            <Campo etiqueta="Dimensión a lo largo del muro" unidad="mm" valor={hc.txt} onCambio={hc.setTxt} min={110} />
            <Campo etiqueta="Espesor del muro confinado" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={110} />
            <Campo etiqueta="f′c del concreto" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17.5} ayuda="Mínimo 17.5 MPa (D.10.4.1)" />
            <Selector etiqueta="Zona de amenaza sísmica" valor={zona} onCambio={(v) => setZona(v === 'baja' ? 'baja' : v === 'intermedia' ? 'intermedia' : 'alta')} opciones={OPC_ZONA} className="sm:col-span-2" />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Número de barras longitudinales" valor={nb.txt} onCambio={nb.setTxt} min={3} />
            <Selector etiqueta="Barra longitudinal" valor={barra} onCambio={setBarra} opciones={OPC_BARRAS} />
            <Selector etiqueta="Estribo" valor={estribo} onCambio={setEstribo} opciones={OPC_BARRAS} />
            <Campo etiqueta="Separación de estribos (zona central)" unidad="mm" valor={sc.txt} onCambio={sc.setTxt} min={20} />
            {zona !== 'baja' && (
              <>
                <Campo etiqueta="Separación de estribos en los extremos" unidad="mm" valor={se.txt} onCambio={se.setTxt} min={20} ayuda="D.10.5.6: 100 mm" />
                <Campo etiqueta="Separación entre ramas del estribo" unidad="mm" valor={ramas.txt} onCambio={ramas.setTxt} min={20} ayuda="D.10.5.6: máx. 150 mm" />
                <Campo etiqueta="Luz libre de la columna" unidad="mm" valor={luz.txt} onCambio={luz.setTxt} min={500} ayuda="Para la longitud de la zona confinada" />
              </>
            )}
          </div>
        </Grupo>
      </div>
      <Grupo titulo="Ubicación de columnas intermedias (D.10.5.3)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Separación entre columnas" unidad="mm" valor={sepCol.txt} onCambio={sepCol.setTxt} min={0} />
          <Campo etiqueta="Distancia vertical entre vigas" unidad="mm" valor={distVigas.txt} onCambio={distVigas.setTxt} min={500} />
          {ubic && <Valor etiqueta="Separación máxima" unidad="mm" valor={fmt(ubic.s.max, 0)} estado={ubic.ok === null ? 'neutro' : ubic.ok ? 'ok' : 'mal'} nota={`35t = ${fmt(ubic.s.porEspesor, 0)} · 1.5h = ${fmt(ubic.s.porAlturaVigas, 0)} · 4000`} />}
        </div>
      </Grupo>

      {!r && <Aviso tipo="error">Revisa los datos: valores positivos.</Aviso>}
      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Área bruta Ag" unidad="mm²" valor={fmt(r.Ag, 0)} estado={r.Ag >= 20000 ? 'ok' : 'mal'} nota="mínimo 20 000 mm² (D.10.5.2.2)" />
            <Valor etiqueta="As provista" unidad="mm²" valor={fmt(r.As, 0)} nota={`cuantía ${fmt(r.cuantia, 4)}`} />
            <Valor etiqueta="As mínima = 0.0075 Ag" unidad="mm²" valor={fmt(r.AsMin, 0)} estado={r.As >= r.AsMin ? 'ok' : 'mal'} />
            <Valor etiqueta="s máx. de estribos (zona central)" unidad="mm" valor={fmt(r.sepEstribosMax, 0)} nota="menor de 1.5 × lado menor y 200" />
            {r.longitudZona !== undefined && <Valor etiqueta="Longitud de zona confinada" unidad="mm" valor={fmt(r.longitudZona, 0)} nota="en cada extremo (D.10.5.6)" />}
          </div>
          <TablaVerif items={items} />
          <Veredicto items={items} nombre="Columna de confinamiento" />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Viga de confinamiento                                           */
/* ------------------------------------------------------------------ */
function PanelViga() {
  const bv = useNum(120);
  const hv = useNum(200);
  const t = useNum(120);
  const fc = useNum(21);
  const nb = useNum(3);
  const [barra, setBarra] = useState('No.3');
  const [estribo, setEstribo] = useState('6M');
  const s = useNum(180);
  const [losa, setLosa] = useState('no');
  const [enchape, setEnchape] = useState('no');
  const dist = useNum(2400);

  const r = useMemo(() => {
    if (![bv.n, hv.n, t.n, fc.n, nb.n, s.n].every((x) => Number.isFinite(x) && x > 0)) return null;
    return verificarViga({
      ancho: bv.n,
      alto: hv.n,
      espesorMuro: t.n,
      fc: fc.n,
      nBarras: Math.round(nb.n),
      barraId: barra,
      estriboId: estribo,
      sepEstribos: s.n,
      losaMaciza: losa === 'si',
      enchape: enchape === 'si',
      distanciaVertical: Number.isFinite(dist.n) && dist.n > 0 ? dist.n : undefined,
    });
  }, [bv.n, hv.n, t.n, fc.n, nb.n, s.n, barra, estribo, losa, enchape, dist.n]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Sección y condiciones">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ancho de la viga" unidad="mm" valor={bv.txt} onCambio={bv.setTxt} min={75} />
            <Campo etiqueta="Altura de la viga" unidad="mm" valor={hv.txt} onCambio={hv.setTxt} min={100} />
            <Campo etiqueta="Espesor del muro confinado" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={110} />
            <Campo etiqueta="f′c del concreto" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17.5} ayuda="Mínimo 17.5 MPa (D.10.4.1)" />
            <Selector etiqueta="¿Entrepiso de losa maciza?" valor={losa} onCambio={setLosa} opciones={OPC_SI_NO} ayuda="Pasa el mínimo a 2 barras N° 4 ó 12M" />
            <Selector etiqueta="¿Viga que requiere enchape?" valor={enchape} onCambio={setEnchape} opciones={OPC_SI_NO} ayuda="Ancho reducible hasta 75 mm (D.10.6.2.2)" />
            <Campo etiqueta="Distancia libre vertical entre vigas" unidad="mm" valor={dist.txt} onCambio={dist.setTxt} min={500} ayuda="Máx. 25 t (D.10.6.3)" />
          </div>
        </Grupo>
        <Grupo titulo="Refuerzo">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Número de barras longitudinales" valor={nb.txt} onCambio={nb.setTxt} min={2} />
            <Selector etiqueta="Barra longitudinal" valor={barra} onCambio={setBarra} opciones={OPC_BARRAS} />
            <Selector etiqueta="Estribo" valor={estribo} onCambio={setEstribo} opciones={OPC_BARRAS} />
            <Campo etiqueta="Separación de estribos" unidad="mm" valor={s.txt} onCambio={s.setTxt} min={20} />
          </div>
        </Grupo>
      </div>
      {!r && <Aviso tipo="error">Revisa los datos: valores positivos.</Aviso>}
      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Área bruta Ag" unidad="mm²" valor={fmt(r.Ag, 0)} estado={r.Ag >= 20000 ? 'ok' : 'mal'} nota="mínimo 20 000 mm² (D.10.6.2.2)" />
            <Valor etiqueta="As provista" unidad="mm²" valor={fmt(r.As, 0)} nota={`cuantía ${fmt(r.cuantia, 4)}`} />
            <Valor etiqueta="As mínima = 0.0075 Ag" unidad="mm²" valor={fmt(r.AsMin, 0)} estado={r.As >= r.AsMin ? 'ok' : 'mal'} />
            <Valor etiqueta="s máx. de estribos" unidad="mm" valor={fmt(r.sepEstribosMax, 0)} nota="menor de 1.5 × lado menor y 200" />
          </div>
          <TablaVerif items={r.verificaciones} />
          <Veredicto items={r.verificaciones} nombre="Viga de confinamiento" />
        </>
      )}
    </div>
  );
}

export default function MuroConfinadoRefuerzo() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="densidad">
        <TabsList className="flex-wrap">
          <TabsTrigger value="densidad">Densidad de muros (D.10.3.4)</TabsTrigger>
          <TabsTrigger value="muro">Muro y unidades (D.10.3)</TabsTrigger>
          <TabsTrigger value="columna">Columnas (D.10.5)</TabsTrigger>
          <TabsTrigger value="viga">Vigas (D.10.6)</TabsTrigger>
        </TabsList>
        <TabsContent value="densidad" className="pt-3">
          <PanelDensidad />
        </TabsContent>
        <TabsContent value="muro" className="pt-3">
          <PanelMuro />
        </TabsContent>
        <TabsContent value="columna" className="pt-3">
          <PanelColumna />
        </TabsContent>
        <TabsContent value="viga" className="pt-3">
          <PanelViga />
        </TabsContent>
      </Tabs>
      <PieCalc>
        Solo requisitos mínimos de D.10.3 a D.10.6; el refuerzo requerido por resistencia (D.10.7) se verifica en la calculadora de resistencia de muros confinados. «N° n ó nM» se evalúa con el menor diámetro (convención del proyecto).
      </PieCalc>
    </div>
  );
}
