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

## 📦 Como baixar o projeto (Zip)
Se você quiser baixar todo o código para o seu computador, siga estes passos na **Janela Mágica (Terminal)**:

1. Digite este comando e aperte Enter:
   `zip -r projeto.zip . -x "node_modules/*" ".next/*" ".git/*"`
2. Espere terminar.
3. Olhe para a lista de arquivos na esquerda. Vai aparecer um arquivo chamado `projeto.zip`.
4. Clique com o botão direito nele e escolha **Download**.

---

## 🚀 Como enviar para o GitHub
Se você já criou seu repositório no GitHub, use estes comandos um por um no Terminal:

1. `git add .`
2. `git commit -m "Minha atualização"`
3. `git branch -M main`
4. `git remote add origin https://github.com/caiosolozabal/MashupGPT` (Só se ainda não tiver feito)
5. `git push -u origin main`

---

## 🛠️ Como rodar o projeto localmente
1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse em: `http://localhost:9002`

---
*Desenvolvido com carinho para a Mashup Music.*
