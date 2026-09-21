/**
 * Authenticated attachment loading.
 * ─────────────────────────────────────────────────────────────
 * Uploads are no longer publicly served — every attachment goes
 * through GET /api/files/:name with the user's (or admin's) Bearer
 * token. Since <img src> cannot send auth headers, we fetch the
 * bytes with axios and hand back object URLs, cached per file.
 */
import api from '../api'

const objectUrls = new Map() // backend path -> object URL
const inflight = new Map()   // dedupe concurrent fetches

const API_ORIGIN = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '')

/** Normalize a stored attachment path (/uploads/x or full URL) to an
    authenticated /api/files/ path. */
export function authedFileUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('data:')) return pathOrUrl
  const name = String(pathOrUrl).split('/').pop()
  return `${API_ORIGIN}/api/files/${encodeURIComponent(name)}`
}

/** Fetch an attachment as a blob object URL (cached). */
export async function loadAttachmentUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  const raw = pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('data:') ? pathOrUrl : null
  if (raw) return raw
  if (objectUrls.has(pathOrUrl)) return objectUrls.get(pathOrUrl)
  if (inflight.has(pathOrUrl)) return inflight.get(pathOrUrl)

  const p = (async () => {
    try {
      const name = String(pathOrUrl).split('/').pop()
      const res = await api.get(`/files/${encodeURIComponent(name)}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      objectUrls.set(pathOrUrl, url)
      return url
    } catch (err) {
      // 401/403/404 → null; callers render an honest fallback
      return null
    } finally {
      inflight.delete(pathOrUrl)
    }
  })()
  inflight.set(pathOrUrl, p)
  return p
}

/** Trigger a browser download for an attachment (auth-aware). */
export async function downloadAttachment(pathOrUrl, fallbackName = 'kinyabot-attachment') {
  const name = decodeURIComponent(String(pathOrUrl).split('/').pop() || fallbackName)
  try {
    const url = await loadAttachmentUrl(pathOrUrl)
    if (!url) throw new Error('unavailable')
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch {
    // Last resort: direct navigation (may open in a tab)
    window.open(authedFileUrl(pathOrUrl), '_blank')
  }
}

export function isImagePath(pathOrUrl) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(String(pathOrUrl || '').split('?')[0])
}

export function fileKind(pathOrUrl) {
  const p = String(pathOrUrl || '').toLowerCase()
  if (isImagePath(p)) return 'image'
  if (/\.(mp3|wav|m4a|ogg|webm|flac|aac|mp4)$/.test(p)) return 'audio'
  return 'document'
}
