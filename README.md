# Mashup Music Hub 🎧

O ecossistema definitivo para gestão de agências de DJs e eventos. Esta plataforma integra uma vitrine pública de alto impacto com um ERP administrativo completo para controle de agenda, logística de equipamentos e fechamentos financeiros.

## 🚀 Como realizar o Deploy (Produção)

Este projeto está configurado com **Firebase App Hosting**. O deploy ocorre automaticamente a cada `push` para o branch principal no GitHub.

Para um deploy seguro e completo, execute a sequência abaixo no terminal:

```bash
# 1. Verificar se o código está íntegro
npm run typecheck

# 2. Adicionar mudanças
git add .

# 3. Registrar a versão
git commit -m "Descrição clara da sua mudança"

# 4. Enviar para o servidor (Inicia o deploy automático)
git push
```

## 🛠️ Configurações Iniciais no Console

Após o primeiro deploy, certifique-se de configurar no Firebase Console:
1. **Build > App Hosting**: Conecte o repositório.
2. **Settings > Domains**: Adicione `mashupmusic.com.br`.
3. **Authentication**: Autorize os domínios `mashupmusic.com.br` e `www.mashupmusic.com.br`.

## 📸 Fotos e Ativos

### Equipamentos (Locação)
Crie as pastas em `public/estruturas/` e adicione os arquivos `.jpg`:
- `social/` (1.jpg, 2.jpg)
- `wedding/` (1.jpg, 2.jpg)
- `experience/` (1.jpg, 2.jpg)
- `corporate/` (1.jpg, 2.jpg)

### DJs (Elenco)
Coloque as fotos em `public/djs/` com os nomes:
- `Pivete.jpeg`, `djingrid.png`, `feeli.jpg`, `yurihang.jpeg`, `djsolo.jpeg`

---
*Mashup Music Hub - Elevando o som do seu evento.*