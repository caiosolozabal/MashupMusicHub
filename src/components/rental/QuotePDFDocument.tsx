
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { RentalQuote, AppConfig, RentalQuoteItem } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

/**
 * Mapeamento Comercial Premium
 */
const GROUP_MAPPING: Record<string, string[]> = {
  'SISTEMA DE SONORIZAÇÃO': [
    'caixa', 'som', 'audio', 'speaker', 'sub', 'grave', 'ativa',
    'dj', 'controladora', 'mixer', 'pioneer', 'xdj', 'cdj', 'fone',
    'microfone', 'shure', 'sem fio', 'áudio'
  ],
  'ESTRUTURA E DESIGN DE LUZ': [
    'iluminação', 'luz', 'lighting', 'moving', 'head', 'led', 'refletor', 'par led', 'wash',
    'treliça', 'box truss', 'q25', 'q15', 'palco', 'praticável', 'mesa', 'mobiliário', 'estrutura',
    'painel', 'vídeo', 'led panel', 'telão', 'projetor'
  ],
  'OPERAÇÃO TÉCNICA ESPECIALIZADA': [
    'técnico', 'operador', 'equipe', 'staff', 'mão de obra', 'manuseio', 'roadie'
  ],
};

const getCommercialGroup = (category: string | null | undefined, itemName: string): string => {
  const cat = (category || '').toLowerCase();
  const name = itemName.toLowerCase();
  
  if (GROUP_MAPPING['OPERAÇÃO TÉCNICA ESPECIALIZADA'].some(p => cat.includes(p) || name.includes(p))) {
    return 'OPERAÇÃO TÉCNICA ESPECIALIZADA';
  }
  if (GROUP_MAPPING['SISTEMA DE SONORIZAÇÃO'].some(p => cat.includes(p) || name.includes(p))) {
    return 'SISTEMA DE SONORIZAÇÃO';
  }
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

export const generateQuotePdf = async (quote: RentalQuote, config: AppConfig | null) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const sidebarWidth = 65; 
    const neonGreen = [132, 255, 30]; 

    const drawLayout = () => {
        // Sidebar Background
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, sidebarWidth, pageHeight, 'F');
        
        // Sidebar Content
        let y = 35;
        
        // Logo / Brand
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('MASHUP', sidebarWidth / 2, y, { align: 'center' });
        
        y += 6;
        doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text('MUSIC EXPERIENCE', sidebarWidth / 2, y, { align: 'center' });

        const addSidebarSection = (title: string, value: string[], space = 28) => {
            y += space;
            doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 15, y);
            
            y += 2;
            doc.setDrawColor(40, 40, 40);
            doc.line(15, y, sidebarWidth - 15, y);
            
            y += 7;
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            value.forEach(line => {
                const split = doc.splitTextToSize(line, sidebarWidth - 25);
                doc.text(split, 15, y);
                y += (split.length * 4.5);
            });
        };

        addSidebarSection('EVENTO', [
            quote.clientName,
            quote.eventName || '',
            quote.eventDate ? format(quote.eventDate.toDate(), 'dd/MM') : ''
        ].filter(Boolean));

        addSidebarSection('LOCALIZAÇÃO', [quote.eventLocation || 'N/A']);

        addSidebarSection('EMITIDO EM', [format(quote.createdAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })]);

        // Footer Sidebar
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(7);
        doc.text(config?.companyName || 'MASHUP MUSIC HUB', 15, pageHeight - 15);
        doc.text('CNPJ: 48.716.222/0001-31', 15, pageHeight - 10);
    };

    const itemsByGroup: Record<string, RentalQuoteItem[]> = {};
    quote.items.forEach(item => {
        const group = getCommercialGroup(item.categorySnapshot, item.nameSnapshot);
        if (!itemsByGroup[group]) itemsByGroup[group] = [];
        itemsByGroup[group].push(item);
    });

    // --- PÁGINA 1 ---
    drawLayout();

    let yPos = 30;
    const contentX = sidebarWidth + 15;
    const contentWidth = pageWidth - contentX - 15;

    // Header Content
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA', contentX, yPos);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('DE', contentX + 3, yPos);
    
    yPos += 12;
    doc.setFontSize(34);
    doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.text('ORÇAMENTO', contentX, yPos);

    yPos += 12;
    doc.setTextColor(100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUÇÃO TÉCNICA E AUDIOVISUAL', contentX, yPos);

    yPos += 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const intro = "Apresentamos uma curadoria técnica exclusiva, projetada para atender aos mais altos padrões de casamentos e eventos corporativos. Nossa solução foca na clareza sonora absoluta e estética minimalista.";
    const introLines = doc.splitTextToSize(intro, contentWidth);
    doc.text(introLines, contentX, yPos);
    yPos += (introLines.length * 5) + 15;

    // Itens
    groupOrder.forEach(groupName => {
        const items = itemsByGroup[groupName];
        if (!items || items.length === 0) return;

        if (yPos > pageHeight - 40) {
            doc.addPage();
            drawLayout();
            yPos = 30;
        }

        // Grupo Titulo
        doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.rect(contentX, yPos - 5, 2.5, 8, 'F');
        
        doc.setTextColor(0);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(groupName, contentX + 6, yPos);
        
        doc.setFontSize(7);
        doc.setTextColor(160);
        doc.text('ESPECIFICAÇÃO TÉCNICA', contentX + 6, yPos + 6);
        doc.text('QTD TOTAL', pageWidth - 15, yPos + 6, { align: 'right' });
        yPos += 18;

        items.forEach(item => {
            if (yPos > pageHeight - 25) {
                doc.addPage();
                drawLayout();
                yPos = 30;
            }

            doc.setFontSize(10.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20);
            doc.text(item.nameSnapshot, contentX + 6, yPos);

            const totalItem = (item.qty * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            doc.setFontSize(10);
            doc.text(`${String(item.qty).padStart(2, '0')} ${totalItem}`, pageWidth - 15, yPos, { align: 'right' });
            
            yPos += 5;
            if (item.descriptionSnapshot) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(130);
                const desc = doc.splitTextToSize(item.descriptionSnapshot, contentWidth - 30);
                doc.text(desc, contentX + 6, yPos);
                yPos += (desc.length * 4.5);
            }
            yPos += 6;
        });
        yPos += 5;
    });

    // --- PÁGINA INVESTIMENTO ---
    doc.addPage();
    drawLayout();

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
        ['TAXA DE MONTAGEM / EQUIPE', quote.fees.montagem + quote.fees.outros],
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

    yPos += 45;
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES GERAIS', contentX + 5, yPos);
    yPos += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    const terms = config?.rentalTerms || "Este orçamento contempla montagem, desmontagem e suporte técnico especializado. A Mashup Music Experience garante a excelência técnica para que o foco do seu evento seja exclusivamente a experiência dos convidados.";
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

    doc.save(`Orcamento_Mashup_${quote.clientName.replace(/ /g, '_')}.pdf`);
};
