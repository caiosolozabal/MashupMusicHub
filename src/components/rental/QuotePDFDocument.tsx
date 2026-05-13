
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { RentalQuote, AppConfig, RentalQuoteItem } from '@/lib/types';
import { format } from 'date-fns';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

/**
 * Mapeamento Comercial Premium
 * Agrupa categorias técnicas em blocos de percepção de valor para o cliente.
 */
const GROUP_MAPPING: Record<string, string[]> = {
  'SISTEMA DE SONORIZAÇÃO': [
    'caixa', 'som', 'audio', 'speaker', 'sub', 'grave', 'ativa',
    'dj', 'controladora', 'mixer', 'pioneer', 'xdj', 'cdj', 'fone',
    'microfone', 'shure', 'sem fio', 'bastão', 'áudio'
  ],
  'ESTRUTURA E DESIGN DE LUZ': [
    'iluminação', 'luz', 'lighting', 'moving', 'head', 'led', 'refletor', 'par led', 'wash',
    'treliça', 'box truss', 'q25', 'q15', 'palco', 'praticável', 'mesa', 'mobiliário', 'estrutura',
    'painel', 'vídeo', 'led panel', 'telão', 'projetor', 'projeção', 'cenografia'
  ],
  'OPERAÇÃO TÉCNICA ESPECIALIZADA': [
    'técnico', 'operador', 'equipe', 'staff', 'mão de obra', 'manuseio', 'roadie'
  ],
};

const getCommercialGroup = (category: string | null | undefined, itemName: string): string => {
  const cat = (category || '').toLowerCase();
  const name = itemName.toLowerCase();
  
  // Prioridade 1: Operação Técnica (Staff)
  if (GROUP_MAPPING['OPERAÇÃO TÉCNICA ESPECIALIZADA'].some(p => cat.includes(p) || name.includes(p))) {
    return 'OPERAÇÃO TÉCNICA ESPECIALIZADA';
  }

  // Prioridade 2: Sonorização e Performance
  if (GROUP_MAPPING['SISTEMA DE SONORIZAÇÃO'].some(p => cat.includes(p) || name.includes(p))) {
    return 'SISTEMA DE SONORIZAÇÃO';
  }

  // Prioridade 3: Luz, Estruturas e Cenografia
  if (GROUP_MAPPING['ESTRUTURA E DESIGN DE LUZ'].some(p => cat.includes(p) || name.includes(p))) {
    return 'ESTRUTURA E DESIGN DE LUZ';
  }

  return 'OUTROS ITENS E ACESSÓRIOS';
};

