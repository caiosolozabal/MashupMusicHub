import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { RentalQuote, AppConfig } from '@/lib/types';
import { format } from 'date-fns';

// We need to define the autoTable property on the jsPDF instance
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Function to load image from URL and convert to Base64
const toBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateQuotePdf = async (quote: RentalQuote, config: AppConfig | null) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 15;

    // --- Header ---
    if (config?.logoUrl) {
        try {
            const logoData = await toBase64(config.logoUrl);
            const img = new Image();
            img.src = logoData;
            await new Promise(resolve => { img.onload = resolve; });
            const imgWidth = 40;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(logoData, 'PNG', 15, 10, imgWidth, imgHeight);
        } catch(e) {
            console.error("Could not load logo for PDF", e);
        }
    }
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(config?.companyName || 'Proposta de Locação', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const creationDate = `Proposta gerada em: ${format(new Date(), 'dd/MM/yyyy')}`;
    doc.text(creationDate, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });
    yPos += 5;

    doc.setLineWidth(0.5);
    doc.line(15, yPos, doc.internal.pageSize.getWidth() - 15, yPos);
    yPos += 10;


    // --- Client and Event Info ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes da Proposta', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.autoTable({
        startY: yPos,
        body: [
            ['Cliente:', quote.clientName, 'Evento:', quote.eventName || 'N/A'],
            ['Contato:', quote.clientContact || 'N/A', 'Data:', quote.eventDate ? format(quote.eventDate.toDate(), 'dd/MM/yyyy') : 'N/A'],
            ['Kit:', quote.kitName || 'Itens Avulsos', 'Local:', quote.eventLocation || 'N/A'],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { cellWidth: 70 },
            2: { fontStyle: 'bold', cellWidth: 20 },
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Items Table ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Itens Inclusos', 15, yPos);
    yPos += 6;
    
    const tableHead = [['Item', 'Qtd.', 'Preço Unit.', 'Subtotal']];
    const tableBody = quote.items.map(item => [
        item.nameSnapshot,
        item.qty.toString(),
        item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        (item.qty * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);
    
    doc.autoTable({
        startY: yPos,
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [50, 50, 50] },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;


    // --- Totals, Notes, and Terms ---
    const totalsX = doc.internal.pageSize.getWidth() - 85;
    const totalsY = yPos;
    
    // Notes and Terms on the left
    if(quote.notes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', 15, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(quote.notes, 100);
        doc.text(notesLines, 15, yPos);
        yPos += (notesLines.length * 4) + 5;
    }
    
    if (config?.rentalTerms) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Termos e Condições:', 15, yPos);
        yPos += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const termsLines = doc.splitTextToSize(config.rentalTerms, 100);
        doc.text(termsLines, 15, yPos);
        yPos += (termsLines.length * 3.5) + 5;
    }

    if (config?.pixKey) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Pagamento via PIX:', 15, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(config.pixKey, 15, yPos);
    }
    
    // Totals on the right
    doc.autoTable({
        startY: totalsY,
        body: [
            ['Subtotal Itens:', quote.totals.itemsSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
            ['Taxas Adicionais:', quote.totals.feesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
            ['Desconto:', `- ${quote.totals.discountTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5, halign: 'right' },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: totalsX }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;
    doc.setLineWidth(0.3);
    doc.line(totalsX, finalY + 1, doc.internal.pageSize.getWidth() - 15, finalY + 1);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'Total Final:',
      totalsX,
      finalY + 6,
      { align: 'right' }
    );
     doc.text(
      quote.totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      doc.internal.pageSize.getWidth() - 15,
      finalY + 6,
      { align: 'right' }
    );

    // --- Save PDF ---
    const fileName = `proposta_${quote.clientName.replace(/ /g, '_')}_${quote.id.substring(0, 5)}.pdf`;
    doc.save(fileName);
};
