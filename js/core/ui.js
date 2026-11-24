// ============================================================
//  Componentes de interfaz: DOM, hojas, modales, avisos.
// ============================================================

// h('div.clase#id', {attrs}, ...hijos)
export function h(sel, attrs, ...hijos) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs != null) hijos.unshift(attrs);
    attrs = {};
  }
  const [, tag = 'div', resto = ''] = sel.match(/^([a-z0-9]*)(.*)$/i);
  const el = document.createElement(tag || 'div');
  resto.replace(/([.#])([\w-]+)/g, (_, t, v) => { t === '.' ? el.classList.add(v) : (el.id = v); });
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else if (k === 'class') el.className += ' ' + v;
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function vaciar(el) { while (el.firstChild) el.firstChild.remove(); return el; }

// ---------- Aviso breve ----------
export function aviso(texto, { accion, alTocar, duracion = 3500 } = {}) {
  const cont = $('#avisos');
  const t = h('div.aviso', texto,
    accion && h('button.btn.btn-chico.btn-destaque', { onclick: () => { alTocar?.(); t.remove(); } }, accion));
  cont.append(t);
  if (duracion) setTimeout(() => t.remove(), duracion);
  return t;
}

// ---------- Hoja inferior / modal ----------
export function hoja(titulo, contenido, { botones = [], ancho = false, alCerrar } = {}) {
  return new Promise(resolver => {
    const fondo = h('div.hoja-fondo');
    const cerrar = (valor) => {
      fondo.classList.add('saliendo');
      setTimeout(() => fondo.remove(), 180);
      alCerrar?.(valor);
      resolver(valor);
    };
    const pie = botones.length ? h('div.hoja-pie', botones.map(b =>
      h(`button.btn${b.clase ? '.' + b.clase : ''}`, {
        onclick: async () => {
          if (b.accion) { const r = await b.accion(); if (r === false) return; cerrar(r ?? b.valor); }
          else cerrar(b.valor);
        },
      }, b.texto))) : null;
    const panel = h(`div.hoja${ancho ? '.hoja-ancha' : ''}`,
      h('div.hoja-cab', h('h2', titulo), h('button.btn-icono', { 'aria-label': 'Cerrar', onclick: () => cerrar(undefined) }, '✕')),
      h('div.hoja-cuerpo', contenido),
      pie);
    fondo.append(panel);
    fondo.addEventListener('pointerdown', e => { if (e.target === fondo) cerrar(undefined); });
    document.body.append(fondo);
    const primer = panel.querySelector('input:not([type=checkbox]):not([type=file]), textarea, select');
    if (primer && !matchMedia('(pointer:coarse)').matches) primer.focus();
    fondo.cerrar = cerrar;
  });
}

export function confirmar(texto, { si = 'Sí', no = 'Cancelar', peligro = false } = {}) {
  return hoja('Confirmar', h('p', texto), {
    botones: [
      { texto: no, valor: false, clase: 'btn-sec' },
      { texto: si, valor: true, clase: peligro ? 'btn-peligro' : 'btn-prim' },
    ],
  }).then(Boolean);
}

export function pedirTexto(titulo, valor = '', { placeholder = '', multilinea = false } = {}) {
  const inp = multilinea
    ? h('textarea.campo', { rows: 4, placeholder }, valor)
    : h('input.campo', { value: valor, placeholder });
  return hoja(titulo, inp, {
    botones: [
      { texto: 'Cancelar', valor: null, clase: 'btn-sec' },
      { texto: 'OK', clase: 'btn-prim', accion: () => inp.value },
    ],
  }).then(v => (v === undefined ? null : v));
}

// Menú de acciones: [{texto, valor, peligro}]
export function menu(titulo, opciones) {
  let fondo;
  const lista = h('div.menu-lista', opciones.map(o =>
    h(`button.menu-item${o.peligro ? '.peligro' : ''}${o.activo ? '.activo' : ''}`,
      { onclick: () => fondo?.cerrar(o.valor) },
      o.color && h('span.punto', { style: { background: o.color } }),
      o.texto)));
  const p = hoja(titulo, lista);
  fondo = $$('.hoja-fondo').pop();
  return p;
}

// ---------- Campos de formulario ----------
export function campo(etiqueta, input, { ayuda } = {}) {
  return h('label.form-campo', h('span.form-etq', etiqueta), input, ayuda && h('small.form-ayuda', ayuda));
}

export function select(opciones, valor, attrs = {}) {
  return h('select.campo', attrs, opciones.map(o => {
    const [v, t] = Array.isArray(o) ? o : typeof o === 'object' ? [o.id, o.nombre] : [o, o];
    return h('option', { value: v, selected: String(v) === String(valor) }, t);
  }));
}

export function chips(opciones, activos, alCambiar, { multiple = true } = {}) {
  const sel = new Set(activos);
  const cont = h('div.chips');
  const pintar = () => {
    vaciar(cont);
    opciones.forEach(o => cont.append(h(`button.chip${sel.has(o.id) ? '.activo' : ''}`, {
      onclick: () => {
        if (sel.has(o.id)) sel.delete(o.id);
        else { if (!multiple) sel.clear(); sel.add(o.id); }
        pintar();
        alCambiar([...sel]);
      },
    }, o.color && h('span.punto', { style: { background: o.color } }), o.nombre)));
  };
  pintar();
  return cont;
}

export function vacio(texto, boton) {
  return h('div.vacio', h('p', texto), boton);
}

export function fechaLarga(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function fechaCorta(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

export function lineas(txt) { return String(txt || '').split('\n').map(s => s.trim()).filter(Boolean); }
