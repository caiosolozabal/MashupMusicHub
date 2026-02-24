/**
 * @fileOverview Base de dados estática dos DJs para a vitrine pública.
 * Atualizado com os textos oficiais e caminhos de arquivos confirmados.
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
    fotoUrl: '/djs/Pivete.jpeg',
    estilos: ['Hip Hop', 'Funk', 'Brasilidades', 'Open Format'],
    resumoBooking: 'DJ criado nas pistas do Rio, com forte identidade brasileira e passagem por grandes eventos em todo o país.',
    bioLonga: 'Nascido no bairro da Tijuca e criado nas festas de hip hop do centro do Rio de Janeiro, Pivete desenvolveu suas habilidades de discotecagem inspirado por DJs da cena R&B e Black Music.\n\nCom muito estudo e prática, construiu uma carreira sólida transitando com facilidade por diversos ritmos, tendo como especialidades a brasilidade e o funk dentro do formato Open Format.\n\nPivete já se apresentou em sete estados brasileiros, levando sua identidade musical para diferentes regiões do país. No Rio de Janeiro, sua cidade natal, é presença confirmada em grandes eventos e casas de destaque, consolidando-se como um DJ versátil, experiente e conectado com o público.'
  },
  {
    slug: 'djingrid',
    nome: 'DJ Ingrid',
    instagramHandle: 'djingridoficial',
    presskitUrl: 'https://drive.google.com/drive/folders/1HJNkAVtz935_EegAWPK3-JBGvLw9QgV2',
    fotoUrl: '/djs/djingrid.png',
    estilos: ['Funk Carioca', 'Funk', 'Open Format'],
    resumoBooking: 'Um dos principais nomes femininos do funk carioca, com atuação nacional e internacional.',
    bioLonga: 'DJ Ingrid iniciou sua carreira profissional em 2013 com o objetivo de ouvir nas pistas o tipo de música que marcou sua infância em Mesquita, na Baixada Fluminense: o funk carioca.\n\nHoje, além de DJ, atua como produtora musical e cultural, sendo reconhecida como um dos principais nomes femininos do gênero no circuito carioca.\n\nSua trajetória já passou por diferentes territórios, do Complexo do Lins ao Morro do Pão de Açúcar, além de apresentações em estados como Espírito Santo e Rio Grande do Sul. Seu trabalho também ultrapassou fronteiras, com sets publicados em rádios online na Itália e em Londres, além de participação em uma exposição na Alemanha.'
  },
  {
    slug: 'feeli',
    nome: 'Feeli',
    instagramHandle: 'feeli.dj',
    presskitUrl: 'https://drive.google.com/drive/folders/1CAhZnb5-DiwALSxCum1QxErfEVhn2bJw',
    fotoUrl: '/djs/feeli.jpg',
    estilos: ['Funk', 'Hip Hop', 'Open Format'],
    resumoBooking: 'DJ e produtor que leva versões exclusivas dos hits brasileiros com identidade do Rio.',
    bioLonga: 'Felipe Elidio, conhecido artisticamente como Feeli, nasceu e foi criado no Rio de Janeiro, mais precisamente em Copacabana. Formado em Produção Audiovisual pela FAETEC, iniciou sua trajetória musical ainda na infância, começando aos seis anos de idade.\n\nDesde os 15 anos atua profissionalmente como DJ, explorando a cena musical carioca e expandindo sua atuação para a produção musical ao longo da adolescência.\n\nAtualmente, Feeli tem como foco levar seu show para todo o Brasil, apresentando versões exclusivas dos principais hits brasileiros com uma pegada única e carioca. Seu objetivo é conectar pessoas através da música e transportar a energia vibrante do Rio de Janeiro para cada apresentação.'
  },
  {
    slug: 'yurihang',
    nome: 'Yuri Hang',
    instagramHandle: 'djyurihang',
    presskitUrl: 'https://drive.google.com/drive/folders/1RbNfPZQYiPZEDTFw3vOuO_ZHMoGPdmiZ',
    fotoUrl: '/djs/yurihang.jpeg',
    estilos: ['Funk', 'Hip Hop', 'Open Format'],
    resumoBooking: 'DJ Open Format com forte leitura de pista e vasta experiência, referência em versatilidade e energia em eventos no Rio de Janeiro.',
    bioLonga: 'Com mais de 14 anos de atuação, Yuri Hang é DJ especialista em Open Format, reconhecido por manter pistas cheias, sets versáteis e forte conexão com o público. Com base sólida em Black Music e Funk, adapta o repertório de forma estratégica para diferentes formatos de evento e perfis de pista.\n\nJá se apresentou em diversas casas e eventos do Rio de Janeiro, dividindo line-ups com grandes nomes da música nacional. Foi residente da tradicional casa de shows Konteiner, onde consolidou sua leitura de pista, presença de palco e capacidade de resposta em tempo real à dinâmica de cada evento.\n\nSeu trabalho é orientado a resultado: energia, engajamento e fluidez musical do início ao fim — ideal para festas, shows, eventos corporativos e projetos que exigem versatilidade, experiência e entrega profissional.'
  },
  {
    slug: 'djsolo',
    nome: 'Solô',
    instagramHandle: 'djsolo.rj',
    presskitUrl: 'https://drive.google.com/drive/folders/1OTeDOlDSUyNUSkdarAQSf53pMxJ04fxP',
    fotoUrl: '/djs/djsolo.jpeg',
    estilos: ['Funk', 'Hip Hop', 'Open Format'],
    resumoBooking: 'DJ da Zona Sul do Rio, com passagens por grandes festivais e artistas nacionais.',
    bioLonga: 'Originário da Sul do Rio de Janeiro, Solô (Caio Solozabal) descobriu sua paixão pela música ainda jovem. Aos 14 anos, iniciou sua trajetória como hobby, que rapidamente se transformou em dedicação profissional à discotecagem.\n\nAtuando no formato Open Format, Solô mistura com habilidade funk carioca, black music e música eletrônica, criando sets dinâmicos e conectados com diferentes públicos.\n\nAo longo da carreira, já se apresentou em eventos e festivais renomados como Kriok Festival, Alma Festival e JUCS, compartilhando o palco com artistas como L7nnon, Cabelinho e DJ Zullu. Também foi DJ residente da Fox Formaturas por dois anos, fortalecendo sua experiência em grandes produções.'
  }
];
