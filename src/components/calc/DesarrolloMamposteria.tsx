import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BARRAS, buscarBarra } from '@/data/refuerzoDetalles';
import { DESARROLLO, TABLA_D461_INYECCION, type TipoMorteroRelleno } from '@/data/refuerzoMamposteria';
import {
  alturaMaximaInyeccion,
  diametroDoblamiento,
  dimensionesMinimasParaAltura,
  etapasInyeccion,
  ganchoEstandar,
  longitudDesarrollo,
  longitudEmpalme,
  recubrimientoMinimoCelda,
  resistenciaEmpalmeMecanico,
  separacionMaximaEmpalme,
  verificarBarraEnCelda,
} from '@/lib/nsr10/desarrolloMamposteria';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';

const config = {
  ld: { label: 'ℓd (Ec. D.4.2-1)', color: 'var(--chart-1)' },
  minimo: { label: 'Mínimo 300 mm', color: 'var(--muted-foreground)' },
} satisfies ChartConfig;

const OPCIONES_BARRA = BARRAS.map((b) => ({
  value: b.id,
  label: `${b.designacion}${b.diametroPulgada ? ` (${b.diametroPulgada})` : ''} — db = ${b.db} mm`,
}));

const OPCIONES_TIPO = [
  { value: 'corrugada', label: 'Corrugada' },
  { value: 'lisa', label: 'Lisa (ℓd × 2)' },
];

const OPCIONES_MORTERO = [
  { value: 'fino', label: 'Mortero de relleno fino' },
  { value: 'grueso', label: 'Mortero de relleno grueso' },
];

const OPCIONES_EXPOSICION = [
  { value: 'no', label: 'No expuesta a tierra ni intemperie' },
  { value: 'si', label: 'Expuesta a tierra o intemperie' },
];

