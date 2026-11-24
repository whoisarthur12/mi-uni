// Escala de agresividad del Compresor (S1: el tamaño es monótono en DPI y calidad).
// PROVISIONAL: se calibra con los PDFs reales del dueño antes de darla por buena (ADR-011).
export const NIVELES = [
  { dpi: 300, calidad: 85 }, { dpi: 250, calidad: 80 }, { dpi: 200, calidad: 75 }, { dpi: 175, calidad: 70 },
  { dpi: 150, calidad: 65 }, { dpi: 150, calidad: 55 }, { dpi: 125, calidad: 50 }, { dpi: 110, calidad: 45 },
  { dpi: 100, calidad: 40 }, { dpi: 90, calidad: 35 }, { dpi: 80, calidad: 30 }, { dpi: 72, calidad: 25 },
];
/** Por debajo de este DPI el texto escaneado puede verse borroso: se avisa en el resultado. */
export const PISO_DPI = 100;
/** Zona de aceptación del modo objetivo: entre el 90 % y el 100 % de la meta. */
export const ZONA_MIN = 0.9;
/** Meta por defecto (decisión del dueño): 4,8 MB = 4.800.000 bytes. */
export const OBJETIVO_POR_DEFECTO = 4_800_000;

/** Escalera de emergencia, rasterizado (pdfimage24): de más a menos calidad. */
export const RASTER = [{ dpi: 110, calidad: 55 }, { dpi: 96, calidad: 45 }, { dpi: 85, calidad: 38 }, { dpi: 72, calidad: 30 }];

export const MANUAL = {
  dpis: [72, 96, 110, 150, 200, 300],
  porDefecto: { dpi: 150, calidad: 60, gris: false },
};
