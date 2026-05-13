# ECHODOME — Official Band PWA

Progressive Web App oficial da Echodome. Roda no browser, pode ser instalado como app no celular (Android/iOS) e funciona offline.

---

## Como rodar localmente

Você precisa de um servidor HTTP local — abrir o `index.html` diretamente pelo `file://` não funciona com Service Worker.

**Opção 1 — VS Code Live Server**
Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) e clique em **Go Live**.

**Opção 2 — Python**
```bash
python3 -m http.server 8080
# Acesse http://localhost:8080
```

**Opção 3 — Node.js**
```bash
npx serve .
```

---

## Estrutura de pastas

```
/
├── index.html              # Página principal (SPA)
├── manifest.json           # Manifest do PWA (nome, ícones, cores)
├── service-worker.js       # Cache offline (static + áudio + fontes)
│
├── css/
│   ├── style.css           # Estilos globais, layout, seção Band
│   ├── player.css          # Mini player e player fullscreen
│   ├── gallery.css         # Grid e lightbox da galeria
│   ├── themes.css          # Variáveis de tema (default, neon, ember...)
│   ├── character-design.css # Viewer de personagens
│   ├── mobile.css          # Overrides para telas pequenas
│   └── ...
│
├── js/
│   ├── app.js              # Navegação, dados dos membros, redes sociais
│   ├── player.js           # Lógica do player de áudio
│   ├── gallery.js          # Dados da galeria, lightbox, filtros, busca
│   ├── songs/index.js      # Catálogo completo de músicas e álbuns
│   ├── themes.js           # Troca de tema
│   ├── downloader.js       # Download offline de músicas via SW
│   └── ...
│
└── assets/
    ├── songs/              # Arquivos .mp3
    ├── gallery/            # Fotos e GIFs
    │   └── webp/           # Versões WebP otimizadas (geradas automaticamente)
    ├── icons/              # Ícones do PWA (192/512, any/maskable)
    └── characters/         # SVGs dos personagens
```

---

## Como adicionar uma música nova

1. Coloque o arquivo `.mp3` em `assets/songs/`.
2. Abra `js/songs/index.js` e adicione um objeto na array do álbum correspondente:

```js
{
  id:       'nome-da-musica',
  title:    'Nome da Música',
  duration: '3:42',
  file:     'assets/songs/nome-da-musica.mp3',
  lyrics:   `Letra aqui...`,
  cover:    'assets/gallery/nome-da-musica.png',
}
```

3. Se for um álbum novo, crie um objeto na array `ALBUMS` seguindo o mesmo padrão dos existentes.

---

## Como adicionar uma foto na galeria

1. Coloque a imagem em `assets/gallery/`.
2. Para PNGs maiores que ~800KB, gere também uma versão WebP:
   ```bash
   cwebp -q 82 assets/gallery/minha-foto.png -o assets/gallery/webp/minha-foto.webp
   ```
3. Abra `js/gallery.js` e adicione na array `GALLERY_ITEMS`:
   ```js
   { file: 'assets/gallery/minha-foto.png', label: 'DESCRIÇÃO', placeholder: '◈', tags: ['live'] },
   ```
   Tags disponíveis: `live`, `studio`, `band`, `portrait`, `gif`, `artwork`.

---

## Links de redes sociais

Edite o array `BAND_SOCIALS` no topo de `js/app.js` com os URLs reais:

```js
const BAND_SOCIALS = [
  { id: 'instagram', label: 'INSTAGRAM', url: 'https://instagram.com/SUA_CONTA', ... },
  { id: 'spotify',   label: 'SPOTIFY',   url: 'https://open.spotify.com/artist/SEU_ID', ... },
];
```

---

## Temas

O app tem múltiplos temas de cor definidos em `css/themes.css`. Para adicionar um tema novo, crie um novo bloco `[data-theme="nome"]` no arquivo seguindo o padrão dos existentes.

---

## Funcionalidades adicionadas (fix #16–20)

### #16 — Contador de plays
Cada música tocada por mais de 10 segundos conta como 1 play (salvo em `localStorage`). As 3 mais tocadas ganham o badge **★ TOP** na tracklist. O contador fica visível ao lado de cada faixa.

### #17 — Notificações push
Botão **NOTIFICAR LANÇAMENTOS** na seção Band. Requer backend VAPID para funcionar em produção — substitua `VAPID_PUBLIC_KEY` em `js/push-notifications.js` pela sua chave pública gerada com:
```bash
npx web-push generate-vapid-keys
```

### #18 — Compartilhar música
Ícone de share no player fullscreen. Usa `navigator.share` no mobile (abre a gaveta nativa do sistema). Em desktop sem suporte, copia o link para a área de transferência.

### #19 — Fila customizável
Botão **+** em cada faixa na tracklist adiciona à fila. Botão **☰** no mini player abre o painel lateral. Arraste os itens para reordenar. A fila tem prioridade sobre o avanço normal de álbum.

### #20 — Letras independentes
Nova aba **LYRICS** no nav. Lista todas as músicas organizadas por álbum; clique em qualquer uma para ler a letra sem precisar tocá-la. Botão **▶ TOCAR** diretamente na página da letra.
