/**
 * En MDX los elementos JSX escritos en minúscula (<svg>, <text>, <path>…) llegan al HTML con los nombres
 * de atributo tal cual se escribieron, y el navegador ignora `strokeWidth`, `textAnchor`, `fillOpacity`…
 * (HTML/SVG usan guiones). Este plugin convierte a la forma SVG correcta los atributos camelCase de los
 * elementos JSX minúscula, de modo que se pueda escribir cualquiera de las dos formas.
 * (`viewBox`, `preserveAspectRatio`, `gradientUnits`, etc. son camelCase legítimos en SVG y no se tocan.)
 */
const MAPA = {
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  clipRule: 'clip-rule',
  strokeWidth: 'stroke-width',
  strokeOpacity: 'stroke-opacity',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  textAnchor: 'text-anchor',
  dominantBaseline: 'dominant-baseline',
  alignmentBaseline: 'alignment-baseline',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontFamily: 'font-family',
  fontStyle: 'font-style',
  letterSpacing: 'letter-spacing',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  markerStart: 'marker-start',
  markerMid: 'marker-mid',
  markerEnd: 'marker-end',
  clipPath: 'clip-path',
  vectorEffect: 'vector-effect',
  shapeRendering: 'shape-rendering',
  textDecoration: 'text-decoration',
};

/** Recorre un AST estree (expresiones `{…}` y bloques `export`) y renombra atributos JSX de elementos minúscula. */
function recorrerEstree(n) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) {
    for (const x of n) recorrerEstree(x);
    return;
  }
  if (n.type === 'JSXOpeningElement' && n.name?.type === 'JSXIdentifier' && /^[a-z]/.test(n.name.name)) {
    for (const a of n.attributes ?? []) {
      if (a.type === 'JSXAttribute' && a.name?.type === 'JSXIdentifier' && MAPA[a.name.name]) a.name.name = MAPA[a.name.name];
    }
  }
  for (const k of Object.keys(n)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
    const v = n[k];
    if (v && typeof v === 'object') recorrerEstree(v);
  }
}

function recorrer(nodo) {
  if ((nodo.type === 'mdxJsxFlowElement' || nodo.type === 'mdxJsxTextElement') && typeof nodo.name === 'string' && /^[a-z]/.test(nodo.name)) {
    for (const a of nodo.attributes ?? []) {
      if (a.type === 'mdxJsxAttribute' && MAPA[a.name]) a.name = MAPA[a.name];
    }
  }
  // Atributos con expresión (p. ej. strokeWidth={2}) y JSX dentro de expresiones o de bloques `export`.
  if (nodo.data?.estree) recorrerEstree(nodo.data.estree);
  for (const at of nodo.attributes ?? []) {
    if (at?.value && typeof at.value === 'object' && at.value.data?.estree) recorrerEstree(at.value.data.estree);
  }
  for (const h of nodo.children ?? []) recorrer(h);
}

export default function remarkSvgAtributos() {
  return (arbol) => recorrer(arbol);
}
