// ============================================================
//  EDITOR DE PIZARRA — un solo editor reutilizable.
//  abrirPizarra(id, { titulo, jugadores }) → Promise<pizarra>
// ============================================================
import * as db from '../core/db.js';
import { nuevaPizarra } from '../core/model.js';
import { h, hoja, aviso, campo, select, menu, pedirTexto, vaciar } from '../core/ui.js';
import { entregarArchivo } from '../core/archivos.js';
import { CONFIG } from '../../config.js';
import { encuadrar, dibujarEscena, ordenToque, MARGEN } from './render.js';
import { toca, manijas, TIPOS, COLORES_ZONA, COLORES_FLECHA, radioJugador } from './elementos.js';
import { crearGestos } from './gestos.js';
import { crearHistorial } from './historial.js';
import { ICONOS, BARRA, crear, r2, siguienteDorsal } from './herramientas.js';
import { aPNG } from './exportar.js';

// Crea la pizarra si no existe y devuelve el registro.
export async function asegurarPizarra(id, duenio, espacioTipo = 'completa') {
  let p = id ? await db.obtener('pizarras', id) : null;
  if (!p) { p = nuevaPizarra(duenio, espacioTipo); await db.guardar('pizarras', p); }
  return p;
}

export function abrirPizarra(id, opciones = {}) {
  return new Promise(async (resolver) => {
    const piz = await asegurarPizarra(id, opciones.duenio, opciones.espacioTipo);
    if (opciones.titulo) piz.nombre = opciones.titulo;
    new Editor(piz, opciones, resolver);
  });
}

class Editor {
  constructor(piz, opc, resolver) {
    this.piz = piz;
    this.opc = opc;
    this.resolver = resolver;
    this.cuadro = 0;
    this.herr = 'sel';
    this.subs = { material: 'cono', flecha: 'pase', zona: 'zona_rect' };
    this.sel = null;
    this.accion = null;
    this.temporal = null;
    this.vista = { s: 1, ox: 0, oy: 0 };
    this.vistaFit = null;
    this.hist = crearHistorial(
      () => ({ e: this.piz.elementos, c: this.piz.cuadros, s: this.piz.espacio }),
      (x) => { this.piz.elementos = x.e; this.piz.cuadros = x.c; this.piz.espacio = x.s; this.sel = null; this.pintar(); },
    );
    this.construir();
  }

  get estados() { return this.piz.cuadros[this.cuadro].estados; }

  // ---------- Interfaz ----------
  construir() {
    const izq = h('div.pz-barra.pz-izq', BARRA.map(t => {
      const b = h('button.pz-btn', { 'data-herr': t.id, title: t.nombre, 'aria-label': t.nombre, onclick: () => this.elegir(t) });
      b.innerHTML = ICONOS[t.subs ? this.subs[t.id] : t.id];
      if (t.subs) b.append(h('span.pz-mas', '▸'));
      return b;
    }));
    const der = h('div.pz-barra.pz-der',
      this.boton('deshacer', 'Deshacer', () => { if (this.hist.deshacer()) this.cambio(); }, 'pz-edita'),
      this.boton('rehacer', 'Rehacer', () => { if (this.hist.rehacer()) this.cambio(); }, 'pz-edita'),
      this.boton('borrar', 'Borrar seleccionado', () => this.borrarSel(), 'pz-edita'),
      this.boton('encuadrar', 'Encuadrar', () => { this.encuadrar(); }),
      this.boton('espacio', 'Espacio y medidas', () => this.configEspacio(), 'pz-edita'),
      this.boton('png', 'Exportar imagen', () => this.exportar()),
      h('div.pz-flex'),
      this.boton('listo', 'Listo', () => this.cerrar(), 'pz-listo'),
    );
    this.canvas = h('canvas.pz-canvas');
    this.minibar = h('div.pz-minibar');
    this.pop = h('div.pz-pop');
    this.titulo = h('div.pz-titulo', this.piz.nombre || 'Pizarra');
    this.lienzo = h('div.pz-lienzo', this.canvas, this.titulo, this.minibar, this.pop,
      h('div.pz-girar', h('div.pz-girar-ico', '📱↻'), h('p', 'Girá el celu para editar')));
    this.raiz = h('div.pz', izq, this.lienzo, der);
    this.izq = izq;
    // Las hojas abiertas antes (ej: formulario de tarea) se esconden mientras se edita.
    this.hojasPrevias = [...document.querySelectorAll('.hoja-fondo')];
    this.hojasPrevias.forEach(x => x.classList.add('oculta-pz'));
    document.body.append(this.raiz);
    document.body.classList.add('pz-abierta');

    this.ctx = this.canvas.getContext('2d');
    this.gestos = crearGestos(this.canvas, {
      vista: () => this.vista,
      limites: () => ({ min: this.vistaFit.s * 0.6, max: this.vistaFit.s * 8 }),
      alInicio: (p, e) => this.inicio(p, e),
      alMover: (p) => this.mover(p),
      alFin: (p, i) => this.fin(p, i),
      alCancelar: () => this.cancelar(),
      alCambiarVista: (v) => { this.vista = { ...this.vista, ...v }; this.ocultarMinibar(); this.pintar(); },
    });
    this.ro = new ResizeObserver(() => this.redimensionar());
    this.ro.observe(this.lienzo);
    this.marcarHerr();

    // Botón "atrás" de Android cierra la pizarra.
    history.pushState({ pizarra: true }, '');
    this.alAtras = () => this.cerrar(true);
    window.addEventListener('popstate', this.alAtras);
    this.alTecla = (e) => this.tecla(e);
    window.addEventListener('keydown', this.alTecla);
  }

