import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  bordeMinimoPostinstalado,
  esPostinstalado,
  futaEfectiva,
  hefMaximoPostinstalado,
  interaccionTraccionCortante,
  resistenciaCortanteAnclaje,
  resistenciaTraccionAnclaje,
  separacionMinima,
  type CategoriaPost,
  type CombinacionesCarga,
  type EntradaAnclaje,
  type GeometriaGrupo,
  type ModoResistencia,
  type RefuerzoBorde,
  type TipoAnclaje,
} from '@/lib/nsr10/anclajes';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import Selector from './Selector';

const OPC_TIPO = [
  { value: 'preinstalado', label: 'Preinstalado: perno o tornillo con cabeza' },
  { value: 'post-sobreperforacion', label: 'Postinstalado: con sobreperforación en su base' },
  { value: 'post-torque', label: 'Postinstalado: expansión de torque controlado' },
  { value: 'post-desplazamiento', label: 'Postinstalado: expansión de desplazamiento controlado' },
] as const;
const OPC_CATEGORIA = [
  { value: '1', label: 'Categoría 1 (confiabilidad alta)' },
  { value: '2', label: 'Categoría 2 (confiabilidad mediana)' },
  { value: '3', label: 'Categoría 3 (confiabilidad baja)' },
] as const;
const OPC_COMB = [
  { value: 'C.9.2', label: 'Combinaciones de C.9.2 (C-D.4.4)' },
  { value: 'apendice-C', label: 'Combinaciones del Apéndice C-C (C-D.4.5)' },
] as const;
const OPC_N = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
] as const;
const OPC_SI_NO = (si: string, no: string) => [
  { value: 'si', label: si },
  { value: 'no', label: no },
];
const OPC_BORDE = [
  { value: 'ninguno', label: 'Sin refuerzo de borde' },
  { value: 'barra', label: 'Barra ≥ No. 4 (12 mm) entre anclaje y borde' },
  { value: 'barra-estribos', label: 'Barra ≥ No. 4 y estribos a ≤ 100 mm' },
] as const;

