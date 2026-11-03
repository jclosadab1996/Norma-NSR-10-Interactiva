import { useState } from 'react';
import { TABLA_FA, TABLA_FV, COLUMNAS_INTENSIDAD, GRUPOS_USO, type PerfilSueloConCoef } from '@/data/tablas';
import { perfilPorVs, velocidadMediaCortante } from '@/lib/nsr10';
import { Aviso, Campo, Grupo, PieCalc, Valor, fmt, useNum } from './ui';
import { useSitio } from './sitio';
import { cn } from '@/lib/utils';

const PERFILES: PerfilSueloConCoef[] = ['A', 'B', 'C', 'D', 'E'];

export default function EfectosLocales() {
  const { sitio, campos } = useSitio();
  const vs = useNum(300);
  const [estratos, setEstratos] = useState([
    { espesor: '10', vs: '200' },
    { espesor: '20', vs: '400' },
  ]);

  const vsMedia = velocidadMediaCortante(
    estratos.map((e) => ({ espesor: Number(e.espesor.replace(',', '.')), vs: Number(e.vs.replace(',', '.')) })).filter((e) => e.espesor > 0 && e.vs > 0),
  );
  const sugerido = Number.isFinite(vs.n) && vs.n > 0 ? perfilPorVs(vs.n) : null;

  return (
    <div className="space-y-5">
      {campos}

      {sitio.perfil === 'F' ? (
        <Aviso tipo="atencion">
          Para el perfil tipo F la norma no da coeficientes: exige una investigación geotécnica particular y un análisis de
          amplificación de onda (A.2.10).
        </Aviso>
      ) : sitio.valido ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Valor destacado etiqueta="Fa (períodos cortos)" valor={fmt(sitio.fa!, 2)} nota={`Perfil ${sitio.perfil}, Aa = ${fmt(sitio.aa, 2)} (interpolado)`} />
          <Valor destacado etiqueta="Fv (períodos intermedios)" valor={fmt(sitio.fv!, 2)} nota={`Perfil ${sitio.perfil}, Av = ${fmt(sitio.av, 2)} (interpolado)`} />
          <Valor destacado etiqueta={`I — Grupo ${sitio.grupo}`} valor={fmt(sitio.i, 2)} nota={GRUPOS_USO.find((g) => g.grupo === sitio.grupo)?.nombre} />
        </div>
      ) : (
        <Aviso tipo="error">Revisa Aa y Av: deben ser números entre 0.05 y 0.50.</Aviso>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {([['Fa', TABLA_FA, 'Aa'], ['Fv', TABLA_FV, 'Av']] as const).map(([nombre, tabla, col]) => (
          <div key={nombre} className="overflow-x-auto rounded-lg border">
            <table className="w-full text-center text-sm">
              <caption className="bg-muted/50 px-3 py-1.5 text-left text-xs font-semibold">
                Tabla A.2.4-{nombre === 'Fa' ? '3' : '4'} — Coeficiente {nombre}
              </caption>
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-2 py-1 text-left">Perfil</th>
                  {COLUMNAS_INTENSIDAD.map((c, i) => (
                    <th key={c} className="px-2 py-1">
                      {i === 0 ? `${col} ≤ 0.1` : i === 4 ? `${col} ≥ 0.5` : `${col} = ${c.toFixed(1)}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERFILES.map((p) => (
                  <tr key={p} className={cn('border-b last:border-0', sitio.perfil === p && 'bg-primary/10 font-semibold')}>
                    <td className="px-2 py-1 text-left">{p}</td>
                    {tabla[p].map((v, i) => (
                      <td key={i} className="px-2 py-1 font-mono">
                        {v.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <Grupo titulo="¿Qué perfil de suelo tengo? (ayuda con vs, A.2.4.3.1)">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Campo etiqueta="Velocidad media de onda de cortante vs" unidad="m/s" valor={vs.txt} onCambio={vs.setTxt} min={50} max={3000} />
            {sugerido && (
              <Valor etiqueta="Perfil sugerido por vs" valor={sugerido.perfil} nota={`${sugerido.motivo} (Tabla A.2.4-1). La clasificación real también considera arcillas blandas, N, su y perfil F.`} />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">O calcula vs de varios estratos (30 m superiores)</p>
            {estratos.map((e, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Campo etiqueta={`Espesor d${i + 1}`} unidad="m" valor={e.espesor} onCambio={(v) => setEstratos(estratos.map((x, k) => (k === i ? { ...x, espesor: v } : x)))} />
                <Campo etiqueta={`vs${i + 1}`} unidad="m/s" valor={e.vs} onCambio={(v) => setEstratos(estratos.map((x, k) => (k === i ? { ...x, vs: v } : x)))} />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-accent" onClick={() => setEstratos([...estratos, { espesor: '5', vs: '300' }])}>
                + Estrato
              </button>
              {estratos.length > 1 && (
                <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-accent" onClick={() => setEstratos(estratos.slice(0, -1))}>
                  − Quitar
                </button>
              )}
              <span className="ml-auto font-mono text-sm">
                vs = {Number.isFinite(vsMedia) ? fmt(vsMedia, 1) : '—'} m/s
              </span>
            </div>
          </div>
        </div>
      </Grupo>
      <PieCalc>Fa y Fv se interpolan linealmente entre columnas del mismo perfil (A.2.4.5.5 y A.2.4.5.6).</PieCalc>
    </div>
  );
}
