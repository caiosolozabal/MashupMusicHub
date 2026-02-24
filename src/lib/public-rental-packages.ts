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
      "/estruturas/social/1.jpg",
      "/estruturas/social/2.jpg",
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
      "/estruturas/wedding/1.jpg",
      "/estruturas/wedding/2.jpg",
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
      "/estruturas/live/1.jpg",
      "/estruturas/live/2.jpg",
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
      "/estruturas/corporate/1.jpg",
      "/estruturas/corporate/2.jpg",
    ],
  },
];
