import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import municipios from '@/data/municipios.json';
import { cn } from '@/lib/utils';
import { PieCalc } from './ui';
import Selector from './Selector';

type Mun = (typeof municipios)[number];

const COLOR_ZONA: Record<string, string> = {
  Baja: 'bg-ok/15 text-ok',
  Intermedia: 'bg-warn/15 text-warn',
  Alta: 'bg-danger/15 text-danger',
};

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DEPARTAMENTOS = [...new Set(municipios.map((m) => m.departamento))];
const LIMITE = 60;

export default function Municipios() {
  const [q, setQ] = useState('');
  const [dep, setDep] = useState('todos');
  const [zona, setZona] = useState('todas');
  const [sel, setSel] = useState<Mun | null>(null);

  const resultados = useMemo(() => {
    const nq = sinTildes(q.trim());
    return municipios.filter(
      (m) =>
        (dep === 'todos' || m.departamento === dep) &&
        (zona === 'todas' || m.zona === zona) &&
        (!nq || sinTildes(m.municipio).includes(nq) || m.codigo.startsWith(nq)),
    );
  }, [q, dep, zona]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[2fr_1.4fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="mun-q" className="text-sm font-medium">Municipio o código DANE</Label>
          <Input id="mun-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej.: Pasto, Bucaramanga, 76001…" className="h-9" />
        </div>
        <Selector
          etiqueta="Departamento"
          valor={dep}
          onCambio={setDep}
          opciones={[{ value: 'todos', label: 'Todos' }, ...DEPARTAMENTOS.map((d) => ({ value: d, label: d }))]}
        />
        <Selector
          etiqueta="Zona de amenaza"
          valor={zona}
          onCambio={setZona}
          opciones={[{ value: 'todas', label: 'Todas' }, { value: 'Baja', label: 'Baja' }, { value: 'Intermedia', label: 'Intermedia' }, { value: 'Alta', label: 'Alta' }]}
        />
      </div>

      {sel && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h4 className="text-lg font-semibold">{sel.municipio}</h4>
            <span className="text-sm text-muted-foreground">{sel.departamento} · DANE {sel.codigo}</span>
            <span className={cn('ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold', COLOR_ZONA[sel.zona])}>Amenaza {sel.zona}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Aa', sel.aa, 'Diseño (A.2)'],
              ['Av', sel.av, 'Diseño (A.2)'],
              ['Ae', sel.ae, 'Seguridad limitada (A.10)'],
              ['Ad', sel.ad, 'Umbral de daño (A.12)'],
            ].map(([k, v, n]) => (
              <div key={String(k)} className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">{k} · {n}</dt>
                <dd className="font-mono text-2xl font-semibold">{Number(v).toFixed(2)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="max-h-[26rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs">
              <tr>
                <th className="px-3 py-2">Municipio</th>
                <th className="hidden px-3 py-2 sm:table-cell">Departamento</th>
                <th className="px-2 py-2 text-right">Aa</th>
                <th className="px-2 py-2 text-right">Av</th>
                <th className="px-2 py-2">Zona</th>
                <th className="hidden px-2 py-2 text-right md:table-cell">Ae</th>
                <th className="hidden px-2 py-2 text-right md:table-cell">Ad</th>
              </tr>
            </thead>
            <tbody>
              {resultados.slice(0, LIMITE).map((m) => (
                <tr
                  key={m.codigo}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver ${m.municipio}`}
                  onClick={() => setSel(m)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(m)}
                  className={cn('cursor-pointer border-t hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none', sel?.codigo === m.codigo && 'bg-primary/10')}
                >
                  <td className="px-3 py-1.5 font-medium">{m.municipio}</td>
                  <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{m.departamento}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{m.aa.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{m.av.toFixed(2)}</td>
                  <td className="px-2 py-1.5"><span className={cn('rounded-full px-2 py-0.5 text-xs', COLOR_ZONA[m.zona])}>{m.zona}</span></td>
                  <td className="hidden px-2 py-1.5 text-right font-mono md:table-cell">{m.ae.toFixed(2)}</td>
                  <td className="hidden px-2 py-1.5 text-right font-mono md:table-cell">{m.ad.toFixed(2)}</td>
                </tr>
              ))}
              {resultados.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          {resultados.length} de {municipios.length} municipios{resultados.length > LIMITE && ` — mostrando los primeros ${LIMITE}; afina la búsqueda`}.
        </p>
      </div>
      <PieCalc>Datos del Apéndice A-4 tal como están impresos en la norma (incluye sus nombres).</PieCalc>
    </div>
  );
}
