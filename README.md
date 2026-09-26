# 🎬 Qual é o Filme?

Jogo de adivinhar o filme a partir de frames, inspirado no [Framed](https://framed.wtf).

Você tem **6 tentativas**. Cada erro (ou pulo) revela um frame novo e mais fácil.
Acertou no 1º frame = **6 pontos**, no 2º = 5, …, no 6º = 1. Errou tudo = 0.

## Rodando localmente

```bash
npm install
npm run dev
```

## Adicionando filmes

O catálogo fica em [`src/data/movies.json`](src/data/movies.json). Cada filme tem:

```json
{
  "id": 603,
  "title": "Matrix",
  "originalTitle": "The Matrix",
  "year": 1999,
  "aliases": [],
  "frames": ["lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg", "..."]
}
```

- `frames`: 6 imagens, **da mais difícil para a mais fácil**. Pode ser o caminho de uma imagem do TMDB,
  uma URL completa ou um arquivo seu em `public/frames/` (ex.: `./frames/matrix-1.jpg`).
- `aliases`: outros nomes aceitos como resposta. Acentos, pontuação e maiúsculas/minúsculas são ignorados.

### Automático via TMDB

1. Crie uma conta grátis em [themoviedb.org](https://www.themoviedb.org/settings/api) e copie o
   **token de leitura da API (v4)**.
2. Crie um arquivo `.env` na raiz com `TMDB_TOKEN=seu_token` (ele não é enviado para o git).
3. Rode:

```bash
npm run fetch-frames -- "o iluminado" "clube da luta" 13
```

O script busca os filmes, pega 6 frames sem texto e salva no catálogo. Depois vale reordenar os frames
à mão, do mais difícil para o mais fácil.

## Publicação

Todo `git push` na branch `main` publica o site no GitHub Pages automaticamente
(veja [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

---

Imagens fornecidas pelo [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB, mas não é
endossado ou certificado pelo TMDB.
