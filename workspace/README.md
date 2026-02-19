# Mashup Music Hub 🎧 - Documentação do Sistema

Este repositório contém a plataforma completa da **Mashup Music**, uma solução integrada que combina uma vitrine pública de talentos com um robusto ERP (Sistema de Gestão) para administração de agenda, logística de equipamentos e fechamentos financeiros.

---

## 🏗️ Arquitetura Técnica

A aplicação foi construída utilizando as tecnologias mais modernas do ecossistema web:

- **Frontend**: Next.js 14 (App Router) com React 18.
- **Estilização**: Tailwind CSS para design responsivo e Shadcn/UI para componentes de interface consistentes.
- **Backend-as-a-Service**: Firebase.
  - **Firestore**: Banco de dados NoSQL em tempo real.
  - **Auth**: Autenticação segura com controle de acesso baseado em funções (RBAC).
  - **Storage**: Armazenamento de comprovantes, logotipos e fotos dos itens.
- **Geração de Documentos**: `jsPDF` para criação de propostas e relatórios financeiros em PDF diretamente no navegador.

---

## 🎨 Identidade Visual e UX

O sistema opera com dois temas distintos para diferenciar claramente os contextos:

1.  **Área Pública (Tema Neon)**: Fundo escuro (`#0a0a0a`), textos em branco e destaques em **Verde Neon** (`#84FF96`). Foco em impacto visual e conversão de clientes.
2.  **Área Administrativa (Tema Profissional)**: Fundo branco, tipografia em preto e elementos de marca em **Roxo Vibrante**. Foco em legibilidade, produtividade e foco operacional.

---

## 🌐 Módulo Público (Vitrine)

### 1. Landing Page
- Design centralizado e minimalista.
- Hero section com chamada para ação (CTA) para contratação via WhatsApp.
- Seção de estatísticas e diferenciais da agência.

### 2. Showcase de DJs (Elenco)
- Grid dinâmico de talentos com efeitos de zoom e película visual.
- Filtros por estilo musical (Open Format, Funk, Black Music, etc.).
- **Páginas Individuais**: Biografia detalhada, presskits, links de redes sociais e curadoria de estilos para cada artista.

### 3. Cabeçalho e Rodapé Integrados
- Navegação fluida.
- Rodapé minimalista com links diretos para Instagram (@mashuprio) e WhatsApp do gestor.
- Suporte para logotipo dinâmico (carregado via `public/logo.png`).

---

## 🛡️ Módulo Interno (Gestão ERP)

O coração do sistema é o painel de controle, acessível apenas para usuários autenticados com níveis de permissão específicos (**Admin**, **Sócio**, **DJ**).

### 1. Dashboard de Inteligência
- Visão geral de faturamento mensal.
- Contador de pendências operacionais e pagamentos em atraso.
- Atalhos para os próximos eventos da agenda.

### 2. Gestão de Agenda (Eventos)
O sistema possui uma lógica avançada de **Estados Operacionais**:
- **Ativo**: Eventos futuros ou recentes aguardando conclusão.
- **Em Atraso**: Eventos passados onde o cliente não confirmou o pagamento integral.
- **Encerrado**: Eventos passados, com pagamento confirmado e já incluídos em um fechamento financeiro (Histórico Imutável).
- **Cancelado**: Registros desativados para fins de métricas.

**Funcionalidades da Agenda:**
- Visualização em **Lista Compacta** (otimizada para mobile) ou **Calendário Mensal**.
- Filtros por DJ, Mês/Ano ou período personalizado.
- **Vínculo de Eventos**: Capacidade de conectar um "Serviço de DJ" a uma "Locação de Equipamento", permitindo rastrear custos e receitas de forma cruzada.
- **Upload de Comprovantes**: DJs podem subir fotos de recibos diretamente no evento.

### 3. Sistema Financeiro e Fechamentos (Settlements)
Mecanismo automático para prestação de contas entre a agência e o artista:
- **Cálculo de Cachê**: Aplicação automática de porcentagens diferenciadas (Cachê de DJ vs. Comissão de Locação).
- **Lógica de Recebimento**: Distingue se o sinal foi recebido pela **Agência** ou pelo **DJ**, calculando o saldo final (quem deve pagar quem).
- **Ajuste Manual (Delta)**: Permite ao administrador adicionar bônus ou descontos extras antes de fechar o período.
- **Relatório de Fechamento**: Geração de PDF profissional com extrato de todos os eventos, dados bancários do DJ e resumo de valores.

### 4. Módulo de Locação (Rental)
- **Catálogo de Equipamentos**: Gestão de inventário com fotos, preços base, descrição técnica e tags.
- **Gerador de Orçamentos**: Ferramenta de montagem de kits.
- **Inteligência de Capacidade**: O sistema analisa os itens adicionados e sugere para quantas pessoas aquele kit é adequado (Ex: "Som ideal para até 100 pessoas com bom grave").
- **Propostas em PDF**: Gera propostas comerciais prontas para enviar ao cliente, com termos de uso e chave PIX da agência.

### 5. Gestão de Usuários e Permissões
- **Convite de Usuários**: Fluxo de criação de conta e perfil simultâneo.
- **Configurações Financeiras por DJ**: Cada DJ tem seu próprio percentual de contrato e cor de identificação na agenda.
- **Dados Bancários**: Armazenamento seguro de chaves PIX e contas para automatizar os relatórios de fechamento.

### 6. Ferramentas de Migração
- **Legado**: Visualização somente leitura de eventos do banco de dados antigo (`listeiro-cf302`).
- **Importação em Lote**: Ferramenta para subir catálogo de itens de locação de forma massiva.

---

## 🚀 Orientações para Produção

### Como subir a Logotipo
1. Salve sua logo como `logo.png` (formato PNG transparente recomendado).
2. Coloque o arquivo na pasta `/public/`.
3. O sistema irá atualizar automaticamente no topo e no rodapé.

### Hospedagem e Domínio
Para utilizar o domínio **mashupmusic.com.br**:
1. O projeto está configurado para o **Firebase App Hosting**.
2. Conecte o repositório GitHub ao console do Firebase.
3. Aponte o DNS no Registro.br conforme as instruções geradas no painel do Firebase após o primeiro deploy.

---
*Desenvolvido para Mashup Music Hub.*