const configChart = {
  valor: { label: 'φ × resistencia (kN)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** Vista en planta: anclajes, bordes libres cercanos y área proyectada ANc (rectángulo discontinuo). */
function Planta({ g, hef }: { g: GeometriaGrupo; hef: number }) {
  const alc = 1.5 * hef;
  const xmin = -Math.min(g.cIzq, alc);
  const xmax = (g.nx - 1) * g.sx + Math.min(g.cDer, alc);
  const ymin = -Math.min(g.cSup, alc);
  const ymax = (g.ny - 1) * g.sy + Math.min(g.cInf, alc);
  const margen = 0.35 * alc;
  const vx0 = xmin - margen;
  const vx1 = xmax + margen;
  const vy0 = ymin - margen;
  const vy1 = ymax + margen;
  const W = vx1 - vx0;
  const H = vy1 - vy0;
  const esc = Math.min(300 / W, 240 / H);
  const X = (x: number) => (x - vx0) * esc;
  const Y = (y: number) => (y - vy0) * esc;
  const bordes = [
    { c: g.cIzq, x1: -g.cIzq, x2: -g.cIzq, y1: vy0, y2: vy1, nombre: 'borde' },
    { c: g.cDer, x1: (g.nx - 1) * g.sx + g.cDer, x2: (g.nx - 1) * g.sx + g.cDer, y1: vy0, y2: vy1, nombre: 'borde' },
    { c: g.cSup, x1: vx0, x2: vx1, y1: -g.cSup, y2: -g.cSup, nombre: 'borde' },
    { c: g.cInf, x1: vx0, x2: vx1, y1: (g.ny - 1) * g.sy + g.cInf, y2: (g.ny - 1) * g.sy + g.cInf, nombre: 'borde' },
  ].filter((b) => b.c <= alc * 1.35);
  const anclajes: { x: number; y: number }[] = [];
  for (let i = 0; i < g.nx; i++) for (let j = 0; j < g.ny; j++) anclajes.push({ x: i * g.sx, y: j * g.sy });
  return (
    <svg viewBox={`0 0 ${W * esc} ${H * esc}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Vista en planta del anclaje, bordes libres y área proyectada ANc">
      <title>Planta: anclajes, bordes y área proyectada ANc</title>
      <rect x={X(xmin)} y={Y(ymin)} width={(xmax - xmin) * esc} height={(ymax - ymin) * esc} fill="var(--chart-1)" fillOpacity={0.18} stroke="var(--chart-1)" strokeWidth={1.5} strokeDasharray="6 3" />
      {anclajes.map((a, i) => (
        <g key={i}>
          <circle cx={X(a.x)} cy={Y(a.y)} r={Math.max(5, 0.06 * alc * esc)} fill="currentColor" />
          <circle cx={X(a.x)} cy={Y(a.y)} r={1.5 * hef * esc} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeDasharray="2 3" />
        </g>
      ))}
      {bordes.map((b, i) => (
        <line key={i} x1={X(b.x1)} y1={Y(b.y1)} x2={X(b.x2)} y2={Y(b.y2)} stroke="var(--danger, #dc2626)" strokeWidth={3} />
      ))}
      <text x={X(xmin) + 4} y={Y(ymin) + 12} fontSize={10} fill="currentColor">ANc</text>
    </svg>
  );
}

function FilaModo({ m, gobierna }: { m: ModoResistencia; gobierna: boolean }) {
  return (
    <tr className={gobierna ? 'bg-primary/10 font-medium' : ''}>
      <td className="px-2 py-1">{m.clave}</td>
      <td className="px-2 py-1">{m.nombre}{m.nota ? <span className="block text-xs text-muted-foreground">{m.nota}</span> : null}</td>
      <td className="px-2 py-1 text-right font-mono">{fmt(m.nominal, 1)}</td>
      <td className="px-2 py-1 text-right font-mono">{fmt(m.phi, 2)}</td>
      <td className="px-2 py-1 text-right font-mono">{fmt(m.disenio, 1)}</td>
    </tr>
  );
}

export default function AnclajeConcreto() {
  const [tipo, setTipo] = useState<TipoAnclaje>('preinstalado');
  const [categoria, setCategoria] = useState<CategoriaPost>(1);
  const [comb, setComb] = useState<CombinacionesCarga>('C.9.2');
  const [nx, setNx] = useState('1');
  const [ny, setNy] = useState('1');
  const [fisurado, setFisurado] = useState('si');
  const [suplem, setSuplem] = useState('no');
  const [ductil, setDuctil] = useState('si');
  const [sismico, setSismico] = useState('no');
  const [borde, setBorde] = useState<RefuerzoBorde>('ninguno');

  const hef = useNum(200);
  const da = useNum(20);
  const Ase = useNum(245);
  const futa = useNum(400);
  const fya = useNum(250);
  const fc = useNum(28);
  const lambda = useNum(1);
  const Abrg = useNum(1500);
  const NpEns = useNum(0);
  const sx = useNum(150);
  const sy = useNum(150);
  const cIzq = useNum(2000);
  const cDer = useNum(2000);
  const cSup = useNum(2000);
  const cInf = useNum(2000);
  const ha = useNum(300);
  const Nua = useNum(100);
  const Vua = useNum(0);

  const post = esPostinstalado(tipo);
  const nxn = Number(nx);
  const nyn = Number(ny);

  const calc = useMemo(() => {
    const req = [hef.n, da.n, Ase.n, futa.n, fya.n, fc.n, lambda.n, ha.n, cIzq.n, cDer.n, cSup.n, cInf.n];
    if (req.some((v) => !Number.isFinite(v) || v <= 0)) return null;
    if (nxn > 1 && !(sx.n > 0)) return null;
    if (nyn > 1 && !(sy.n > 0)) return null;
    const geometria: GeometriaGrupo = {
      nx: nxn,
      ny: nyn,
      sx: nxn > 1 ? sx.n : 0,
      sy: nyn > 1 ? sy.n : 0,
      cIzq: cIzq.n,
      cDer: cDer.n,
      cSup: cSup.n,
      cInf: cInf.n,
    };
    const e: EntradaAnclaje = {
      tipo,
      categoria,
      combinaciones: comb,
      fc: fc.n,
      lambda: lambda.n,
      da: da.n,
      hef: hef.n,
      Ase: Ase.n,
      futa: futa.n,
      fya: fya.n,
      aceroDuctil: ductil === 'si',
      geometria,
      fisurado: fisurado === 'si',
      refuerzoSuplementario: suplem === 'si',
      Abrg: !post && Abrg.n > 0 ? Abrg.n : undefined,
      NpEnsayo: post && NpEns.n > 0 ? NpEns.n : undefined,
      sismico: sismico === 'si',
      ha: ha.n,
      refuerzoBorde: borde,
      tipoAceroCortante: 'tornillo',
    };
    return { e, geometria, tr: resistenciaTraccionAnclaje(e), cor: resistenciaCortanteAnclaje(e) };
  }, [tipo, categoria, comb, nxn, nyn, fisurado, suplem, ductil, sismico, borde, hef.n, da.n, Ase.n, futa.n, fya.n, fc.n, lambda.n, Abrg.n, NpEns.n, sx.n, sy.n, cIzq.n, cDer.n, cSup.n, cInf.n, ha.n, post]);

  const nuaOk = Number.isFinite(Nua.n) && Nua.n >= 0;
  const vuaOk = Number.isFinite(Vua.n) && Vua.n >= 0;
  const inter = calc && nuaOk && vuaOk && (Nua.n > 0 || Vua.n > 0) ? interaccionTraccionCortante(Nua.n, calc.tr.phiNn, Vua.n, calc.cor.phiVn) : null;

  const datos = calc
    ? [
        ...calc.tr.modos.map((m) => ({ modo: m.clave, valor: Number(m.disenio.toFixed(2)), gob: m === calc.tr.gobernante })),
        ...calc.cor.modos.map((m) => ({ modo: m.clave, valor: Number(m.disenio.toFixed(2)), gob: m === calc.cor.gobernante })),
      ]
    : [];

  const advertencias: string[] = [];
  if (calc) {
    const g = calc.geometria;
    const sMin = separacionMinima(da.n, false);
    if ((nxn > 1 && sx.n < sMin) || (nyn > 1 && sy.n < sMin)) advertencias.push(`Separación menor que 4 da = ${fmt(sMin, 0)} mm (C-D.8.1).`);
    const caMin = Math.min(g.cIzq, g.cDer, g.cSup, g.cInf);
    if (post) {
      const b = bordeMinimoPostinstalado(tipo as Exclude<TipoAnclaje, 'preinstalado'>, da.n);
      if (caMin < b) advertencias.push(`Borde menor que el mínimo sin ensayos específicos de ${fmt(b, 0)} mm (C-D.8.3).`);
      const hMax = hefMaximoPostinstalado(ha.n);
      if (hef.n > hMax) advertencias.push(`hef excede el máximo ${fmt(hMax, 0)} mm para el espesor dado (C-D.8.5).`);
      if (fc.n > 55) advertencias.push('f′c > 55 MPa: los postinstalados requieren ensayos (C-D.3.5).');
    } else {
      if (fc.n > 70) advertencias.push('f′c > 70 MPa excede el límite de C-D.3.5.');
    }
    if (da.n > 50 || hef.n > 635) advertencias.push('da > 50 mm o hef > 635 mm: fuera del alcance de C-D.4.2.2.');
    if (futa.n > futaEfectiva(futa.n, fya.n)) advertencias.push(`futa se limitó a ${fmt(futaEfectiva(futa.n, fya.n), 0)} MPa (menor entre futa, 1.9 fya y 860 MPa).`);
    if (sismico === 'si' && ductil !== 'si') advertencias.push('Zonas DMO/DES: C-D.3.3.4 exige que controle un elemento de acero dúctil (o C-D.3.3.5/C-D.3.3.6).');
    if (sismico === 'si' && post && fisurado !== 'si') advertencias.push('Zonas DMO/DES: se debe suponer concreto fisurado (C-D.3.3.3).');
    advertencias.push(...calc.tr.advertencias);
  }

  const sinDatos = !calc;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Anclaje y acero">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector className="sm:col-span-2" etiqueta="Tipo de anclaje" valor={tipo} onCambio={(v) => setTipo(v as TipoAnclaje)} opciones={OPC_TIPO} />
            {post && <Selector className="sm:col-span-2" etiqueta="Categoría ACI 355.2" valor={String(categoria)} onCambio={(v) => setCategoria(Number(v) as CategoriaPost)} opciones={OPC_CATEGORIA} />}
            <Campo etiqueta="hef" unidad="mm" valor={hef.txt} onCambio={hef.setTxt} min={25} max={635} ayuda="Profundidad efectiva de embebido" />
            <Campo etiqueta="da" unidad="mm" valor={da.txt} onCambio={da.setTxt} min={6} max={50} />
            <Campo etiqueta="Ase,N = Ase,V" unidad="mm²" valor={Ase.txt} onCambio={Ase.setTxt} min={1} ayuda="Área efectiva en la rosca" />
            <Campo etiqueta="futa" unidad="MPa" valor={futa.txt} onCambio={futa.setTxt} min={100} max={1000} />
            <Campo etiqueta="fya" unidad="MPa" valor={fya.txt} onCambio={fya.setTxt} min={100} max={900} />
            <Selector etiqueta="Elemento de acero" valor={ductil} onCambio={setDuctil} opciones={OPC_SI_NO('Dúctil (alarg. > 14 %, A ≥ 30 %)', 'Frágil')} />
            {!post && <Campo etiqueta="Abrg (cabeza)" unidad="mm²" valor={Abrg.txt} onCambio={Abrg.setTxt} min={0} ayuda="Área neta de apoyo; 0 = no evaluar Npn ni Nsb" />}
            {post && <Campo etiqueta="Np (ensayos)" unidad="kN" valor={NpEns.txt} onCambio={NpEns.setTxt} min={0} ayuda="Por anclaje, ACI 355.2; 0 = no evaluar" />}
          </div>
        </Grupo>
        <Grupo titulo="Concreto y condiciones">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="f′c" unidad="MPa" valor={fc.txt} onCambio={fc.setTxt} min={17} max={70} />
            <Campo etiqueta="λ" valor={lambda.txt} onCambio={lambda.setTxt} min={0.75} max={1} ayuda="1.0 peso normal" />
            <Campo etiqueta="ha (espesor)" unidad="mm" valor={ha.txt} onCambio={ha.setTxt} min={50} />
            <Selector etiqueta="Concreto fisurado a nivel de servicio" valor={fisurado} onCambio={setFisurado} opciones={OPC_SI_NO('Fisurado (ψc = 1.0)', 'No fisurado (ψc > 1)')} />
            <Selector etiqueta="Refuerzo suplementario" valor={suplem} onCambio={setSuplem} opciones={OPC_SI_NO('Sí (condición A)', 'No (condición B)')} />
            <Selector etiqueta="Refuerzo de borde (cortante)" valor={borde} onCambio={(v) => setBorde(v as RefuerzoBorde)} opciones={OPC_BORDE} />
            <Selector etiqueta="Combinaciones de carga" valor={comb} onCambio={(v) => setComb(v as CombinacionesCarga)} opciones={OPC_COMB} />
            <Selector etiqueta="Zona DMO/DES (sismo)" valor={sismico} onCambio={setSismico} opciones={OPC_SI_NO('Sí (0.75 φ concreto)', 'No')} />
          </div>
        </Grupo>
        <Grupo titulo="Geometría del grupo (planta)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector etiqueta="Anclajes en x" valor={nx} onCambio={setNx} opciones={OPC_N} />
            <Selector etiqueta="Anclajes en y" valor={ny} onCambio={setNy} opciones={OPC_N} />
            {nxn > 1 && <Campo etiqueta="sx" unidad="mm" valor={sx.txt} onCambio={sx.setTxt} min={1} />}
            {nyn > 1 && <Campo etiqueta="sy" unidad="mm" valor={sy.txt} onCambio={sy.setTxt} min={1} />}
            <Campo etiqueta="Borde izquierdo" unidad="mm" valor={cIzq.txt} onCambio={cIzq.setTxt} min={1} ayuda="Valor grande (2000) = sin borde cercano" />
            <Campo etiqueta="Borde derecho" unidad="mm" valor={cDer.txt} onCambio={cDer.setTxt} min={1} />
            <Campo etiqueta="Borde superior" unidad="mm" valor={cSup.txt} onCambio={cSup.setTxt} min={1} />
            <Campo etiqueta="Borde inferior (ca1 del cortante)" unidad="mm" valor={cInf.txt} onCambio={cInf.setTxt} min={1} ayuda="El cortante actúa hacia este borde" />
          </div>
        </Grupo>
        <Grupo titulo="Cargas mayoradas (opcional)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nua (tracción total)" unidad="kN" valor={Nua.txt} onCambio={Nua.setTxt} min={0} />
            <Campo etiqueta="Vua (cortante total)" unidad="kN" valor={Vua.txt} onCambio={Vua.setTxt} min={0} ayuda="Perpendicular al borde inferior" />
          </div>
          <p className="text-xs text-muted-foreground">Se supone la carga repartida por igual entre los anclajes y sin excentricidad.</p>
        </Grupo>
      </div>

      {sinDatos && <Aviso tipo="error">Revisa los datos: todos deben ser positivos y las separaciones definidas si hay más de un anclaje.</Aviso>}

      {calc && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Valor etiqueta="Nb (Ec. C-D-7)" unidad="kN" valor={fmt(calc.tr.arrancamiento.Nb, 1)} nota={`kc = ${calc.tr.arrancamiento.kc}`} />
            <Valor etiqueta="ANc / ANco" valor={fmt(calc.tr.arrancamiento.Anc / calc.tr.arrancamiento.Anco, 3)} nota={`ANc = ${fmt(calc.tr.arrancamiento.Anc, 0)} mm² · ANco = ${fmt(calc.tr.arrancamiento.Anco, 0)} mm²`} />
            <Valor etiqueta="ψed,N · ψc,N · ψcp,N · ψec,N" valor={`${fmt(calc.tr.arrancamiento.psiEd, 2)} · ${fmt(calc.tr.arrancamiento.psiC, 2)} · ${fmt(calc.tr.arrancamiento.psiCp, 2)} · ${fmt(calc.tr.arrancamiento.psiEc, 2)}`} nota="C-D.5.2.4 a C-D.5.2.7" />
            <Valor etiqueta={calc.tr.arrancamiento.esGrupo ? 'Ncbg' : 'Ncb'} unidad="kN" valor={fmt(calc.tr.arrancamiento.Ncb, 1)} nota="Ecs. C-D-4 / C-D-5" />
            <Valor destacado etiqueta="φNn gobernante (tracción)" unidad="kN" valor={fmt(calc.tr.phiNn, 1)} nota={`Gobierna ${calc.tr.gobernante.clave}`} estado={nuaOk && Nua.n > 0 ? (Nua.n <= calc.tr.phiNn ? 'ok' : 'mal') : 'neutro'} />
            <Valor destacado etiqueta="φVn gobernante (cortante)" unidad="kN" valor={fmt(calc.cor.phiVn, 1)} nota={`Gobierna ${calc.cor.gobernante.clave}`} estado={vuaOk && Vua.n > 0 ? (Vua.n <= calc.cor.phiVn ? 'ok' : 'mal') : 'neutro'} />
            <Valor etiqueta="Vb (Ec. C-D-24)" unidad="kN" valor={fmt(calc.cor.arrancamiento.Vb, 1)} nota={`ℓe = ${fmt(calc.cor.arrancamiento.le, 0)} mm`} />
            <Valor etiqueta="AVc / AVco" valor={fmt(calc.cor.arrancamiento.Avc / calc.cor.arrancamiento.Avco, 3)} nota={`ψed,V ${fmt(calc.cor.arrancamiento.psiEd, 2)} · ψc,V ${fmt(calc.cor.arrancamiento.psiC, 2)} · ψh,V ${fmt(calc.cor.arrancamiento.psiH, 2)}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border p-3">
              <p className="mb-2 text-sm font-semibold">Planta y área proyectada ANc</p>
              <Planta g={calc.geometria} hef={calc.tr.arrancamiento.hefUsado} />
              <p className="mt-2 text-xs text-muted-foreground">Rectángulo discontinuo: ANc (1.5 hef desde los ejes, recortado por los bordes en rojo). Círculos punteados: radio 1.5 hef.</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="mb-2 text-sm font-semibold">φ × resistencia por modo de falla (kN)</p>
              <ChartContainer config={configChart} className="aspect-[4/3] w-full">
                <BarChart data={datos} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="modo" />
                  <YAxis tickFormatter={(x) => String(Math.round(Number(x)))} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{Number(v).toFixed(1)} kN</span>} />} />
                  <Bar dataKey="valor" isAnimationActive={false}>
                    {datos.map((d, i) => (
                      <Cell key={i} fill={d.gob ? 'var(--chart-2)' : 'var(--chart-1)'} fillOpacity={d.gob ? 1 : 0.55} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground">Barra intensa = modo gobernante de tracción (N) y de cortante (V).</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs">
                <tr>
                  <th className="px-2 py-1">Modo</th>
                  <th className="px-2 py-1">Descripción</th>
                  <th className="px-2 py-1 text-right">Nominal (kN)</th>
                  <th className="px-2 py-1 text-right">φ</th>
                  <th className="px-2 py-1 text-right">φ·Nn (kN)</th>
                </tr>
              </thead>
              <tbody>
                {calc.tr.modos.map((m) => (
                  <FilaModo key={m.clave} m={m} gobierna={m === calc.tr.gobernante} />
                ))}
                {calc.cor.modos.map((m) => (
                  <FilaModo key={m.clave} m={m} gobierna={m === calc.cor.gobernante} />
                ))}
              </tbody>
            </table>
          </div>

          {inter && (
            <Aviso tipo={inter.cumple ? 'nota' : 'error'}>
              {inter.caso === 'solo-traccion' && `Vua ≤ 0.2φVn: basta Nua ≤ φNn (C-D.7.1). Nua/φNn = ${fmt(inter.razonN, 3)} → ${inter.cumple ? 'cumple' : 'NO cumple'}.`}
              {inter.caso === 'solo-cortante' && `Nua ≤ 0.2φNn: basta Vua ≤ φVn (C-D.7.2). Vua/φVn = ${fmt(inter.razonV, 3)} → ${inter.cumple ? 'cumple' : 'NO cumple'}.`}
              {inter.caso === 'interaccion' && `Interacción (Ec. C-D-32): Nua/φNn + Vua/φVn = ${fmt(inter.razonN, 3)} + ${fmt(inter.razonV, 3)} = ${fmt(inter.razon, 3)} (límite 1.2) → ${inter.cumple ? 'cumple' : 'NO cumple'}.`}
            </Aviso>
          )}

          <div className="space-y-2">
            {advertencias.map((a, i) => (
              <Aviso key={i} tipo="atencion">
                {a}
              </Aviso>
            ))}
          </div>
        </>
      )}

      <PieCalc>
        Resistencias de C-D.5 y C-D.6; φ de C-D.4.4/C-D.4.5 por modo (condición A/B según refuerzo suplementario; extracción y cabeceo siempre condición B). Cortante perpendicular al borde inferior con fila crítica = la más cercana. Para ψec, excentricidades, ψcp,N con cac definido y casos fuera del rectángulo (3 o más bordes: hef reducido) revisa C-D.5.2; no se incluyen refuerzo del anclaje (C-D.5.2.9), placas añadidas (C-D.5.2.8) ni cortante paralelo al borde.
      </PieCalc>
    </div>
  );
}
