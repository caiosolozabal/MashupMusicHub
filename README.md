# Mashup Music Hub 🎧

Sistema integrado de gestão para a agência **Mashup Music**, unindo uma vitrine pública de DJs com um ERP administrativo completo.

## 🚀 Guia de Utilização por Página

### 1. Dashboard (Painel de Controle)
- **O que faz**: Visão geral da saúde da agência ou da agenda do DJ.
- **Como usar**: 
  - Acompanhe os cards de **Pendências Operacionais** (eventos que já passaram e não foram pagos).
  - Visualize o **Faturamento do Mês** atual.
  - Acesse rapidamente os **Próximos Eventos** através dos links diretos.

### 2. Agenda de Eventos
- **O que faz**: Gestão completa do calendário operacional.
- **Como usar**:
  - **Novo Evento**: Clique em "Novo" e preencha os dados. Se for Staff, você pode atribuir qualquer DJ. Se for DJ, o evento é auto-atribuído.
  - **Vínculos**: Use o campo "Vincular Evento" para conectar uma Locação a um Serviço de DJ, facilitando o rastreamento.
  - **Comprovantes**: Dentro de um evento salvo, DJs podem fazer upload de recibos de pagamento diretamente para conferência da Staff.
  - **Modos de Exibição**: Alterne entre "Lista" (compacto para mobile) e "Mês" (visualização de calendário).

### 3. Fechamentos (Settlements)
- **O que faz**: O "coração financeiro" que calcula quem deve quem.
- **Como usar**:
  - **Seleção**: Escolha o DJ e o mês/período.
  - **Conferência**: Marque apenas os eventos que o cliente já pagou integralmente.
  - **Resumo**: O sistema calcula automaticamente o **Cachê do DJ** (baseado em % de serviço e locação) e o **Saldo Final** (considerando quem recebeu o sinal).
  - **Ajuste Manual (Delta)**: Caso precise adicionar um bônus ou desconto extra, altere o valor final e descreva o motivo.
  - **Finalização**: Ao confirmar, um PDF oficial é gerado e o evento é "Encerrado", ficando protegido contra edições futuras.

### 4. Locação (Rental)
- **O que faz**: Montagem de orçamentos comerciais de equipamentos.
- **Como usar**:
  - **Orçamento**: Adicione itens do catálogo ao carrinho lateral. O sistema sugere a capacidade de público baseada na "Pontuação de Som".
  - **Taxas**: Insira frete ou descontos.
  - **Status**: Salve como "Rascunho" ou "Enviado". 
  - **PDF Comercial**: Gere a proposta profissional com o logo da agência e termos de uso configurados.

### 5. Configurações
- **Gerenciar Usuários**: Staff pode convidar novos usuários, definir percentuais de comissão e escolher a cor do DJ no calendário.
- **Contas da Agência**: Cadastro de contas bancárias para controle de recebimento de sinal.
- **Marca (Logo & PIX)**: Suba o logotipo da empresa e a chave PIX principal. Esses dados aparecerão em todos os PDFs.
- **Migração**: Ferramenta para consultar eventos do banco de dados antigo ou importar o catálogo de itens via planilha.

---

## 🏗️ Arquitetura Técnica
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS.
- **Backend**: Firebase (Auth, Firestore, Storage).
- **Segurança**: Regras de acesso baseadas em funções (RBAC).
- **Temas**: Tema Profissional (Interno) e Tema Neon (Público).

## 📖 Documentação Completa
Para detalhes sobre modelagem de dados e regras de negócio complexas, consulte:
👉 **[CONSULTAR DOCUMENTAÇÃO DE ENGENHARIA](/workspace/README.md)**

---
*Mashup Music Hub - Elevando o som do seu evento.*