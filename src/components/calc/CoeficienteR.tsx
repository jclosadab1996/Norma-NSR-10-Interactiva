import { useMemo, useState } from 'react';
import {
  IRREGULARIDADES_ALTURA,
  IRREGULARIDADES_PLANTA,
  REDUNDANCIA,
  SISTEMAS,
  TITULOS_TABLAS,
  buscarSistema,
  describirLimite,
  limiteEnZona,
  phiAltura,
  phiPlanta,
  r0Efectivo,
  type TipoIrregularidadAltura,
  type TipoIrregularidadPlanta,
  type ZonaAmenaza,
} from '@/data/sistemasEstructurales';
import { coeficienteR, fuerzaReducida } from '@/lib/nsr10';
import { Aviso, Grupo, PieCalc, Valor, fmt } from './ui';
import Selector from './Selector';
import { Label } from '@/components/ui/label';

const OPCIONES_SISTEMA = SISTEMAS.map((s) => ({
  value: s.id,
  label: `${s.tabla} · ${s.numero} — ${s.sistemaSismico}`.slice(0, 110),
}));

const OPCIONES_ZONA = [
  { value: 'alta', label: 'Alta' },
  { value: 'intermedia', label: 'Intermedia' },
  { value: 'baja', label: 'Baja' },
];

function Casillas<T extends string>({
  titulo,
  items,
  marcados,
  onCambio,
}: {
  titulo: string;
  items: ReadonlyArray<{ tipo: T; nombre: string; phi: number }>;
  marcados: T[];
  onCambio: (v: T[]) => void;
}) {
  return (
    <Grupo titulo={titulo}>
      <ul className="space-y-1.5">
        {items.map((it) => {
          const id = `${titulo}-${it.tipo}`;
          const on = marcados.includes(it.tipo);
          return (
            <li key={it.tipo} className="flex items-start gap-2">
              <input
                id={id}
                type="checkbox"
                className="mt-1"
                checked={on}
                onChange={() => onCambio(on ? marcados.filter((m) => m !== it.tipo) : [...marcados, it.tipo])}
              />
              <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal leading-snug">
                <span className="font-mono font-semibold">{it.tipo}</span> {it.nombre}
                <span className="ml-1 font-mono text-xs text-muted-foreground">φ = {it.phi.toFixed(2)}</span>
              </Label>
            </li>
          );
        })}
      </ul>
    </Grupo>
  );
}

export default function CoeficienteR() {
  const [id, setId] = useState((SISTEMAS.find((s) => s.id === 'a3-3-1a') ?? SISTEMAS[0]).id);
  const [zona, setZona] = useState<ZonaAmenaza>('alta');
  const [planta, setPlanta] = useState<TipoIrregularidadPlanta[]>([]);
  const [altura, setAltura] = useState<TipoIrregularidadAltura[]>([]);
  const [sinRedundancia, setSinRedundancia] = useState(false);
  const [soldadura, setSoldadura] = useState(false);

  const sistema = buscarSistema(id) ?? SISTEMAS[0];
  const lim = limiteEnZona(sistema, zona);
  const r0 = r0Efectivo(sistema, soldadura);
  const phiP = phiPlanta(planta);
  const phiA = phiAltura(altura);
  const phiR = sinRedundancia && sistema.capacidadDisipacion !== 'DMI' ? REDUNDANCIA.phiRAusenciaRedundancia : REDUNDANCIA.phiRRedundante;
  const r = coeficienteR(r0, phiA, phiP, phiR);
  const factor = useMemo(() => phiA * phiP * phiR, [phiA, phiP, phiR]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[3fr_1fr]">
        <Selector
          etiqueta="Sistema estructural de resistencia sísmica (Tablas A.3-1 a A.3-4)"
          valor={id}
          onCambio={setId}
          opciones={OPCIONES_SISTEMA}
          ayuda={`${TITULOS_TABLAS[sistema.tabla]} — vertical: ${sistema.sistemaVertical}`}
        />
        <Selector etiqueta="Zona de amenaza sísmica" valor={zona} onCambio={(v) => setZona(v as ZonaAmenaza)} opciones={OPCIONES_ZONA} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Valor etiqueta="R0 · Ω0 de la tabla" valor={`${sistema.r0.toFixed(1)} · ${sistema.omega0.toFixed(1)}`} nota={sistema.capacidadDisipacion ? `Capacidad ${sistema.capacidadDisipacion}` : undefined} />
        <Valor
          etiqueta={`Uso en zona ${zona}`}
          valor={lim.permitido ? 'Permitido' : lim.alturaExcepcionM ? 'Solo excepción' : 'No se permite'}
          estado={lim.permitido ? 'ok' : 'mal'}
          nota={describirLimite(lim)}
        />
        <Valor etiqueta="Material" valor={sistema.material} />
      </div>
      {!lim.permitido && <Aviso tipo="atencion">El sistema elegido no se permite en zona de amenaza {zona}; revisa las notas de la tabla ({sistema.notas.join(', ') || '—'}).</Aviso>}

      {sistema.ajusteR0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soldadura} onChange={(e) => setSoldadura(e.target.checked)} />
          {sistema.ajusteR0.condicion} (nota {sistema.ajusteR0.nota}: R0 × {sistema.ajusteR0.factor})
        </label>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Casillas titulo="Irregularidades en planta (Tabla A.3-6)" items={IRREGULARIDADES_PLANTA} marcados={planta} onCambio={setPlanta} />
        <Casillas titulo="Irregularidades en altura (Tabla A.3-7)" items={IRREGULARIDADES_ALTURA} marcados={altura} onCambio={setAltura} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={sinRedundancia} onChange={(e) => setSinRedundancia(e.target.checked)} />
        <span>
          El sistema NO cumple las condiciones de redundancia de A.3.3.8 (φr = {REDUNDANCIA.phiRAusenciaRedundancia}). Para capacidad DMI siempre φr = 1.0.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Valor etiqueta="φa (altura)" valor={fmt(phiA, 2)} nota="Menor valor de los marcados" />
        <Valor etiqueta="φp (planta)" valor={fmt(phiP, 2)} nota="Menor valor de los marcados" />
        <Valor etiqueta="φr (redundancia)" valor={fmt(phiR, 2)} />
        <Valor destacado etiqueta="R = φa·φp·φr·R0" valor={fmt(r, 2)} nota={`Factor combinado ${fmt(factor, 3)}`} />
        <Valor etiqueta="Fuerza de diseño relativa" valor={`${fmt((r0 / r) * 100, 0)} %`} nota="frente a la del sistema regular (R0/R)" />
      </div>
      <p className="text-sm text-muted-foreground">
        Ejemplo: una fuerza sísmica elástica de 1000 kN se reduce a <strong className="font-mono text-foreground">{fmt(fuerzaReducida(1000, r), 1)} kN</strong> con R = {fmt(r, 2)} (A.3.7).
      </p>
      <PieCalc>Se toma el menor φ de cada tipo de irregularidad (A.3.3.3). La evaluación de qué irregularidades aplican depende de la zona y el grupo de uso (A.3.3.6 y A.3.3.7).</PieCalc>
    </div>
  );
}
