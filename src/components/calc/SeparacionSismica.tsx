import { useState } from 'react';
import type { ColindanciaSeparacion } from '@/data/tablas';
import { coeficienteSeparacion } from '@/lib/nsr10';
import { Aviso, Campo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const COLINDANCIAS = [
  { value: 'coinciden-losas', label: 'Hay vecino y las losas de entrepiso coinciden' },
  { value: 'no-coinciden-losas', label: 'Hay vecino y las losas NO coinciden' },
  { value: 'sin-vecino-o-separado', label: 'No hay vecino (o ya dejó la separación requerida)' },
] as const;

export default function SeparacionSismica() {
  const pisos = useNum(8);
  const hp = useNum(3);
  const [col, setCol] = useState<ColindanciaSeparacion>('no-coinciden-losas');
  const [zonaBaja, setZonaBaja] = useState(false);

  const n = Math.round(pisos.n);
  const ok = Number.isFinite(n) && n >= 1 && n <= 60 && hp.n > 0;
  const coef = ok ? coeficienteSeparacion(n, col) : NaN;
  const filas = ok ? Array.from({ length: n }, (_, i) => ({ piso: i + 1, h: (i + 1) * hp.n })) : [];
  const efectivo = zonaBaja ? 0 : coef;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Campo etiqueta="Pisos aéreos en la colindancia" valor={pisos.txt} onCambio={pisos.setTxt} min={1} max={60} />
        <Campo etiqueta="Altura de piso" unidad="m" valor={hp.txt} onCambio={hp.setTxt} min={2} max={6} paso={0.1} />
        <Selector className="md:col-span-2" etiqueta="Tipo de colindancia (Tabla A.6.5-1)" valor={col} onCambio={(v) => setCol(v as ColindanciaSeparacion)} opciones={COLINDANCIAS} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={zonaBaja} onChange={(e) => setZonaBaja(e.target.checked)} />
        El municipio está en zona de amenaza sísmica baja (A.6.5.2.1a: no se requiere separación entre vecinos)
      </label>

      {ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Valor destacado etiqueta="Coeficiente de la tabla" valor={zonaBaja ? 'No aplica' : fmt(coef, 2)} nota={efectivo === 0 ? 'No requiere separación sísmica' : `${(coef * 100).toFixed(0)} % de la altura del piso`} />
            <Valor etiqueta="Altura de la cubierta hn" unidad="m" valor={fmt(n * hp.n, 1)} />
            <Valor destacado etiqueta="Separación en la cubierta" unidad="cm" valor={fmt(efectivo * n * hp.n * 100, 1)} />
          </div>
          {efectivo > 0 && (
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs"><tr><th className="px-3 py-1.5 text-left">Nivel</th><th className="px-3 py-1.5 text-right">Altura sobre el terreno (m)</th><th className="px-3 py-1.5 text-right">Separación mínima (cm)</th></tr></thead>
                <tbody className="font-mono">
                  {[...filas].reverse().map((f) => (
                    <tr key={f.piso} className="border-t"><td className="px-3 py-1 text-left">{f.piso === n ? 'Cubierta' : `Piso ${f.piso}`}</td><td className="px-3 py-1 text-right">{fmt(f.h, 1)}</td><td className="px-3 py-1 text-right">{fmt(efectivo * f.h * 100, 1)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {!ok && <Aviso tipo="error">Ingresa un número de pisos entre 1 y 60 y una altura de piso positiva.</Aviso>}
      <PieCalc>Aplica a edificaciones nuevas frente al paramento del lote (A.6.5.2.3); no aplica si el paramento colinda con vía o zona verde pública (a).</PieCalc>
    </div>
  );
}
