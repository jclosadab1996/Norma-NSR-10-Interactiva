import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS_D, NOMBRE_SISTEMA, buscarBarraD, type SistemaMamposteria } from '@/data/cuantiasMamposteria';
import {
  clasificarPerforacionVertical,
  cuantiasBloque,
  cuantiasCavidad,
  evaluarAdicionalesDES,
  resumir,
  verificarSistema,
  type DatosBloque,
  type DatosCavidad,
  type Verificacion,
} from '@/lib/nsr10/cuantiasMamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = {
  provisto: { label: 'Cuantía provista', color: 'var(--chart-1)' },
  minimo: { label: 'Mínimo de la norma', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const OPCIONES_SISTEMA = (Object.keys(NOMBRE_SISTEMA) as SistemaMamposteria[]).map((k) => ({ value: k, label: NOMBRE_SISTEMA[k] }));
const OPCIONES_BARRA = BARRAS_D.map((b) => ({ value: b.id, label: b.etiqueta }));
const OPCIONES_SI_NO = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];
const GRUPOS: Verificacion['grupo'][] = ['Geometría', 'Materiales', 'Cuantías', 'Separaciones', 'Barras mínimas', 'Conectores', 'Uso'];

function SelBarra({ etiqueta, valor, onCambio, ayuda }: { etiqueta: string; valor: string; onCambio: (v: string) => void; ayuda?: string }) {
  return <Selector etiqueta={etiqueta} valor={valor} onCambio={onCambio} opciones={OPCIONES_BARRA} ayuda={ayuda} />;
}

