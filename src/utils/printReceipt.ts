import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Utilitário de impressão de recibos com 100% de compatibilidade em:
 * - iPhone e iPad (iOS Safari e WebKit)
 * - Android (Chrome, Samsung Internet)
 * - Computadores (Safari, Chrome, Edge, Firefox)
 */

export interface PrintOptions {
  elementId: string;
  documentTitle: string;
  template?: 'cupom' | 'corporate' | 'classic' | 'modern';
}

/**
 * Impressão direta no navegador:
 * Resolve o problema de tela em branco no iOS Safari clonando o elemento
 * para fora do React (#root), diretamente no <body> como elemento estático de primeiro nível.
 */
export async function printElementDirectly(options: PrintOptions): Promise<boolean> {
  const { elementId, documentTitle, template = 'cupom' } = options;
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.error(`Elemento #${elementId} não encontrado para impressão.`);
    return false;
  }

  // Remove qualquer portal de impressão anterior
  const existingPortal = document.getElementById('direct-print-portal');
  if (existingPortal) existingPortal.remove();

  // Cria o portal direto no body
  const portal = document.createElement('div');
  portal.id = 'direct-print-portal';

  // Clona o recibo exatamente como está na tela
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.id = 'cloned-print-receipt';

  // Remove elementos com .no-print
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  // Garante que o clone não herde estilos de limitação de altura
  clone.style.width = template === 'cupom' ? '380px' : '720px';
  clone.style.maxWidth = '100%';
  clone.style.margin = '0 auto';
  clone.style.boxShadow = 'none';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.overflow = 'visible';
  clone.style.height = 'auto';
  clone.style.minHeight = '0';
  clone.style.position = 'static';
  clone.style.display = 'block';

  portal.appendChild(clone);
  document.body.appendChild(portal);
  document.body.classList.add('is-printing-receipt');

  const oldTitle = document.title;
  document.title = documentTitle;

  return new Promise((resolve) => {
    // Dá 150ms para o WebKit recalcular a árvore de renderização do DOM
    setTimeout(() => {
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        document.body.classList.remove('is-printing-receipt');
        portal.remove();
        document.title = oldTitle;
        resolve(true);
      };

      window.addEventListener('afterprint', cleanup, { once: true });

      try {
        window.print();
      } catch (err) {
        console.error('Erro ao chamar window.print:', err);
      }

      // Timeout de segurança caso afterprint não dispare (comum em alguns navegadores mobile)
      setTimeout(cleanup, 2500);
    }, 150);
  });
}

/**
 * Gera um arquivo PDF genuíno (.pdf) em alta definição usando html2canvas + jsPDF.
 * Salva no dispositivo ou abre o menu de compartilhamento nativo no iPhone/Android (AirPrint, Salvar em Arquivos, WhatsApp, etc.).
 */
export async function generateElementPDF(
  elementId: string,
  fileName: string,
  title: string
): Promise<{ success: boolean; shared?: boolean; error?: string }> {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    return { success: false, error: 'Elemento não encontrado' };
  }

  try {
    // Clona para um elemento temporário com fundo branco e largura padronizada
    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    // Configuração de captura com escala de 3x para nitidez absoluta
    const canvas = await html2canvas(sourceEl, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Dimensões do PDF
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Converte px para mm (1px ~ 0.264583mm)
    const pdfWidth = 210; // Largura A4 em mm
    const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;

    // Se o cupom for comprido ou modelo A4
    const orientation = pdfHeight > pdfWidth ? 'portrait' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [pdfWidth, Math.max(297, pdfHeight + 20)],
    });

    // Centraliza o cupom na página
    const marginX = Math.max(10, (pdfWidth - (pdfWidth - 20)) / 2);
    const contentWidth = pdfWidth - marginX * 2;
    const contentHeight = (canvasHeight * contentWidth) / canvasWidth;

    pdf.addImage(imgData, 'JPEG', marginX, 10, contentWidth, contentHeight);

    const pdfBlob = pdf.output('blob');
    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const pdfFile = new File([pdfBlob], safeFileName, { type: 'application/pdf' });

    // Se no celular e suportar compartilhamento de arquivos nativo (iOS Safari / Android)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: title,
          text: `Comprovante de Serviço - ${title}`,
        });
        return { success: true, shared: true };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: true, shared: false };
        }
      }
    }

    // Download direto do arquivo PDF
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { success: true, shared: false };
  } catch (err: any) {
    console.error('Erro ao gerar PDF:', err);
    return { success: false, error: err?.message || 'Falha ao gerar PDF' };
  }
}

/**
 * Gera imagem PNG em alta resolução para envio rápido no WhatsApp ou galeria.
 */
export async function generateElementPNG(
  elementId: string,
  fileName: string,
  title: string
): Promise<{ success: boolean; shared?: boolean; error?: string }> {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    return { success: false, error: 'Elemento não encontrado' };
  }

  try {
    const canvas = await html2canvas(sourceEl, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve({ success: false, error: 'Erro ao gerar blob da imagem' });
          return;
        }

        const safeFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
        const file = new File([blob], safeFileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title,
              text: `Comprovante: ${title}`,
            });
            resolve({ success: true, shared: true });
            return;
          } catch (err: any) {
            if (err?.name === 'AbortError') {
              resolve({ success: true, shared: false });
              return;
            }
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        resolve({ success: true, shared: false });
      }, 'image/png');
    });
  } catch (err: any) {
    console.error('Erro ao gerar PNG:', err);
    return { success: false, error: err?.message || 'Falha ao capturar imagem' };
  }
}
