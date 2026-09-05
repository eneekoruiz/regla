import type { jsPDF } from 'jspdf';

/**
 * Shares a generated PDF using the native Web Share API on mobile,
 * or falls back to direct browser download on desktop.
 */
export async function shareOrDownloadPDF(
  doc: jsPDF,
  filename = 'reporte-ginecologico-aura.pdf',
  title = 'Reporte Ginecológico • Aura Ciclo'
): Promise<{ shared: boolean; downloaded: boolean }> {
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], filename, { type: 'application/pdf' });

  // 1. Try Native Web Share API with File
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: 'Resumen ginecológico y de ciclos menstruales generado con Aura.',
        files: [file]
      });
      return { shared: true, downloaded: false };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled share dialog
        return { shared: false, downloaded: false };
      }
      console.warn('Web Share failed, falling back to download:', error);
    }
  }

  // 2. Fallback: Direct download
  doc.save(filename);
  return { shared: false, downloaded: true };
}

/**
 * Shares plain text via Web Share API or copies to clipboard
 */
export async function shareOrCopyText(
  text: string,
  title = 'Resumen Ginecológico • Aura'
): Promise<{ shared: boolean; copied: boolean }> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text
      });
      return { shared: true, copied: false };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { shared: false, copied: false };
      }
    }
  }

  // Fallback: Copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return { shared: false, copied: true };
  }

  return { shared: false, copied: false };
}
