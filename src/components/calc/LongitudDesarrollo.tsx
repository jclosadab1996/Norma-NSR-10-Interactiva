import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { FC_MAX_EQUIVALENTE_MPA, RAIZ_FC_MAX_MPA } from '@/data/desarrolloRefuerzo';
import { BARRAS, buscarBarra } from '@/data/refuerzoDetalles';
import {
  cbDesdeLibres,
  claseEmpalmeTraccion,
  empalmeCompresion,
  empalmeTraccion,
  espaciamientoAdecuadoC122,
  fcExcedeLimiteRaiz,
  lambdaDesarrollo,
  ldcCompresion,
  ldEcuacionC121,
  ldhGancho,
  ldTablaC122,
  ktr,
  psiE as calcPsiE,
  psiT as calcPsiT,
} from '@/lib/nsr10/desarrollo';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const configChart = {
  tabla: { label: 'ℓd tracción (tabla C.12.2.2)', color: 'var(--chart-1)' },
  ecuacion: { label: 'ℓd tracción (Ec. C.12-1)', color: 'var(--chart-2)' },
  ldc: { label: 'ℓdc compresión', color: 'var(--chart-3)' },
  ldh: { label: 'ℓdh gancho estándar', color: 'var(--chart-4)' },
  empB: { label: 'Empalme Clase B', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const OPCIONES_BARRA = BARRAS.map((b) => ({
  value: b.id,
  label: b.sistema === 'pulgada' ? `${b.designacion} (${b.diametroPulgada}) — ${b.db} mm` : `${b.designacion} — ${b.db} mm`,
}));
const OPCIONES_CONCRETO = [
  { value: 'normal', label: 'Peso normal (λ = 1.0)' },
  { value: 'liviano', label: 'Liviano sin fct especificado (λ = 0.75)' },
];
const OPCIONES_UBICACION = [
  { value: 'otras', label: 'Otras situaciones (ψt = 1.0)' },
  { value: 'superior', label: 'Barra horizontal con más de 300 mm de concreto fresco debajo (ψt = 1.3)' },
];
const OPCIONES_EPOXICO = [
  { value: 'no', label: 'Sin recubrimiento o galvanizada (ψe = 1.0)' },
  { value: 'si', label: 'Con recubrimiento epóxico (ψe = 1.2 ó 1.5)' },
];
const OPCIONES_SINO = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Sí' },
];
const OPCIONES_METODO = [
  { value: 'ecuacion', label: 'Ecuación C.12-1 (C.12.2.3)' },
  { value: 'tabla', label: 'Tabla de C.12.2.2' },
];
const OPCIONES_EJE = [
  { value: 'fc', label: "f′c (MPa), con fy fijo" },
  { value: 'fy', label: 'fy (MPa), con f′c fijo' },
];

interface Params {
  db: number;
  ab: number;
  fy: number;
  fc: number;
  lambda: number;
  psiT: number;
  epoxico: boolean;
  cc: number;
  sLibre: number;
  estribosMin: boolean;
  ktrMm: number;
  relacionAs: number;
  recGancho: boolean;
  estGancho: boolean;
  confinadoCompresion: boolean;
}

function calcular(p: Params, metodo: 'tabla' | 'ecuacion') {
  const pE = calcPsiE({ epoxico: p.epoxico, recubrimientoLibre: p.cc, separacionLibre: p.sLibre, db: p.db });
  const cb = cbDesdeLibres(p.cc, p.sLibre, p.db);
  const adecuado = espaciamientoAdecuadoC122(p.sLibre, p.cc, p.db, p.estribosMin);
  const e = { fy: p.fy, fc: p.fc, db: p.db, lambda: p.lambda, psiT: p.psiT, psiE: pE };
  const tabla = ldTablaC122({ ...e, espaciamientoAdecuado: adecuado }, { relacionAs: p.relacionAs });
  const ecuacion = ldEcuacionC121({ ...e, cb, ktrMm: p.ktrMm }, { relacionAs: p.relacionAs });
  const baseTabla = ldTablaC122({ ...e, espaciamientoAdecuado: adecuado }, { paraEmpalme: true });
  const baseEcuacion = ldEcuacionC121({ ...e, cb, ktrMm: p.ktrMm }, { paraEmpalme: true });
  const base = metodo === 'tabla' ? baseTabla.ld : baseEcuacion.ld;
  const ldc = ldcCompresion({ fy: p.fy, fc: p.fc, db: p.db, lambda: p.lambda, relacionAs: p.relacionAs, confinado: p.confinadoCompresion });
  const ldh = ldhGancho({ fy: p.fy, fc: p.fc, db: p.db, lambda: p.lambda, recubrimientoSuficiente: p.recGancho && p.db <= 36, estribosConfinan: p.estGancho && p.db <= 36, relacionAs: p.relacionAs });
  return {
    psiE: pE,
    cb,
    adecuado,
    tabla,
    ecuacion,
    baseTabla,
    baseEcuacion,
    base,
    empA: empalmeTraccion(base, 'A'),
    empB: empalmeTraccion(base, 'B'),
    ldc,
    ldh,
    empComp: empalmeCompresion(p.fy, p.fc, p.db),
  };
}

export default function LongitudDesarrollo() {
  const [barraId, setBarraId] = useState('No.8');
  const fy = useNum(420);
  const fc = useNum(28);
  const [concreto, setConcreto] = useState('normal');
  const [ubicacion, setUbicacion] = useState('otras');
  const [epoxico, setEpoxico] = useState('no');
  const cc = useNum(50);
  const sLibre = useNum(75);
  const [estribosMin, setEstribosMin] = useState('si');
  const [usarKtr, setUsarKtr] = useState('no');
  const atr = useNum(142);
  const sEst = useNum(150);
  const nBarras = useNum(2);
  const relacionAs = useNum(1);
  const [recGancho, setRecGancho] = useState('no');
  const [estGancho, setEstGancho] = useState('no');
  const [confComp, setConfComp] = useState('no');
  const [metodo, setMetodo] = useState<'tabla' | 'ecuacion'>('ecuacion');
  const asRel = useNum(1);
  const fracEmp = useNum(100);
  const [eje, setEje] = useState<'fc' | 'fy'>('fc');

  const barra = buscarBarra(barraId) ?? BARRAS[0];
  const lambda = lambdaDesarrollo(concreto === 'liviano' ? 'liviano-otros' : 'normal');

  const ktrMm = useMemo(() => {
    if (usarKtr !== 'si') return 0;
    if (![atr.n, sEst.n, nBarras.n].every((x) => Number.isFinite(x) && x > 0)) return NaN;
    return ktr(atr.n, sEst.n, nBarras.n);
  }, [usarKtr, atr.n, sEst.n, nBarras.n]);

  const entradasOk =
    [fy.n, fc.n, cc.n].every((x) => Number.isFinite(x) && x > 0) &&
    Number.isFinite(sLibre.n) &&
    sLibre.n >= 0 &&
    Number.isFinite(ktrMm) &&
    Number.isFinite(relacionAs.n) &&
    relacionAs.n > 0 &&
    relacionAs.n <= 1;

  const params: Params | null = entradasOk
    ? {
        db: barra.db,
        ab: barra.area,
        fy: fy.n,
        fc: fc.n,
        lambda,
        psiT: ubicacion === 'superior' ? calcPsiT(301) : calcPsiT(0),
        epoxico: epoxico === 'si',
        cc: cc.n,
        sLibre: sLibre.n,
        estribosMin: estribosMin === 'si',
        ktrMm,
        relacionAs: relacionAs.n,
        recGancho: recGancho === 'si',
        estGancho: estGancho === 'si',
        confinadoCompresion: confComp === 'si',
      }
    : null;

  const clave = params ? JSON.stringify(params) : '';
  const r = useMemo(() => (params ? calcular(params, metodo) : null), [clave, metodo]); // eslint-disable-line react-hooks/exhaustive-deps

  const claseExigida =
    Number.isFinite(asRel.n) && Number.isFinite(fracEmp.n) ? claseEmpalmeTraccion({ relacionAsProporcionadaRequerida: asRel.n, fraccionEmpalmada: fracEmp.n / 100 }) : 'B';

  const datos = useMemo(() => {
    if (!params) return [];
    const filas: Record<string, number>[] = [];
    const n = 48;
    const x0 = eje === 'fc' ? 17.5 : 240;
    const x1 = eje === 'fc' ? FC_MAX_EQUIVALENTE_MPA : 550;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const p = eje === 'fc' ? { ...params, fc: x } : { ...params, fy: x };
      const c = calcular(p, metodo);
      filas.push({
        x,
        tabla: c.tabla.ldSobreDb,
        ecuacion: c.ecuacion.ldSobreDb,
        ldc: c.ldc.ldcSobreDb,
        ldh: c.ldh.ldhSobreDb,
        empB: c.empB / p.db,
      });
    }
    return filas;
  }, [clave, metodo, eje]); // eslint-disable-line react-hooks/exhaustive-deps

  const xActual = eje === 'fc' ? fc.n : fy.n;
  const grande = barra.db > 36;
  const ldbPrincipal = metodo === 'tabla' ? r?.tabla : r?.ecuacion;

  return (
    <div className="space-y-5">
      <Grupo titulo="Barra y materiales">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Barra (db)" valor={barraId} onCambio={setBarraId} opciones={OPCIONES_BARRA} />
          <Campo etiqueta="fy" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={240} max={550} paso={10} ayuda="C.9.4: fy de diseño no mayor de 550 MPa (con excepciones)" />
          <Campo etiqueta="f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} max={FC_MAX_EQUIVALENTE_MPA} paso={1} ayuda={`C.12.1.2: √f′c ≤ ${RAIZ_FC_MAX_MPA} MPa (f′c ≤ ${FC_MAX_EQUIVALENTE_MPA.toFixed(1)} MPa)`} />
          <Selector etiqueta="Tipo de concreto → λ (C.12.2.4 d)" valor={concreto} onCambio={setConcreto} opciones={OPCIONES_CONCRETO} />
          <Selector etiqueta="Ubicación del refuerzo → ψt (C.12.2.4 a)" valor={ubicacion} onCambio={setUbicacion} opciones={OPCIONES_UBICACION} className="lg:col-span-2" />
          <Selector etiqueta="Recubrimiento del refuerzo → ψe (C.12.2.4 b)" valor={epoxico} onCambio={setEpoxico} opciones={OPCIONES_EPOXICO} className="lg:col-span-2" />
        </div>
      </Grupo>

      <Grupo titulo="Recubrimiento, separación y confinamiento transversal">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Recubrimiento libre (a la superficie del concreto)" unidad="mm" valor={cc.txt} onCambio={cc.setTxt} min={10} ayuda="Hasta el borde de la barra, incluyendo el estribo" />
          <Campo etiqueta="Separación libre entre barras" unidad="mm" valor={sLibre.txt} onCambio={sLibre.setTxt} min={0} ayuda="Entre las barras que se desarrollan o empalman" />
          <Selector etiqueta="Estribos a lo largo de ℓd ≥ mínimo del Título C" valor={estribosMin} onCambio={setEstribosMin} opciones={OPCIONES_SINO} ayuda="Solo para la tabla de C.12.2.2" />
          <Selector etiqueta="Incluir Ktr (Ec. C.12-2)" valor={usarKtr} onCambio={setUsarKtr} opciones={OPCIONES_SINO} ayuda="Ktr = 0 es una simplificación permitida" />
          {usarKtr === 'si' && (
            <>
              <Campo etiqueta="Atr: área del refuerzo transversal que cruza el plano de hendimiento" unidad="mm²" valor={atr.txt} onCambio={atr.setTxt} min={0} ayuda="Ej.: 2 ramas de No. 3 = 142 mm²" />
              <Campo etiqueta="s: separación de ese refuerzo transversal" unidad="mm" valor={sEst.txt} onCambio={sEst.setTxt} min={1} />
              <Campo etiqueta="n: barras que se desarrollan en el plano de hendimiento" valor={nBarras.txt} onCambio={nBarras.setTxt} min={1} />
            </>
          )}
          <Campo etiqueta="As requerida / As suministrada" valor={relacionAs.txt} onCambio={relacionAs.setTxt} min={0.1} max={1} paso={0.05} ayuda="Refuerzo en exceso (C.12.2.5): 1.0 si no se aplica" />
        </div>
      </Grupo>

      <Grupo titulo="Gancho, compresión y empalme">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Gancho: recubrimiento lateral ≥ 65 mm (y ≥ 50 mm en 90°) → ×0.7" valor={recGancho} onCambio={setRecGancho} opciones={OPCIONES_SINO} ayuda="C.12.5.3 a, barras hasta No. 11 (36M)" />
          <Selector etiqueta="Gancho: estribos a ≤ 3db a lo largo de ℓdh → ×0.8" valor={estGancho} onCambio={setEstGancho} opciones={OPCIONES_SINO} ayuda="C.12.5.3 b o c, barras hasta No. 11 (36M)" />
          <Selector etiqueta="Compresión: confinada por espiral o estribos No. 13 a ≤ 100 mm → ×0.75" valor={confComp} onCambio={setConfComp} opciones={OPCIONES_SINO} ayuda="C.12.3.3 b" />
          <Selector etiqueta="Método para ℓd (base del empalme)" valor={metodo} onCambio={(m) => setMetodo(m === 'tabla' ? 'tabla' : 'ecuacion')} opciones={OPCIONES_METODO} ayuda="C.12.2.1 permite C.12.2.2 o C.12.2.3" />
          <Campo etiqueta="Empalme: As proporcionada / As requerida" valor={asRel.txt} onCambio={asRel.setTxt} min={0.1} paso={0.1} ayuda="Para decidir Clase A o B (C.12.15.2)" />
          <Campo etiqueta="Empalme: % del refuerzo empalmado en la longitud de traslapo" unidad="%" valor={fracEmp.txt} onCambio={fracEmp.setTxt} min={1} max={100} paso={5} />
        </div>
      </Grupo>

      {!entradasOk && <Aviso tipo="error">Revisa los datos: fy, f′c y recubrimiento deben ser positivos; la separación no puede ser negativa; Ktr necesita Atr, s y n positivos; As requerida/suministrada entre 0.1 y 1.</Aviso>}
      {entradasOk && fcExcedeLimiteRaiz(fc.n) && <Aviso tipo="atencion">√f′c supera 8.3 MPa: C.12.1.2 obliga a usar 8.3 MPa (equivale a f′c = {FC_MAX_EQUIVALENTE_MPA.toFixed(1)} MPa).</Aviso>}
      {entradasOk && grande && <Aviso tipo="atencion">Barras mayores de No. 11 (36M): no se permiten empalmes por traslapo salvo los casos de C.12.16.2 y C.15.8.2.3 (C.12.14.2.1), y los factores de C.12.5.3 no aplican.</Aviso>}
      {entradasOk && concreto === 'liviano' && (
        <Aviso tipo="nota">
          Concreto liviano: se usa λ = 0.75 (C.12.2.4 d). Las barras con cabeza (C.12.6) exigen concreto de peso normal. Para ganchos, el texto impreso de C.12.5.2 dice «ψe = 0.75 para concreto con agregados livianos»; aquí se aplica el efecto de λ en el denominador (más conservador) y se señala como errata en el capítulo.
        </Aviso>
      )}

      {r && params && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="ℓd a tracción, tabla C.12.2.2" valor={fmt(r.tabla.ld, 0)} unidad="mm" nota={`${fmt(r.tabla.ldSobreDb, 1)} db · divisor ${r.tabla.divisorTabla} · ${r.adecuado ? 'espaciamiento adecuado' : 'otros casos'}`} destacado={metodo === 'tabla'} />
            <Valor
              etiqueta="ℓd a tracción, Ec. C.12-1"
              valor={fmt(r.ecuacion.ld, 0)}
              unidad="mm"
              nota={`${fmt(r.ecuacion.ldSobreDb, 1)} db · (cb+Ktr)/db = ${fmt(r.ecuacion.terminoConfinamiento ?? NaN, 2)}${r.ecuacion.confinamientoLimitado ? ' (limitado a 2.5)' : ''} · ψs = ${r.ecuacion.psiS}`}
              destacado={metodo === 'ecuacion'}
            />
            <Valor etiqueta="ℓdc a compresión (C.12.3)" valor={fmt(r.ldc.ldc, 0)} unidad="mm" nota={`${fmt(r.ldc.ldcSobreDb, 1)} db${r.ldc.minimoAplicado ? ' · gobierna el mínimo de 200 mm' : ''}`} />
            <Valor etiqueta="ℓdh gancho estándar (C.12.5)" valor={fmt(r.ldh.ldh, 0)} unidad="mm" nota={`${fmt(r.ldh.ldhSobreDb, 1)} db · factor ${fmt(r.ldh.factor, 2)}${r.ldh.minimoAplicado ? ' · gobierna el mínimo (8db / 150 mm)' : ''}`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Empalme tracción Clase A (1.0 ℓd)" valor={fmt(r.empA, 0)} unidad="mm" nota="C.12.15.1 · ℓd sin 300 mm ni exceso de As" />
            <Valor etiqueta="Empalme tracción Clase B (1.3 ℓd)" valor={fmt(r.empB, 0)} unidad="mm" nota="C.12.15.1" />
            <Valor etiqueta="Clase exigida según tus datos" valor={`Clase ${claseExigida}`} nota="C.12.15.2: A solo con As ≥ 2 As,req y ≤ 50 % empalmado" estado={claseExigida === 'A' ? 'ok' : 'neutro'} />
            <Valor etiqueta="Empalme en compresión (C.12.16.1)" valor={fmt(r.empComp.longitud, 0)} unidad="mm" nota={r.empComp.incrementoFcBajo ? 'f′c < 21 MPa: incrementado 1/3' : r.empComp.minimoAplicado ? 'gobierna el mínimo de 300 mm' : '0.071 fy db (fy ≤ 420) ó (0.13 fy − 24) db'} />
          </div>

          <Aviso tipo="nota">
            ψt·ψe = {fmt(ldbPrincipal?.psiTE ?? NaN, 2)} (ψe = {fmt(r.psiE, 1)}), λ = {fmt(lambda, 2)}, cb = {fmt(r.cb, 1)} mm, Ktr = {fmt(ktrMm, 1)} mm. Se usa {metodo === 'tabla' ? 'la tabla de C.12.2.2' : 'la Ec. C.12-1'} como base de los empalmes. La tabla y la ecuación son dos caminos equivalentes admitidos por C.12.2.1; la ecuación suele dar valores menores cuando hay buen recubrimiento y estribos.
          </Aviso>

          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <p className="text-sm font-medium">Longitudes ℓ/db en función de {eje === 'fc' ? 'f′c' : 'fy'}</p>
              <div className="w-full sm:w-64">
                <Selector etiqueta="Variable del eje horizontal" valor={eje} onCambio={(v) => setEje(v === 'fy' ? 'fy' : 'fc')} opciones={OPCIONES_EJE} />
              </div>
            </div>
            <ChartContainer config={configChart} className="aspect-[16/9] w-full">
              <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(x) => String(Math.round(Number(x)))}
                  label={{ value: eje === 'fc' ? "f′c (MPa)" : 'fy (MPa)', position: 'insideBottomRight', offset: -2, fontSize: 12 }}
                />
                <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'ℓ / db', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, pl) => `${eje === 'fc' ? 'f′c' : 'fy'} = ${Number(pl?.[0]?.payload?.x ?? 0).toFixed(1)} MPa`}
                      formatter={(val, name) => (
                        <span className="font-mono">
                          {String(name)}: {Number(val).toFixed(1)} db
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="tabla" name={configChart.tabla.label} stroke="var(--color-tabla)" strokeWidth={metodo === 'tabla' ? 3 : 1.75} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ecuacion" name={configChart.ecuacion.label} stroke="var(--color-ecuacion)" strokeWidth={metodo === 'ecuacion' ? 3 : 1.75} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ldc" name={configChart.ldc.label} stroke="var(--color-ldc)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ldh" name={configChart.ldh.label} stroke="var(--color-ldh)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="empB" name={configChart.empB.label} stroke="var(--color-empB)" strokeWidth={1.75} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                {Number.isFinite(xActual) && datos.length > 0 && xActual >= datos[0].x && xActual <= datos[datos.length - 1].x && (
                  <ReferenceDot x={xActual} y={ldbPrincipal?.ldSobreDb ?? 0} r={6} fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />
                )}
              </LineChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">
              Con los mismos demás datos. Las longitudes bajan al subir f′c porque ℓd depende de 1/√f′c (con √f′c ≤ 8.3 MPa); las de compresión, además, tienen el piso de 0.043 fy db, que no depende de f′c.
            </p>
          </div>

          {r.baseEcuacion.confinamientoLimitado && <Aviso>El término (cb + Ktr)/db superó 2.5 y se limitó a 2.5 (C.12.2.3): más confinamiento adicional no reduce ℓd.</Aviso>}
        </>
      )}

      <PieCalc>
        Barras corrugadas a tracción con C.12.2 (ℓd mínimo 300 mm), a compresión con C.12.3, ganchos estándar con C.12.5 y empalmes por traslapo con C.12.15 y C.12.16. Para el cálculo de empalmes, ℓd se toma sin el mínimo de 300 mm ni el factor de refuerzo en exceso (C.12.15.1). Se desprecian paquetes de barras, malla, torones y barras con cabeza (ver el capítulo C.12).
      </PieCalc>
    </div>
  );
}
