import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CARGAS_CUBIERTA, GRANIZO, cargaVivaCubierta } from '@/data/cargasVivas';
import {
  GAMMA_AGUA_DULCE,
  GAMMA_AGUA_MARINA,
  cargaGranizo,
  empozamientoPorProfundidad,
  empozamientoPorVolumen,
  pesoAguaEmpozada,
  profundidadEquivalente,
} from '@/lib/nsr10/cargasVivas';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const config = { valor: { label: 'kN/m²', color: 'var(--chart-1)' } } satisfies ChartConfig;

const opcionesModo = [
  { value: 'profundidad', label: 'Conozco la profundidad de agua hasta el rebosadero' },
  { value: 'volumen', label: 'Conozco el volumen que se puede acumular' },
] as const;
const opcionesAgua = [
  { value: 'dulce', label: `Agua dulce — ${GAMMA_AGUA_DULCE.toFixed(1)} kN/m³ (1 000 kg/m³)` },
  { value: 'marina', label: `Agua marina — ${GAMMA_AGUA_MARINA.toFixed(2)} kN/m³ (1 030 kg/m³)` },
] as const;
const opcionesCubierta = CARGAS_CUBIERTA.map((c) => ({
  value: c.id,
  label: c.igualRestoEdificacion ? `${c.tipo} — la del resto de la edificación` : `${c.tipo.length > 70 ? c.tipo.slice(0, 68) + '…' : c.tipo} — ${c.kNm2!.toFixed(2)} kN/m²`,
}));