  boton(icono, nombre, fn, clase = '') {
    const b = h(`button.pz-btn${clase ? '.' + clase : ''}`, { title: nombre, 'aria-label': nombre, onclick: fn });
    b.innerHTML = ICONOS[icono];
    return b;
  }

  elegir(t) {
    this.cerrarPop();
    if (t.subs) {
      // Si ya está activa, abre el menú de sub-herramientas.
      if (this.herr === t.id) return this.abrirPop(t);
      this.herr = t.id;
      this.marcarHerr();
      this.abrirPop(t);
      return;
    }
    this.herr = t.id;
    this.marcarHerr();
  }

  abrirPop(t) {
    const btn = this.izq.querySelector(`[data-herr="${t.id}"]`);
    vaciar(this.pop);
    t.subs.forEach(([id, nombre]) => {
      const b = h(`button.pz-btn.pz-sub${this.subs[t.id] === id ? '.activo' : ''}`, {
        title: nombre, onclick: () => { this.subs[t.id] = id; btn.innerHTML = ICONOS[id]; btn.append(h('span.pz-mas', '▸')); this.cerrarPop(); },
      });
      b.innerHTML = ICONOS[id];
      b.append(h('span.pz-sub-txt', nombre));
      this.pop.append(b);
    });
    const r = btn.getBoundingClientRect(), rl = this.lienzo.getBoundingClientRect();
    this.pop.style.top = Math.max(4, Math.min(r.top - rl.top, rl.height - t.subs.length * 50 - 8)) + 'px';
    this.pop.classList.add('visible');
  }
  cerrarPop() { this.pop.classList.remove('visible'); }

  marcarHerr() {
    this.izq.querySelectorAll('[data-herr]').forEach(b => b.classList.toggle('activo', b.dataset.herr === this.herr));
    this.canvas.dataset.herr = this.herr;
  }

  redimensionar() {
    const r = this.lienzo.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
    this.dpr = dpr;
    this.vertical = matchMedia('(pointer:coarse)').matches && r.height > r.width * 1.05 && innerHeight > innerWidth;
    this.raiz.classList.toggle('vertical', this.vertical);
    this.encuadrar();
  }

  encuadrar() {
    this.vistaFit = encuadrar(this.piz.espacio, this.w, this.h);
    this.vista = { ...this.vistaFit };
    this.ocultarMinibar();
    this.pintar();
  }

