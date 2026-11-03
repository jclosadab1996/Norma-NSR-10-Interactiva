import { useState } from 'react';
import { TABLA_CT_ALFA, type SistemaPeriodo } from '@/data/tablas';
import {
  coeficienteCu,
  coeficienteCw,
  ctMuros,
  periodoAproximado,
  periodoAproximadoCtAlpha,
  periodoPorPisos,
} from '@/lib/nsr10';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';

const OPCIONES = (Object.keys(TABLA_CT_ALFA) as SistemaPeriodo[]).map((k) => ({
  value: k,
  label: `${TABLA_CT_ALFA[k].descripcion.slice(0, 70)}${TABLA_CT_ALFA[k].descripcion.length > 70 ? '…' : ''} (Ct ${TABLA_CT_ALFA[k].ct}, α ${TABLA_CT_ALFA[k].alpha})`,
}));

export default function PeriodoFundamental() {
  const hn = useNum(30);
  const av = useNum(0.2);
  const fv = useNum(2.0);
  const [sistema, setSistema] = useState<SistemaPeriodo>('porticos-concreto');
  const n = useNum(10);
  const hp = useNum(3);
  const ab = useNum(400);
  const [muros, setMuros] = useState([{ awi: '2', hwi: '30', lwi: '4' }, { awi: '2', hwi: '30', lwi: '4' }]);

  const okHn = Number.isFinite(hn.n) && hn.n > 0;
  const ta = okHn ? periodoAproximado(sistema, hn.n) : NaN;
  const cu = Number.isFinite(av.n) && Number.isFinite(fv.n) ? coeficienteCu(av.n, fv.n) : NaN;

  const mu = muros.map((m) => ({ awi: parseNum(m.awi), hwi: parseNum(m.hwi), lwi: parseNum(m.lwi) }));
  const murosOk = mu.every((m) => m.awi > 0 && m.hwi > 0 && m.lwi > 0) && ab.n > 0 && okHn;
  const cw = murosOk ? coeficienteCw(mu, ab.n, hn.n) : NaN;
  const ctw = Number.isFinite(cw) && cw > 0 ? ctMuros(cw) : null;
  const taMuros = ctw && okHn ? periodoAproximadoCtAlpha(ctw.ct, ctw.alpha, hn.n) : NaN;

  const pisosOk = Number.isFinite(n.n) && n.n >= 1;
  const aplica05 = pisosOk && n.n <= 12 && hp.n <= 3 && (sistema === 'porticos-concreto' || sistema === 'porticos-acero');

  return (
    <div className="space-y-5">
      <Grupo titulo="Datos generales">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Altura hn (desde la base hasta el piso más alto)" unidad="m" valor={hn.txt} onCambio={hn.setTxt} min={1} max={300} />
          <Campo etiqueta="Av" valor={av.txt} onCambio={av.setTxt} min={0.05} max={0.5} paso={0.05} />
          <Campo etiqueta="Fv" valor={fv.txt} onCambio={fv.setTxt} min={0.8} max={3.5} paso={0.1} ayuda="Se obtiene de A.2.4 (ver calculadora de efectos locales)" />
        </div>
      </Grupo>

      <Tabs defaultValue="ct">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ct">Ta = Ct·hn^α</TabsTrigger>
          <TabsTrigger value="muros">Muros (Cw)</TabsTrigger>
          <TabsTrigger value="pisos">Ta = 0.1·N</TabsTrigger>
        </TabsList>

        <TabsContent value="ct" className="space-y-3 pt-3">
          <Selector etiqueta="Sistema estructural (Tabla A.4.2-1)" valor={sistema} onCambio={(v) => setSistema(v as SistemaPeriodo)} opciones={OPCIONES} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Valor etiqueta="Ct · α" valor={`${TABLA_CT_ALFA[sistema].ct} · ${TABLA_CT_ALFA[sistema].alpha}`} />
            <Valor destacado etiqueta="Ta" unidad="s" valor={fmt(ta, 3)} nota="A.4.2-3" />
            <Valor etiqueta="Cu · Ta (límite superior de T)" unidad="s" valor={fmt(cu * ta, 3)} nota={`Cu = ${fmt(cu, 3)} (A.4.2-2, mín. 1.2)`} />
          </div>
        </TabsContent>

        <TabsContent value="muros" className="space-y-3 pt-3">
          <p className="text-sm text-muted-foreground">
            Alternativa para estructuras con muros estructurales de concreto reforzado o mampostería: Ct = 0.0062/√Cw, α = 1.00 (Tabla A.4.2-1 y ecuación A.4.2-4).
          </p>
          <Campo etiqueta="Área de la base AB" unidad="m²" valor={ab.txt} onCambio={ab.setTxt} min={1} className="max-w-xs" />
          {muros.map((m, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Campo etiqueta={`Awi (muro ${i + 1})`} unidad="m²" valor={m.awi} onCambio={(v) => setMuros(muros.map((x, k) => (k === i ? { ...x, awi: v } : x)))} />
              <Campo etiqueta="hwi" unidad="m" valor={m.hwi} onCambio={(v) => setMuros(muros.map((x, k) => (k === i ? { ...x, hwi: v } : x)))} />
              <Campo etiqueta="ℓwi" unidad="m" valor={m.lwi} onCambio={(v) => setMuros(muros.map((x, k) => (k === i ? { ...x, lwi: v } : x)))} />
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-accent" onClick={() => setMuros([...muros, { awi: '2', hwi: hn.txt, lwi: '4' }])}>+ Muro</button>
            {muros.length > 1 && <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-accent" onClick={() => setMuros(muros.slice(0, -1))}>− Quitar</button>}
          </div>
          {ctw ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <Valor etiqueta="Cw" valor={fmt(cw, 4)} nota="A.4.2-4" />
              <Valor etiqueta="Ct" valor={fmt(ctw.ct, 4)} nota="0.0062/√Cw" />
              <Valor destacado etiqueta="Ta" unidad="s" valor={fmt(taMuros, 3)} />
              <Valor etiqueta="Cu · Ta" unidad="s" valor={fmt(cu * taMuros, 3)} />
            </div>
          ) : (
            <Aviso tipo="error">Completa Awi, hwi, ℓwi, AB y hn con valores positivos.</Aviso>
          )}
        </TabsContent>

        <TabsContent value="pisos" className="space-y-3 pt-3">
          <p className="text-sm text-muted-foreground">
            Solo para edificaciones de 12 pisos o menos, con altura de piso hp ≤ 3 m y sistema de pórticos resistentes a momentos de concreto reforzado o acero (A.4.2-5).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Número de pisos N" valor={n.txt} onCambio={n.setTxt} min={1} max={12} />
            <Campo etiqueta="Altura de piso hp" unidad="m" valor={hp.txt} onCambio={hp.setTxt} min={2} max={3} paso={0.1} />
            <Valor destacado etiqueta="Ta = 0.1·N" unidad="s" valor={fmt(pisosOk ? periodoPorPisos(n.n) : NaN, 2)} />
          </div>
          {!aplica05 && <Aviso tipo="atencion">Con los datos actuales (N, hp o el sistema elegido en la pestaña Ta = Ct·hn^α) la ecuación A.4.2-5 podría no ser aplicable.</Aviso>}
        </TabsContent>
      </Tabs>
      <PieCalc>Después de dimensionar, T debe recalcularse con A.4.2-1 o análisis modal y converger dentro de ±10 % (A.4.2.3).</PieCalc>
    </div>
  );
}
