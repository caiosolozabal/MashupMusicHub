/**
 * @fileOverview Base de dados estática dos DJs para a vitrine pública.
 * Estes dados são usados para o Grid de DJs e para as páginas de perfil individuais.
 */

export interface PublicDj {
  slug: string;
  nome: string;
  instagramHandle: string;
  presskitUrl: string;
  fotoUrl: string;
  estilos: string[];
  resumoBooking: string;
  bioLonga: string;
}

export const PUBLIC_DJS: PublicDj[] = [
  {
    slug: 'deejaypivete',
    nome: 'Deejay Pivete',
    instagramHandle: 'deejaypivete',
    presskitUrl: 'https://drive.google.com/drive/folders/1ujsNM_FqRDGK90kkoARQCUqiM2si8svK',
    fotoUrl: '/djs/deejaypivete.jpg',
    estilos: ['Open Format', 'Black Music', 'Funk'],
    resumoBooking: 'Referência em técnica e repertório, Pivete domina as pistas com o melhor do Open Format e Black Music.',
    bioLonga: 'Com anos de estrada na cena carioca, Deejay Pivete construiu uma carreira sólida baseada na versatilidade e na leitura de pista impecável. Seu set transita com naturalidade entre o Hip-Hop clássico e os hits atuais, sempre mantendo a energia lá no alto.'
  },
  {
    slug: 'djsolo',
    nome: 'DJ Solô',
    instagramHandle: 'djsolo.rj',
    presskitUrl: 'https://drive.google.com/drive/folders/1OTeDOlDSUyNUSkdarAQSf53pMxJ04fxP',
    fotoUrl: '/djs/djsolo.jpg',
    estilos: ['Deep House', 'Nu Disco', 'House'],
    resumoBooking: 'Elegância e grooves sofisticados. Solô é a escolha ideal para eventos que buscam uma atmosfera premium.',
    bioLonga: 'DJ Solô é sinônimo de sofisticação sonora. Especialista em criar atmosferas envolventes, seus sets de Deep House e Nu Disco são cuidadosamente curados para proporcionar uma experiência auditiva única, seja em lounges, casamentos ou eventos corporativos de alto padrão.'
  },
  {
    slug: 'djyurihang',
    nome: 'Yuri Hang',
    instagramHandle: 'djyurihang',
    presskitUrl: 'https://drive.google.com/drive/folders/1RbNfPZQYiPZEDTFw3vOuO_ZHMoGPdmiZ',
    fotoUrl: '/djs/djyurihang.jpg',
    estilos: ['House', 'Techno', 'Melodic'],
    resumoBooking: 'Energia contagiante e presença de palco. Yuri Hang traz o melhor do House Progressivo e Melódico.',
    bioLonga: 'Yuri Hang destaca-se pela sua energia vibrante e conexão com o público. Com uma pesquisa musical focada nas vertentes melódicas do House e Techno, seus sets são jornadas sonoras que prendem a atenção da pista do início ao fim.'
  },
  {
    slug: 'feeli',
    nome: 'Feeli',
    instagramHandle: 'feeli.dj',
    presskitUrl: 'https://drive.google.com/drive/folders/1CAhZnb5-DiwALSxCum1QxErfEVhn2bJw',
    fotoUrl: '/djs/feeli.jpg',
    estilos: ['Indie Dance', 'Dark Disco', 'House'],
    resumoBooking: 'Explorando novas sonoridades, Feeli traz um set autêntico que mistura Indie Dance e Dark Disco.',
    bioLonga: 'Feeli é uma artista que não tem medo de arriscar. Sua identidade musical é marcada pela fusão de ritmos hipnóticos e batidas marcantes, criando um som que é ao mesmo tempo moderno e nostálgico.'
  },
  {
    slug: 'djingrid',
    nome: 'DJ Ingrid',
    instagramHandle: 'djingridoficial',
    presskitUrl: 'https://drive.google.com/drive/folders/1HJNkAVtz935_EegAWPK3-JBGvLw9QgV2',
    fotoUrl: '/djs/djingrid.png',
    estilos: ['Pop', 'Electronic', 'Latin'],
    resumoBooking: 'A explosão do Pop e música eletrônica com um toque latino irresistível. Diversão garantida.',
    bioLonga: 'DJ Ingrid domina a arte de fazer a pista dançar. Com um repertório que une os maiores sucessos do Pop mundial a batidas eletrônicas modernas, ela é mestre em ler o desejo do público e entregar exatamente o que a festa precisa.'
  }
];
