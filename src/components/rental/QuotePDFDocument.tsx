
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { RentalQuote, AppConfig } from '@/lib/types';
import { format } from 'date-fns';

// Interface para estender o jsPDF com autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Função para converter imagem em Base64 com suporte a CORS
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
    let yPos = 20;

    // --- Cabeçalho ---
    if (config?.logoUrl) {
        try {
            const logoData = await toBase64(config.logoUrl);
            const imgWidth = 45;
            // Usamos uma altura fixa proporcional ou calculada
            doc.addImage(logoData, 'PNG', 15, 10, imgWidth, 20);
            yPos = 35;
        } catch(e) {
            console.warn("Não foi possível carregar a logo para o PDF, usando texto.");
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(config?.companyName || 'Mashup Music', 15, yPos);
            yPos += 10;
        }
    } else {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(config?.companyName || 'Mashup Music', 15, yPos);
        yPos += 10;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const creationDate = `Proposta gerada em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
    doc.text(creationDate, pageWidth - 15, 20, { align: 'right' });

    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // --- Detalhes do Cliente e Evento ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Detalhes da Proposta', 15, yPos);
    yPos += 5;
    
    doc.autoTable({
        startY: yPos,
        body: [
            ['Cliente:', quote.clientName, 'Evento:', quote.eventName || 'N/A'],
            ['Contato:', quote.clientContact || 'N/A', 'Data:', quote.eventDate ? format(quote.eventDate.toDate(), 'dd/MM/yyyy') : 'N/A'],
            ['Kit:', quote.kitName || 'Itens Avulsos', 'Local:', quote.eventLocation || 'N/A'],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 20 },
            1: { cellWidth: 75 },
            2: { fontStyle: 'bold', cellWidth: 20 },
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Tabela de Itens ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Itens Inclusos', 15, yPos);
    yPos += 5;
    
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
        headStyles: { fillColor: [40, 40, 40], fontSize: 10 },
        styles: { fontSize: 9 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // --- Resumo Financeiro ---
    const totalsX = pageWidth - 80;
    const totalsBodyRows = [
      ['Subtotal Itens:', quote.totals.itemsSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
    ];

    if (quote.fees.frete > 0) totalsBodyRows.push(['+ Frete:', quote.fees.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    if (quote.fees.montagem > 0) totalsBodyRows.push(['+ Montagem/Desmontagem:', quote.fees.montagem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    if (quote.fees.outros > 0) totalsBodyRows.push(['+ Outros:', quote.fees.outros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);
    if (quote.discount > 0) totalsBodyRows.push(['- Desconto:', quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]);

    doc.autoTable({
        startY: yPos,
        body: totalsBodyRows,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1, halign: 'right' },
        columnStyles: { 
            0: { fontStyle: 'bold' },
            1: { fontStyle: 'normal' }
        },
        margin: { left: totalsX }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(totalsX + 5, yPos, pageWidth - 15, yPos);
    yPos += 7;
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL FINAL:', totalsX + 5, yPos);
    doc.text(
      quote.totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      pageWidth - 15,
      yPos,
      { align: 'right' }
    );
    yPos += 15;

    // --- Observações e Termos ---
    // Verificamos se há espaço na página atual, senão criamos uma nova
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 20;
    }

    if(quote.notes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', 15, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 30);
        doc.text(notesLines, 15, yPos);
        yPos += (notesLines.length * 4.5) + 8;
    }
    
    if (config?.rentalTerms) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Termos e Condições de Locação:', 15, yPos);
        yPos += 5;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const termsLines = doc.splitTextToSize(config.rentalTerms, pageWidth - 30);
        doc.text(termsLines, 15, yPos);
        yPos += (termsLines.length * 4) + 10;
    }

    if (config?.pixKey) {
        if (yPos > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Pagamento via PIX:', 15, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(config.pixKey, 15, yPos);
    }
    
    // --- Rodapé ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
        'Mashup Music Hub - Eleve o nível sonoro do seu evento.', 
        pageWidth / 2, 
        doc.internal.pageSize.getHeight() - 10, 
        { align: 'center' }
    );

    // --- Salvar ---
    const safeName = quote.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `proposta_${safeName}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
};
