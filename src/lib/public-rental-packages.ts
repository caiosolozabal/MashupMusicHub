
/**
 * @fileOverview Base de dados dos pacotes de locação para a vitrine pública.
 * Configurado para usar caminhos de imagem locais conforme preferência do usuário.
 */

export type RentalPackage = {
  slug: string;
  title: string;
  subtitle: string;
  capacityPeople: number;
  highlights: string[];
  includes: string[];
  images: string[];
  ctaWhatsAppText: string;
};

export const RENTAL_PACKAGES: RentalPackage[] = [
  {
    slug: "pacote-a",
    title: "Pacote A",
    subtitle: "2 altas — atende até 50 pessoas",
    capacityPeople: 50,
    highlights: [
      "Ideal para aniversários e eventos pequenos",
      "Som limpo e potente",
      "Montagem rápida e discreta",
    ],
    includes: [
      "2 caixas ativas (altas)",
      "Cabos e acessórios",
      "Entrega e montagem (conforme combinado)",
    ],
    images: [
      "/pacotes/pacote-a/1.jpg",
      "/pacotes/pacote-a/2.jpg",
    ],
    ctaWhatsAppText:
      "Olá! Quero orçamento do Pacote A (2 altas — até 50 pessoas). Pode me ajudar com disponibilidade e valores?",
  },
  {
    slug: "pacote-b",
    title: "Pacote B",
    subtitle: "2 altas + 2 subs — atende até 100 pessoas",
    capacityPeople: 100,
    highlights: [
      "Grave de pista (subs) + definição nas altas",
      "Ótimo para pagode + DJ",
      "Mais pressão sonora sem perder qualidade",
    ],
    includes: [
      "2 caixas ativas (altas)",
      "2 subwoofers",
      "Cabos e acessórios",
      "Entrega e montagem (conforme combinado)",
    ],
    images: [
      "/pacotes/pacote-b/1.jpg",
      "/pacotes/pacote-b/2.jpg",
    ],
    ctaWhatsAppText:
      "Olá! Quero orçamento do Pacote B (2 altas + 2 subs — até 100 pessoas). Pode me ajudar?",
  },
  {
    slug: "pacote-casamento",
    title: "Pacote Casamento",
    subtitle: "Setup Premium — atende até 150 pessoas",
    capacityPeople: 150,
    highlights: [
      "Setup completo para pista e performance de DJ",
      "Visual profissional e acabamento premium",
      "Ideal para casamento e eventos corporativos",
    ],
    includes: [
      "4 caixas ativas (altas)",
      "2 subwoofers",
      "DJ Desk Premium",
      "Controladora Pioneer XDJ-XZ",
      "Cabos e acessórios",
      "Montagem e desmontagem técnica inclusa",
    ],
    images: [
      "/pacotes/pacote-casamento/1.jpg",
      "/pacotes/pacote-casamento/2.jpg",
      "/pacotes/pacote-casamento/3.jpg",
    ],
    ctaWhatsAppText:
      "Olá! Quero um orçamento do Pacote Casamento (Premium). Pode me ajudar com os detalhes?",
  },
];
