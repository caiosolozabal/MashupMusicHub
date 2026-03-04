# Mashup Music Hub 🎧 - Guia de Produção

Este sistema está configurado para deploy automático via **Firebase App Hosting**.

## 🚀 Como colocar o site no ar (Domínio mashupmusic.com.br)

Sempre que fizermos alterações aqui no Firebase Studio e você quiser que elas apareçam no site real, execute estes 3 comandos no terminal:

```bash
git add .
git commit -m "Descrição da mudança"
git push
```

---

## 🎟️ Módulo de Captação de Convidados (Ativo)

Este módulo substitui o Google Forms e centraliza a inteligência de público da Mashup.

### Funcionalidades Disponíveis:
1. **Admin de Eventos**: Gestão centralizada de mídias e detalhes das festas.
2. **Criação em Lote**: Gere dezenas de listas de promoters em segundos.
3. **Landing Pages Premium**: Links curtos (`/l/nome-da-lista`) com visual imersivo e fechamento automático (curfew/capacidade).
4. **Ticket Digital**: Página de sucesso em formato de ingresso para incentivar compartilhamento.
5. **Magic Links (Promoters)**: Páginas de estatísticas em tempo real via token (sem login).
6. **CRM de Frequentadores**: Base global de contatos com histórico de RSVP e ranking de engajamento.

---

## 📸 Fotos da "Audio Experience" (Locação)

Para que as fotos reais apareçam nos cards de locação, você deve criar as seguintes pastas dentro de `public/` e colocar arquivos `.jpg`:

### 1. Social Signature
- Pasta: `public/estruturas/social/`
- Arquivos: `1.jpg`, `2.jpg`

### 2. Wedding Premium
- Pasta: `public/estruturas/wedding/`
- Arquivos: `1.jpg`, `2.jpg`

### 3. AUDIO EXPERIENCE
- Pasta: `public/estruturas/experience/`
- Arquivos: `1.jpg`, `2.jpg`

### 4. Corporate Elite
- Pasta: `public/estruturas/corporate/`
- Arquivos: `1.jpg`, `2.jpg`

---

## 📸 Fotos do "Elenco" (DJs)
Coloque as fotos dos DJs diretamente na pasta `public/djs/` com os seguintes nomes exatos:
- `Pivete.jpeg`, `djingrid.png`, `feeli.jpg`, `yurihang.jpeg`, `djsolo.jpeg`

---
*Mashup Music Hub - Elevando o som do seu evento.*
