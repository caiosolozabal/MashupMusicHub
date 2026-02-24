/**
 * @fileOverview Base de dados das estruturas da Mashup Audio Experience.
 * Focado em propostas de valor em vez de apenas especificações técnicas.
 */

export type RentalPackage = {
  slug: string;
  title: string;
  subtitle: string;
  highlights: string[];
  includes: string[];
  images: string[];
};

export const RENTAL_PACKAGES: RentalPackage[] = [
  {
    slug: "social",
    title: "Social Signature",
    subtitle: "A batida perfeita para sua celebração particular",
    highlights: [
      "Ideal para aniversários e festas sociais",
      "Design compacto e elegante",
      "Som cristalino com alta fidelidade",
    ],
    includes: [
      "Par de caixas ativas de alta performance",
      "Iluminação de pista sincronizada",
      "Setup de DJ Mashup Standard",
      "Montagem e desmontagem técnica",
    ],
    images: [
      "https://picsum.photos/seed/social-1/800/1000",
      "https://picsum.photos/seed/social-2/800/1000",
    ],
  },
  {
    slug: "wedding",
    title: "Wedding Premium",
    subtitle: "Excelência técnica para o seu 'sim'",
    highlights: [
      "Estética impecável que valoriza a decoração",
      "Sistema de subwoofers para pressão sonora de pista",
      "Suporte total para cerimônia e recepção",
    ],
    includes: [
      "Sistema completo de PA (Altas + Subs)",
      "DJ Desk Premium com acabamento exclusivo",
      "Iluminação cênica e de pista",
      "Microfonia digital para discursos",
    ],
    images: [
      "https://picsum.photos/seed/wedding-1/800/1000",
      "https://picsum.photos/seed/wedding-2/800/1000",
    ],
  },
  {
    slug: "live",
    title: "Live Performance",
    subtitle: "Potência e clareza para apresentações ao vivo",
    highlights: [
      "Monitoramento de palco preciso",
      "Mixagem profissional para bandas e artistas",
      "Estrutura robusta para ambientes amplos",
    ],
    includes: [
      "Line Array ou Sistema de PA de Grande Porte",
      "Mesa de som digital de última geração",
      "Kit completo de microfonia e direct boxes",
      "Técnico de som dedicado",
    ],
    images: [
      "https://picsum.photos/seed/live-1/800/1000",
      "https://picsum.photos/seed/live-2/800/1000",
    ],
  },
  {
    slug: "corporate",
    title: "Corporate Elite",
    subtitle: "Soberia e impacto para sua marca",
    highlights: [
      "Som inteligível para palestras e reuniões",
      "Equipamentos discretos e modernos",
      "Pontualidade e rigor técnico absoluto",
    ],
    includes: [
      "Sistema de som distribuído para clareza vocal",
      "Painéis de LED ou Projeção (opcional)",
      "Passadores de slide e suporte técnico",
      "Ambientação sonora para coquetéis",
    ],
    images: [
      "https://picsum.photos/seed/corp-1/800/1000",
      "https://picsum.photos/seed/corp-2/800/1000",
    ],
  },
];