  pintar() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      dibujarEscena(ctx, this.piz, this.cuadro, this.vista, { w: this.w, h: this.h, seleccion: this.sel, temporal: this.temporal });
      if (this.sel && !this.accion) this.mostrarMinibar();
    });
  }

  // ---------- Coordenadas ----------
  aMundo(p) { return { x: (p.x - this.vista.ox) / this.vista.s, y: (p.y - this.vista.oy) / this.vista.s }; }
  limitar(m) {
    const e = this.piz.espacio;
    return { x: Math.max(-MARGEN, Math.min(e.largo + MARGEN, m.x)), y: Math.max(-MARGEN, Math.min(e.ancho + MARGEN, m.y)) };
  }

  tocado(p) {
    if (this.sel) {
      const el = this.piz.elementos.find(e => e.id === this.sel);
      const st = this.estados[this.sel];
      if (el && st) for (const m of manijas(el, st, this.vista)) if (Math.hypot(p.x - m.x, p.y - m.y) < 22) return { el, parte: m.parte };
    }
    for (const el of ordenToque(this.piz.elementos)) {
      if (toca(this.ctx, el, this.estados[el.id], this.vista, p.x, p.y, 8)) return { el, parte: 'cuerpo' };
    }
    return null;
  }

  // ---------- Gestos de un dedo ----------
  tipoActual() {
    if (this.herr === 'material') return this.subs.material;
    if (this.herr === 'zona') return this.subs.zona;
    return this.herr;
  }

  inicio(p, e) {
    this.cerrarPop();
    this.ocultarMinibar();
    if (this.vertical) return;
    const m = this.limitar(this.aMundo(p));
    const t = this.tocado(p);
    this.hist.abrir();

    if (t && t.parte !== 'cuerpo') {
      this.accion = { tipo: t.parte, id: t.el.id, p0: p };
      return;
    }
    if (this.herr === 'flecha') {
      let ini = m;
      let desde = null;
      if (t && ['propio', 'rival', 'pelota'].includes(t.el.tipo)) { const s = this.estados[t.el.id]; ini = { x: s.x, y: s.y }; desde = t.el; }
      const c = crear('flecha', ini.x, ini.y, { claseFlecha: this.subs.flecha });
      c.el.estilo.color = this.ultimoColorFlecha || c.el.estilo.color;
      this.temporal = c;
      this.accion = { tipo: 'crearFlecha', desde };
      return;
    }
    if (this.herr === 'zona') {
      const c = crear(this.subs.zona, m.x, m.y);
      c.st.w = 0; c.st.h = 0;
      this.temporal = c;
      this.accion = { tipo: 'crearZona', m0: m };
      return;
    }
    if (t) {
      const st = this.estados[t.el.id];
      // Con una herramienta de colocar: tocar = colocar encima (ej: pelota al pie), arrastrar = mover.
      const colocaEncima = this.herr !== 'sel';
      if (!colocaEncima) { this.sel = t.el.id; this.pintar(); }
      this.accion = { tipo: 'mover', id: t.el.id, dx: st.x - m.x, dy: st.y - m.y, colocar: colocaEncima ? m : null };
      return;
    }
    if (this.herr === 'sel') {
      this.sel = null;
      this.accion = e.pointerType === 'mouse' ? { tipo: 'pan', p0: p, v0: { ...this.vista } } : { tipo: 'nada' };
      this.pintar();
      return;
    }
    this.accion = { tipo: 'colocar', m };
  }

  mover(p) {
    const a = this.accion; if (!a) return;
    if (a.colocar && a.id && this.sel !== a.id) { this.sel = a.id; }
    const m = this.limitar(this.aMundo(p));
    const st = a.id ? this.estados[a.id] : null;
    switch (a.tipo) {
      case 'mover':
        if (st.x2 != null) { // flecha: se mueve entera
          const nx = r2(m.x + a.dx), ny = r2(m.y + a.dy), dx = nx - st.x, dy = ny - st.y;
          st.x2 = r2(st.x2 + dx); st.y2 = r2(st.y2 + dy);
          if (st.cx != null) { st.cx = r2(st.cx + dx); st.cy = r2(st.cy + dy); }
          st.x = nx; st.y = ny;
        } else { st.x = r2(m.x + a.dx); st.y = r2(m.y + a.dy); }
        break;
      case 'rot': {
        const c = { x: st.x * this.vista.s + this.vista.ox, y: st.y * this.vista.s + this.vista.oy };
        let g = Math.atan2(p.x - c.x, -(p.y - c.y)) * 180 / Math.PI;
        const cerca = Math.round(g / 90) * 90;
        g = Math.abs(g - cerca) < 7 ? cerca : Math.round(g);
        st.rot = ((g % 360) + 360) % 360;
        break;
      }
      case 'tam': {
        const a2 = -(st.rot || 0) * Math.PI / 180;
        const dx = m.x - st.x, dy = m.y - st.y;
        const lx = dx * Math.cos(a2) - dy * Math.sin(a2), ly = dx * Math.sin(a2) + dy * Math.cos(a2);
        st.w = r2(Math.max(1, Math.abs(lx) * 2)); st.h = r2(Math.max(1, Math.abs(ly) * 2));
        break;
      }
      case 'ini': st.x = r2(m.x); st.y = r2(m.y); break;
      case 'fin': st.x2 = r2(m.x); st.y2 = r2(m.y); break;
      case 'ctrl': {
        // el punto que se arrastra es el medio de la curva → control = 2*medio - (ini+fin)/2
        st.cx = r2(2 * m.x - (st.x + st.x2) / 2); st.cy = r2(2 * m.y - (st.y + st.y2) / 2);
        break;
      }
      case 'crearFlecha': this.temporal.st.x2 = r2(m.x); this.temporal.st.y2 = r2(m.y); break;
      case 'crearZona': {
        const s = this.temporal.st, m0 = a.m0;
        s.x = r2((m0.x + m.x) / 2); s.y = r2((m0.y + m.y) / 2);
        s.w = r2(Math.abs(m.x - m0.x)); s.h = r2(Math.abs(m.y - m0.y));
        break;
      }
      case 'pan':
        this.vista = { ...this.vista, ox: a.v0.ox + (p.x - a.p0.x), oy: a.v0.oy + (p.y - a.p0.y) };
        break;
    }
    this.pintar();
  }

  fin(p, { toque }) {
    const a = this.accion; this.accion = null;
    if (!a) return;
    if (a.tipo === 'mover' && a.colocar && toque) a.tipo = 'colocar', a.m = a.colocar;
    if (a.tipo === 'colocar' && toque) {
      const tipo = this.tipoActual();
      const c = crear(tipo, a.m.x, a.m.y, { elementos: this.piz.elementos });
      this.agregar(c);
      if (tipo === 'texto') { this.sel = c.el.id; this.hist.cerrar(); this.cambio(); return this.editarEtiqueta(c.el); }
      this.sel = c.el.id;
    }
    if (a.tipo === 'crearFlecha') {
      const s = this.temporal.st;
      if (Math.hypot(s.x2 - s.x, s.y2 - s.y) * this.vista.s > 18) {
        this.recortarFlecha(s, a.desde);
        this.agregar(this.temporal); this.sel = this.temporal.el.id;
      }
      this.temporal = null;
    }
    if (a.tipo === 'crearZona') {
      const s = this.temporal.st;
      if (s.w * this.vista.s < 16 || s.h * this.vista.s < 16) { s.w = 10; s.h = 8; s.x = a.m0.x; s.y = a.m0.y; }
      this.agregar(this.temporal); this.sel = this.temporal.el.id;
      this.temporal = null;
    }
    if (this.hist.cerrar()) this.cambio();
    else this.pintar();
  }

  cancelar() {
    this.temporal = null;
    if (this.accion?.tipo === 'pan') this.vista = this.accion.v0;
    this.accion = null;
    this.hist.revertir();
    this.pintar();
  }

  // Para que la flecha no quede tapada: arranca y termina en el borde del jugador.
  recortarFlecha(st, desde) {
    const v = this.vista;
    const radioM = el => (el.tipo === 'pelota' ? Math.max(0.45 * v.s, 6) : radioJugador(v.s)) / v.s + 0.25;
    const fin = { x: st.x2 * v.s + v.ox, y: st.y2 * v.s + v.oy };
    const destino = ordenToque(this.piz.elementos).find(e => ['propio', 'rival', 'pelota'].includes(e.tipo) && e !== desde
      && toca(this.ctx, e, this.estados[e.id], v, fin.x, fin.y, 2));
    const L = Math.hypot(st.x2 - st.x, st.y2 - st.y);
    if (!L) return;
    const a = desde ? radioM(desde) : 0;
    let b = 0;
    if (destino) {
      const d = this.estados[destino.id];
      st.x2 = d.x; st.y2 = d.y;
      b = radioM(destino);
    }
    const L2 = Math.hypot(st.x2 - st.x, st.y2 - st.y);
    if (L2 - a - b < 1) return;
    const vx = (st.x2 - st.x) / L2, vy = (st.y2 - st.y) / L2;
    const x0 = st.x, y0 = st.y;
    st.x = r2(x0 + vx * a); st.y = r2(y0 + vy * a);
    st.x2 = r2(st.x2 - vx * b); st.y2 = r2(st.y2 - vy * b);
  }

  agregar({ el, st }) {
    this.piz.elementos.push(el);
    // el elemento existe en todos los cuadros (para la animación de la fase 2)
    for (const c of this.piz.cuadros) c.estados[el.id] = structuredClone(st);
  }

  // ---------- Acciones ----------
  cambio() {
    this.pintar();
    clearTimeout(this.tGuardar);
    this.tGuardar = setTimeout(() => this.guardar(), 400);
  }

  async guardar() {
    clearTimeout(this.tGuardar);
    await db.guardar('pizarras', this.piz);
  }

  borrarSel() {
    if (!this.sel) return aviso('Tocá un elemento para borrarlo.');
    this.hist.abrir();
    this.piz.elementos = this.piz.elementos.filter(e => e.id !== this.sel);
    for (const c of this.piz.cuadros) delete c.estados[this.sel];
    this.sel = null;
    this.ocultarMinibar();
    this.hist.cerrar(); this.cambio();
  }

  duplicarSel() {
    const el = this.piz.elementos.find(e => e.id === this.sel); if (!el) return;
    this.hist.abrir();
    const st = structuredClone(this.estados[el.id]);
    const nuevo = structuredClone(el); nuevo.id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
    if (el.tipo === 'propio' || el.tipo === 'rival') { nuevo.etiqueta = siguienteDorsal(this.piz.elementos, el.tipo); nuevo.jugadorId = null; nuevo.nombre = ''; }
    st.x = r2(st.x + 3); st.y = r2(st.y + 3);
    if (st.x2 != null) { st.x2 = r2(st.x2 + 3); st.y2 = r2(st.y2 + 3); if (st.cx != null) { st.cx = r2(st.cx + 3); st.cy = r2(st.cy + 3); } }
    this.agregar({ el: nuevo, st });
    this.sel = nuevo.id;
    this.hist.cerrar(); this.cambio();
  }

  async editarEtiqueta(el) {
    const titulo = el.tipo === 'texto' ? 'Texto' : 'Dorsal o letra';
    const v = await pedirTexto(titulo, el.etiqueta);
    if (v == null) return;
    this.hist.abrir();
    el.etiqueta = el.tipo === 'texto' ? (v.trim() || 'Texto') : v.trim().slice(0, 3);
    this.hist.cerrar(); this.cambio();
  }

  async elegirJugador(el) {
    const lista = (this.opc.jugadores || []).slice().sort((a, b) => (Number(a.dorsal) || 99) - (Number(b.dorsal) || 99));
    if (!lista.length) return aviso('No hay jugadores en el plantel.');
    const estado = id => CONFIG.estados.find(s => s.id === id);
    const v = await menu('Elegí jugador', [
      { texto: 'Sin jugador (solo dorsal)', valor: '__ninguno' },
      ...lista.map(j => ({ texto: `${j.dorsal || '–'} · ${j.apodo || j.nombre}`, valor: j.id, color: estado(j.estado)?.color, activo: el.jugadorId === j.id })),
    ]);
    if (v === undefined) return;
    this.hist.abrir();
    if (v === '__ninguno') { el.jugadorId = null; el.nombre = ''; }
    else {
      const j = lista.find(x => x.id === v);
      el.jugadorId = j.id; el.nombre = j.apodo || j.nombre.split(' ')[0];
      if (j.dorsal) el.etiqueta = String(j.dorsal);
    }
    this.hist.cerrar(); this.cambio();
  }

  cambiarColor(el) {
    const lista = el.tipo === 'flecha' ? COLORES_FLECHA : COLORES_ZONA;
    const i = lista.indexOf(el.estilo.color);
    this.hist.abrir();
    el.estilo.color = lista[(i + 1) % lista.length];
    if (el.tipo === 'flecha') this.ultimoColorFlecha = el.estilo.color;
    this.hist.cerrar(); this.cambio();
  }

  cambiarClaseFlecha(el) {
    const orden = ['pase', 'conduccion', 'desmarque'];
    this.hist.abrir();
    el.flecha.clase = orden[(orden.indexOf(el.flecha.clase) + 1) % 3];
    this.hist.cerrar(); this.cambio();
  }

  // ---------- Mini barra del seleccionado ----------
  mostrarMinibar() {
    const el = this.piz.elementos.find(e => e.id === this.sel);
    const st = el && this.estados[el.id];
    if (!el || !st) return this.ocultarMinibar();
    vaciar(this.minibar);
    const b = (txt, fn, cls = '') => h(`button.pz-mb${cls}`, { onpointerdown: e => e.stopPropagation(), onclick: fn }, txt);
    if (el.tipo === 'propio') this.minibar.append(b('👤 Jugador', () => this.elegirJugador(el)));
    if (el.tipo === 'propio' || el.tipo === 'rival') this.minibar.append(b('# Dorsal', () => this.editarEtiqueta(el)));
    if (el.tipo === 'texto') this.minibar.append(b('✎ Editar', () => this.editarEtiqueta(el)));
    if (el.tipo === 'flecha') this.minibar.append(b(({ pase: 'Pase', conduccion: 'Conducción', desmarque: 'Desmarque' })[el.flecha.clase] + ' ⇄', () => this.cambiarClaseFlecha(el)));
    if (el.tipo === 'flecha' || TIPOS[el.tipo].zona) this.minibar.append(b('', () => this.cambiarColor(el), '.pz-mb-color'));
    this.minibar.append(b('⧉', () => this.duplicarSel()), b('🗑', () => this.borrarSel(), '.pz-mb-peligro'));
    const colorBtn = this.minibar.querySelector('.pz-mb-color');
    if (colorBtn) colorBtn.style.setProperty('--c', el.estilo.color);

    // posición: arriba del elemento, dentro del lienzo
    const v = this.vista;
    let x = st.x * v.s + v.ox, y = st.y * v.s + v.oy;
    if (el.tipo === 'flecha') { x = ((st.x + st.x2) / 2) * v.s + v.ox; y = Math.min(st.y, st.y2) * v.s + v.oy; }
    const alto = Math.max(radioJugador(v.s), 18);
    this.minibar.classList.add('visible');
    const mw = this.minibar.offsetWidth, mh = this.minibar.offsetHeight;
    let top = y - alto - mh - 34;
    if (top < 4) top = y + alto + 30;
    this.minibar.style.left = Math.max(4, Math.min(this.w - mw - 4, x - mw / 2)) + 'px';
    this.minibar.style.top = Math.max(4, Math.min(this.h - mh - 4, top)) + 'px';
  }
  ocultarMinibar() { this.minibar.classList.remove('visible'); }

  // ---------- Espacio ----------
  async configEspacio() {
    const e = this.piz.espacio;
    const tipo = select([['completa', 'Cancha completa'], ['media', 'Media cancha'], ['reducido', 'Espacio reducido']], e.tipo);
    const largo = h('input.campo', { type: 'number', inputmode: 'decimal', min: 5, max: 130, step: 0.5, value: e.largo });
    const ancho = h('input.campo', { type: 'number', inputmode: 'decimal', min: 5, max: 100, step: 0.5, value: e.ancho });
    tipo.onchange = () => { const d = CONFIG.cancha[tipo.value]; largo.value = d.largo; ancho.value = d.ancho; };
    const ok = await hoja('Espacio', h('div.form-grilla',
      campo('Tipo', tipo),
      h('div.form-fila', campo('Largo (m)', largo), campo('Ancho (m)', ancho))), {
      botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-sec' }, { texto: 'Aplicar', valor: true, clase: 'btn-prim' }],
    });
    if (!ok) return;
    this.hist.abrir();
    this.piz.espacio = { tipo: tipo.value, largo: clampN(largo.value, 5, 130, 40), ancho: clampN(ancho.value, 5, 100, 30) };
    this.hist.cerrar();
    this.cambio();
    this.encuadrar();
  }

  async exportar() {
    await this.guardar();
    const blob = await aPNG(this.piz, this.cuadro);
    const nombre = (this.piz.nombre || 'pizarra').toLowerCase().replace(/[^\wáéíóúñ]+/g, '-').replace(/^-|-$/g, '') || 'pizarra';
    const r = await entregarArchivo(blob, `${nombre}.png`, { titulo: this.piz.nombre });
    if (r === 'descargado') aviso('Imagen descargada.');
  }

  tecla(e) {
    if (document.querySelector('.hoja-fondo')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? this.hist.rehacer() : this.hist.deshacer()) && this.cambio(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.borrarSel(); }
    else if (e.key === 'Escape') { this.sel = null; this.ocultarMinibar(); this.pintar(); }
  }

  async cerrar(desdeAtras = false) {
    if (this.cerrado) return;
    this.cerrado = true;
    await this.guardar();
    this.gestos.destruir();
    this.ro.disconnect();
    window.removeEventListener('popstate', this.alAtras);
    window.removeEventListener('keydown', this.alTecla);
    this.raiz.remove();
    this.hojasPrevias.forEach(x => x.classList.remove('oculta-pz'));
    document.body.classList.remove('pz-abierta');
    if (!desdeAtras && history.state?.pizarra) history.back();
    this.resolver(this.piz);
  }
}

function clampN(v, a, b, def) { const n = parseFloat(v); return isNaN(n) ? def : Math.max(a, Math.min(b, n)); }
