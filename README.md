# Mashup Music Hub 🎧

Este projeto é um sistema completo para gestão de agências de DJs e locação de equipamentos.

## 🌟 Funcionalidades Principais
- **Agenda de Eventos:** Controle total de datas, locais e status de pagamento.
- **Módulo de Locação:** Criação de orçamentos profissionais com catálogo de itens e geração de PDF.
- **Fechamentos Financeiros:** Cálculo automático de cachês de DJs e comissões de locação.
- **Gestão de Usuários:** Níveis de acesso para Administradores, Sócios e DJs.

## 🏗️ Estrutura Técnica
- **Frontend:** Next.js (App Router), React, Tailwind CSS.
- **Componentes:** Shadcn/UI e Lucide React para ícones.
- **Backend/Banco de Dados:** Firebase (Firestore e Authentication).
- **Lógica de Dados:** Ver arquivo `docs/backend.json` para o esquema completo das coleções.

---

## 📦 Como baixar o projeto (Zip Completo)
Para baixar tudo para o seu computador:
1. Digite este comando no Terminal:
   `zip -r projeto.zip . -x "node_modules/*" ".next/*" ".git/*"`
2. Clique com o botão direito em `projeto.zip` na esquerda e escolha **Download**.

## 🔍 Zip para Revisão Técnica (Leve)
Para criar um arquivo apenas com código e configurações (ideal para análise do ChatGPT ou revisores):
1. Digite este comando no Terminal:
   `zip -r project-review.zip . -x "node_modules/*" ".next/*" ".firebase/*" "dist/*" "build/*" "coverage/*" "public/uploads/*" "public/images/*" ".git/*"`
2. O arquivo `project-review.zip` será criado.

---

## 🚀 Como enviar para o GitHub
1. `git add .`
2. `git commit -m "Minha atualização"`
3. `git branch -M main`
4. `git remote add origin https://github.com/caiosolozabal/MashupGPT`
5. `git push -u origin main`

---

## 🛠️ Como rodar o projeto localmente
1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse em: `http://localhost:9002`

---
*Desenvolvido com carinho para a Mashup Music.*
