# Mashup Music Hub 🎧 - Snapshot Técnico

Este documento fornece uma visão técnica detalhada da arquitetura, estrutura e funcionalidades do sistema Mashup Music Hub.

## 🏗️ Arquitetura do Projeto

O projeto é uma aplicação **Next.js 14** utilizando o **App Router**, integrada ao **Firebase** para autenticação, banco de dados (Firestore) e armazenamento de arquivos (Storage).

### Stack Tecnológica
- **Frontend:** React 18, Tailwind CSS, Shadcn/UI.
- **Backend-as-a-Service:** Firebase (Auth, Firestore, Storage).
- **Relatórios:** jsPDF e jsPDF-autotable para geração de orçamentos.
- **Tipagem:** TypeScript rigoroso para modelos de dados.

## 📂 Snapshot da Estrutura de Arquivos (Top 200)

### Configurações de Ambiente
- `.firebaserc` - Configuração de projeto padrão (mashup-music-hub).
- `firebase.json` - Configurações de deploy de regras e índices.
- `firestore.rules` - Regras de segurança granulares por Role.
- `firestore.indexes.json` - Índices compostos para queries de alta performance.
- `package.json` - Manifesto de dependências e scripts.

### Código Fonte (`src/`)
- `src/app/` - Rotas e páginas (Layouts, Dashboard, Agenda, Locação, Fechamentos, Configurações).
- `src/components/` - Componentes modulares:
  - `ui/` - Componentes de base Shadcn.
  - `events/` - Formulários e visualização de eventos.
  - `rental/` - Lógica de orçamentos e geração de PDF.
  - `settlements/` - Interface de fechamento financeiro.
  - `settings/` - Painéis de controle administrativo.
- `src/context/` - `AuthContext` para gestão global de sessão e permissões.
- `src/lib/` - Bibliotecas utilitárias, definições de tipos (`types.ts`) e instâncias do Firebase.
- `src/hooks/` - Hooks customizados para autenticação e utilitários de UI.

## 🔑 Regras de Negócio e Permissões (RBAC)

O sistema opera com base em funções (Roles):
- **Admin/Partner:** Acesso total, gestão de usuários, contas bancárias e configuração de marca.
- **DJ:** Acesso à própria agenda, upload de comprovantes, visualização de fechamentos e (se autorizado) criação de eventos de locação.
- **Financeiro:** Focado na gestão de cobranças e fechamentos.

## 🚀 Comandos Úteis

### Desenvolvimento
```bash
npm run dev          # Inicia o servidor local em http://localhost:9002
npm run build        # Gera o build de produção
```

### Operações Firebase (Modo Seguro)
```bash
# Deploy apenas de regras de segurança
firebase deploy --only firestore:rules

# Deploy apenas de índices
firebase deploy --only firestore:indexes

# Trocar projeto ativo
firebase use --alias default
```

## 🛠️ Manutenção e Migração
O sistema inclui uma ferramenta de migração dedicada em `src/app/(app)/settings/migration/`, permitindo a importação de itens de catálogo em lote e a consulta de dados legados do projeto `listeiro-cf302`.

---
*Gerado automaticamente pelo App Prototyper em Firebase Studio.*
