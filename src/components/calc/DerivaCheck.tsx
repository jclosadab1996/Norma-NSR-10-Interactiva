import { useState } from 'react';
import { limiteDeriva, limiteDerivaUmbralDano, verificarDeriva, type TipoLimiteDeriva } from '@/lib/nsr10';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';
import Selector from './Selector';
import { cn } from '@/lib/utils';

export default function DerivaCheck() {
  const hp = useNum(3);
  const [tipo, setTipo] = useState<TipoLimiteDeriva>('general');
  const [criterio, setCriterio] = useState<'diseno' | 'umbral'>('diseno');
  const [fisurada, setFisurada] = useState(false);
  const [desp, setDesp] = useState<string[]>(['12', '27', '40', '50', '57']); // mm

  const limite = criterio === 'diseno' ? limiteDeriva(tipo) : limiteDerivaUmbralDano(tipo);
  const factor = fisurada ? 0.7 : 1;
  const hpMm = hp.n * 1000;

  const filas = desp.map((d, i) => {
    const sup = parseNum(d);
    const inf = i === 0 ? 0 : parseNum(desp[i - 1]);
    const ok = Number.isFinite(sup) && Number.isFinite(inf) && hpMm > 0;
    return { piso: i + 1, sup, inf, v: ok ? verificarDeriva(sup, inf, hpMm, limite, factor) : null };
  });
  const critica = filas.reduce<(typeof filas)[number] | null>((m, f) => (f.v && (!m || (m.v && f.v.razon > m.v.razon)) ? f : m), null);
  const todosOk = filas.every((f) => f.v?.cumple);

  return (
    <div className="space-y-5">
      <Grupo titulo="Criterio de verificación">
        <div className="grid gap-3 sm:grid-cols-3">
          <Selector
            etiqueta="Verificación"
            valor={criterio}
            onCambio={(v) => setCriterio(v as 'diseno' | 'umbral')}
            opciones={[
              { value: 'diseno', label: 'Sismo de diseño (Tabla A.6.4-1)' },
              { value: 'umbral', label: 'Umbral de daño (Tabla A.12.5-1)' },
            ]}
          />
          <Selector
            etiqueta="Tipo de estructura"
            valor={tipo}
            onCambio={(v) => setTipo(v as TipoLimiteDeriva)}
            opciones={[
              { value: 'general', label: 'Concreto, acero, madera o mampostería (flexión)' },
              { value: 'mamposteriaCortante', label: 'Mampostería poco esbelta / falla por cortante' },
            ]}
          />
          <Campo etiqueta="Altura de piso hpi" unidad="m" valor={hp.txt} onCambio={hp.setTxt} min={2} max={6} paso={0.1} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fisurada} onChange={(e) => setFisurada(e.target.checked)} />
          Análisis con secciones fisuradas (concreto, mampostería o mixtas): derivas × 0.7 (A.6.4.1.1)
        </label>
        <p className="text-sm">Límite aplicado: <strong className="font-mono">{(limite * 100).toFixed(2)} % de hpi</strong></p>
      </Grupo>

      <Grupo titulo="Desplazamientos horizontales totales δ de cada nivel (mm, medidos desde la base)">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {desp.map((d, i) => (
            <Campo key={i} etiqueta={`δ nivel ${i + 1}`} unidad="mm" valor={d} onCambio={(v) => setDesp(desp.map((x, k) => (k === i ? v : x)))} />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-accent" onClick={() => setDesp([...desp, String((parseNum(desp[desp.length - 1]) || 0) + 6)])}>+ Piso</button>
          {desp.length > 1 && <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-accent" onClick={() => setDesp(desp.slice(0, -1))}>− Quitar</button>}
        </div>
      </Grupo>

      {critica?.v && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Valor etiqueta="Piso crítico" valor={String(critica.piso)} />
          <Valor etiqueta="Deriva máxima" valor={`${(critica.v.razon * 100).toFixed(3)} %`} nota={`de hpi · límite ${(limite * 100).toFixed(2)} %`} />
          <Valor etiqueta="Resultado" valor={todosOk ? 'Cumple' : 'No cumple'} estado={todosOk ? 'ok' : 'mal'} />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              {['Piso', 'δi (mm)', 'δi−1 (mm)', 'Δi (mm)', 'Δi / hpi', 'Uso del límite', ''].map((h) => (
                <th key={h} className="px-2 py-1.5 text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {filas.map((f) => (
              <tr key={f.piso} className="border-t">
                <td className="px-2 py-1 text-left">{f.piso}</td>
                <td className="px-2 py-1 text-right">{Number.isFinite(f.sup) ? fmt(f.sup, 1) : '—'}</td>
                <td className="px-2 py-1 text-right">{Number.isFinite(f.inf) ? fmt(f.inf, 1) : '—'}</td>
                <td className="px-2 py-1 text-right">{f.v ? fmt(f.v.deriva, 2) : '—'}</td>
                <td className="px-2 py-1 text-right">{f.v ? `${(f.v.razon * 100).toFixed(3)} %` : '—'}</td>
                <td className="px-2 py-1">
                  {f.v && (
                    <div className="ml-auto h-2 w-24 overflow-hidden rounded bg-muted" aria-hidden="true">
                      <div className={cn('h-full', f.v.cumple ? 'bg-ok' : 'bg-danger')} style={{ width: `${Math.min(100, f.v.uso * 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className={cn('px-2 py-1 text-right font-sans text-xs font-semibold', f.v?.cumple ? 'text-ok' : 'text-danger')}>{f.v ? (f.v.cumple ? 'Cumple' : 'Excede') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Aviso>Ingresa los desplazamientos totales δ (incluida la torsión y, cuando aplique, P-Δ) obtenidos del análisis según A.6.2; la deriva es la diferencia entre pisos consecutivos (A.6.3).</Aviso>
      <PieCalc>Edificaciones de un piso no tienen límite de deriva si los elementos no estructurales acomodan el desplazamiento (A.6.4.1.5).</PieCalc>
    </div>
  );
}
