// ============================================================
//  Arrastrar y soltar con pointer events (funciona con el dedo).
//  - manija: elemento que inicia el arrastre
//  - zonas destino: contenedores con [data-drop="clave"];
//    sus hijos directos con [data-item] marcan las posiciones.
// ============================================================
import { h } from './ui.js';

export function arrastrable(manija, { tarjeta, datos, alSoltar }) {
  manija.style.touchAction = 'none';
  manija.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    const origen = tarjeta || manija;
    const r = origen.getBoundingClientRect();
    const fantasma = origen.cloneNode(true);
    fantasma.classList.add('arrastre-fantasma');
    Object.assign(fantasma.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
    document.body.append(fantasma);
    origen.classList.add('arrastrando');
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const marca = h('div.drop-marca');
    let destino = null, indice = 0, scrollT = null;

    const mover = ev => {
      fantasma.style.left = ev.clientX - dx + 'px';
      fantasma.style.top = ev.clientY - dy + 'px';
      const bajo = document.elementFromPoint(ev.clientX, ev.clientY);
      const zona = bajo?.closest('[data-drop]');
      destino = zona;
      if (!zona) { marca.remove(); }
      else {
        const items = [...zona.querySelectorAll(':scope > [data-item]')].filter(x => x !== origen);
        indice = items.length;
        for (let i = 0; i < items.length; i++) {
          const ri = items[i].getBoundingClientRect();
          if (ev.clientY < ri.top + ri.height / 2) { indice = i; break; }
        }
        const ref = items[indice];
        if (ref) zona.insertBefore(marca, ref); else zona.append(marca);
      }
      // scroll automático cerca de los bordes
      const cont = document.getElementById('vista');
      clearInterval(scrollT);
      const rc = cont.getBoundingClientRect();
      if (ev.clientY < rc.top + 50) scrollT = setInterval(() => cont.scrollBy(0, -12), 16);
      else if (ev.clientY > rc.bottom - 50) scrollT = setInterval(() => cont.scrollBy(0, 12), 16);
    };
    const fin = () => {
      clearInterval(scrollT);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', cancelar);
      fantasma.remove(); marca.remove();
      origen.classList.remove('arrastrando');
      if (destino) alSoltar({ zona: destino.dataset.drop, indice, datos });
    };
    const cancelar = () => { destino = null; fin(); };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', cancelar);
    mover(e);
  });
}
