# Mashup Music Hub 🎧 - Guia de Produção

Este sistema está configurado para deploy automático via **Firebase App Hosting**.

## 🚀 Como colocar o site no ar (Domínio mashupmusic.com.br)

Agora que o código já está no seu GitHub, siga estes passos no **Console do Firebase**:

### 1. Ativar o App Hosting
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. No menu lateral, vá em **Build > App Hosting**.
3. Clique em **"Começar"**.
4. Conecte sua conta do GitHub e selecione o repositório `MashupMusicHub`.
5. Na configuração de "Deployment", escolha a região mais próxima (usualmente `us-central1`).
6. Clique em **Finalizar e Implantar**. O Firebase fará o primeiro "build" do site (isso leva uns 3-5 minutos).

### 2. Conectar o Domínio Customizado
1. Assim que o deploy terminar, você verá uma URL terminada em `.web.app`.
2. Vá na aba **Configurações** (Settings) dentro do App Hosting.
3. Clique em **"Adicionar domínio personalizado"**.
4. Digite `mashupmusic.com.br`.
5. Como você já configurou o Registro.br, o Firebase validará a conexão automaticamente.

### 3. Autorizar o Login
1. No menu lateral, vá em **Build > Authentication**.
2. Clique na aba **Configurações > Domínios Autorizados**.
3. Adicione `mashupmusic.com.br` e `www.mashupmusic.com.br`. **Sem isso, o login não funcionará no novo domínio.**

---

## 📸 Fotos dos Equipamentos
Para que as fotos reais apareçam no site, você deve criar as seguintes pastas dentro de `public/` e colocar os arquivos:
- `public/pacotes/pacote-a/1.jpg`
- `public/pacotes/pacote-b/1.jpg`
- `public/pacotes/pacote-casamento/1.jpg`

---
*Mashup Music Hub - Elevando o som do seu evento.*