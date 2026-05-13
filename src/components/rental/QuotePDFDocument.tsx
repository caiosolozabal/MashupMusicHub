
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { RentalQuote, AppConfig, RentalQuoteItem } from '@/lib/types';
import { format } from 'date-fns';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const toBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Erro ao converter imagem para base64:", error);
        throw error;
    }
};

export const generateQuotePdf = async (quote: RentalQuote, config: AppConfig | null) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const sidebarWidth = 65;
    const neonGreen = [132, 255, 30]; // #84FF1E

    const drawSidebar = () => {
        doc.setFillColor(15, 15, 15);
        doc.rect(0, 0, sidebarWidth, pageHeight, 'F');
    };

    const addSidebarContent = async (yStart: number) => {
        let y = yStart;

        // Logo
        if (config?.logoUrl) {
            try {
                const logoData = await toBase64(config.logoUrl);
                doc.addImage(logoData, 'PNG', 10, 15, 45, 18);
                y = 45;
            } catch (e) {
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('MASHUP', 15, 30);
                y = 45;
            }
        }

        // Event Info in Sidebar
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE', 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.clientName.toUpperCase(), 15, y + 4);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('EVENTO', 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text((quote.eventName || 'N/A').toUpperCase(), 15, y + 4);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('DATA', 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.eventDate ? format(quote.eventDate.toDate(), 'dd/MM/yyyy') : 'N/A', 15, y + 4);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('LOCAL', 15, y);
        doc.setFont('helvetica', 'normal');
        const localLines = doc.splitTextToSize((quote.eventLocation || 'N/A').toUpperCase(), sidebarWidth - 25);
        doc.text(localLines, 15, y + 4);

        // Footer Sidebar
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('MASHUPMUSIC.COM.BR', 15, pageHeight - 15);
    };

    // --- PAGE 1 ---
    drawSidebar();
    await addSidebarContent(45);

    // Main Content
    let yPos = 30;
    const contentX = sidebarWidth + 12;
    const contentWidth = pageWidth - contentX - 15;

    doc.setTextColor(0);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA DE', contentX, yPos);
    yPos += 10;
    doc.text('ORÇAMENTO', contentX, yPos);
    
    // Neon Bar below title
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.rect(contentX, yPos + 4, 30, 2, 'F');

    yPos += 25;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const introText = "Agradecemos o contato e a oportunidade de apresentar nossa estrutura para o seu evento. Abaixo, detalhamos os equipamentos selecionados para garantir a melhor experiência sonora e visual.";
    const introLines = doc.splitTextToSize(introText, contentWidth);
    doc.text(introLines, contentX, yPos);
    yPos += (introLines.length * 5) + 15;

    // Group items by category
    const categories = Array.from(new Set(quote.items.map(i => i.categorySnapshot || 'Outros')));

    categories.forEach(cat => {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            drawSidebar();
            yPos = 30;
        }

        // Category Heading with Neon indicator
        doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.rect(contentX, yPos - 5, 1.5, 8, 'F');
        
        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.toUpperCase(), contentX + 5, yPos);
        yPos += 10;

        const catItems = quote.items.filter(i => (i.categorySnapshot || 'Outros') === cat);
        
        catItems.forEach(item => {
            if (yPos > pageHeight - 30) {
                doc.addPage();
                drawSidebar();
                yPos = 30;
            }

            // Item Name
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30);
            doc.text(item.nameSnapshot, contentX + 5, yPos);

            // Item Qty & Price (Right Aligned)
            doc.setFont('helvetica', 'normal');
            doc.text(`${item.qty} UN`, pageWidth - 35, yPos, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            const totalItem = (item.qty * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            doc.text(totalItem, pageWidth - 15, yPos, { align: 'right' });
            
            yPos += 4;
            // Technical Description (Subtext)
            if (item.descriptionSnapshot) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(120);
                const descLines = doc.splitTextToSize(item.descriptionSnapshot, contentWidth - 40);
                doc.text(descLines, contentX + 5, yPos);
                yPos += (descLines.length * 4);
            }

            yPos += 6;
            // separator line
            doc.setDrawColor(240);
            doc.line(contentX + 5, yPos - 2, pageWidth - 15, yPos - 2);
            yPos += 4;
        });
        yPos += 5;
    });

    // Notes Box
    if (quote.notes) {
        if (yPos > pageHeight - 60) {
            doc.addPage();
            drawSidebar();
            yPos = 30;
        }
        doc.setFillColor(245, 245, 245);
        doc.rect(contentX, yPos, contentWidth + 5, 30, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('OBSERVAÇÕES:', contentX + 5, yPos + 7);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(quote.notes, contentWidth - 5);
        doc.text(notesLines, contentX + 5, yPos + 13);
    }

    // --- PAGE 2: INVESTMENT ---
    doc.addPage();
    drawSidebar();
    await addSidebarContent(45);

    yPos = 40;
    doc.setTextColor(0);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIMENTO', contentX, yPos);
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.rect(contentX, yPos + 4, 25, 1.5, 'F');

    yPos += 30;
    const totalsData = [
        ['SUBTOTAL EQUIPAMENTOS', quote.totals.itemsSubtotal],
        ['LOGÍSTICA / FRETE', quote.fees.frete],
        ['MONTAGEM E OPERAÇÃO', quote.fees.montagem + quote.fees.outros],
        ['DESCONTOS APLICADOS', -quote.discount],
    ];

    totalsData.forEach(([label, val]) => {
        if (val === 0 && !label.includes('SUBTOTAL')) return;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80);
        doc.text(label.toString(), contentX + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(Math.abs(Number(val)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 15, yPos, { align: 'right' });
        yPos += 12;
    });

    yPos += 10;
    doc.setFillColor(15, 15, 15);
    doc.rect(contentX, yPos, contentWidth + 5, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('TOTAL DA PROPOSTA', contentX + 5, yPos + 15);
    doc.setFontSize(18);
    doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.text(quote.totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 20, yPos + 16, { align: 'right' });

    // Terms
    yPos += 45;
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMOS E CONDIÇÕES', contentX + 5, yPos);
    yPos += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const terms = config?.rentalTerms || "O pagamento deve ser realizado 50% na reserva e 50% na entrega. Danos por mau uso são de responsabilidade do locatário.";
    const termsLines = doc.splitTextToSize(terms, contentWidth);
    doc.text(termsLines, contentX + 5, yPos);

    if (config?.pixKey) {
        yPos += (termsLines.length * 4) + 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('PAGAMENTO VIA PIX:', contentX + 5, yPos);
        doc.text(config.pixKey, contentX + 5, yPos + 5);
    }

    const safeName = quote.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`proposta_mashup_${safeName}.pdf`);
};
