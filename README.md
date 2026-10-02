# 🎬 Qual é o Filme?

Jogo de adivinhar o filme a partir de frames, inspirado no [Framed](https://framed.wtf).

Você tem **6 tentativas**. Cada erro (ou pulo) revela um frame novo e mais fácil.
Acertou no 1º frame = **6 pontos**, no 2º = 5, …, no 6º = 1. Errou tudo = 0.

**Jogue em: https://srkcire.github.io/qual-e-o-filme/**

## Modos

- **📅 Filme do Dia** — um filme por dia, igual para todo mundo (como o Wordle). Guarda sequência de
  vitórias, recorde e a distribuição dos seus resultados. Vira à meia-noite no horário de quem joga.
- **🎞️ Livre** — filmes em ordem aleatória, sem repetir até passar pelo catálogo inteiro.
- **🎉 Festa**, em dois formatos:
  - **🌐 Sala online** — cada um no seu celular, todos vendo o mesmo frame ao mesmo tempo. Quem cria a sala
    recebe um código de 4 letras (ou link `?sala=CODIGO`); não precisa de conta para entrar. Um frame novo
    aparece a cada 10–30 s; acertar no 1º frame vale 6 pontos, e quem acerta primeiro ganha +1 ⚡. Chute
    errado bloqueia até o próximo frame. Funciona com o Realtime do Supabase (broadcast + presença), sem
    tabelas: o aparelho do anfitrião controla a partida — se ele sair, a sala fecha.
  - **📱 Mesmo aparelho** — de 2 a 8 jogadores revezando, cada um com o seu filme por rodada. Uma tela de
    "passe o aparelho" esconde o frame na troca de jogador. No fim, pódio e revanche.

O progresso e as estatísticas ficam salvos no navegador (`localStorage`).

## Contas e perfis

Jogar não exige conta. Dá para entrar com **Google** ou criar conta com **e-mail e senha** (com "esqueci minha senha"). Quem entra ganha:

- **Perfil** com nome, sobrenome, apelido público (`@apelido`) e **avatar** montado no editor
  (4 estilos do [DiceBear](https://www.dicebear.com): Aventureiro, Rabisco, Cartoon e Pixel).
  O e-mail nunca é exibido para outros jogadores.
- **Estatísticas na nuvem**: ao entrar, os dados do aparelho são somados aos da conta e passam a
  sincronizar entre celular e computador.
- **Excluir conta** a qualquer momento na tela de perfil (apaga perfil, estatísticas e resultados).
- **Amigos e ranking** (botão 👥): busca pelo apelido, pedido de amizade com aceite, link de convite
  (`?amigo=apelido`) e ranking do Filme do Dia entre amigos — hoje, 7 e 30 dias. O ranking mostra pontos
  e quadradinhos, mas nunca qual era o filme, para não estragar o desafio de quem ainda não jogou.

O backend é o [Supabase](https://supabase.com). A estrutura do banco e as regras de acesso (RLS) ficam em
[`supabase/migrations/`](supabase/migrations/) e são aplicadas automaticamente pela integração
Supabase ↔ GitHub a cada push na `main`. A chave em [`src/lib/supabase.ts`](src/lib/supabase.ts) é a
*publishable* (pública por natureza) — nunca coloque a *secret key* no código.

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
à mão, do mais difícil para o mais fácil — e trocar os que forem arte de pôster em vez de cena do filme.

> **Atenção:** o Filme do Dia é sorteado a partir do catálogo. Adicionar ou remover filmes muda a
> sequência dos próximos dias (o desafio de hoje também pode mudar). Para não trocar dias que já foram
> jogados, acrescente os filmes desses dias em `FIXED_DAYS` ([`src/lib/game.ts`](src/lib/game.ts))
> antes de mexer no catálogo.

## Publicação

Todo `git push` na branch `main` publica o site no GitHub Pages automaticamente
(veja [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

---

Imagens fornecidas pelo [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB, mas não é
endossado ou certificado pelo TMDB.
