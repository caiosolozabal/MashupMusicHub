
# Mashup Music Hub 🎧

O ecossistema definitivo para gestão de agências de DJs e eventos. Esta plataforma integra uma vitrine pública de alto impacto com um ERP administrativo completo para controle de agenda, logística de equipamentos e fechamentos financeiros.

## 🚀 Como colocar o site no ar (Produção)

Agora que o código está no GitHub, siga estes passos no Console do Firebase:

1. **Ativar App Hosting**: No Console do Firebase, vá em *Build > App Hosting* e conecte seu repositório `MashupMusicHub`.
2. **Configurar Domínio**: Após o primeiro deploy, vá nas configurações do App Hosting e adicione `mashupmusic.com.br`.
3. **Validar DNS**: Como você já configurou o Registro.br, o Firebase validará o domínio automaticamente.
4. **Autorizar Login**: Vá em *Authentication > Settings > Authorized Domains* e adicione `mashupmusic.com.br` e `www.mashupmusic.com.br`.

## 🛠️ Comandos Git (Para atualizações)

Sempre que fizer mudanças, execute:
```bash
git add .
git commit -m "Descrição da sua mudança"
git push
```

## 📸 Fotos dos Equipamentos
Para as fotos dos pacotes aparecerem, crie as seguintes pastas dentro de `public/` e coloque os arquivos `.jpg`:
- `public/pacotes/pacote-a/` (1.jpg, 2.jpg)
- `public/pacotes/pacote-b/` (1.jpg, 2.jpg)
- `public/pacotes/pacote-casamento/` (1.jpg, 2.jpg, 3.jpg)

---
*Mashup Music Hub - Elevando o som do seu evento.*
