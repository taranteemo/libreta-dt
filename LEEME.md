# Libreta DT — Fase 1

App web instalable (PWA) para cuerpos técnicos: plantel, microciclo con biblioteca de tareas y pizarra.
Funciona sin internet y guarda todo en el dispositivo (IndexedDB). Sin servidor, sin frameworks, sin build.

Requiere iOS/iPadOS 15.4 o más nuevo, o Chrome en Android.

## Estructura

```
index.html              página única
manifest.webmanifest    datos para instalarla (nombre, colores, íconos)
sw.js                   service worker: offline + aviso de versión nueva
config.js               MARCA: nombre, club, escudo, colores, fuente, posiciones, etc.
assets/                 escudo, íconos y fuente (Bangers, licencia OFL)
css/                    estilos
js/app.js               arranque, navegación
js/core/                modelo de datos, base, backup, instalación, actualización, UI
js/modulos/             plantel, microciclo (semana, sesión, biblioteca, impresión), más
js/pizarra/             editor, render, gestos, herramientas, historial, exportar
```

## Cambiar la marca

1. `config.js`: nombre de la app, club, escudo, colores, tipografía, listas.
2. Escudo: reemplazá `assets/brand/escudo.svg` (o poné otro archivo y cambiá la ruta en `config.js`).
3. **Excepción:** el navegador lee `manifest.webmanifest`, el `<title>` de `index.html` y los íconos
   antes que el JavaScript. Si cambiás el nombre o los colores, cambialos también ahí, y reemplazá los
   PNG de `assets/icons/` (192, 512, maskable 512 y apple-touch-icon de 180).

## Subirla a GitHub Pages

1. Entrá a github.com → **New repository** → nombre, por ejemplo `libreta-dt` → **Public** → Create.
2. En el repo vacío: **Add file → Upload files** → arrastrá **todo el contenido** de esta carpeta
   (no la carpeta en sí: `index.html` tiene que quedar en la raíz del repo) → **Commit changes**.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
4. En 1–2 minutos queda en `https://TU-USUARIO.github.io/libreta-dt/`.

### Cada vez que subas cambios

1. En `sw.js` subí el número de `VERSION` (ej: `1.0.0` → `1.0.1`). **Si no lo cambiás, los celulares no se enteran.**
2. Subí los archivos que cambiaron (Upload files pisa los existentes).
3. Al abrir la app, aparece "Hay una versión nueva · Actualizar".

## Lista de pruebas

### iPhone / iPad (Safari)
- [ ] Abrir el link en **Safari** → aparece la guía "Instalá Libreta DT" con los pasos.
- [ ] Compartir → Agregar a inicio → el ícono aparece con el nombre correcto.
- [ ] Abrir desde el ícono: pantalla completa, sin barra de Safari.
- [ ] Crear plantel → cargar 3 jugadores (uno con foto sacada con la cámara).
- [ ] Cambiar el estado de un jugador tocando la etiqueta; filtrar por posición y estado.
- [ ] Biblioteca → nueva tarea con medidas 20×15 → Dibujar diagrama.
- [ ] Pizarra en **horizontal**: poner jugadores, rivales, pelota al pie de un jugador, conos, aro, valla, mini arco, zona, texto.
- [ ] Flechas de pase, conducción y desmarque; curvar una con la manija del medio.
- [ ] Mover con un dedo; zoom y paneo con dos dedos; botón encuadrar.
- [ ] Rotar una valla con la manija amarilla; agrandar una zona con la manija blanca.
- [ ] Seleccionar un jugador → 👤 Jugador → vincularlo al plantel (aparece el apodo).
- [ ] Deshacer / rehacer; borrar; duplicar.
- [ ] Cambiar el espacio (completa / media / reducido con medidas).
- [ ] Exportar PNG → se abre la hoja para compartir (WhatsApp, Fotos, Archivos).
- [ ] Girar el celu a **vertical** con la pizarra abierta → se ve, con el cartel "Girá el celu para editar".
- [ ] Semana: cargar fecha de partido → se calculan los MD; cambiar uno a mano; poner tipo de sesión.
- [ ] Abrir un día → agregar tarea de la biblioteca a Principal → arrastrar (⠿) a Final.
- [ ] Editar la tarea en la sesión y verificar que la de la biblioteca **no** cambia.
- [ ] Imprimir / PDF → la vista se ve bien → Imprimir. Si en la app instalada no abre nada, probar desde Safari.
- [ ] Más → Hacer backup → guardarlo en Archivos.
- [ ] Modo avión → cerrar y abrir la app → todo sigue ahí y funciona.
- [ ] En el iPad horizontal: en la sesión aparece la biblioteca al costado; arrastrar una tarea a una parte.

### Android (Chrome)
- [ ] Abrir el link → la guía ofrece el botón **Instalar** (o Menú ⋮ → Instalar app).
- [ ] Repetir las pruebas de plantel, biblioteca, pizarra, semana y sesión.
- [ ] Botón "atrás" del celu con la pizarra abierta → cierra la pizarra y guarda.
- [ ] Exportar PNG → compartir por WhatsApp.
- [ ] Backup → importar en **otro celular** → aparece todo (planteles, jugadores con foto, tareas, sesiones).
- [ ] Modo avión → abrir la app → funciona.

### Actualización
- [ ] Subir un cambio con `VERSION` nueva en `sw.js` → abrir la app → aparece el aviso → Actualizar → recarga con el cambio.
