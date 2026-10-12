/**
 * Real music, without a key. Two sources, both on the Internet Archive, which
 * serves files with open CORS so the browser can fetch the bytes itself:
 * a curated shelf of Kevin MacLeod tracks (CC BY 4.0, the usual short-form
 * bed), and a search over the Archive's audio restricted to licences that
 * allow commercial use. Attribution travels with the project.
 */
export interface LibraryTrack {
  id: string
  title: string
  artist: string
  /** What it is good for, in the words a brief would use. */
  mood: string
  seconds: number
  url: string
  license: string
  credit: string
}
const DISCOGRAPHY = 'https://archive.org/download/KevinMacLeod_2019-04_Discography/Kevin MacLeod/'
const CC_BY_4 = 'http://creativecommons.org/licenses/by/4.0/'
function macleod(id: string, album: string, number: string, title: string, mood: string, seconds: number): LibraryTrack {
  const path = `${album}/Kevin MacLeod - ${number} - ${title}.mp3`
  return {
    id,
    title,
    artist: 'Kevin MacLeod',
    mood,
    seconds,
    url: DISCOGRAPHY.split('/').map((s, i) => (i < 3 ? s : encodeURIComponent(s))).join('/') + path.split('/').map(encodeURIComponent).join('/'),
    license: CC_BY_4,
    credit: `${title} Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License ${CC_BY_4}`
  }
}
export const MUSIC_LIBRARY: LibraryTrack[] = [
  macleod('sneaky-snitch', 'Mystery', '11', 'Sneaky Snitch', 'sournois, comique, le classique des sketches', 137),
  macleod('investigations', 'Comedy Scoring', '08', 'Investigations', 'enquête légère, pizzicato', 94),
  macleod('hidden-agenda', 'Comedy Scoring', '07', 'Hidden Agenda', 'malin, discret', 135),
  macleod('local-forecast', 'Disco Ultralounge', '13', 'Local Forecast - Elevator', 'ascenseur, lounge, second degré', 189),
  macleod('lobby-time', 'Groovy', '07', 'Lobby Time', 'jazz de hall, décontracté', 193),
  macleod('deadly-roulette', 'Groovy', '08', 'Deadly Roulette', 'groove espion, assuré', 159),
  macleod('carefree', 'Calming', '04', 'Carefree', 'ukulélé, léger, positif', 205),
  macleod('cheery-monday', 'Ferret', '06', 'Cheery Monday', 'entraînant, lundi matin', 80),
  macleod('thinking-music', 'Royalty Free', '00', 'Thinking Music', 'réflexion, calme', 196),
  macleod('wallpaper', 'Light Electronic', '17', 'Wallpaper', 'électronique discret, fond', 220),
  macleod('cipher', 'Light Electronic', '18', 'Cipher', 'tech, tendu, enquête', 231),
  macleod('pamgaea', 'Light Electronic', '08', 'Pamgaea', 'électronique chaud, explication', 169),
  macleod('backbay-lounge', 'Teh Jazzes', '01', 'Backbay Lounge', 'jazz lounge, bar de nuit', 267),
  macleod('airport-lounge', 'Disco Ultralounge', '01', 'Airport Lounge', 'lounge, attente, ironique', 308),
  macleod('fluffing-a-duck', 'Oddities', '05', 'Fluffing a Duck', 'absurde, gag', 67)
]
export function libraryTrack(id: string) {
  return MUSIC_LIBRARY.find((t) => t.id === id)
}
// --- Licences --------------------------------------------------------------------
/** Licences that allow a promotional video: public domain, CC0, CC BY, CC BY-SA. NC and ND are out. */
export function commercialOk(licenseUrl: string | undefined) {
  if (!licenseUrl) return false
  const u = licenseUrl.toLowerCase()
  if (/\/by-nc|\/by-nd|\/by-nc-nd|\/by-nc-sa/.test(u)) return false
  return /publicdomain|\/licenses\/by\/|\/licenses\/by-sa\//.test(u)
}
export function licenseLabel(licenseUrl: string | undefined) {
  if (!licenseUrl) return 'unknown'
  const u = licenseUrl.toLowerCase()
  if (u.includes('publicdomain/zero')) return 'CC0'
  if (u.includes('publicdomain')) return 'Public domain'
  const m = /licenses\/(by[a-z-]*)\/(\d\.\d)/.exec(u)
  return m ? `CC ${m[1]!.toUpperCase()} ${m[2]}` : licenseUrl
}
// --- Internet Archive ---------------------------------------------------------------
export interface ArchiveItem {
  identifier: string
  title: string
  creator: string
  license: string
  downloads: number
}
export interface ArchiveFile {
  name: string
  title: string
  seconds: number
  bytes: number
  url: string
}
type Fetch = typeof fetch
const ARCHIVE = 'https://archive.org'
/** Items whose licence allows commercial use, most downloaded first. */
export async function searchArchive(query: string, fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<ArchiveItem[]> {
  const q = `(${query.trim()}) AND mediatype:(audio) AND (licenseurl:(*publicdomain*) OR licenseurl:(*licenses/by/*) OR licenseurl:(*licenses/by-sa/*))`
  const params = new URLSearchParams({ q, 'sort[]': 'downloads desc', rows: '20', output: 'json' })
  for (const f of ['identifier', 'title', 'creator', 'licenseurl', 'downloads']) params.append('fl[]', f)
  const response = await fetchFn(`${ARCHIVE}/advancedsearch.php?${params}`, { signal })
  if (!response.ok) throw new Error(`Internet Archive search failed (${response.status})`)
  const json = (await response.json()) as { response?: { docs?: Record<string, unknown>[] } }
  return parseSearch(json)
}
export function parseSearch(json: { response?: { docs?: Record<string, unknown>[] } }): ArchiveItem[] {
  return (json.response?.docs ?? [])
    .map((d) => ({
      identifier: String(d.identifier ?? ''),
      title: String(d.title ?? d.identifier ?? ''),
      creator: Array.isArray(d.creator) ? d.creator.map(String).join(', ') : String(d.creator ?? ''),
      license: String(d.licenseurl ?? ''),
      downloads: Number(d.downloads ?? 0)
    }))
    .filter((d) => d.identifier && commercialOk(d.license))
}
/** The mp3 files of an item, playable as a bed: longer than 20 s, under 25 MB. */
export async function archiveFiles(identifier: string, fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<ArchiveFile[]> {
  const response = await fetchFn(`${ARCHIVE}/metadata/${encodeURIComponent(identifier)}`, { signal })
  if (!response.ok) throw new Error(`Internet Archive item failed (${response.status})`)
  const json = (await response.json()) as { files?: Record<string, unknown>[] }
  return parseFiles(identifier, json)
}
export function parseFiles(identifier: string, json: { files?: Record<string, unknown>[] }): ArchiveFile[] {
  return (json.files ?? [])
    .filter((f) => /\.mp3$/i.test(String(f.name ?? '')))
    .map((f) => ({
      name: String(f.name),
      title: String(f.title ?? String(f.name).replace(/^.*\//, '').replace(/\.mp3$/i, '')),
      seconds: Math.round(Number(f.length ?? 0)),
      bytes: Number(f.size ?? 0),
      url: `${ARCHIVE}/download/${encodeURIComponent(identifier)}/${String(f.name).split('/').map(encodeURIComponent).join('/')}`
    }))
    .filter((f) => f.seconds >= 20 && f.bytes > 0 && f.bytes < 25_000_000)
    .sort((a, b) => a.name.localeCompare(b.name))
}
/** Attribution line for a file found by search; the item page is the reference. */
export function archiveCredit(item: ArchiveItem, file: ArchiveFile) {
  return `${file.title}${item.creator ? ` by ${item.creator}` : ''} (${licenseLabel(item.license)}) https://archive.org/details/${item.identifier}`
}
/** Downloads the bytes, reporting progress when the server says how many there are. */
export async function fetchTrack(url: string, onProgress?: (fraction: number) => void, fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetchFn(url, { signal })
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const total = Number(response.headers.get('content-length') ?? 0)
  if (!response.body || !total) return response.arrayBuffer()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress?.(Math.min(1, received / total))
  }
  const out = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out.buffer
}
