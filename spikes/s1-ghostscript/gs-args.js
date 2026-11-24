// Construye los argumentos de Ghostscript para pdfwrite. Verificados contra Ghostscript 10.06.0
// (paquete @okathira/ghostpdl-wasm 1.1.0) en el spike S1; ver README.md de este spike.

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