export default function CuantiasMamposteria() {
  const [sistema, setSistema] = useState<SistemaMamposteria>('reforzada');

  // ---- Muro de perforación vertical (D.7, D.8, D.9) ----
  const esp = useNum(150);
  const fmB = useNum(12);
  const largo = useNum(4);
  const alto = useNum(2.4);
  const aa = useNum(0.05);
  const [todas, setTodas] = useState('si');
  const [bV, setBV] = useState('No. 4');
  const sV = useNum(800);
  const [bH, setBH] = useState('6M');
  const nH = useNum(2);
  const sH = useNum(400);
  const [ubic, setUbic] = useState<'juntas' | 'embebido'>('juntas');
  const nExt = useNum(1);
  const [bExt, setBExt] = useState('No. 4');
  const nRem = useNum(2);
  const [bRem, setBRem] = useState('No. 3');
  const [aberturas, setAberturas] = useState('no');
  const [bAbV, setBAbV] = useState('No. 4');
  const nAbH = useNum(2);
  const [bAbH, setBAbH] = useState('No. 3');

  // ---- Cavidad (D.6) ----
  const tPared = useNum(80);
  const tCav = useNum(100);
  const fmC = useNum(10);
  const fInj = useNum(14);
  const [capas, setCapas] = useState<'1' | '2'>('1');
  const fracMayor = useNum(50);
  const [cvV, setCvV] = useState('No. 4');
  const sCvV = useNum(400);
  const [cvH, setCvH] = useState('No. 3');
  const sCvH = useNum(300);
  const nPV = useNum(0);
  const [bPV, setBPV] = useState('No. 3');
  const sPV = useNum(800);
  const nPH = useNum(2);
  const [bPH, setBPH] = useState('alambre-4');
  const sPH = useNum(400);
  const nExtC = useNum(2);
  const [bExtC, setBExtC] = useState('No. 4');
  const nRemC = useNum(2);
  const [bRemC, setBRemC] = useState('No. 4');
  const [compr, setCompr] = useState('no');
  const dEst = useNum(6);
  const sEst = useNum(150);
  const sPos = useNum(1500);
  const [tipoCon, setTipoCon] = useState<'cercha' | 'zeta'>('cercha');
  const dCon = useNum(4);
  const svCon = useNum(600);
  const shCon = useNum(800);
  const pata = useNum(50);

  const bloqueNums = [esp.n, fmB.n, largo.n, alto.n, sV.n, sH.n, nH.n, nExt.n, nRem.n, nAbH.n];
  const bloqueOk = bloqueNums.every((x) => Number.isFinite(x) && x > 0) && (sistema !== 'no-reforzada' || (Number.isFinite(aa.n) && aa.n >= 0));
  const cavidadNums = [tPared.n, tCav.n, fmC.n, fInj.n, sCvV.n, sCvH.n, nExtC.n, nRemC.n, sPos.n, dCon.n, svCon.n, shCon.n, sPV.n, sPH.n];
  const cavidadOk =
    cavidadNums.every((x) => Number.isFinite(x) && x > 0) &&
    Number.isFinite(nPV.n) && nPV.n >= 0 && Number.isFinite(nPH.n) && nPH.n >= 0 &&
    (capas === '1' || (fracMayor.n >= 50 && fracMayor.n <= 100)) &&
    (compr === 'no' || (dEst.n > 0 && sEst.n > 0)) &&
    (tipoCon === 'cercha' || pata.n > 0);

  const bloque: DatosBloque = useMemo(() => {
    const bv = buscarBarraD(bV);
    const bh = buscarBarraD(bH);
    const be = buscarBarraD(bExt);
    const br = buscarBarraD(bRem);
    const bav = buscarBarraD(bAbV);
    const bah = buscarBarraD(bAbH);
    return {
      espesor: esp.n,
      fm: fmB.n,
      longitud: largo.n,
      altura: alto.n,
      todasCeldasInyectadas: todas === 'si',
      vertical: { diametro: bv.diametro, area: bv.area, sep: sV.n, n: 1 },
      horizontal: { diametro: bh.diametro, area: bh.area, sep: sH.n, n: nH.n },
      ubicacionHorizontal: ubic,
      extremo: { n: nExt.n, diametro: be.diametro },
      remate: { n: nRem.n, diametro: br.diametro },
      hayAberturas: aberturas === 'si',
      aberturaVertical: { n: 1, diametro: bav.diametro },
      aberturaHorizontal: { n: nAbH.n, diametro: bah.diametro },
    };
  }, [esp.n, fmB.n, largo.n, alto.n, todas, bV, sV.n, bH, sH.n, nH.n, ubic, nExt.n, bExt, nRem.n, bRem, aberturas, bAbV, nAbH.n, bAbH]);

  const cavidad: DatosCavidad = useMemo(() => {
    const v = buscarBarraD(cvV);
    const h = buscarBarraD(cvH);
    const pv = buscarBarraD(bPV);
    const ph = buscarBarraD(bPH);
    const e = buscarBarraD(bExtC);
    const r = buscarBarraD(bRemC);
    const nc = capas === '2' ? 2 : 1;
    return {
      espesorPared: tPared.n,
      espesorCavidad: tCav.n,
      fm: fmC.n,
      fInyeccion: fInj.n,
      capas: nc,
      fraccionCapaMayor: nc === 2 ? fracMayor.n / 100 : 1,
      verticalCavidad: { diametro: v.diametro, area: v.area, sep: sCvV.n },
      horizontalCavidad: { diametro: h.diametro, area: h.area, sep: sCvH.n },
      verticalParedes: { diametro: pv.diametro, area: pv.area, sep: sPV.n, n: nPV.n },
      horizontalParedes: { diametro: ph.diametro, area: ph.area, sep: sPH.n, n: nPH.n },
      extremo: { n: nExtC.n, diametro: e.diametro },
      remate: { n: nRemC.n, diametro: r.diametro },
      contribuyeCompresion: compr === 'si',
      estribo: { diametro: dEst.n, sep: sEst.n },
      posicionadorSep: sPos.n,
      conector: { tipo: tipoCon, diametro: dCon.n, sepVertical: svCon.n, sepHorizontal: shCon.n, pata: tipoCon === 'zeta' ? pata.n : 0 },
    };
  }, [tPared.n, tCav.n, fmC.n, fInj.n, capas, fracMayor.n, cvV, sCvV.n, cvH, sCvH.n, bPV, nPV.n, sPV.n, bPH, nPH.n, sPH.n, bExtC, nExtC.n, bRemC, nRemC.n, compr, dEst.n, sEst.n, sPos.n, tipoCon, dCon.n, svCon.n, shCon.n, pata.n]);

  const esCavidad = sistema === 'cavidad';
  const datosOk = esCavidad ? cavidadOk : bloqueOk;

  const calc = useMemo(() => {
    if (!datosOk) return null;
    const verifs = verificarSistema(sistema, { cavidad, bloque, aa: aa.n });
    const resumen = resumir(verifs);
    let barras: { nombre: string; provisto: number; minimo: number }[] = [];
    let info: { rv: number; rh: number; suma: number; titulo: string } | null = null;
    if (esCavidad) {
      const q = cuantiasCavidad(cavidad);
      barras = [
        { nombre: 'ρv cavidad', provisto: q.cavidadVertical, minimo: 0.0015 },
        { nombre: 'ρh cavidad', provisto: q.cavidadHorizontal, minimo: 0.002 },
        { nombre: 'ρv sección', provisto: q.seccionVertical, minimo: 0.0007 },
        { nombre: 'ρh sección', provisto: q.seccionHorizontal, minimo: 0.0007 },
        { nombre: 'ρv + ρh', provisto: q.suma, minimo: 0.002 },
      ];
      info = { rv: q.seccionVertical, rh: q.seccionHorizontal, suma: q.suma, titulo: 'sobre la sección completa' };
    } else if (sistema !== 'no-reforzada') {
      const q = cuantiasBloque(bloque);
      if (sistema === 'reforzada') {
        barras = [
          { nombre: 'ρv', provisto: q.vertical, minimo: 0.0007 },
          { nombre: 'ρh', provisto: q.horizontal, minimo: 0.0007 },
          { nombre: 'ρv + ρh', provisto: q.suma, minimo: 0.002 },
          { nombre: 'ρv (½ ρh)', provisto: q.vertical, minimo: 0.5 * q.horizontal },
        ];
      } else {
        barras = [
          { nombre: 'ρv', provisto: q.vertical, minimo: 0.00027 },
          { nombre: 'ρh', provisto: q.horizontal, minimo: 0.00027 },
        ];
      }
      info = { rv: q.vertical, rh: q.horizontal, suma: q.suma, titulo: 'sobre el área bruta del muro' };
    }
    const clasif = esCavidad ? null : clasificarPerforacionVertical(bloque);
    const des = sistema === 'reforzada' ? evaluarAdicionalesDES(bloque) : null;
    return { verifs, resumen, barras, info, clasif, des };
  }, [datosOk, sistema, cavidad, bloque, aa.n, esCavidad]);

  const num = (x: number) => (x < 0.01 ? x.toFixed(5) : x.toFixed(4));

  return (
    <div className="space-y-5">
      <Selector etiqueta="Sistema de mampostería" valor={sistema} onCambio={(v) => setSistema(v as SistemaMamposteria)} opciones={OPCIONES_SISTEMA} />

      {esCavidad ? (
        <>
          <Grupo titulo="Geometría y materiales de la cavidad (D.6.1)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Espesor de cada pared lateral" unidad="mm" valor={tPared.txt} onCambio={tPared.setTxt} min={70} ayuda="Espesor real; mínimo 70 mm" />
              <Campo etiqueta="Espesor de la cavidad" unidad="mm" valor={tCav.txt} onCambio={tCav.setTxt} min={50} ayuda="Mínimo 50 mm" />
              <Campo etiqueta="f′m de las paredes" unidad="MPa" valor={fmC.txt} onCambio={fmC.setTxt} min={6.25} />
              <Campo etiqueta="Resistencia del material de inyección" unidad="MPa" valor={fInj.txt} onCambio={fInj.setTxt} min={12.5} ayuda="Mortero de relleno o concreto fluido a 28 días" />
            </div>
          </Grupo>
          <Grupo titulo="Refuerzo de la cavidad (D.6.3.2, D.6.3.6)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Selector etiqueta="Capas de refuerzo" valor={capas} onCambio={(v) => setCapas(v === '2' ? '2' : '1')} opciones={[{ value: '1', label: '1 capa' }, { value: '2', label: '2 capas' }]} />
              {capas === '2' && <Campo etiqueta="% del refuerzo en la capa mayor" unidad="%" valor={fracMayor.txt} onCambio={fracMayor.setTxt} min={50} max={100} ayuda="50 % si las capas son iguales; máx. 66 %" />}
              <SelBarra etiqueta="Barra vertical (por capa)" valor={cvV} onCambio={setCvV} />
              <Campo etiqueta="Separación vertical" unidad="mm" valor={sCvV.txt} onCambio={sCvV.setTxt} min={50} max={400} />
              <SelBarra etiqueta="Barra horizontal (por capa)" valor={cvH} onCambio={setCvH} />
              <Campo etiqueta="Separación horizontal" unidad="mm" valor={sCvH.txt} onCambio={sCvH.setTxt} min={50} max={400} />
              <Campo etiqueta="Separación de posicionadores" unidad="mm" valor={sPos.txt} onCambio={sPos.setTxt} ayuda="De la barra vertical; máx. menor de 250 ∅ y 3 m" />
              <Selector etiqueta="¿La barra vertical resiste compresión?" valor={compr} onCambio={setCompr} opciones={OPCIONES_SI_NO} />
              {compr === 'si' && <Campo etiqueta="Diámetro de los estribos" unidad="mm" valor={dEst.txt} onCambio={dEst.setTxt} min={6} />}
              {compr === 'si' && <Campo etiqueta="Separación de los estribos" unidad="mm" valor={sEst.txt} onCambio={sEst.setTxt} />}
            </div>
          </Grupo>
          <Grupo titulo="Refuerzo en las paredes laterales (suma a la cuantía de la sección completa)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Barras verticales por grupo (0 = ninguna)" valor={nPV.txt} onCambio={nPV.setTxt} min={0} paso={1} />
              <SelBarra etiqueta="Barra vertical en paredes" valor={bPV} onCambio={setBPV} />
              <Campo etiqueta="Separación horizontal" unidad="mm" valor={sPV.txt} onCambio={sPV.setTxt} />
              <Campo etiqueta="Alambres horizontales por nivel (0 = ninguno)" valor={nPH.txt} onCambio={nPH.setTxt} min={0} paso={1} ayuda="Total de las dos paredes, p. ej. 2 en una escalerilla" />
              <SelBarra etiqueta="Alambre/barra horizontal en juntas" valor={bPH} onCambio={setBPH} />
              <Campo etiqueta="Separación vertical" unidad="mm" valor={sPH.txt} onCambio={sPH.setTxt} />
            </div>
          </Grupo>
          <Grupo titulo="Extremos, remate y conectores (D.6.1.4, D.6.3.3)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Barras verticales en cada extremo" valor={nExtC.txt} onCambio={nExtC.setTxt} min={2} paso={1} />
              <SelBarra etiqueta="Barra de extremo" valor={bExtC} onCambio={setBExtC} />
              <Campo etiqueta="Barras horizontales en remate y arranque" valor={nRemC.txt} onCambio={nRemC.setTxt} min={2} paso={1} />
              <SelBarra etiqueta="Barra de remate" valor={bRemC} onCambio={setBRemC} />
              <Selector etiqueta="Tipo de conector" valor={tipoCon} onCambio={(v) => setTipoCon(v === 'zeta' ? 'zeta' : 'cercha')} opciones={[{ value: 'cercha', label: 'Cercha, escalera o estribo' }, { value: 'zeta', label: 'En zeta' }]} />
              <Campo etiqueta="Diámetro del conector" unidad="mm" valor={dCon.txt} onCambio={dCon.setTxt} min={4} />
              <Campo etiqueta="Separación vertical" unidad="mm" valor={svCon.txt} onCambio={svCon.setTxt} />
              <Campo etiqueta="Separación horizontal" unidad="mm" valor={shCon.txt} onCambio={shCon.setTxt} />
              {tipoCon === 'zeta' && <Campo etiqueta="Longitud de la pata" unidad="mm" valor={pata.txt} onCambio={pata.setTxt} min={50} />}
            </div>
          </Grupo>
        </>
      ) : (
        <>
          <Grupo titulo="Muro y materiales">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Espesor nominal del muro" unidad="mm" valor={esp.txt} onCambio={esp.setTxt} min={120} ayuda="Se usa también para el área bruta" />
              <Campo etiqueta="f′m de la mampostería" unidad="MPa" valor={fmB.txt} onCambio={fmB.setTxt} min={sistema === 'reforzada' ? 10 : 8} max={sistema === 'reforzada' ? 28 : undefined} />
              {sistema === 'reforzada' && <Campo etiqueta="Longitud del muro L" unidad="m" valor={largo.txt} onCambio={largo.setTxt} min={0.5} ayuda="Para los adicionales DES (D.7.2.1.1)" />}
              {sistema === 'reforzada' && <Campo etiqueta="Altura del muro H" unidad="m" valor={alto.txt} onCambio={alto.setTxt} min={0.5} />}
              {sistema === 'reforzada' && <Selector etiqueta="¿Todas las celdas verticales inyectadas?" valor={todas} onCambio={setTodas} opciones={OPCIONES_SI_NO} ayuda="Incluso las que no llevan refuerzo" />}
              {sistema === 'no-reforzada' && <Campo etiqueta="Aceleración Aa del sitio" valor={aa.txt} onCambio={aa.setTxt} min={0} max={0.05} paso={0.01} ayuda="D.9.2.1: solo con Aa ≤ 0.05" />}
            </div>
          </Grupo>
          <Grupo titulo={sistema === 'no-reforzada' ? 'Refuerzo que SÍ tiene el muro (para ver si calificaría como D.7 o D.8)' : 'Refuerzo provisto'}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SelBarra etiqueta="Barra vertical" valor={bV} onCambio={setBV} />
              <Campo etiqueta="Separación entre barras verticales" unidad="mm" valor={sV.txt} onCambio={sV.setTxt} />
              <SelBarra etiqueta="Alambre/barra horizontal" valor={bH} onCambio={setBH} />
              <Campo etiqueta="Alambres horizontales por nivel" valor={nH.txt} onCambio={nH.setTxt} min={1} paso={1} ayuda="2 en una escalerilla" />
              <Campo etiqueta="Separación vertical del horizontal" unidad="mm" valor={sH.txt} onCambio={sH.setTxt} />
              <Selector etiqueta="Ubicación del refuerzo horizontal" valor={ubic} onCambio={(v) => setUbic(v === 'embebido' ? 'embebido' : 'juntas')} opciones={[{ value: 'juntas', label: 'En las juntas de pega' }, { value: 'embebido', label: 'En elementos embebidos (D.4.5.11.2)' }]} />
              <Campo etiqueta="Barras verticales en cada extremo" valor={nExt.txt} onCambio={nExt.setTxt} min={1} paso={1} />
              <SelBarra etiqueta="Barra de extremo" valor={bExt} onCambio={setBExt} />
              <Campo etiqueta="Barras horizontales en remate y arranque" valor={nRem.txt} onCambio={nRem.setTxt} min={2} paso={1} />
              <SelBarra etiqueta="Barra de remate" valor={bRem} onCambio={setBRem} />
              <Selector etiqueta="¿Aberturas interiores mayores de 600 mm?" valor={aberturas} onCambio={setAberturas} opciones={OPCIONES_SI_NO} />
              {aberturas === 'si' && <SelBarra etiqueta="Barra vertical junto a la abertura" valor={bAbV} onCambio={setBAbV} />}
              {aberturas === 'si' && <Campo etiqueta="Barras horizontales arriba y abajo" valor={nAbH.txt} onCambio={nAbH.setTxt} min={2} paso={1} />}
              {aberturas === 'si' && <SelBarra etiqueta="Barra horizontal de abertura" valor={bAbH} onCambio={setBAbH} />}
            </div>
          </Grupo>
        </>
      )}

      {!datosOk && <Aviso tipo="error">Revisa los datos: los campos numéricos deben ser positivos (los conteos de barras opcionales pueden ser 0).</Aviso>}

      {calc && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor
              destacado
              etiqueta={`Verificaciones del sistema ${sistema === 'cavidad' ? 'D.6' : sistema === 'reforzada' ? 'D.7' : sistema === 'parcial' ? 'D.8' : 'D.9'}`}
              valor={`${calc.resumen.cumplen} de ${calc.resumen.total}`}
              nota={calc.resumen.todasCumplen ? 'Cumple todas' : `${calc.resumen.incumplen} no cumple(n)`}
              estado={calc.resumen.todasCumplen ? 'ok' : 'mal'}
            />
            {calc.info && <Valor etiqueta="Cuantía vertical ρv" valor={num(calc.info.rv)} nota={calc.info.titulo} />}
            {calc.info && <Valor etiqueta="Cuantía horizontal ρh" valor={num(calc.info.rh)} nota={calc.info.titulo} />}
            {calc.info && <Valor etiqueta="Suma ρv + ρh" valor={num(calc.info.suma)} nota={sistema === 'parcial' ? 'D.8 no exige suma' : 'Mínimo 0.0020 (D.6 y D.7)'} />}
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Requisito</th>
                  <th className="px-3 py-2">Norma</th>
                  <th className="px-3 py-2">Requerido</th>
                  <th className="px-3 py-2">Provisto</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {GRUPOS.map((g) => {
                  const filas = calc.verifs.filter((x) => x.grupo === g);
                  if (filas.length === 0) return null;
                  return [
                    <tr key={`g-${g}`} className="bg-muted/30">
                      <td colSpan={5} className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {g}
                      </td>
                    </tr>,
                    ...filas.map((x) => (
                      <tr key={x.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          {x.requisito}
                          {x.nota && <p className="mt-0.5 text-xs text-muted-foreground">{x.nota}</p>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          {x.seccion}
                          <br />
                          <span className="text-muted-foreground">{x.pag}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{x.requerido}</td>
                        <td className="px-3 py-2 font-mono text-xs">{x.provisto}</td>
                        <td className={`whitespace-nowrap px-3 py-2 font-semibold ${x.cumple ? 'text-ok' : 'text-danger'}`}>
                          {x.cumple ? 'Cumple' : 'No cumple'}
                          {x.errata && <p className="text-xs font-normal text-muted-foreground">Con el valor impreso: {x.cumpleValorImpreso ? 'cumple' : 'no cumple'}</p>}
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>

          {calc.barras.length > 0 && (
            <div className="rounded-xl border p-3">
              <p className="mb-1 px-1 text-sm font-medium">Cuantías provistas frente a los mínimos de la norma</p>
              <ChartContainer config={config} className="aspect-[16/8] w-full">
                <BarChart data={calc.barras} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nombre" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(x) => Number(x).toFixed(4)} width={64} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(5)}</span>} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar name="Cuantía provista" dataKey="provisto" fill="var(--color-provisto)" radius={3} isAnimationActive={false} />
                  <Bar name="Mínimo de la norma" dataKey="minimo" fill="var(--color-minimo)" radius={3} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            </div>
          )}

          {calc.des && (
            <Aviso>
              D.7.2.1.1 (DES), requisitos adicionales (a) y (b), alternativa a inyectar todas las celdas (D.2.1.2): la separación vertical y horizontal debe ser ≤ {fmt(calc.des.limiteSeparacion, 0)} mm (menor de L/3, H/3 y 1 200 mm). El PDF imprime 120 mm en lugar de
              1 200 mm (posible errata); con 120 mm el límite sería {fmt(calc.des.limiteImpreso, 0)} mm. Vertical: {calc.des.verticalOk ? 'cumple' : 'no cumple'}. Horizontal (además debe estar embebido en
              mortero de relleno): {calc.des.horizontalOk ? 'cumple' : 'no cumple'}.
              {bloque.todasCeldasInyectadas && ' Como se inyectan todas las celdas, el muro ya es DES sin necesidad de estos adicionales.'}
            </Aviso>
          )}

          {calc.clasif && (
            <Aviso tipo={calc.clasif.sistema === 'no-reforzada' ? 'atencion' : 'nota'}>
              Clasificación con estos datos (autoría del proyecto): <strong>{NOMBRE_SISTEMA[calc.clasif.sistema]}</strong>, capacidad {calc.clasif.capacidad}. {calc.clasif.explicacion}
              {calc.clasif.sistema === 'no-reforzada' && ' Recuerde que D.9.2.1 solo permite este sistema con Aa ≤ 0.05.'}
            </Aviso>
          )}
        </>
      )}
      <PieCalc>
        Valores de D.6 a D.9 (páginas D-43 a D-52). «N° 4 ó 12M» se evalúa con 12 mm, «N° 3 ó 10M» con 9.5 mm y «N° 2 ó 6M» con 6 mm; «200 mm ó 16 ∅» y «250 ∅ ó 3 m» se leen como el menor de los dos. En D.7.3.3(b) y D.7.2.1.1 el PDF imprime 120 mm (probable errata de 1 200 mm): se evalúa con 1 200 mm y se muestra el resultado con el valor impreso. Solo debe ingresarse refuerzo continuo en el tramo del muro. No incluye la
        resistencia a cortante o flexión (D.5) ni el diseño por esfuerzos admisibles (Apéndice D-1).
      </PieCalc>
    </div>
  );
}
