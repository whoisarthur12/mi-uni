// Argumentos de Ghostscript para pdfwrite y pdfimage. Verificados contra Ghostscript 10.06.0
// (paquete @okathira/ghostpdl-wasm 1.1.0) en el spike S1 y en la Fase 1 (pdfimage24, -sPDFPassword, -sPageList).

/** Calidad 1–100 (escala IJG) → QFactor de Ghostscript (factor lineal: QFactor = escala% / 100). */
export function qualityToQFactor(q) {
  const quality = Math.min(100, Math.max(1, q));
  const scale = quality >= 50 ? 200 - 2 * quality : 5000 / quality;
  return Math.max(0.01, scale / 100);
}

export function buildArgs({ dpi, quality, gray = false, input = '/in.pdf', output = '/out.pdf' }) {
  const qf = qualityToQFactor(quality).toFixed(3);
  const args = [
    '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.5', '-dNOPAUSE', '-dBATCH', '-dSAFER',
    '-dDownsampleColorImages=true', '-dDownsampleGrayImages=true', '-dDownsampleMonoImages=true',
    '-dColorImageDownsampleType=/Bicubic', '-dGrayImageDownsampleType=/Bicubic',
    `-dColorImageResolution=${dpi}`, `-dGrayImageResolution=${dpi}`, `-dMonoImageResolution=${Math.max(dpi * 2, 300)}`,
    // Umbral 1.0: reducir cualquier imagen por encima del DPI pedido (por defecto solo si supera 1.5×).
    '-dColorImageDownsampleThreshold=1.0', '-dGrayImageDownsampleThreshold=1.0',
    '-dAutoFilterColorImages=false', '-dAutoFilterGrayImages=false',
    '-dColorImageFilter=/DCTEncode', '-dGrayImageFilter=/DCTEncode',
    // Sin esto los JPEG que no se reducen se copian tal cual (medido: 0,80 vs 0,10 del original).
    '-dPassThroughJPEGImages=false',
    '-dDetectDuplicateImages=true', '-dCompressFonts=true', '-dSubsetFonts=true',
  ];
  if (gray) args.push('-sColorConversionStrategy=Gray', '-dProcessColorModel=/DeviceGray');
  args.push(`-sOutputFile=${output}`, '-c',
    `<< /ColorImageDict << /QFactor ${qf} /Blend 1 /HSamples [2 1 1 2] /VSamples [2 1 1 2] >> ` +
    `/GrayImageDict << /QFactor ${qf} /Blend 1 /HSamples [1 1 1 1] /VSamples [1 1 1 1] >> >> setdistillerparams`,
    '-f', input);
  return args;
}

/** Opciones comunes a toda pasada: contraseña de apertura (si el usuario la dio) y lista de páginas. */
export function conExtras(args, { password, paginas } = {}) {
  const pre = [];
  if (password) pre.push(`-sPDFPassword=${password}`);
  if (paginas && paginas.length) pre.push(`-sPageList=${paginas.join(',')}`);
  return [...pre, ...args];
}

/** Rasterizar páginas a un PDF de solo imágenes JPEG (dispositivo pdfimage24/pdfimage8, verificado en 10.06.0). */
export function rasterArgs({ dpi, quality, gray = false, input = '/in.pdf', output = '/out.pdf' }) {
  return [`-sDEVICE=${gray ? 'pdfimage8' : 'pdfimage24'}`, `-r${dpi}`, '-sCompression=JPEG', `-dJPEGQ=${Math.round(quality)}`,
    '-dNOPAUSE', '-dBATCH', '-dSAFER', `-sOutputFile=${output}`, input];
}
