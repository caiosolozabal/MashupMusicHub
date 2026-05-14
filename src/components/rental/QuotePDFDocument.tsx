
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

export const generateQuotePdf = async (
  quote: RentalQuote, 
  config: AppConfig | null, 
  options: { showItemPrices?: boolean } = { showItemPrices: true }
) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const sidebarWidth = 62; 
    const neonGreen = [132, 255, 30]; 
    const showItemPrices = options.showItemPrices ?? true;

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
        const subTitle = 'MUSIC EXPERIENCE';
        const charSpace = 1.5;
        doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        
        // Centralização Perfeita: Compensação manual de CharSpace
        const textWidth = doc.getTextWidth(subTitle);
        const totalWidth = textWidth + ((subTitle.length - 1) * charSpace);
        const startX = (sidebarWidth - totalWidth) / 2;
        doc.text(subTitle, startX, y, { charSpace: charSpace });

        const addSidebarSection = (title: string, value: string[], space = 20) => {
            y += space;
            doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 15, y, { charSpace: 1.2 });
            
            y += 2;
            doc.setDrawColor(30, 30, 30);
            doc.setLineWidth(0.1);
            doc.line(15, y, sidebarWidth - 15, y);
            
            y += 6;
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            value.forEach(line => {
                const split = doc.splitTextToSize(line, sidebarWidth - 25);
                doc.text(split, 15, y);
                y += (split.length * 4);
            });
        };

        addSidebarSection('EVENTO', [
            quote.clientName,
            quote.eventName || '',
            quote.eventDate ? format(quote.eventDate.toDate(), 'dd/MM/yyyy') : ''
        ].filter(Boolean), 25);

        addSidebarSection('LOCALIZAÇÃO', [quote.eventLocation || 'N/A'], 18);

        addSidebarSection('EMITIDO EM', [format(quote.createdAt.toDate(), "dd 'de' MMM, yyyy", { locale: ptBR })], 18);

        // Footer Sidebar
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(6.5);
        doc.text(config?.companyName || 'MASHUP MUSIC HUB', 15, pageHeight - 15);
        doc.text('CNPJ: 48.716.222/0001-31', 15, pageHeight - 11);
    };

    const itemsByGroup: Record<string, RentalQuoteItem[]> = {};
    quote.items.forEach(item => {
        const group = getCommercialGroup(item.categorySnapshot, item.nameSnapshot);
        if (!itemsByGroup[group]) itemsByGroup[group] = [];
        itemsByGroup[group].push(item);
    });

    // --- PÁGINA 1 ---
    drawLayout();

    let yPos = 35;
    const contentX = sidebarWidth + 15;
    const contentWidth = pageWidth - contentX - 15;

    // Header Content com Hierarquia Editorial
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA', contentX, yPos);
    
    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('DE', contentX + 0.5, yPos);
    
    yPos += 12;
    doc.setFontSize(42);
    doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.text('ORÇAMENTO', contentX - 1, yPos);

    yPos += 10;
    doc.setTextColor(120);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUÇÃO TÉCNICA E AUDIOVISUAL', contentX, yPos, { charSpace: 0.5 });

    yPos += 22;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const intro = "Apresentamos uma curadoria técnica exclusiva, projetada para atender aos mais altos padrões de estética e clareza sonora. Nossa solução foca na excelência operacional para que o seu evento seja uma experiência inesquecível.";
    const introLines = doc.splitTextToSize(intro, contentWidth);
    doc.text(introLines, contentX, yPos);
    yPos += (introLines.length * 5) + 15;

    // Renderização dos Grupos
    groupOrder.forEach(groupName => {
        const items = itemsByGroup[groupName];
        if (!items || items.length === 0) return;

        // Integridade de Blocos: Se o grupo não cabe na página, pula inteira
        let estimatedGroupHeight = 25; 
        items.forEach(item => {
            estimatedGroupHeight += 12;
            if (item.descriptionSnapshot) {
                const descLines = doc.splitTextToSize(item.descriptionSnapshot, contentWidth - 30);
                estimatedGroupHeight += (descLines.length * 4);
            }
        });

        if (yPos + estimatedGroupHeight > pageHeight - 30) {
            doc.addPage();
            drawLayout();
            yPos = 35;
        }

        // Grupo Titulo
        doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
        doc.rect(contentX, yPos - 5, 2, 8, 'F');
        
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(groupName, contentX + 6, yPos);
        
        doc.setFontSize(6.5);
        doc.setTextColor(180);
        doc.text('ESPECIFICAÇÃO TÉCNICA', contentX + 6, yPos + 6, { charSpace: 0.3 });
        
        const rightHeader = showItemPrices ? 'QTD / VALOR TOTAL' : 'QTD TOTAL';
        doc.text(rightHeader, pageWidth - 15, yPos + 6, { align: 'right', charSpace: 0.3 });
        yPos += 16;

        items.forEach(item => {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                drawLayout();
                yPos = 35;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30);
            doc.text(item.nameSnapshot, contentX + 6, yPos);

            doc.setFontSize(9.5);
            if (showItemPrices) {
                const totalItem = (item.qty * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                doc.text(`${String(item.qty).padStart(2, '0')}    ${totalItem}`, pageWidth - 15, yPos, { align: 'right' });
            } else {
                doc.text(`${String(item.qty).padStart(2, '0')}`, pageWidth - 15, yPos, { align: 'right' });
            }
            
            yPos += 4.5;
            if (item.descriptionSnapshot) {
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(140);
                const desc = doc.splitTextToSize(item.descriptionSnapshot, contentWidth - 35);
                doc.text(desc, contentX + 6, yPos, { lineHeightFactor: 1.1 });
                yPos += (desc.length * 3.5);
            }
            yPos += 6;
        });
        yPos += 8;
    });

    // --- PÁGINA INVESTIMENTO ---
    doc.addPage();
    drawLayout();

    yPos = 45;
    doc.setTextColor(0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIMENTO', contentX, yPos);
    
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.rect(contentX, yPos + 4, 30, 1.5, 'F');

    yPos += 30;
    const investmentData = [
        ['EQUIPAMENTOS E SISTEMAS', quote.totals.itemsSubtotal],
        ['LOGÍSTICA E FRETE', quote.fees.frete],
        ['TAXA DE MONTAGEM E EQUIPE', quote.fees.montagem + quote.fees.outros],
        ['DESCONTOS CONCEDIDOS', -quote.discount],
    ];

    investmentData.forEach(([label, val]) => {
        if (val === 0 && !label.toString().includes('EQUIPAMENTOS')) return;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(120);
        doc.text(label.toString(), contentX + 5, yPos, { charSpace: 0.5 });
        
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20);
        doc.text(Math.abs(Number(val)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 15, yPos, { align: 'right' });
        
        yPos += 12;
        doc.setDrawColor(245);
        doc.line(contentX + 5, yPos - 5, pageWidth - 15, yPos - 5);
    });

    yPos += 15;
    // HERO BLOCK FINANCEIRO: Centralização e Hierarquia Premium
    const boxHeight = 55;
    const boxWidth = contentWidth + 5;
    const centerX = contentX + (boxWidth / 2);
    
    doc.setFillColor(10, 10, 10);
    doc.rect(contentX, yPos, boxWidth, boxHeight, 'F');
    
    // Título do Box: Pequeno, fino e elegante
    const invTitle = 'INVESTIMENTO TOTAL DO PROJETO';
    const invCharSpace = 1.3;
    doc.setTextColor(210);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    
    const invTitleWidth = doc.getTextWidth(invTitle);
    const invTitleTotalWidth = invTitleWidth + ((invTitle.length - 1) * invCharSpace);
    const invTitleX = centerX - (invTitleTotalWidth / 2);
    
    doc.text(invTitle, invTitleX, yPos + 18, { charSpace: invCharSpace });
    
    // Valor: Grande, neon e centralizado
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    const totalVal = quote.totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    doc.text(totalVal, centerX, yPos + 40, { align: 'center' });

    yPos += 75;
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
        doc.text(config.pixKey, contentX + (contentWidth/2), yPos + 9.5, { align: 'center' });
    }

    doc.save(`Orcamento_Mashup_${quote.clientName.replace(/ /g, '_')}.pdf`);
};
