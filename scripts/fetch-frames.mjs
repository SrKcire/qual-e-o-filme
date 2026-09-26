// Adiciona filmes ao catálogo (src/data/movies.json) usando a API do TMDB.
//
// Uso:
//   npm run fetch-frames -- 603 "o rei leão" "cidade de deus"
//
// Cada argumento pode ser um ID do TMDB ou um texto de busca.
// Precisa da variável TMDB_TOKEN (token de leitura v4) ou TMDB_API_KEY (chave v3),
// que pode ficar num arquivo .env na raiz (ele é ignorado pelo git).
//
// O script pega os 6 frames sem texto mais votados. Depois vale abrir o JSON
// e reordenar os frames do mais difícil para o mais fácil.

import { readFile, writeFile } from 'node:fs/promises'

const CATALOG = new URL('../src/data/movies.json', import.meta.url)
const API = 'https://api.themoviedb.org/3'
const { TMDB_TOKEN, TMDB_API_KEY } = process.env

if (!TMDB_TOKEN && !TMDB_API_KEY) {
  console.error('Defina TMDB_TOKEN ou TMDB_API_KEY (no ambiente ou num arquivo .env).')
  process.exit(1)
}

async function tmdb(path, params = {}) {
  const url = new URL(API + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  if (!TMDB_TOKEN) url.searchParams.set('api_key', TMDB_API_KEY)
  const res = await fetch(url, { headers: TMDB_TOKEN ? { Authorization: `Bearer ${TMDB_TOKEN}` } : {} })
  if (!res.ok) throw new Error(`TMDB ${res.status} em ${path}`)
  return res.json()
}

async function resolveId(arg) {
  if (/^\d+$/.test(arg)) return Number(arg)
  const { results } = await tmdb('/search/movie', { query: arg, language: 'pt-BR' })
  if (!results.length) throw new Error(`Nenhum filme encontrado para "${arg}"`)
  const best = results[0]
  console.log(`  "${arg}" → ${best.title} (${best.release_date?.slice(0, 4)}) [${best.id}]`)
  return best.id
}

async function buildEntry(id) {
  const [details, images] = await Promise.all([
    tmdb(`/movie/${id}`, { language: 'pt-BR' }),
    // include_image_language=null traz só imagens sem texto (sem o título estampado)
    tmdb(`/movie/${id}/images`, { include_image_language: 'null' }),
  ])
  const frames = images.backdrops
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .slice(0, 6)
    .map((b) => b.file_path.replace(/^\//, ''))
  if (frames.length < 6) console.warn(`  ⚠ ${details.title}: só ${frames.length} frames sem texto encontrados`)
  return {
    id,
    title: details.title,
    originalTitle: details.original_title,
    year: Number(details.release_date?.slice(0, 4)) || 0,
    aliases: [],
    frames,
  }
}

const args = process.argv.slice(2)
if (!args.length) {
  console.error('Informe IDs do TMDB ou nomes de filmes. Ex.: npm run fetch-frames -- 603 "cidade de deus"')
  process.exit(1)
}

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'))
for (const arg of args) {
  try {
    const id = await resolveId(arg)
    const entry = await buildEntry(id)
    const i = catalog.findIndex((m) => m.id === id)
    if (i >= 0) catalog[i] = { ...entry, aliases: catalog[i].aliases }
    else catalog.push(entry)
    console.log(`✔ ${entry.title} (${entry.year}) — ${entry.frames.length} frames`)
    for (const f of entry.frames) console.log(`    https://image.tmdb.org/t/p/w780/${f}`)
  } catch (err) {
    console.error(`✘ ${arg}: ${err.message}`)
  }
}

await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n')
console.log(`\nCatálogo salvo com ${catalog.length} filmes.`)
