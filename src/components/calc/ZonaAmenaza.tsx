import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { zonaAmenaza } from '@/lib/nsr10';
import { REGIONES_AA_AV } from '@/data/tablas';
import { Campo, Valor, useNum, PieCalc } from './ui';
import { CIUDADES_EJEMPLO } from './sitio';

const COLOR_ZONA = {
  Baja: 'bg-ok/15 text-ok border-ok/40',
  Intermedia: 'bg-warn/15 text-warn border-warn/50',
  Alta: 'bg-danger/15 text-danger border-danger/40',
} as const;

const EXPLICA = {
  Baja: 'Aa y Av ≤ 0.10 (A.2.3.1). Mayor flexibilidad en algunos requisitos (sistemas, alturas, irregularidades, separación sísmica).',
  Intermedia: 'Aa o Av > 0.10 y ninguno > 0.20 (A.2.3.2).',
  Alta: 'Aa o Av > 0.20 (A.2.3.3). Aplican las exigencias más estrictas de disipación de energía y detallado.',
} as const;

export default function ZonaAmenaza() {
  const aa = useNum(0.15);
  const av = useNum(0.2);
  const [ciudad, setCiudad] = useState<string>('Bogotá D. C.');

  const ok = Number.isFinite(aa.n) && Number.isFinite(av.n) && aa.n > 0 && av.n > 0;
  const zona = ok ? zonaAmenaza(aa.n, av.n) : null;
  const mayor = ok ? Math.max(aa.n, av.n) : NaN;
  const region = ok ? REGIONES_AA_AV.find((r) => Math.abs(r.valor - mayor) < 1e-9) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Cargar valores de una ciudad (Tabla A.2.3-2):</span>
        {CIUDADES_EJEMPLO.map((c) => (
          <Button
            key={c.nombre}
            size="sm"
            variant={ciudad === c.nombre ? 'default' : 'outline'}
            onClick={() => {
              setCiudad(c.nombre);
              aa.setTxt(String(c.aa));
              av.setTxt(String(c.av));
            }}
          >
            {c.nombre}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Aa" valor={aa.txt} onCambio={(v) => { aa.setTxt(v); setCiudad(''); }} paso={0.05} min={0.05} max={0.5} ayuda="Coeficiente de aceleración horizontal pico efectiva (Figura A.2.3-2)" />
        <Campo etiqueta="Av" valor={av.txt} onCambio={(v) => { av.setTxt(v); setCiudad(''); }} paso={0.05} min={0.05} max={0.5} ayuda="Coeficiente de velocidad horizontal pico efectiva (Figura A.2.3-3)" />
      </div>

      {zona && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`rounded-lg border p-3 sm:col-span-1 ${COLOR_ZONA[zona]}`}>
            <p className="text-xs opacity-80">Zona de amenaza sísmica</p>
            <p className="text-2xl font-bold">{zona}</p>
          </div>
          <Valor etiqueta="Mayor valor entre Aa y Av" valor={mayor.toFixed(2)} nota={region ? `Región ${region.region} de los mapas (Tabla A.2.2-1)` : 'Valor intermedio entre regiones del mapa'} />
          <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-1">{EXPLICA[zona]}</div>
        </div>
      )}
      <PieCalc>Regla de la Tabla A.2.3-1 aplicada sobre el mayor valor entre Aa y Av.</PieCalc>
    </div>
  );
}
