# Mashup Music Hub 🎧

O **Mashup Music Hub** é uma plataforma completa de gestão para agências de DJs, focada em automatizar a agenda de eventos, o controle financeiro (fechamentos) e orçamentos de locação de equipamentos.

## 🚀 Funcionalidades Principais

- **Dashboard Gerencial:** Visão rápida de faturamento, eventos do mês e métricas de locação.
- **Agenda de Eventos:** Controle total de datas, horários, locais e DJs atribuídos, com visualização em lista e calendário.
- **Módulo de Locação:** Criador de orçamentos profissional com catálogo de itens, cálculo automático de taxas (frete, montagem) e geração de PDF para o cliente.
- **Fechamentos Financeiros:** Sistema de apuração de cachês dos DJs baseado em percentuais configuráveis, com registro de pagamentos e upload de comprovantes.
- **Migração de Dados:** Ferramentas para visualização de dados de sistemas legados e importação em lote.

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS.
- **Componentes:** Shadcn/UI, Lucide React (Ícones).
- **Backend/Banco de Dados:** Firebase (Firestore, Authentication, Storage, App Hosting).
- **Relatórios:** jsPDF para geração de orçamentos.

## 📂 Estrutura do Projeto

- `src/app/(app)`: Contém as rotas principais do sistema (Dashboard, Agenda, Locação, Configurações).
- `src/components`: Componentes reutilizáveis da interface.
- `src/context/AuthContext.tsx`: Gerenciamento de autenticação e permissões (Admin, Sócio, DJ).
- `docs/backend.json`: O "Blueprint" do projeto, contendo o esquema de todas as entidades do banco de dados.
- `src/lib/utils.ts`: Contém a lógica central de cálculo de cachês e utilitários.

## 📦 Como subir para o GitHub

1. Crie um repositório vazio no seu GitHub.
2. Abra o terminal aqui no Firebase Studio.
3. Execute os seguintes comandos:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Mashup Music Hub"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

## 🤖 Análise por IA (ChatGPT)

Para que o ChatGPT analise este projeto com precisão, forneça a ele o conteúdo dos arquivos:
1. `README.md` (este arquivo)
2. `docs/backend.json` (esquema do banco de dados)
3. `src/lib/types.ts` (definições de tipos do sistema)
