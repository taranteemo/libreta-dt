// ============================================================
//  Entregar y recibir archivos (compartir / descargar / elegir).
// ============================================================

// Comparte un archivo con la hoja nativa (WhatsApp, Archivos, Drive…)
// y si no se puede, lo descarga.
export async function entregarArchivo(blob, nombre, { titulo } = {}) {
  const file = new File([blob], nombre, { type: blob.type || 'application/octet-stream' });
  const esMovil = matchMedia('(pointer:coarse)').matches;
  if (esMovil && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo || nombre });
      return 'compartido';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'descargado';
}

export function elegirArchivo(accept = '') {
  return new Promise(ok => {
    const inp = document.createElement('input');
    inp.type = 'file';
    if (accept) inp.accept = accept;
    inp.style.display = 'none';
    inp.onchange = () => { ok(inp.files[0] || null); inp.remove(); };
    document.body.append(inp);
    inp.click();
  });
}

export function blobABase64(blob) {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => mal(r.error);
    r.readAsDataURL(blob);
  });
}

export async function base64ABlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

// Achica una imagen a un lado máximo y la devuelve como JPEG.
export async function achicarImagen(file, max = 400, calidad = 0.82) {
  const bmp = await cargarImagen(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', calidad));
}

function cargarImagen(file) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => { ok(img); URL.revokeObjectURL(img.src); };
    img.onerror = mal;
    img.src = URL.createObjectURL(file);
  });
}

export function hoyArchivo() {
  return new Date().toISOString().slice(0, 10);
}
