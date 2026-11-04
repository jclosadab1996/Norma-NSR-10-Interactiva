import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { USOS_CARGA_VIVA, NOMBRES_CARGAS, ORDEN_CARGAS } from '@/data/combinacionesB';
import {
  combinaciones,
  envolvente,
  puedeReducirFactorL,
  sismoReducido,
  type Cargas,
  type MetodoDiseno,
  type NombreCarga,
  type UsoCargaViva,
} from '@/lib/nsr10/combinaciones';
import { cn } from '@/lib/utils';
import Selector from './Selector';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, parseNum, useNum } from './ui';

const config = { valor: { label: 'Valor de la combinación', color: 'var(--chart-1)' } } satisfies ChartConfig;

const METODOS = [
  { value: 'resistencia', label: 'Método de la resistencia — cargas mayoradas (B.2.4)' },
  { value: 'trabajo', label: 'Esfuerzos de trabajo / estado límite de servicio (B.2.3)' },
] as const;

const USOS = (Object.keys(USOS_CARGA_VIVA) as UsoCargaViva[]).map((k) => ({ value: k, label: USOS_CARGA_VIVA[k] }));

const INICIAL: Record<NombreCarga, string> = { D: '100', L: '50', Lr: '10', G: '0', Le: '0', W: '30', E: '60', H: '0', F: '0', T: '0' };

