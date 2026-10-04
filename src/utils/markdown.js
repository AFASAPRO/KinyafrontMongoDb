/**
 * Shared Markdown → HTML rendering, used anywhere KinyaBot's replies are
 * shown (main chat bubbles, Voice Mode's feed). Centralized so code-block
 * styling, syntax highlighting and link handling stay identical everywhere
 * instead of drifting between two copies.
 *
 * Output is trusted-source HTML (KinyaBot's own AI replies, never raw
 * third-party HTML), consistent with how the rest of the app already
 * renders assistant content.
 */
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'

// Curated language set (importing the full highlight.js bundle adds ~700 kB)
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import csharp from 'highlight.js/lib/languages/csharp'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'

const LANGS = { javascript, typescript, python, xml, html: xml, css, java, cpp, c, csharp, bash, sh: bash, json, sql, ruby, php, go, rust, kotlin, swift, yaml, markdown, plaintext }
Object.entries(LANGS).forEach(([name, def]) => hljs.registerLanguage(name, def))
hljs.registerAliases(['js'], { languageName: 'javascript' })
hljs.registerAliases(['ts'], { languageName: 'typescript' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['shell', 'zsh'], { languageName: 'bash' })

const EXT_BY_LANG = { javascript: 'js', typescript: 'ts', python: 'py', html: 'html', css: 'css', java: 'java', cpp: 'cpp', c: 'c', bash: 'sh', json: 'json', sql: 'sql', ruby: 'rb', php: 'php', go: 'go', rust: 'rs', kotlin: 'kt', swift: 'swift' }

const renderer = new marked.Renderer()
renderer.code = (code, lang) => {
  const language = hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(String(code), { language }).value
  const safeLang = lang || 'text'
  const ext = EXT_BY_LANG[safeLang] || 'txt'
  return `<div class="code-block" data-lang="${safeLang}" data-ext="${ext}">
    <div class="code-header">
      <span class="code-lang">${safeLang}</span>
      <div class="code-actions">
        <button class="copy-code-btn" onclick="(function(btn){const code=btn.closest('.code-block').querySelector('code');navigator.clipboard.writeText(code.innerText);btn.innerHTML='<i class=\\'fas fa-check\\'></i> Copied';setTimeout(()=>{btn.innerHTML='<i class=\\'fas fa-copy\\'></i> Copy'},1500)})(this)">
          <i class='fas fa-copy'></i> Copy
        </button>
        <button class="download-code-btn" onclick="(function(btn){const block=btn.closest('.code-block');const code=block.querySelector('code').innerText;const ext=block.dataset.ext||'txt';const lang=block.dataset.lang||'code';const blob=new Blob([code],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kinyabot-code-'+Date.now()+'.'+ext;a.click()})(this)">
          <i class='fas fa-download'></i> Download
        </button>
      </div>
    </div>
    <pre class="hljs"><code class="language-${language}">${highlighted}</code></pre>
  </div>`
}
marked.use({ renderer, breaks: true, gfm: true })

/** Render assistant markdown (code fences, lists, bold, links…) to safe HTML. */
export function renderMarkdown(text) {
  if (!text) return ''
  return marked.parse(text)
}

/** Render plain user text: escape HTML, keep line breaks. No markdown parsing
 *  (matches how the main chat bubbles treat the user's own messages). */
export function renderPlainText(text) {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}
