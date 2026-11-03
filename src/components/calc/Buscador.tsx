import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type Resultado = { url: string; titulo: string; extracto: string };
type PagefindApi = {
  search: (q: string) => Promise<{ results: Array<{ data: () => Promise<{ url: string; excerpt: string; meta: { title?: string } }> }> }>;
};

/** Búsqueda de texto completo con Pagefind (el índice se genera en `npm run build`). */
export default function Buscador() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Resultado[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-indice'>('cargando');
  const [buscando, setBuscando] = useState(false);
  const api = useRef<PagefindApi | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = '/pagefind/pagefind.js';
        api.current = (await import(/* @vite-ignore */ url)) as PagefindApi;
        setEstado('listo');
      } catch {
        setEstado('sin-indice');
      }
    })();
    const p = new URLSearchParams(window.location.search).get('q');
    if (p) setQ(p);
  }, []);

  useEffect(() => {
    let vigente = true;
    (async () => {
      if (!api.current || q.trim().length < 2) {
        setBuscando(false);
        return setRes([]);
      }
      setBuscando(true);
      const r = await api.current.search(q.trim());
      const datos = await Promise.all(r.results.slice(0, 20).map((x) => x.data()));
      if (vigente) {
        setRes(datos.map((d) => ({ url: d.url, titulo: d.meta.title ?? d.url, extracto: d.excerpt })));
        setBuscando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [q, estado]);

  return (
    <div className="space-y-4">
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Busca: deriva, espectro, Fa, perfil de suelo, A.4.2…"
        className="h-11 text-base"
        aria-label="Buscar en el sitio"
      />
      {estado === 'sin-indice' && (
        <p className="rounded-lg border border-warn/50 bg-warn/10 p-3 text-sm">
          El índice de búsqueda se genera al construir el sitio. Ejecuta <code>npm run build</code> y <code>npm run preview</code> para usarlo.
        </p>
      )}
      {buscando && <p className="text-sm text-muted-foreground">Buscando…</p>}
      {estado === 'listo' && !buscando && q.trim().length >= 2 && res.length === 0 && <p className="text-sm text-muted-foreground">Sin resultados para «{q}».</p>}
      <ul className="space-y-3">
        {res.map((r) => (
          <li key={r.url} className="rounded-xl border bg-card p-4">
            <a href={r.url} className="text-base font-semibold text-primary hover:underline">{r.titulo}</a>
            <p className="mt-1 text-sm text-muted-foreground [&_mark]:rounded [&_mark]:bg-warn/30 [&_mark]:px-0.5 [&_mark]:text-foreground" dangerouslySetInnerHTML={{ __html: r.extracto }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