function Casilla({ marcada, onCambio, children }: { marcada: boolean; onCambio: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={marcada} onChange={(e) => onCambio(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export default function CombinacionesCarga() {
  const [metodo, setMetodo] = useState<MetodoDiseno>('resistencia');
  const [txt, setTxt] = useState<Record<NombreCarga, string>>(INICIAL);

  // Ayuda para E = Fs / R (B.2.3.2 y B.2.4.2.1)
  const [usarFsR, setUsarFsR] = useState(false);
  const fs = useNum(300);
  const r = useNum(5);

  // Opciones de B.2.4.2.x
  const [uso, setUso] = useState<UsoCargaViva>('general');
  const l0 = useNum(1.8);
  const [reducirL, setReducirL] = useState(false);
  const [viento13, setViento13] = useState(false);
  const [sismoServicio, setSismoServicio] = useState(false);
  const [hNeutraliza, setHNeutraliza] = useState(false);
  // Opción de B.2.3.2.1
  const [derivas, setDerivas] = useState(false);
  const [ambos, setAmbos] = useState(false);

  const eDeFsR = usarFsR ? sismoReducido(fs.n, r.n) : NaN;
  const num = (k: NombreCarga) => (k === 'E' && usarFsR ? eDeFsR : parseNum(txt[k]));
  const valores = Object.fromEntries(ORDEN_CARGAS.map((k) => [k, num(k)])) as Record<NombreCarga, number>;
  const entradasOk = ORDEN_CARGAS.every((k) => Number.isFinite(valores[k])) && (!usarFsR || (r.n > 0 && Number.isFinite(fs.n)));

  const permiteReducirL = Number.isFinite(l0.n) && puedeReducirFactorL(uso, l0.n);
  const lista = useMemo(() => {
    if (!entradasOk) return [];
    const cargas: Cargas = valores;
    return combinaciones(metodo, cargas, {
      sentidos: ambos ? 'ambos' : 'dado',
      reducirFactorL: reducirL && permiteReducirL,
      viento13,
      sismoNivelServicio: sismoServicio,
      hNeutralizaWE: hNeutraliza,
      verificacionDerivas: derivas,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodo, ambos, reducirL, permiteReducirL, viento13, sismoServicio, hNeutraliza, derivas, entradasOk, ...ORDEN_CARGAS.map((k) => valores[k])]);

  const env = envolvente(lista);
  const etiqueta = (c: (typeof lista)[number]) => (c.variante ? `${c.id} (−W,−E)` : c.id);
  const datos = lista.map((c) => ({ nombre: etiqueta(c), valor: c.valor, gob: c === env?.maxima }));
  const alto = Math.max(220, lista.length * 26 + 50);

  const campo = (k: NombreCarga) =>
    k === 'E' && usarFsR ? null : (
      <Campo key={k} etiqueta={<><b>{k}</b> · {NOMBRES_CARGAS[k].split(' (')[0]}</>} unidad="kN" valor={txt[k]} onCambio={(v) => setTxt({ ...txt, [k]: v })} />
    );

  return (
    <div className="space-y-5">
      <Selector etiqueta="Método de diseño" valor={metodo} onCambio={(v) => setMetodo(v as MetodoDiseno)} opciones={METODOS} ayuda="Todo el diseño se hace con un solo método (B.2.1.2). La NSR-10 usa resistencia para todos los materiales excepto madera y guadua (B.2.3.1)." />

      <Grupo titulo="Efectos de las cargas nominales (misma unidad; W y E pueden llevar signo)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{ORDEN_CARGAS.map(campo)}</div>
        <Casilla marcada={usarFsR} onCambio={setUsarFsR}>
          Calcular <b>E = Fs / R</b> a partir de la fuerza sísmica del Título A (B.2.3.2, B.2.4.2.1)
        </Casilla>
        {usarFsR && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta={<><b>Fs</b> · sismo sin reducir</>} unidad="kN" valor={fs.txt} onCambio={fs.setTxt} />
            <Campo etiqueta={<b>R</b>} valor={r.txt} onCambio={r.setTxt} min={0.5} ayuda="R = φa·φp·φr·R0 (calculadora de R en A.3)" />
            <Valor etiqueta="E = Fs / R" unidad="kN" valor={fmt(eDeFsR, 2)} />
          </div>
        )}
      </Grupo>

      <Grupo titulo="Opciones de la norma">
        {metodo === 'resistencia' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector etiqueta="Uso (para B.2.4.2.2)" valor={uso} onCambio={(v) => setUso(v as UsoCargaViva)} opciones={USOS} />
              <Campo etiqueta={<>L<sub>0</sub> (carga viva sin reducir)</>} unidad="kN/m²" valor={l0.txt} onCambio={l0.setTxt} min={0} />
            </div>
            <Casilla marcada={reducirL && permiteReducirL} onCambio={setReducirL}>
              Usar 0.5 en lugar de 1.0 para L en B.2.4-3, -4 y -5 (B.2.4.2.2){' '}
              <span className={cn('text-xs', permiteReducirL ? 'text-ok' : 'text-danger')}>
                {permiteReducirL ? '— permitido' : '— no permitido (estacionamiento, reunión pública o L0 > 4.8 kN/m²)'}
              </span>
            </Casilla>
            <Casilla marcada={viento13} onCambio={setViento13}>Usar 1.3W en lugar de 1.6W en B.2.4-4 y B.2.4-6: el viento NO se redujo por direccionalidad (B.2.4.2.3)</Casilla>
            <Casilla marcada={sismoServicio} onCambio={setSismoServicio}>Usar 1.4E en lugar de 1.0E en B.2.4-5 y B.2.4-7: E está a nivel de servicio (B.2.4.2.4)</Casilla>
            <Casilla marcada={hNeutraliza} onCambio={setHNeutraliza}>H = 0 en B.2.4-6 y B.2.4-7: el empuje neutraliza los efectos de W o E (B.2.4.2.5)</Casilla>
          </div>
        ) : (
          <Casilla marcada={derivas} onCambio={setDerivas}>
            Verificación de derivas: usar 1.0E en lugar de 0.7E, con E = Fs sin dividir por R (B.2.3.2.1)
          </Casilla>
        )}
        <Casilla marcada={ambos} onCambio={setAmbos}>
          Evaluar también W y E en sentido contrario (útil si el efecto puede invertirse)
        </Casilla>
      </Grupo>

      {!entradasOk && <Aviso tipo="error">Revisa los valores: todas las cargas deben ser números (use 0 si no actúan); R debe ser mayor que 0.</Aviso>}

      {env && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Valor destacado etiqueta="Combinación gobernante (mayor valor)" valor={etiqueta(env.maxima)} nota={env.maxima.expresion} />
            <Valor etiqueta="Valor de diseño" unidad="kN" valor={fmt(env.maxima.valor, 2)} nota={`${METODOS.find((m) => m.value === metodo)!.label.split(' —')[0]} · ${env.maxima.pag}`} />
            <Valor etiqueta="Combinación mínima" valor={`${fmt(env.minima.valor, 2)} kN`} nota={`${etiqueta(env.minima)}: ${env.minima.expresion}`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Ecuación</th>
                    <th className="px-2 py-1.5 text-left">Expresión con tus datos</th>
                    <th className="px-2 py-1.5 text-right">Valor (kN)</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {lista.map((c, i) => (
                    <tr key={`${c.id}-${i}`} className={cn('border-t', c === env.maxima && 'bg-primary/10 font-semibold')}>
                      <td className="px-2 py-1 text-left align-top">
                        {etiqueta(c)}
                        {c.cubierta && <span className="ml-1 text-xs font-normal text-muted-foreground">[{c.cubierta}]</span>}
                      </td>
                      <td className="px-2 py-1 text-left align-top text-xs">
                        {c.texto}
                        <br />
                        <span className="text-muted-foreground">= {c.expresion}</span>
                        {c.notas.map((n) => (
                          <span key={n} className="block text-muted-foreground">{n}</span>
                        ))}
                      </td>
                      <td className="px-2 py-1 text-right align-top">{fmt(c.valor, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ChartContainer config={config} className="w-full" style={{ height: alto }}>
              <BarChart data={datos} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <YAxis type="category" dataKey="nombre" tickLine={false} width={86} interval={0} fontSize={11} />
                <XAxis type="number" tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: 'kN', position: 'insideBottomRight', offset: -2, fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v) => <span className="font-mono">{Number(v).toFixed(2)} kN</span>} />} />
                <Bar dataKey="valor" radius={3}>
                  {datos.map((d) => (
                    <Cell key={d.nombre} fill={d.gob ? 'var(--chart-2)' : 'var(--chart-1)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </>
      )}
      <PieCalc>
        Cada combinación suma factor × efecto. «(Lr ó G ó Le)» usa la mayor de las tres cargas de cubierta; «(L ó 0.8W)» usa la mayor de las dos. La barra naranja es la gobernante. Los efectos más desfavorables de viento y sismo se toman independientemente (B.2.3.1).
      </PieCalc>
    </div>
  );
}