const groupOrder = [
  'SISTEMA DE SONORIZAÇÃO',
  'ESTRUTURA E DESIGN DE LUZ',
  'OPERAÇÃO TÉCNICA ESPECIALIZADA',
  'OUTROS ITENS E ACESSÓRIOS'
];

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

        // Informações na Sidebar
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('PROPOSTA PARA', 15, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.clientName.toUpperCase(), 15, y + 5);

        y += 18;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('EVENTO / PROJETO', 15, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text((quote.eventName || 'N/A').toUpperCase(), 15, y + 5);

        y += 18;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('DATA PREVISTA', 15, y);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.eventDate ? format(quote.eventDate.toDate(), 'dd/MM/yyyy') : 'N/A', 15, y + 5);

        y += 18;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('LOCAL', 15, y);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const localLines = doc.splitTextToSize((quote.eventLocation || 'N/A').toUpperCase(), sidebarWidth - 25);
        doc.text(localLines, 15, y + 5);

        // Footer Sidebar
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        doc.text('MASHUPMUSIC.COM.BR', 15, pageHeight - 15);
    };

    // Agrupar itens comercialmente conforme as novas regras
    const itemsByGroup: Record<string, RentalQuoteItem[]> = {};
    quote.items.forEach(item => {
        const group = getCommercialGroup(item.categorySnapshot, item.nameSnapshot);
        if (!itemsByGroup[group]) itemsByGroup[group] = [];
        itemsByGroup[group].push(item);
    });

    // --- PÁGINA 1: DETALHAMENTO ---
    drawSidebar();
    await addSidebarContent(45);

    let yPos = 30;
    const contentX = sidebarWidth + 12;
    const contentWidth = pageWidth - contentX - 15;

    // Título Principal
    doc.setTextColor(0);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA DE', contentX, yPos);
    yPos += 10;
    doc.text('ORÇAMENTO', contentX, yPos);
    
    // Detalhe Neon
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.rect(contentX, yPos + 4, 30, 2.5, 'F');

    yPos += 25;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const introText = "Apresentamos nossa proposta técnica dimensionada para garantir a excelência sonora e visual do seu projeto. Utilizamos equipamentos de padrão global e equipe especializada.";
    const introLines = doc.splitTextToSize(introText, contentWidth);
    doc.text(introLines, contentX, yPos);
    yPos += (introLines.length * 5) + 15;

    // Renderizar Grupos Comerciais Consolidados
    groupOrder.forEach(groupName => {
        const items = itemsByGroup[groupName];
        if (!items || items.length === 0) return;

        // Verificar quebra de página
        if (yPos > pageHeight - 40) {
            doc.addPage();
            drawSidebar();
            yPos = 30;
        }

        // Título do Grupo com barra Neon
        doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.rect(contentX, yPos - 5, 2, 8, 'F');
        
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(groupName, contentX + 6, yPos);
        yPos += 12;

        items.forEach(item => {
            if (yPos > pageHeight - 25) {
                doc.addPage();
                drawSidebar();
                yPos = 30;
            }

            // Nome do Item
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30);
            doc.text(item.nameSnapshot, contentX + 6, yPos);

            // Qtd e Preço
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            doc.text(`${item.qty} UN`, pageWidth - 45, yPos, { align: 'right' });
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            const totalItem = (item.qty * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            doc.text(totalItem, pageWidth - 15, yPos, { align: 'right' });
            
            yPos += 5;

            // Descrição Técnica (Snapshot)
            if (item.descriptionSnapshot) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(140);
                const descLines = doc.splitTextToSize(item.descriptionSnapshot, contentWidth - 40);
                doc.text(descLines, contentX + 6, yPos);
                yPos += (descLines.length * 4);
            }

            yPos += 4;
            // Linha divisória sutil
            doc.setDrawColor(245);
            doc.line(contentX + 6, yPos, pageWidth - 15, yPos);
            yPos += 8;
        });

        yPos += 5; // Espaço extra entre grupos
    });

    // Box de Observações
    if (quote.notes) {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            drawSidebar();
            yPos = 30;
        }
        doc.setFillColor(250, 248, 255);
        doc.rect(contentX, yPos, contentWidth + 5, 35, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('OBSERVAÇÕES ADICIONAIS:', contentX + 5, yPos + 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const notesLines = doc.splitTextToSize(quote.notes, contentWidth - 5);
        doc.text(notesLines, contentX + 5, yPos + 14);
    }

    // --- PÁGINA 2: INVESTIMENTO ---
    doc.addPage();
    drawSidebar();
    await addSidebarContent(45);

    yPos = 40;
    doc.setTextColor(0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIMENTO', contentX, yPos);
    
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.rect(contentX, yPos + 4, 25, 2, 'F');

    yPos += 30;
    const investmentData = [
        ['EQUIPAMENTOS E SISTEMAS', quote.totals.itemsSubtotal],
        ['LOGÍSTICA E FRETE', quote.fees.frete],
        ['TAXA DE MONTAGEM / OUTROS', quote.fees.montagem + quote.fees.outros],
        ['DESCONTOS CONCEDIDOS', -quote.discount],
    ];

    investmentData.forEach(([label, val]) => {
        if (val === 0 && !label.toString().includes('EQUIPAMENTOS')) return;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text(label.toString(), contentX + 5, yPos);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(Math.abs(Number(val)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 15, yPos, { align: 'right' });
        
        yPos += 14;
    });

    // Bloco de Total Final (Preto com Neon)
    yPos += 10;
    doc.setFillColor(15, 15, 15);
    doc.rect(contentX, yPos, contentWidth + 5, 28, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIMENTO TOTAL DO PROJETO', contentX + 8, yPos + 16);
    
    doc.setFontSize(20);
    doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.text(quote.totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 20, yPos + 18, { align: 'right' });

    // Termos de Locação
    yPos += 45;
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES GERAIS', contentX + 5, yPos);
    
    yPos += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    const terms = config?.rentalTerms || "1. Validade da proposta: 7 dias. 2. Pagamento: 50% na reserva e 50% na entrega. 3. O contratante é responsável pela integridade dos equipamentos durante o período de locação.";
    const termsLines = doc.splitTextToSize(terms, contentWidth);
    doc.text(termsLines, contentX + 5, yPos);

    if (config?.pixKey) {
        yPos += (termsLines.length * 4) + 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('FORMA DE PAGAMENTO (PIX):', contentX + 5, yPos);
        doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.setFillColor(15,15,15);
        doc.rect(contentX + 5, yPos + 3, contentWidth - 10, 10, 'F');
        doc.text(config.pixKey, contentX + 10, yPos + 9.5);
    }

    const fileName = `Orcamento_Mashup_${quote.clientName.replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
};
