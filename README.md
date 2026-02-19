# Mashup Music Hub 🎧 - Site Institucional e Gestão

Este projeto é uma plataforma completa para a agência Mashup Music, incluindo uma vitrine pública de DJs e uma área administrativa para gestão de agenda e fechamentos financeiros.

## 🚀 Guia de Deploy (Hospedagem)

Para colocar o site no ar com o domínio `mashupmusic.com.br`:

1. **Repositório**: Certifique-se de que o código está em um repositório privado ou público no GitHub.
2. **Firebase App Hosting**:
   - Vá para o [Console do Firebase](https://console.firebase.google.com/).
   - Selecione o projeto `mashup-music-hub`.
   - No menu lateral, clique em **App Hosting** e depois em "Começar".
   - Conecte sua conta do GitHub e selecione este repositório.
   - O Firebase cuidará de todo o processo de build do Next.js.
3. **Domínio Personalizado**:
   - Assim que o primeiro deploy terminar, vá nas configurações do App Hosting.
   - Clique em **"Add Custom Domain"**.
   - Digite `mashupmusic.com.br`.
   - Copie os valores de DNS fornecidos pelo Firebase.
4. **Configuração no Registro.br**:
   - Acesse o painel do seu domínio no Registro.br.
   - Na seção DNS, insira os registros (A e TXT) fornecidos pelo Firebase.
   - Aguarde a propagação (pode levar algumas horas).

## 🛠️ Tecnologias
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Shadcn/UI.
- **Backend**: Firebase (Auth, Firestore, Storage, App Hosting).
- **Design**: Tema Neon para a área pública e Profissional/Roxo para a área interna.

## 📁 Estrutura de Arquivos Importantes
- `src/app/(public)`: Páginas visíveis para todos os usuários (Home, DJs).
- `src/app/(app)`: Área restrita para DJs e Administradores.
- `public/`: Pasta para arquivos estáticos (logo.png, fotos dos DJs).
- `src/lib/public-djs.ts`: Banco de dados dos DJs da vitrine.

## 🎨 Identidade Visual
- **Público**: Background `#0a0a0a`, Primária `#84FF96` (Verde Neon).
- **Interno**: Background Branco, Primária Roxo Vibrante.

---
*Desenvolvido para Mashup Music Hub.*
