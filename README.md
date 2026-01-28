# Mashup Music Hub 🎧

Este é o manual do seu castelo! Aqui explicamos como ele funciona e como você pode guardá-lo na internet (GitHub).

## 🌟 O que o projeto faz?
É um sistema para cuidar de uma agência de DJs. Ele ajuda a:
- Marcar festas na agenda.
- Fazer orçamentos para alugar equipamentos de som.
- Calcular quanto cada DJ deve ganhar.

## 🏗️ Estrutura para o ChatGPT ler
- **Tecnologias:** Next.js, React, Tailwind CSS, Shadcn/UI.
- **Banco de Dados:** Firebase (Firestore e Auth).
- **Lógica:** Veja o arquivo `docs/backend.json` para entender as tabelas e regras.

---

## 📦 Como guardar seu projeto no GitHub (Passo a Passo)

Siga estes passos na **Janela Mágica (Terminal)** que fica na parte de baixo da sua tela. 

**Atenção:** Digite apenas as letras. Não precisa digitar aspas ou símbolos estranhos. Aperte a tecla **Enter** depois de cada linha.

### Passo 1: Preparar o terreno
git init

### Passo 2: Juntar as pecinhas
git add .

### Passo 3: Dar um nome para o seu trabalho
git commit -m "Meu projeto de DJs"

### Passo 4: Conectar com o site
*Antes deste passo, crie um repositório no site github.com e copie o link (ex: https://github.com/voce/projeto.git)*

**Se aparecer o erro "remote origin already exists", use este comando:**
git remote set-url origin COLOQUE_O_SEU_LINK_AQUI

**Se for a primeira vez e não der erro, use este:**
git remote add origin COLOQUE_O_SEU_LINK_AQUI

### Passo 5: Mandar para a estante!
git push -u origin main

---
*Dica: Se o computador pedir seu nome ou senha do GitHub, é só digitar e apertar Enter!*