export default function DesarrolloMamposteria() {
  const [barraId, setBarraId] = useState('No.4');
  const [tipo, setTipo] = useState<'corrugada' | 'lisa'>('corrugada');
  const fy = useNum(420);
  const fm = useNum(10);
  const K = useNum(63.5);
  const [sLibreTxt, setSLibreTxt] = useState('');
  const sLibre = { txt: sLibreTxt, n: sLibreTxt.trim() === '' ? NaN : parseNum(sLibreTxt) };
  const [expuesta, setExpuesta] = useState<'no' | 'si'>('no');

  const espesor = useNum(150);
  const celdaA = useNum(100);
  const celdaB = useNum(120);
  const [mortero, setMortero] = useState<TipoMorteroRelleno>('fino');
  const alturaMuro = useNum(2.4);

  const barra = buscarBarra(barraId) ?? BARRAS[0];
  const db = barra.db;

  const desarrolloOk = [fy.n, fm.n, K.n].every((x) => Number.isFinite(x) && x > 0);
  const celdaOk = [espesor.n, celdaA.n, celdaB.n].every((x) => Number.isFinite(x) && x > 0);

  const des = useMemo(() => {
    if (!desarrolloOk) return null;
    const sl = Number.isFinite(sLibre.n) && sLibre.n > 0 ? sLibre.n : undefined;
    const r = longitudDesarrollo({ db, fy: fy.n, fm: fm.n, K: K.n, sLibre: sl, lisa: tipo === 'lisa' });
    const emp = longitudEmpalme(r.ld);
    return {
      r,
      emp,
      sep: separacionMaximaEmpalme(emp),
      mec: resistenciaEmpalmeMecanico(fy.n),
      g180: ganchoEstandar(db, 180),
      g90: ganchoEstandar(db, 90),
      g135: ganchoEstandar(db, 135),
      dob: diametroDoblamiento(db, fy.n),
      cob: recubrimientoMinimoCelda(db, expuesta === 'si'),
      sl,
    };
  }, [desarrolloOk, db, fy.n, fm.n, K.n, sLibre.n, tipo, expuesta]);

  const celda = useMemo(() => {
    if (!celdaOk) return null;
    const menor = Math.min(celdaA.n, celdaB.n);
    const v = verificarBarraEnCelda({ db, espesorMuro: espesor.n, celdaMenor: menor, mortero });
    const hMax = alturaMaximaInyeccion(celdaA.n, celdaB.n, mortero);
    const etapas = Number.isFinite(alturaMuro.n) && alturaMuro.n > 0 ? etapasInyeccion(alturaMuro.n, hMax) : 0;
    const exigencia = Number.isFinite(alturaMuro.n) && alturaMuro.n > 0 ? dimensionesMinimasParaAltura(alturaMuro.n, mortero) : null;
    return { v, hMax, etapas, exigencia, menor };
  }, [celdaOk, celdaA.n, celdaB.n, db, espesor.n, mortero, alturaMuro.n]);

  const datos = useMemo(() => {
    if (!desarrolloOk || !des) return [];
    const sl = des.sl;
    return Array.from({ length: 26 }, (_, i) => {
      const f = 5 + i;
      const r = longitudDesarrollo({ db, fy: fy.n, fm: f, K: K.n, sLibre: sl, lisa: tipo === 'lisa' });
      return { fm: f, ld: r.ld, minimo: DESARROLLO.minimoMm * (tipo === 'lisa' ? 2 : 1) };
    });
  }, [desarrolloOk, des, db, fy.n, K.n, tipo]);

  const ok = (b: boolean | undefined) => (b === undefined ? 'neutro' : b ? 'ok' : 'mal');

  return (
    <div className="space-y-5">
      <Grupo titulo="Barra, materiales y recubrimiento (D.4.2.5)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Barra de refuerzo" valor={barraId} onCambio={setBarraId} opciones={OPCIONES_BARRA} />
          <Selector etiqueta="Superficie de la barra" valor={tipo} onCambio={(v) => setTipo(v === 'lisa' ? 'lisa' : 'corrugada')} opciones={OPCIONES_TIPO} />
          <Campo etiqueta="fy del acero" unidad="MPa" valor={fy.txt} onCambio={fy.setTxt} min={200} max={600} />
          <Campo etiqueta="Resistencia de la mampostería f′m" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={1} max={60} />
          <Campo etiqueta="Recubrimiento K" unidad="mm" valor={K.txt} onCambio={K.setTxt} min={1} ayuda="Desde el extremo exterior de la unidad (se limita a 5 db)" />
          <Campo etiqueta="Espaciamiento libre entre empalmes (opcional)" unidad="mm" valor={sLibre.txt} onCambio={setSLibreTxt} ayuda="Si se da, K no puede exceder este valor" />
        </div>
      </Grupo>

      {!desarrolloOk && <Aviso tipo="error">Revisa fy, f′m y K: deben ser números positivos.</Aviso>}

      {des && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="K efectivo" unidad="mm" valor={fmt(des.r.K, 1)} nota={des.r.limitadoPor === '5db' ? `Limitado a 5 db = ${fmt(5 * db, 1)} mm` : des.r.limitadoPor === 'espaciamiento' ? 'Limitado por el espaciamiento libre' : 'Dato'} />
            <Valor etiqueta="ℓd de la ecuación (corrugada)" unidad="mm" valor={fmt(des.r.ldEcuacion, 0)} nota={`1.5 db² fy / (K √f′m), √f′m = ${fmt(des.r.raizFm, 3)}`} />
            <Valor destacado etiqueta="Longitud de desarrollo ℓd" unidad="mm" valor={fmt(des.r.ld, 0)} nota={`${fmt(des.r.relacionDb, 1)} db${des.r.gobiernaMinimo ? ' · gobierna el mínimo de 300 mm' : ''}${tipo === 'lisa' ? ' · barra lisa ×2' : ''}`} />
            <Valor etiqueta="Longitud de empalme por traslapo" unidad="mm" valor={fmt(des.emp, 0)} nota="Igual a ℓd (D.4.2.5.3)" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Separación transversal máx. (traslapo sin contacto)" unidad="mm" valor={fmt(des.sep.valor, 0)} nota={des.sep.gobierna === '200mm' ? 'Gobierna el tope de 200 mm' : 'Gobierna ℓ/5'} />
            <Valor etiqueta="Empalme mecánico o soldado ≥ 1.25 fy" unidad="MPa" valor={fmt(des.mec, 0)} nota="Soldadura según NTC 4040" />
            <Valor etiqueta="Recubrimiento mínimo en celda" unidad="mm" valor={fmt(des.cob, 0)} nota={expuesta === 'si' ? (db > 16 ? 'Expuesta, barra mayor que N° 5 / 16M' : 'Expuesta, barra ≤ N° 5 / 16M') : 'No expuesta'} />
            <Valor
              etiqueta="Diámetro mínimo de doblamiento"
              unidad="mm"
              valor={des.dob.diametro === null ? '—' : fmt(des.dob.diametro, 1)}
              nota={des.dob.factorDb === null ? (des.dob.aviso ?? 'Fuera de la tabla') : `${des.dob.factorDb} db (Tabla D.4.2-1)`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Valor etiqueta="Gancho 180°: extensión recta" unidad="mm" valor={fmt(des.g180.extension, 1)} nota={des.g180.gobiernaMinimoAbsoluto ? '4 db < 64 mm: gobierna 64 mm' : '4 db (≥ 64 mm)'} />
            <Valor etiqueta="Gancho 90°: extensión recta" unidad="mm" valor={fmt(des.g90.extension, 1)} nota="12 db" />
            <Valor etiqueta="Gancho 135°: extensión recta" unidad="mm" valor={fmt(des.g135.extension, 1)} nota="6 db" />
          </div>
          {des.dob.aviso && des.dob.factorDb !== null && <Aviso tipo="atencion">{des.dob.aviso}</Aviso>}
          {des.r.limitadoPor === 'espaciamiento' && <Aviso tipo="atencion">K quedó limitado por el espaciamiento libre entre empalmes adyacentes: separar más los empalmes reduce ℓd.</Aviso>}

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Longitud de desarrollo frente a f′m con la barra y K actuales (mm)</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fm" type="number" domain={[5, 30]} label={{ value: "f′m (MPa)", position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} label={{ value: 'mm', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `f′m = ${Number(pl?.[0]?.payload?.fm ?? 0).toFixed(0)} MPa`} formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(0)} mm</span>} />} />
                <Line name="ℓd (Ec. D.4.2-1)" dataKey="ld" stroke="var(--color-ld)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line name="Mínimo 300 mm" dataKey="minimo" stroke="var(--color-minimo)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
                {fm.n >= 5 && fm.n <= 30 && <ReferenceLine x={fm.n} stroke="var(--foreground)" strokeDasharray="3 3" />}
                {fm.n >= 5 && fm.n <= 30 && <ReferenceDot x={fm.n} y={des.r.ld} r={5} fill="var(--color-ld)" stroke="var(--background)" />}
              </LineChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">ℓd decrece con √f′m y es inversamente proporcional a K: por eso la norma limita K a 5 db (no se «premia» un recubrimiento muy grande).</p>
          </div>
        </>
      )}

      <Grupo titulo="Celda, muro e inyección (D.4.2.2, D.4.2.3 y Tabla D.4.6-1)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Espesor nominal del muro" unidad="mm" valor={espesor.txt} onCambio={espesor.setTxt} min={60} />
          <Campo etiqueta="Dimensión libre de la celda a" unidad="mm" valor={celdaA.txt} onCambio={celdaA.setTxt} min={20} ayuda="Espacio libre entre rebabas internas" />
          <Campo etiqueta="Dimensión libre de la celda b" unidad="mm" valor={celdaB.txt} onCambio={celdaB.setTxt} min={20} />
          <Selector etiqueta="Tipo de mortero de relleno" valor={mortero} onCambio={(v) => setMortero(v === 'grueso' ? 'grueso' : 'fino')} opciones={OPCIONES_MORTERO} />
          <Campo etiqueta="Altura del muro a inyectar (opcional)" unidad="m" valor={alturaMuro.txt} onCambio={alturaMuro.setTxt} min={0.1} />
          <Selector etiqueta="Exposición (recubrimiento)" valor={expuesta} onCambio={(v) => setExpuesta(v === 'si' ? 'si' : 'no')} opciones={OPCIONES_EXPOSICION} />
        </div>
        <p className="text-xs text-muted-foreground">La barra elegida arriba ({barra.designacion}, db = {db} mm) se verifica en esta celda.</p>
      </Grupo>

      {!celdaOk && <Aviso tipo="error">Revisa el espesor y las dimensiones de la celda: deben ser números positivos.</Aviso>}

      {celda && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor
              etiqueta="Diámetro máximo permitido"
              unidad="mm"
              valor={fmt(celda.v.dbMax, 1)}
              nota={`Por muro ${fmt(celda.v.dbMaxMuro, 1)} mm · por celda (1/3) ${fmt(celda.v.dbMaxCelda, 1)} mm`}
              estado={ok(celda.v.cumpleMaximoMuro && celda.v.cumpleMaximoCelda && celda.v.cumpleMinimo)}
            />
            <Valor etiqueta="Barras verticales por celda (máx.)" valor={String(celda.v.barrasPorCeldaMax)} nota={celda.v.barrasPorCeldaMax === 2 ? 'Celda > 140 mm y db ≤ 16 mm' : 'Una barra por celda'} />
            <Valor
              etiqueta="Mortero entre barra y unidad"
              unidad="mm"
              valor={fmt(celda.v.morteroAlrededor, 1)}
              nota={`Mínimo ${fmt(celda.v.morteroMinimo, 1)} mm (barra centrada, autoría del proyecto)`}
              estado={ok(celda.v.cumpleMortero)}
            />
            <Valor destacado etiqueta="Verificación de la barra en la celda" valor={celda.v.cumple ? 'Cumple' : 'No cumple'} estado={ok(celda.v.cumple)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Valor
              destacado
              etiqueta="Altura máxima de inyección"
              unidad="m"
              valor={celda.hMax > 0 ? fmt(celda.hMax, 1) : '—'}
              nota={celda.hMax > 0 ? `Celda ${fmt(celda.menor, 0)} × ${fmt(Math.max(celdaA.n, celdaB.n), 0)} mm, mortero ${mortero}` : 'La celda no alcanza la dimensión mínima de la Tabla D.4.6-1 para este mortero'}
              estado={celda.hMax > 0 ? 'ok' : 'mal'}
            />
            <Valor
              etiqueta="Etapas de inyección del muro"
              valor={celda.hMax > 0 && celda.etapas > 0 ? String(celda.etapas) : '—'}
              nota={celda.hMax > 0 && celda.etapas > 0 ? `${fmt(alturaMuro.n, 2)} m / ${fmt(celda.hMax, 1)} m (autoría del proyecto)` : 'Indica la altura del muro'}
            />
            <Valor
              etiqueta="Celda mínima para la altura del muro"
              valor={celda.exigencia ? `${celda.exigencia.celda[0]} × ${celda.exigencia.celda[1]} mm` : '—'}
              nota={celda.exigencia ? `Con mortero ${mortero}, de una sola vez` : 'La tabla no admite esa altura con este mortero (máx. 3.0 m)'}
            />
          </div>
          {celda.hMax > 0 && (
            <Aviso tipo="nota">
              Las alturas de la tabla se inyectan con intervalos máximos de una hora (D.4.6.3.1c); si se suspende por más de una hora, se inicia un nuevo vaciado con ventanas de inspección (D.4.6.3.2). Recubrimiento mínimo de la barra en la celda:{' '}
              {recubrimientoMinimoCelda(db, expuesta === 'si')} mm.
            </Aviso>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <caption className="p-2 text-left text-xs text-muted-foreground">Tabla D.4.6-1 (D-28): la fila que cumple la celda dada se resalta.</caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Fino</th>
                  <th className="px-3 py-2">Grueso</th>
                  <th className="px-3 py-2">Celda mín. (mm)</th>
                  <th className="px-3 py-2">Cavidad mín. (mm)</th>
                </tr>
              </thead>
              <tbody>
                {TABLA_D461_INYECCION.map((f) => {
                  const cumple = Math.min(celdaA.n, celdaB.n) >= f.celda[0] && Math.max(celdaA.n, celdaB.n) >= f.celda[1];
                  const alt = mortero === 'fino' ? f.fino : f.grueso;
                  const resaltada = cumple && alt !== null && alt === celda.hMax;
                  return (
                    <tr key={f.celda.join('x')} className={resaltada ? 'bg-primary/10 font-medium' : ''}>
                      <td className="px-3 py-1.5 font-mono">{f.fino === null ? '—' : `${f.fino.toFixed(1)} m`}</td>
                      <td className="px-3 py-1.5 font-mono">{f.grueso === null ? '—' : `${f.grueso.toFixed(1)} m`}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {f.celda[0]} × {f.celda[1]}
                      </td>
                      <td className="px-3 py-1.5 font-mono">{f.cavidad}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PieCalc>
        Ecuación D.4.2-1 con db y K en mm y fy y f′m en MPa. Para barra lisa se duplica ℓd (con el mínimo de 300 mm ya aplicado: interpretación del proyecto). La verificación de la barra
        centrada en la celda y el número de etapas son criterios del proyecto, no texto de la norma.
      </PieCalc>
    </div>
  );
}
