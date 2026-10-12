/**
 * Local store for audio bytes (voice clips, imported music) keyed by content
 * hash. The project only keeps hashes and envelopes: it stays small enough for
 * localStorage, and a clip is never generated twice for the same text and voice.
 */
const DB = 'bloub-studio-audio',
  STORE = 'clips'
let dbPromise: Promise<IDBDatabase> | undefined
function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}
function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = fn(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}
export function putClip(hash: string, bytes: ArrayBuffer) {
  return run('readwrite', (s) => s.put(bytes, hash))
}
export function getClip(hash: string): Promise<ArrayBuffer | undefined> {
  return run('readonly', (s) => s.get(hash) as IDBRequest<ArrayBuffer | undefined>)
}
export function hasClip(hash: string) {
  return run('readonly', (s) => s.count(hash)).then((n) => n > 0)
}
export async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
/** Decoded buffers are cached per session; decoding an MP3 is not free. */
const decoded = new Map<string, Promise<AudioBuffer | undefined>>()
let decoder: AudioContext | undefined
export function decodeClip(hash: string): Promise<AudioBuffer | undefined> {
  let p = decoded.get(hash)
  if (!p) {
    p = getClip(hash).then(async (bytes) => {
      if (!bytes) return undefined
      decoder ??= new AudioContext()
      return decoder.decodeAudioData(bytes.slice(0))
    })
    decoded.set(hash, p)
  }
  return p
}
export function forgetDecoded(hash: string) {
  decoded.delete(hash)
}
