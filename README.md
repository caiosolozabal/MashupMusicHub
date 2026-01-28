# Mashup Music Hub 🎧

O **Mashup Music Hub** é uma plataforma completa de gestão para agências de DJs, focada em automatizar a agenda de eventos, o controle financeiro (fechamentos) e orçamentos de locação de equipamentos.

## 🚀 Funcionalidades Principais

- **Dashboard Gerencial:** Visão rápida de faturamento (Serviços e Locações), eventos do mês e métricas de catálogo.
- **Agenda de Eventos:** Controle total de datas, horários, locais e DJs atribuídos, com visualização em lista e calendário.
- **Módulo de Locação:** Criador de orçamentos profissional com catálogo de itens, cálculo automático de taxas (frete, montagem e desmontagem) e geração de PDF para o cliente.
- **Fechamentos Financeiros:** Sistema de apuração de cachês dos DJs baseado em percentuais configuráveis por tipo de serviço (DJ vs. Locação), com registro de pagamentos.
- **Migração de Dados:** Ferramentas para visualização de dados de sistemas legados (`listeiro-cf302`) e importação em lote de itens.

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS.
- **Componentes:** Shadcn/UI, Lucide React (Ícones).
- **Backend/Banco de Dados:** Firebase (Firestore, Authentication, Storage, App Hosting).
- **Relatórios:** jsPDF para geração de orçamentos profissionais.

## 📂 Estrutura do Projeto

- `src/app/(app)`: Rotas principais (Dashboard, Agenda, Locação, Fechamentos).
- `src/components`: Componentes reutilizáveis, incluindo os módulos específicos de Eventos e Locação.
- `src/context/AuthContext.tsx`: Gerenciamento de autenticação e permissões baseadas em roles (Admin, Sócio, DJ).
- `docs/backend.json`: O "Blueprint" do projeto, contendo o esquema de todas as entidades do banco de dados para referência.
- `src/lib/utils.ts`: Lógica central de cálculo de cachês e utilitários.

## 🤖 Análise por IA (Dica para ChatGPT)

Para que o ChatGPT analise este projeto com precisão, forneça a ele o conteúdo dos arquivos:
1. `README.md` (este arquivo)
2. `docs/backend.json` (esquema do banco de dados)
3. `src/lib/types.ts` (definições de tipos do sistema)

## 📦 Como subir para o GitHub

1. Crie um repositório **vazio** no seu GitHub.
2. Abra o **Terminal** aqui no Firebase Studio.
3. Execute os comandos abaixo (substituindo o link pelo do seu repositório):

```bash
git init
git add .
git commit -m "Initial commit - Mashup Music Hub"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```
