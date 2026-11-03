import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TEMAS_GLOSARIO,
  definiciones,
  inicialDe,
  prefijosSI,
  reglasSI,
  simbolos,
  textoPlano,
  type TemaGlosario,
} from '@/data/glosario';
import { cn } from '@/lib/utils';
import { PieCalc } from './ui';

/** Minúsculas sin tildes (conserva la longitud de cada carácter para poder resaltar sobre el original). */
const plano = (s: string) =>
  Array.from(s)
    .map((c) => {
      const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return n.length === 1 ? n : c.toLowerCase().charAt(0) || c;
    })
    .join('');

/** Resalta las coincidencias de `q` (sin distinguir tildes ni mayúsculas) dentro de `texto`. */
function Resaltar({ texto, q }: { texto: string; q: string }): ReactNode {
  if (!q) return texto;
  const t = plano(texto);
  if (t.length !== texto.length) return texto;
  const partes: ReactNode[] = [];
  let desde = 0;
  let i = t.indexOf(q, desde);
  if (i < 0) return texto;
  let k = 0;
  while (i >= 0) {
    if (i > desde) partes.push(texto.slice(desde, i));
    partes.push(
      <mark key={k++} className="rounded-sm bg-warn/30 px-0.5 text-foreground">
        {texto.slice(i, i + q.length)}
      </mark>,
    );
    desde = i + q.length;
    i = t.indexOf(q, desde);
  }
  if (desde < texto.length) partes.push(texto.slice(desde));
  return partes;
}

/** Convierte `x_{sub}` y `x^{sup}` en <sub>/<sup> y resalta coincidencias en el texto plano. */
function Rico({ texto, q = '' }: { texto: string; q?: string }) {
  const trozos = texto.split(/([_^]\{[^}]*\})/g).filter((t) => t !== '');
  return (
    <>
      {trozos.map((t, i) => {
        const m = /^([_^])\{([^}]*)\}$/.exec(t);
        if (!m) return <Fragment key={i}><Resaltar texto={t} q={q} /></Fragment>;
        return m[1] === '_' ? (
          <sub key={i} className="text-[0.7em]">{m[2]}</sub>
        ) : (
          <sup key={i} className="text-[0.7em]">{m[2]}</sup>
        );
      })}
    </>
  );
}

/** Enlace a la página del capítulo o apéndice cuando la referencia es del Título A. */
function hrefSeccion(ref?: string): string | undefined {
  if (!ref) return undefined;
  const cap = /^A\.(\d{1,2})(?:\.|$)/.exec(ref);
  if (cap && Number(cap[1]) >= 1 && Number(cap[1]) <= 13) return `/titulo-a/a${cap[1]}`;
  const ap = /^A-(\d)$/.exec(ref);
  if (ap) return `/titulo-a/apendice-a${ap[1]}`;
  return undefined;
}

function ChipRef({ s }: { s: string }) {
  const href = hrefSeccion(s);
  const cls = 'rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground';
  return href ? (
    <a href={href} className={cn(cls, 'hover:border-primary/50 hover:text-foreground')} title="Ir al capítulo">
      § {s}
    </a>
  ) : (
    <span className={cls}>§ {s}</span>
  );
}

