import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type Opcion = { value: string; label: string };

type Props = {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: readonly Opcion[];
  ayuda?: string;
  className?: string;
};

/** Select accesible basado en shadcn/ui con etiqueta y ayuda. */
export default function Selector({ etiqueta, valor, onCambio, opciones, ayuda, className }: Props) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </Label>
      <Select value={valor} onValueChange={onCambio}>
        <SelectTrigger id={id} className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}
