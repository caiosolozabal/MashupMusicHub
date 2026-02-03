
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { FinancialSettlement, Event } from '@/lib/types';
import { format } from 'date-fns';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export const generateSettlementPdf = async (settlement: FinancialSettlement, events: Event[]) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Mashup Music Hub', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(14);
    doc.text('Relatório de Fechamento Financeiro', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // --- Info Section ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const infoRows = [
        ['DJ:', settlement.djName],
        ['Período:', settlement.periodStart && settlement.periodEnd ? `${format(settlement.periodStart.toDate(), 'dd/MM/yyyy')} a ${format(settlement.periodEnd.toDate(), 'dd/MM/yyyy')}` : 'N/A'],
        ['Data de Emissão:', format(settlement.generatedAt.toDate(), 'dd/MM/yyyy HH:mm')],
        ['Responsável:', settlement.generatedByName || 'N/A']
    ];

    doc.autoTable({
        startY: yPos,
        body: infoRows,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // --- Bank Details ---
    doc.setFont('helvetica', 'bold');
    doc.text('Dados de Pagamento:', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
    const bankDetails = settlement.djDetails;
    const bankInfo = bankDetails.pixKey 
        ? `PIX: ${bankDetails.pixKey}` 
        : bankDetails.bankName 
            ? `${bankDetails.bankName} - Ag: ${bankDetails.bankAgency} Conta: ${bankDetails.bankAccount} (${bankDetails.bankAccountType})`
            : 'Dados bancários não informados.';
    
    doc.text(bankInfo, 14, yPos);
    yPos += 15;

    // --- Events Table ---
    doc.setFont('helvetica', 'bold');
    doc.text('Eventos Incluídos:', 14, yPos);
    yPos += 5;

    const tableHead = [['Data', 'Evento', 'Contratante', 'Valor Total', 'Rec. por', 'Cachê DJ']];
    const tableBody = events.map(event => [
        format(event.data_evento, 'dd/MM/yy'),
        event.nome_evento,
        event.contratante_nome,
        event.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        event.conta_que_recebeu === 'dj' ? 'DJ' : 'Agência',
        // Note: Cache do DJ recalculado aqui para o PDF se não salvo no evento
        // Para fins deste MVP, vamos usar o valor final balance proporcional
        '' 
    ]);

    doc.autoTable({
        startY: yPos,
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [157, 78, 221] }, // Purple Primary
        columnStyles: {
            3: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // --- Totals Section ---
    const summaryX = pageWidth - 80;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro:', summaryX, yPos);
    yPos += 7;

    const summaryRows = [
        ['Total de Eventos:', settlement.summary.totalEvents.toString()],
        ['Receita Bruta:', settlement.summary.grossRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Valor Calculado:', settlement.summary.finalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Ajuste (Delta):', settlement.summary.deltaValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
    ];

    doc.autoTable({
        startY: yPos,
        body: summaryRows,
        theme: 'plain',
        margin: { left: summaryX },
        styles: { fontSize: 10, halign: 'right' },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 2;
    doc.setLineWidth(0.5);
    doc.line(summaryX, yPos, pageWidth - 14, yPos);
    yPos += 7;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR FINAL PAGO:', summaryX, yPos, { align: 'right' });
    doc.text(
        settlement.summary.finalPaidValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pageWidth - 14,
        yPos,
        { align: 'right' }
    );

    if (settlement.notes) {
        yPos += 20;
        doc.setFontSize(10);
        doc.text('Observações:', 14, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(settlement.notes, pageWidth - 28);
        doc.text(splitNotes, 14, yPos);
    }

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Documento gerado eletronicamente pelo Mashup Music Hub.', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    const fileName = `Fechamento_${settlement.djName.replace(/ /g, '_')}_${format(settlement.generatedAt.toDate(), 'MM-yyyy')}.pdf`;
    doc.save(fileName);
};