const NOMBRE_TEMA = Object.fromEntries(TEMAS_GLOSARIO.map((t) => [t.id, t.nombre])) as Record<TemaGlosario, string>;
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function Glosario() {
  const [q, setQ] = useState('');
  const [tema, setTema] = useState<TemaGlosario | 'todos'>('todos');
  const [pestana, setPestana] = useState('definiciones');

  const nq = plano(q.trim());

  const defs = useMemo(
    () =>
      definiciones.filter(
        (d) => (tema === 'todos' || d.tema === tema) && (!nq || plano(d.termino).includes(nq) || plano(d.definicion).includes(nq)),
      ),
    [nq, tema],
  );

  const grupos = useMemo(() => {
    const m = new Map<string, typeof definiciones[number][]>();
    for (const d of defs) {
      const l = inicialDe(d.termino);
      m.set(l, [...(m.get(l) ?? []), d]);
    }
    return m;
  }, [defs]);

  const simbs = useMemo(
    () =>
      simbolos.filter(
        (s) => !nq || plano(textoPlano(s.simbolo).replace(/̄/g, '')).includes(nq) || plano(textoPlano(s.significado)).includes(nq) || plano(s.ref ?? '').includes(nq),
      ),
    [nq],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="gl-q" className="text-sm font-medium">Buscar término, símbolo o palabra de la definición</Label>
        <div className="relative">
          <Input
            id="gl-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej.: deriva, diafragma, Fa, período fundamental…"
            className="h-10 pr-20"
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute inset-y-1 right-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <Tabs value={pestana} onValueChange={setPestana} className="gap-4">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="definiciones" className="px-3 py-1.5">
            Definiciones <span className="ml-1 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{defs.length}</span>
          </TabsTrigger>
          <TabsTrigger value="nomenclatura" className="px-3 py-1.5">
            Nomenclatura <span className="ml-1 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{simbs.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definiciones" className="space-y-4">
          <div role="group" aria-label="Filtrar por tema" className="flex flex-wrap gap-1.5">
            {[{ id: 'todos' as const, nombre: 'Todos los temas' }, ...TEMAS_GLOSARIO].map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tema === t.id}
                onClick={() => setTema(t.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tema === t.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                )}
              >
                {t.nombre}
              </button>
            ))}
          </div>
          {tema !== 'todos' && (
            <p className="text-sm text-muted-foreground">{TEMAS_GLOSARIO.find((t) => t.id === tema)?.descripcion}</p>
          )}

          {/* Índice de letras */}
          <nav
            aria-label="Índice alfabético"
            className="z-10 -mx-1 lg:sticky lg:top-[6.5rem] flex flex-wrap gap-0.5 rounded-lg border bg-background/90 p-1.5 backdrop-blur"
          >
            {LETRAS.map((l) =>
              grupos.has(l) ? (
                <a key={l} href={`#gl-${l}`} className="grid size-7 place-items-center rounded-md text-sm font-semibold text-primary hover:bg-accent">
                  {l}
                </a>
              ) : (
                <span key={l} aria-hidden="true" className="grid size-7 place-items-center rounded-md text-sm text-muted-foreground/40">
                  {l}
                </span>
              ),
            )}
          </nav>

          {defs.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sin resultados. Prueba con otra palabra o quita el filtro de tema.
            </p>
          ) : (
            <div className="space-y-6">
              {[...grupos.entries()].map(([letra, items]) => (
                <section key={letra} aria-labelledby={`gl-${letra}`} className="scroll-mt-44" id={`gl-${letra}`}>
                  <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-primary">
                    {letra}
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  </h2>
                  <dl className="divide-y rounded-xl border bg-card">
                    {items.map((d) => (
                      <div key={d.termino} className="px-4 py-3">
                        <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-semibold"><Resaltar texto={d.termino} q={nq} /></span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{NOMBRE_TEMA[d.tema]}</span>
                          {d.seccionRelacionada && <ChipRef s={d.seccionRelacionada} />}
                        </dt>
                        <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                          <Resaltar texto={d.definicion} q={nq} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nomenclatura" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Variables usadas en el Título A (A.13.2), en el orden de la norma. Las remisiones «§» llevan al capítulo donde se define cada una.
          </p>
          {simbs.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Sin símbolos que coincidan con la búsqueda.</p>
          ) : (
            <dl className="divide-y rounded-xl border bg-card">
              {simbs.map((s) => (
                <div key={s.simbolo} className="grid grid-cols-1 gap-x-3 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[7rem_1fr] sm:px-4">
                  <dt className="font-serif text-lg font-semibold italic leading-snug text-primary break-words">
                    <Rico texto={s.simbolo} q={nq} />
                  </dt>
                  <dd className="text-sm leading-relaxed">
                    <span className="mr-1 hidden text-muted-foreground sm:inline" aria-hidden="true">=</span>
                    <Rico texto={s.significado} q={nq} />
                    {s.ref && (
                      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                        {s.ref.split(',').map((r) => <ChipRef key={r} s={r.trim()} />)}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Sistema Internacional (SI): prefijos y reglas de escritura</summary>
            <div className="space-y-4 border-t p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="py-1 pr-3">Prefijo</th><th className="py-1 pr-3">Símbolo</th><th className="py-1 pr-3">Potencia</th><th className="py-1 text-right">Valor</th></tr>
                  </thead>
                  <tbody>
                    {prefijosSI.map((p) => (
                      <tr key={p.nombre} className="border-t">
                        <td className="py-1 pr-3">{p.nombre}</td>
                        <td className="py-1 pr-3 font-mono">{p.simbolo}</td>
                        <td className="py-1 pr-3 font-mono"><Rico texto={p.potencia} /></td>
                        <td className="whitespace-nowrap py-1 text-right font-mono text-xs sm:text-sm">{p.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ol className="space-y-1.5 text-sm">
                {reglasSI.map((r) => (
                  <li key={r.letra} className="flex gap-2">
                    <span className="font-semibold">({r.letra})</span>
                    <span><Rico texto={r.regla} /></span>
                  </li>
                ))}
              </ol>
            </div>
          </details>
        </TabsContent>
      </Tabs>

      <PieCalc>Textos tomados del Capítulo A.13 de la NSR-10 (págs. A-125 a A-138); el tema y los enlaces son una organización didáctica de esta web.</PieCalc>
    </div>
  );
}