export default function EmpozamientoGranizo() {
  // Empozamiento
  const [modo, setModo] = useState<string>('profundidad');
  const [agua, setAgua] = useState<string>('dulce');
  const area = useNum(300);
  const h = useNum(0.1);
  const vol = useNum(30);
  // Granizo
  const alt = useNum(2600);
  const incl = useNum(5);
  const [autoridad, setAutoridad] = useState(false);
  // Carga viva de cubierta
  const [cubierta, setCubierta] = useState<string>('inclinada-menor-15');
  const restoTxt = useNum(2.0);

  const gw = agua === 'marina' ? GAMMA_AGUA_MARINA : GAMMA_AGUA_DULCE;
  const areaOk = Number.isFinite(area.n) && area.n > 0;
  const entradaLe = modo === 'profundidad' ? Number.isFinite(h.n) && h.n >= 0 : Number.isFinite(vol.n) && vol.n >= 0;
  const le = areaOk && entradaLe ? (modo === 'profundidad' ? empozamientoPorProfundidad(h.n, gw) : empozamientoPorVolumen(vol.n, area.n, gw)) : NaN;
  const volumen = areaOk && entradaLe ? (modo === 'profundidad' ? h.n * area.n : vol.n) : NaN;
  const peso = Number.isFinite(volumen) ? pesoAguaEmpozada(volumen, gw) : NaN;
  const hEq = Number.isFinite(volumen) ? profundidadEquivalente(volumen, area.n) : NaN;

  const granizoOk = Number.isFinite(alt.n) && Number.isFinite(incl.n) && incl.n >= 0 && incl.n <= 90;
  const g = granizoOk ? cargaGranizo({ alturaMsnm: alt.n, inclinacionGrados: incl.n, exigidoPorAutoridad: autoridad }) : null;

  const filaCubierta = CARGAS_CUBIERTA.find((c) => c.id === cubierta)!;
  const lr = cargaVivaCubierta(cubierta, Number.isFinite(restoTxt.n) && restoTxt.n > 0 ? [restoTxt.n] : []);

  const datos = [
    { caso: 'Lr (viva de cubierta)', valor: Number.isFinite(lr) ? lr : 0, color: 'var(--chart-1)' },
    { caso: 'G (granizo)', valor: g ? g.g : 0, color: 'var(--chart-2)' },
    { caso: 'Le (empozamiento)', valor: Number.isFinite(le) ? le : 0, color: 'var(--chart-3)' },
  ];

  return (
    <div className="space-y-5">
      <Grupo titulo="Empozamiento de agua Le (B.4.8.2)">
        <Aviso tipo="nota">
          La norma no da una profundidad ni una fórmula: el <strong>proyecto hidráulico</strong> define el volumen de agua que se acumula antes de que opere el sistema auxiliar de evacuación y el
          diseñador estructural calcula su peso (B.4.8.2.1 y B.4.8.2.2). Aquí se convierte ese volumen o profundidad en carga con el peso unitario del agua de la Tabla B.3.2-1.
        </Aviso>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Selector etiqueta="Dato de partida" valor={modo} onCambio={setModo} opciones={opcionesModo} />
          <Selector etiqueta="Tipo de agua" valor={agua} onCambio={setAgua} opciones={opcionesAgua} />
          <Campo etiqueta="Área de cubierta que drena" unidad="m²" valor={area.txt} onCambio={area.setTxt} min={1} paso={10} />
          {modo === 'profundidad' ? (
            <Campo etiqueta="Profundidad hasta el rebosadero" unidad="m" valor={h.txt} onCambio={h.setTxt} min={0} paso={0.01} ayuda="Nivel del elemento del sistema auxiliar de evacuación." />
          ) : (
            <Campo etiqueta="Volumen acumulable" unidad="m³" valor={vol.txt} onCambio={vol.setTxt} min={0} paso={1} ayuda="Entregado por el constructor (B.4.8.2.1)." />
          )}
        </div>
        {!areaOk || !entradaLe ? (
          <Aviso tipo="error">Revisa los datos: área mayor que 0 y profundidad o volumen no negativos.</Aviso>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor destacado etiqueta="Le = γw · h" unidad="kN/m²" valor={fmt(le, 3)} nota="Carga uniforme sobre la cubierta" />
            <Valor etiqueta="Volumen de agua" unidad="m³" valor={fmt(volumen, 2)} />
            <Valor etiqueta="Peso total del agua" unidad="kN" valor={fmt(peso, 1)} />
            <Valor etiqueta="Profundidad media" unidad="mm" valor={fmt(hEq * 1000, 0)} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          En cubiertas metálicas debe revisarse además el empozamiento según F.2.2.3.9 (B.4.8.2.3). Una cubierta flexible se deflecta, acumula más agua y carga más: el efecto es progresivo.
        </p>
      </Grupo>

      <Grupo titulo="Granizo G (B.4.8.3)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Altura sobre el nivel del mar" unidad="m" valor={alt.txt} onCambio={alt.setTxt} min={0} paso={50} ayuda="B.4.8.3.1: se considera si es mayor de 2 000 m." />
          <Campo etiqueta="Inclinación de la cubierta" unidad="°" valor={incl.txt} onCambio={incl.setTxt} min={0} max={90} paso={1} ayuda="Mayor de 15° permite reducir G a 0.5 kN/m²." />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={autoridad} onChange={(e) => setAutoridad(e.target.checked)} />
            La autoridad municipal o distrital lo exige
          </label>
        </div>
        {!granizoOk && <Aviso tipo="error">Revisa la altura y la inclinación (0° a 90°).</Aviso>}
        {g && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Valor
              destacado={g.aplica}
              etiqueta="¿Hay que considerar granizo?"
              valor={g.aplica ? 'Sí' : 'No'}
              nota={g.motivo === 'altura' ? `Altura mayor de ${GRANIZO.alturaMsnmM} m` : g.motivo === 'autoridad' ? 'Exigido por la autoridad' : `Altura ≤ ${GRANIZO.alturaMsnmM} m y sin exigencia`}
            />
            <Valor destacado={g.aplica} etiqueta="Carga de granizo G" unidad="kN/m²" valor={fmt(g.g, 2)} nota={g.aplica ? (g.reducida ? 'Valor reducido (inclinación > 15°)' : 'Valor general') : 'No aplica'} />
            <Valor etiqueta="G en kgf/m²" unidad="kgf/m²" valor={fmt(g.g * 100, 0)} nota="Equivalencia de la norma (1 kN/m² = 100 kgf/m²)" />
          </div>
        )}
      </Grupo>

      <Grupo titulo="Carga viva de cubierta Lr (Tabla B.4.2.1-2)">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Selector etiqueta="Tipo de cubierta" valor={cubierta} onCambio={setCubierta} opciones={opcionesCubierta} />
          {filaCubierta.igualRestoEdificacion && (
            <Campo etiqueta="Mayor carga viva del resto de la edificación" unidad="kN/m²" valor={restoTxt.txt} onCambio={restoTxt.setTxt} min={0.1} paso={0.5} ayuda="Nota-1: nunca menor que esa carga." />
          )}
        </div>
        {Number.isFinite(lr) ? <Valor etiqueta="Lr mínima" unidad="kN/m²" valor={fmt(lr, 2)} nota={`${fmt(lr * 100, 0)} kgf/m²`} /> : <Aviso tipo="error">Indica la carga viva del resto de la edificación.</Aviso>}
      </Grupo>

      <div className="rounded-xl border p-3">
        <p className="mb-2 px-1 text-sm font-semibold">Cargas de cubierta por separado (kN/m²)</p>
        <ChartContainer config={config} className="aspect-[16/6] w-full">
          <BarChart data={datos} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="caso" tickLine={false} fontSize={12} />
            <YAxis tickFormatter={(v) => Number(v).toFixed(1)} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{Number(v).toFixed(3)} kN/m²</span>} />} />
            <Bar dataKey="valor" radius={4}>
              {datos.map((d) => (
                <Cell key={d.caso} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className="px-1 text-xs text-muted-foreground">Lr, G y Le son cargas distintas; en las combinaciones B.2.4-2 a B.2.4-4 entran como alternativas (Lr ó G ó Le) y no se suman entre sí.</p>
      </div>

      <PieCalc>Le = γw·h con γw = 1 000 kg/m³ · 9.8 m/s² = 9.8 kN/m³ (Tabla B.3.2-1). G = 1.0 kN/m² (0.5 si la inclinación supera 15°).</PieCalc>
    </div>
  );
}
