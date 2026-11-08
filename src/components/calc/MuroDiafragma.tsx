import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ESPESOR_MIN_DIAFRAGMA_MM, PHI_CORTANTE_DIAFRAGMA, R0_MAX_DIAFRAGMA, TABLA_D1111, type TipoUnidadDiafragma } from '@/data/muroDiafragma';
import { verificarMuroDiafragma, zonaCortanteMiembro } from '@/lib/nsr10/muroDiafragma';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';

const config = {
  cortante: { label: 'φ vm Am (Ec. D.11.4-1)', color: 'var(--chart-1)' },
  aplastamiento: { label: 'Aplastamiento diagonal (componente horizontal)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const OPC_TIPO = TABLA_D1111.map((f) => ({ value: f.clave, label: `${f.unidades} — vm = ${f.vm.toFixed(2)} MPa` }));

const estado = (ok: boolean) => (ok ? 'ok' : 'mal');

export default function MuroDiafragma() {
  const [tipo, setTipo] = useState<TipoUnidadDiafragma>('maciza');
  const L = useNum(3600);
  const h = useNum(2700);
  const t = useNum(120);
  const frac = useNum(1);
  const fm = useNum(5);
  const vu = useNum(40);
  const [vmTxt, setVmTxt] = useState('');
  const vmEns = { txt: vmTxt, setTxt: setVmTxt, n: parseNum(vmTxt) };
  const [r0Txt, setR0Txt] = useState('2');
  const r0 = { txt: r0Txt, setTxt: setR0Txt, n: parseNum(r0Txt) };
  const lMiembro = useNum(3600);

  const ok = [L.n, h.n, t.n, fm.n].every((x) => Number.isFinite(x) && x > 0) && Number.isFinite(frac.n) && frac.n > 0 && frac.n <= 1 && Number.isFinite(vu.n) && vu.n >= 0;

  const r = useMemo(() => {
    if (!ok) return null;
    return verificarMuroDiafragma({
      tipo,
      L: L.n,
      h: h.n,
      t: t.n,
      fraccionNeta: frac.n,
      fm: fm.n,
      Vu: vu.n,
      vmEnsayado: Number.isFinite(vmEns.n) && vmEns.n > 0 ? vmEns.n : undefined,
      R0: Number.isFinite(r0.n) && r0.n > 0 ? r0.n : undefined,
    });
  }, [ok, tipo, L.n, h.n, t.n, frac.n, fm.n, vu.n, vmEns.n, r0.n]);

  const datos = useMemo(() => {
    if (!ok) return [];
    const pts: { L: number; cortante: number; aplastamiento: number }[] = [];
    const lmax = Math.max(2 * L.n, 4000);
    const paso = lmax / 40;
    for (let x = paso; x <= lmax + 1e-6; x += paso) {
      const rr = verificarMuroDiafragma({
        tipo,
        L: x,
        h: h.n,
        t: t.n,
        fraccionNeta: frac.n,
        fm: fm.n,
        Vu: 0,
        vmEnsayado: Number.isFinite(vmEns.n) && vmEns.n > 0 ? vmEns.n : undefined,
      });
      pts.push({ L: Math.round(x), cortante: rr.cortante.Vr, aplastamiento: rr.aplastamiento.Vh });
    }
    return pts;
  }, [ok, tipo, h.n, t.n, frac.n, fm.n, vmEns.n, L.n]);

  const vuOk = Number.isFinite(vu.n) && vu.n > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Muro diafragma">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Unidades de mampostería (Tabla D.11.1-1)" valor={tipo} onCambio={(v) => setTipo((TABLA_D1111.find((f) => f.clave === v)?.clave ?? 'maciza') as TipoUnidadDiafragma)} opciones={OPC_TIPO} className="sm:col-span-2" />
            <Campo etiqueta="Longitud ℓ del panel" unidad="mm" valor={L.txt} onCambio={L.setTxt} min={500} ayuda="Entre columnas" />
            <Campo etiqueta="Altura h del panel" unidad="mm" valor={h.txt} onCambio={h.setTxt} min={500} ayuda="Entre vigas" />
            <Campo etiqueta="Espesor nominal t" unidad="mm" valor={t.txt} onCambio={t.setTxt} min={60} ayuda={`Mínimo ${ESPESOR_MIN_DIAFRAGMA_MM} mm (D.11.1.4)`} />
            <Campo etiqueta="Fracción neta de la sección" valor={frac.txt} onCambio={frac.setTxt} min={0.1} max={1} paso={0.05} ayuda="1.0 = maciza; menor si hay perforaciones" />
            <Campo etiqueta="f′m de la mampostería" unidad="MPa" valor={fm.txt} onCambio={fm.setTxt} min={0.5} max={40} ayuda="Para el aplastamiento diagonal" />
          </div>
        </Grupo>
        <Grupo titulo="Solicitación y opciones">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Cortante horizontal Vu en el muro" unidad="kN" valor={vu.txt} onCambio={vu.setTxt} min={0} />
            <Campo etiqueta="vm de ensayos (opcional)" unidad="MPa" valor={vmEns.txt} onCambio={vmEns.setTxt} min={0} ayuda="Solo si hay ensayos estadísticamente representativos" />
            <Campo etiqueta="R0 del sistema (opcional)" valor={r0.txt} onCambio={r0.setTxt} min={0} paso={0.5} ayuda={`R0 ≤ ${R0_MAX_DIAFRAGMA} (D.11.2.2)`} />
            <Campo etiqueta="Longitud de viga o columna (opcional)" unidad="mm" valor={lMiembro.txt} onCambio={lMiembro.setTxt} min={0} ayuda="Para la zona del 25 % de D.11.4.3" />
          </div>
        </Grupo>
      </div>

      {!ok && <Aviso tipo="error">Revisa los datos: ℓ, h, t y f′m deben ser positivos, la fracción neta debe estar entre 0 y 1 y Vu no puede ser negativo.</Aviso>}

      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Espesor t" unidad="mm" valor={fmt(t.n, 0)} estado={estado(r.espesorCumple)} nota={r.espesorCumple ? `≥ ${ESPESOR_MIN_DIAFRAGMA_MM} mm (D.11.1.4)` : `menor que ${ESPESOR_MIN_DIAFRAGMA_MM} mm (D.11.1.4)`} />
            <Valor etiqueta="Am (área neta horizontal)" unidad="mm²" valor={fmt(r.Am, 0)} nota="ℓ · t · fracción neta" />
            <Valor etiqueta="vm adoptado" unidad="MPa" valor={fmt(r.cortante.vm, 2)} nota={r.cortante.usaEnsayo ? (r.cortante.superaTabla ? `Ensayo; supera la tabla (${fmt(r.cortante.vmTabla, 2)})` : 'Valor de ensayo') : 'Tabla D.11.1-1'} estado={r.cortante.superaTabla ? 'mal' : 'neutro'} />
            <Valor etiqueta="φ" valor={fmt(PHI_CORTANTE_DIAFRAGMA, 2)} nota="Ec. D.11.4-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor destacado etiqueta="φ vm Am" unidad="kN" valor={fmt(r.cortante.Vr, 1)} estado={vuOk ? estado(r.cortante.cumple) : 'neutro'} nota={vuOk ? `Vu / φ vm Am = ${fmt(r.cortante.razon, 3)}` : 'Cortante máximo D.11.4.2'} />
            <Valor etiqueta="Diagonal del muro" unidad="mm" valor={fmt(r.aplastamiento.diagonal, 0)} nota={`θ = ${fmt(r.aplastamiento.anguloGrados, 1)}°`} />
            <Valor etiqueta="Ae diagonal = diagonal/5 · t" unidad="mm²" valor={fmt(r.aplastamiento.Ae, 0)} nota="D.11.4.1 (b); × fracción neta (proyecto)" />
            <Valor etiqueta="h′/t (h′ = diagonal)" valor={fmt(r.aplastamiento.esbeltez, 1)} estado={r.aplastamiento.esbeltezAdmisible ? 'neutro' : 'mal'} nota={r.aplastamiento.esbeltezAdmisible ? 'h′/t ≤ 25' : 'excede 25 (D.5.4.3.1)'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Re" valor={fmt(r.aplastamiento.Re, 4)} nota="Ec. D.5.5-2" />
            <Valor etiqueta="φPn de la biela (φ = 0.60)" unidad="kN" valor={fmt(r.aplastamiento.phiPn, 1)} nota="Po = 0.80 f′m Ae; Pn = 0.80 Po Re" />
            <Valor destacado etiqueta="Resistencia horizontal por aplastamiento" unidad="kN" valor={fmt(r.aplastamiento.Vh, 1)} estado={vuOk ? estado(r.aplastamiento.cumple) : 'neutro'} nota={vuOk ? `Vu / Vh = ${fmt(r.aplastamiento.razon, 3)} · φPn cos θ (proyecto)` : 'φPn · cos θ (autoría del proyecto)'} />
            <Valor destacado etiqueta="Resistencia del muro (menor)" unidad="kN" valor={fmt(r.Vmax, 1)} nota={r.gobierna === 'cortante' ? 'Gobierna el cortante D.11.4-1' : 'Gobierna el aplastamiento diagonal'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Valor etiqueta="Cortante mínimo en cada viga y columna" unidad="kN" valor={fmt(r.Vminimo, 1)} nota="Vu / 4 (D.11.4.3)" />
            <Valor etiqueta="Zona que lo resiste" unidad="mm" valor={Number.isFinite(lMiembro.n) && lMiembro.n > 0 ? fmt(zonaCortanteMiembro(lMiembro.n), 0) : '—'} nota="25 % de la longitud del miembro" />
            <Valor etiqueta="R0" valor={r.r0Cumple === null ? '—' : fmt(r0.n, 1)} estado={r.r0Cumple === null ? 'neutro' : estado(r.r0Cumple)} nota={`R0 ≤ ${R0_MAX_DIAFRAGMA} (D.11.2.2)`} />
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-1 px-1 text-sm font-medium">Resistencia horizontal frente a la longitud del panel (h, t y f′m constantes)</p>
            <ChartContainer config={config} className="aspect-[16/8] w-full">
              <LineChart data={datos} margin={{ left: 4, right: 16, top: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="L" type="number" domain={['dataMin', 'dataMax']} label={{ value: 'longitud ℓ (mm)', position: 'insideBottom', offset: -2, fontSize: 12 }} height={40} />
                <YAxis label={{ value: 'kN', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, pl) => `ℓ = ${Number(pl?.[0]?.payload?.L ?? 0)} mm`} formatter={(val, name) => <span className="font-mono">{String(name)}: {Number(val).toFixed(1)} kN</span>} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line name="φ vm Am (Ec. D.11.4-1)" dataKey="cortante" stroke="var(--color-cortante)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="Aplastamiento diagonal (componente horizontal)" dataKey="aplastamiento" stroke="var(--color-aplastamiento)" strokeWidth={2} dot={false} isAnimationActive={false} />
                {vuOk && <ReferenceLine y={vu.n} stroke="var(--muted-foreground)" strokeDasharray="5 4" label={{ value: 'Vu', position: 'right', fontSize: 11 }} />}
                <ReferenceDot x={Math.round(Math.min(Math.max(L.n, datos[0]?.L ?? 0), datos[datos.length - 1]?.L ?? L.n))} y={r.Vmax} r={5} fill="var(--foreground)" stroke="var(--background)" />
              </LineChart>
            </ChartContainer>
            <p className="mt-1 px-1 text-xs text-muted-foreground">El punto es tu muro (la menor de las dos resistencias). La curva de aplastamiento es aporte del proyecto (esquema del proyecto).</p>
          </div>

          <div className="space-y-2">
            {!r.espesorCumple && <Aviso tipo="error">El espesor nominal debe ser al menos 120 mm (D.11.1.4).</Aviso>}
            {r.cortante.superaTabla && <Aviso tipo="atencion">El vm ingresado supera la Tabla D.11.1-1: solo es admisible en estructuras existentes con ensayos en cantidad representativa estadísticamente (D.11.4.2).</Aviso>}
            {vuOk && !r.cortante.cumple && <Aviso tipo="error">Vu supera φ vm Am (Ec. D.11.4-1).</Aviso>}
            {vuOk && !r.aplastamiento.cumple && <Aviso tipo="error">Vu supera la resistencia horizontal por aplastamiento diagonal (D.11.4.1 b).</Aviso>}
            {!r.aplastamiento.esbeltezAdmisible && <Aviso tipo="atencion">h′/t con h′ igual a la diagonal supera 25 (D.5.4.3.1); D.11 no da una excepción expresa para los muros diafragma: verifica con la fuente oficial.</Aviso>}
            {r.r0Cumple === false && <Aviso tipo="error">R0 no puede ser mayor que 2.0 con muros diafragma (D.11.2.2).</Aviso>}
            {vuOk && r.cumple && <Aviso tipo="nota">Se cumplen el cortante máximo y el aplastamiento diagonal con Vu = {fmt(vu.n, 1)} kN.</Aviso>}
          </div>
        </>
      )}

      <PieCalc>
        Solo para evaluación o modificación de edificaciones existentes (D.11.2.1). La norma fija el cortante máximo φ vm Am y el área y la altura efectiva del aplastamiento diagonal; la conversión de φPn de la biela
        a fuerza horizontal (φPn cos θ), la lectura de «dimensión diagonal» como √(ℓ² + h²) y la fracción neta de unidades perforadas (que reduce Am y el área de la biela) son aportes del proyecto. No sustituye un modelo analítico con sustento experimental (D.11.1.2).
      </PieCalc>
    </div>
  );
}
