# Mashup Music Hub 🎧 - Documentação Completa do Ecossistema

Este repositório contém a plataforma definitiva da **Mashup Music**, uma solução "all-in-one" que integra uma vitrine pública de alto impacto visual com um robusto sistema de gestão ERP para administração de agenda, logística de equipamentos e fechamentos financeiros complexos.

---

## 🏗️ 1. Arquitetura e Stack Tecnológica

O sistema foi projetado seguindo os padrões mais modernos de desenvolvimento web, priorizando performance, escalabilidade e segurança:

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router) - Utilizando Server Components para SEO na área pública e Client Components para interatividade na área de gestão.
- **Linguagem**: TypeScript para tipagem estática e redução de bugs em tempo de execução.
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) com uma estratégia de temas duplos (Neon vs. Profissional).
- **Componentes de UI**: [Radix UI](https://www.radix-ui.com/) e [Shadcn/UI](https://ui.shadcn.com/) para acessibilidade e design consistente.
- **Backend (BaaS)**: [Firebase](https://firebase.google.com/).
  - **Cloud Firestore**: Banco de dados NoSQL com sincronização em tempo real.
  - **Firebase Auth**: Sistema de autenticação com persistência de sessão e controle de funções (RBAC).
  - **Cloud Storage**: Hospedagem de ativos binários (comprovantes, logos e fotos).
- **Geração de Documentos**: `jsPDF` e `jsPDF-AutoTable` para processamento de PDFs no lado do cliente.

---

## 🎨 2. Design System e Identidade Visual

O sistema implementa dois contextos visuais distintos via classes CSS dinâmicas:

### Área Pública (Tema Neon)
- **Foco**: Conversão e Vitrine.
- **Paleta**: Fundo `#0a0a0a` (Preto Profundo), Destaques `#84FF96` (Verde Neon).
- **Tipografia**: Poppins (Headline) para impacto e modernidade.

### Área Interna (Tema Corporativo)
- **Foco**: Produtividade e Operação.
- **Paleta**: Fundo `#F0F0F0` (Cinza Claro), Primária `#9D4EDD` (Roxo Vibrante).
- **Tipografia**: PT Sans (Corpo) para legibilidade em longas jornadas de trabalho.

---

## 🌐 3. Módulo Público (Vitrine de Talentos)

### 3.1. Landing Page Inteligente
- **Hero Section**: Centralizada, com copy focada em elevar o nível sonoro de eventos.
- **Estatísticas Dinâmicas**: Exibição de marcos da agência (Eventos realizados, Curadoria, etc.).
- **CTA Integrado**: Botão de contratação direta via API do WhatsApp.

### 3.2. Catálogo de DJs (Elenco)
- **Grid Adaptativo**: Organização automática de cards com efeito de zoom sincronizado entre foto e película escura.
- **Filtros de Estilo**: Sistema de chips (badges) para identificação rápida de gênero musical.
- **Páginas Individuais**:
  - Bio Longa com suporte a quebras de linha e formatação.
  - Links externos para Presskits e Instagram.
  - Galeria de estilos musicais curados.

---

## 🛡️ 4. Módulo Administrativo (ERP)

Este é o motor do sistema, protegido por regras de segurança do Firestore que impedem o acesso de usuários não autorizados.

### 4.1. Controle de Acesso Baseado em Funções (RBAC)
- **Admin/Sócio**: Acesso total a todas as funções financeiras, de usuários e de catálogo.
- **DJ**: Acesso restrito apenas à sua própria agenda e seus fechamentos.
- **Financeiro**: (Previsão) Foco exclusivo em auditoria e pagamentos.

### 4.2. Gestão de Agenda e Eventos
O sistema possui uma inteligência de **Estados Operacionais** que classifica cada evento:
- **Ativo**: Eventos futuros ou recentes.
- **Em Atraso (Overdue)**: Eventos passados onde o `status_pagamento != 'pago'`. O sistema emite alertas visuais pulsantes.
- **Encerrado (Closed)**: Eventos passados, pagos pelo cliente e já processados em um fechamento financeiro. Estes tornam-se imutáveis para preservar o histórico contábil.
- **Vínculo de Eventos**: Permite conectar um evento de "Serviço de DJ" a um de "Locação de Equipamentos", facilitando o rastreamento de logística cruzada.

### 4.3. Sistema de Fechamentos Financeiros (Settlements)
Mecanismo de alta precisão para acerto de contas entre a agência e o artista:
- **Cálculo de Comissões**: Aplica percentuais específicos por DJ para serviços e locações separadamente.
- **Gestão de Fluxo de Caixa**: Identifica quem recebeu o sinal (Agência ou DJ) e calcula automaticamente quem deve pagar quem no saldo final.
- **Ajuste Manual (Delta)**: Permite adicionar bônus ou descontos manuais no momento do fechamento, com obrigatoriedade de justificativa textual.
- **Relatórios**: Geração automática de PDF com extrato detalhado, dados bancários e resumo de receita bruta vs. líquida.

### 4.4. Módulo de Locação (Rental)
- **Catálogo Técnico**: Gerenciamento de itens com atributos de "Pontuação de Som" e "Capacidade de Pessoas".
- **Inteligência de Sugestão**: O sistema analisa o "Sound Score" total do orçamento e sugere para qual tipo de público aquele kit é adequado (Ex: "Som ambiente" vs "Festa robusta").
- **Workflow de Orçamentos**: Criação, edição e histórico de propostas com conversão instantânea para PDF comercial contendo termos de uso e logo da agência.

---

## ⚙️ 5. Mecanismos de Configuração e Gestão

### 5.1. Gestão de Usuários
- **Convite Direto**: Administradores podem criar contas de usuários (Auth + Firestore) em um único fluxo.
- **Customização Financeira**: Definição de cores para a agenda, percentuais de ganho e dados de pagamento (PIX/Banco) por DJ.

### 5.2. Gestão de Marca (Branding)
- **Logotipo Dinâmico**: O sistema busca `public/logo.png`. Caso não exista, utiliza um fallback de texto estilizado.
- **Dados Mestres**: Configuração central de Chave PIX e Termos de Locação que se replicam em todos os PDFs gerados pelo sistema.

---

## 🛠️ 6. Ferramentas de Suporte e Migração

- **Legado (Old DB)**: Interface somente leitura conectada ao banco de dados antigo (`listeiro-cf302`), permitindo consulta de histórico de anos anteriores sem misturar os dados novos.
- **Importação Batch**: Script para subir em massa o catálogo de equipamentos a partir de uma estrutura pré-definida.

---

## 🚀 7. Guia para o Usuário Final (Produção)

### Como atualizar a Marca?
1. Nomeie sua logo como `logo.png` (formato PNG transparente recomendado).
2. Suba o arquivo na pasta `/public/` do projeto.
3. O sistema atualizará o topo, rodapé e PDFs automaticamente.

### Como funciona o Fechamento?
1. Vá em **Fechamentos**.
2. Selecione o DJ e o mês desejado.
3. Marque os eventos que o cliente já pagou.
4. O sistema dirá o valor exato que a agência deve transferir ao DJ ou vice-versa.
5. Clique em "Confirmar" e o sistema gera o recibo em PDF oficial.

---
*Documentação atualizada em Fevereiro de 2025.*
