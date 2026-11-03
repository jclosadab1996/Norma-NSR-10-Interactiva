import { useId, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Convierte "0,15" o "0.15" en número; NaN si no es válido. */
export function parseNum(texto: string): number {
  const n = parseFloat(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Estado de un campo numérico que conserva el texto mientras se escribe. */
export function useNum(inicial: number) {
  const [txt, setTxt] = useState(String(inicial));
  return { txt, setTxt, n: parseNum(txt) };
}

/** Formatea con decimales fijos usando punto decimal (como la norma). */
export function fmt(x: number, d = 3): string {
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(d);
}

type CampoProps = {
  etiqueta: ReactNode;
  unidad?: string;
  valor: string;
  onCambio: (v: string) => void;
  ayuda?: string;
  paso?: number;
  min?: number;
  max?: number;
  className?: string;
};

export function Campo({ etiqueta, unidad, valor, onCambio, ayuda, paso, min, max, className }: CampoProps) {
  const id = useId();
  const n = parseNum(valor);
  const fuera = Number.isFinite(n) && ((min !== undefined && n < min) || (max !== undefined && n > max));
  const invalido = valor.trim() === '' || !Number.isFinite(n) || fuera;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={valor}
          step={paso}
          aria-invalid={invalido}
          aria-describedby={ayuda ? `${id}-ayuda` : undefined}
          onChange={(e) => onCambio(e.target.value)}
          className={cn('h-9 font-mono', unidad && 'pr-12')}
        />
        {unidad && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
            {unidad}
          </span>
        )}
      </div>
      {(ayuda || fuera) && (
        <p id={`${id}-ayuda`} className={cn('text-xs', fuera ? 'text-danger' : 'text-muted-foreground')}>
          {fuera ? `Valor fuera del rango recomendado${min !== undefined ? ` (mín. ${min}` : ''}${max !== undefined ? `${min !== undefined ? ', ' : ' ('}máx. ${max}` : ''})` : ayuda}
        </p>
      )}
    </div>
  );
}

type ValorProps = {
  etiqueta: ReactNode;
  valor: string;
  unidad?: string;
  nota?: string;
  destacado?: boolean;
  estado?: 'ok' | 'mal' | 'neutro';
};

export function Valor({ etiqueta, valor, unidad, nota, destacado, estado = 'neutro' }: ValorProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        destacado ? 'border-primary/40 bg-primary/10' : 'bg-muted/40',
        estado === 'ok' && 'border-ok/50 bg-ok/10',
        estado === 'mal' && 'border-danger/50 bg-danger/10',
      )}
    >
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={cn('mt-0.5 font-mono text-xl font-semibold leading-tight', estado === 'ok' && 'text-ok', estado === 'mal' && 'text-danger')}>
        {valor}
        {unidad && <span className="ml-1 text-sm font-normal text-muted-foreground">{unidad}</span>}
      </p>
      {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

export function Grupo({ titulo, children, className }: { titulo?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn('space-y-3 rounded-xl border p-4', className)}>
      {titulo && <legend className="px-1 text-sm font-semibold">{titulo}</legend>}
      {children}
    </fieldset>
  );
}

export function Aviso({ tipo = 'nota', children }: { tipo?: 'nota' | 'atencion' | 'error'; children: ReactNode }) {
  return (
    <p
      role={tipo === 'nota' ? 'note' : 'alert'}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        tipo === 'nota' && 'border-note/40 bg-note/10',
        tipo === 'atencion' && 'border-warn/50 bg-warn/10',
        tipo === 'error' && 'border-danger/50 bg-danger/10',
      )}
    >
      {children}
    </p>
  );
}

/** Pie común con recordatorio de uso educativo. */
export function PieCalc({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      {children} Herramienta didáctica: verifica siempre con el texto oficial de la NSR-10.
    </p>
  );
}
