const EXT_BY_LANG = {
  javascript: 'js', js: 'js', jsx: 'jsx', react: 'jsx',
  typescript: 'ts', ts: 'ts', tsx: 'tsx',
  html: 'html', xml: 'xml', css: 'css', scss: 'scss', vue: 'vue', svelte: 'svelte',
  python: 'py', py: 'py', json: 'json', bash: 'sh', sh: 'sh',
  yaml: 'yml', yml: 'yml', markdown: 'md', md: 'md',
  java: 'java', cpp: 'cpp', c: 'c', csharp: 'cs', sql: 'sql',
  ruby: 'rb', php: 'php', go: 'go', rust: 'rs', kotlin: 'kt', swift: 'swift'
}

const DEFAULT_NAMES = {
  html: 'index.html', jsx: 'App.jsx', react: 'App.jsx', tsx: 'App.tsx',
  vue: 'App.vue', svelte: 'App.svelte', css: 'styles.css',
  js: 'script.js', javascript: 'script.js', ts: 'index.ts', typescript: 'index.ts',
  python: 'main.py', py: 'main.py', json: 'data.json', markdown: 'README.md', md: 'README.md'
}

const FENCE_PATTERN = /```([^\s`]*)([^\n]*)\n([\s\S]*?)```/g
const FILE_EXTENSIONS = Object.values(EXT_BY_LANG).join('|')

function cleanPath(path, fallbackName) {
  const segments = String(path || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(segment => segment && segment !== '.' && segment !== '..')
    .map(segment => segment.replace(/[^a-zA-Z0-9._-]/g, '_'))
  return segments.length ? segments.join('/') : fallbackName
}

function namedPath(info, precedingText) {
  const explicit = info.match(/(?:^|\s)(?:file|filename|path)=["']?([^"'\s]+)["']?/i)
  const rawPath = info.match(new RegExp(`(?:^|\\s)([\\w./-]+\\.(?:${FILE_EXTENSIONS}))(?:\\s|$)`, 'i'))
  const heading = precedingText.trimEnd().split('\n').pop()?.match(
    new RegExp(`^\\s{0,3}(?:#{1,6}\\s*)?\`?([\\w./-]+\\.(?:${FILE_EXTENSIONS}))\`?:?\\s*$`, 'i')
  )
  return explicit?.[1] || rawPath?.[1] || heading?.[1] || ''
}

function uniquePath(path, used) {
  if (!used.has(path)) {
    used.add(path)
    return path
  }
  const slash = path.lastIndexOf('/')
  const directory = slash >= 0 ? path.slice(0, slash + 1) : ''
  const file = slash >= 0 ? path.slice(slash + 1) : path
  const dot = file.lastIndexOf('.')
  const stem = dot > 0 ? file.slice(0, dot) : file
  const ext = dot > 0 ? file.slice(dot) : ''
  let suffix = 2
  while (used.has(`${directory}${stem}-${suffix}${ext}`)) suffix++
  const unique = `${directory}${stem}-${suffix}${ext}`
  used.add(unique)
  return unique
}

export function extractCodeFiles(content, messageId = 'generated') {
  const files = []
  const usedPaths = new Set()
  const text = String(content || '')
  let match
  let index = 0

  while ((match = FENCE_PATTERN.exec(text))) {
    const language = (match[1] || 'text').toLowerCase()
    const code = match[3].replace(/\n$/, '')
    if (!code.trim()) continue

    const extension = EXT_BY_LANG[language] || 'txt'
    const defaultName = DEFAULT_NAMES[language] || `code.${extension}`
    const path = cleanPath(namedPath(match[2] || '', text.slice(0, match.index)), defaultName)
    const name = uniquePath(path, usedPaths)
    files.push({
      key: `${messageId}-${index++}`,
      msgId: messageId,
      name,
      language,
      code,
      lines: code.split('\n').length
    })
  }

  FENCE_PATTERN.lastIndex = 0
  return files
}

export function withoutCodeFences(content) {
  return String(content || '')
    .replace(FENCE_PATTERN, '')
    .replace(/```[\s\S]*$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export async function downloadCodeFiles(files, projectName = 'kinyabot-project') {
  if (!files?.length) throw new Error('No generated files are available to download.')

  if (files.length === 1) {
    const file = files[0]
    downloadBlob(new Blob([file.code], { type: 'text/plain;charset=utf-8' }), file.name)
    return
  }

  const { default: JSZip } = await import('jszip')
  const archive = new JSZip()
  files.forEach(file => archive.file(file.name, file.code))
  const blob = await archive.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
  const safeName = String(projectName).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60)
  downloadBlob(blob, `${safeName || 'kinyabot-project'}.zip`)
}
