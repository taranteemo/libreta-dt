// ============================================================
//  MARCA Y AJUSTES DEL CLUB — único archivo a editar para
//  adaptar la app a otro club o entrenador.
//  (Excepción: manifest.webmanifest e íconos, ver LEEME.md)
// ============================================================

export const CONFIG = {
  app: {
    nombre: 'Libreta DT',
    nombreCorto: 'Libreta DT',
    firma: 'por Lombardo Media',
  },

  club: {
    nombre: '',   // Ej: 'Club Atlético Ejemplo'
    // Reemplazá este archivo por el escudo del club (SVG o PNG cuadrado).
    escudo: 'assets/brand/escudo.svg',
  },

  colores: {
    primario: '#195087',
    oscuro: '#003C6E',
    acento: '#0257BA',
    destaque: '#F9D91E',
    blanco: '#FFFFFF',
    rival: '#D62839',      // color de los rivales en la pizarra
  },

  tipografia: {
    // Si la fuente no carga, se usa la del sistema.
    titulos: "'Bangers', 'Arial Black', system-ui, sans-serif",
    texto: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    // Archivo de la fuente de títulos (vacío = no cargar ninguna).
    archivoTitulos: 'assets/fonts/bangers.woff2',
    nombreTitulos: 'Bangers',
  },

  categorias: ['Reserva', '4ta', '5ta', '6ta', '7ma', '8va', '9na'],

  posiciones: [
    { id: 'ARQ', nombre: 'Arquero' },
    { id: 'LD', nombre: 'Lateral derecho' },
    { id: 'DFC', nombre: 'Defensor central' },
    { id: 'LI', nombre: 'Lateral izquierdo' },
    { id: 'MCD', nombre: 'Volante central' },
    { id: 'MC', nombre: 'Volante interno' },
    { id: 'MCO', nombre: 'Enganche' },
    { id: 'ED', nombre: 'Extremo derecho' },
    { id: 'EI', nombre: 'Extremo izquierdo' },
    { id: 'DC', nombre: 'Delantero centro' },
  ],

  estados: [
    { id: 'disponible', nombre: 'Disponible', color: '#2E9E5B' },
    { id: 'lesionado', nombre: 'Lesionado', color: '#D62839' },
    { id: 'sancionado', nombre: 'Sancionado', color: '#E0821E' },
    { id: 'otra_cat', nombre: 'Con otra categoría', color: '#0257BA' },
    { id: 'ausente', nombre: 'Ausente', color: '#7A8594' },
  ],

  // Partes de cada sesión de entrenamiento.
  partesSesion: [
    { id: 'inicial', nombre: 'Inicial' },
    { id: 'principal', nombre: 'Principal' },
    { id: 'final', nombre: 'Final' },
  ],

  objetivos: [
    { id: 'tactico', nombre: 'Táctico' },
    { id: 'tecnico', nombre: 'Técnico' },
    { id: 'fisico', nombre: 'Físico' },
  ],

  fases: [
    { id: 'org_of', nombre: 'Org. ofensiva' },
    { id: 'org_def', nombre: 'Org. defensiva' },
    { id: 'trans_of', nombre: 'Transición ofensiva' },
    { id: 'trans_def', nombre: 'Transición defensiva' },
    { id: 'abp', nombre: 'ABP' },
    { id: 'general', nombre: 'General' },
  ],

  pecheras: ['#F9D91E', '#E0821E', '#2E9E5B', '#D62839', '#0257BA', '#FFFFFF', '#7A3FB0', '#222222'],

  cancha: {
    completa: { largo: 105, ancho: 68 },
    media: { largo: 52.5, ancho: 68 },
    reducido: { largo: 40, ancho: 30 },
  },

  backupDias: 7,
};
