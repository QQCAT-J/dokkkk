// Very small markdown renderer — handles **bold**, *italic*, `code`, ```blocks```, images
function renderContent(content) {
  if (Array.isArray(content)) {
    // Mixed content (text + images)
    return content.map((block, i) => {
      if (block.type === 'image') {
        const src = `data:${block.source.media_type};base64,${block.source.data}`
        return <img key={i} src={src} alt="attached" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4 }} />
      }
      if (block.type === 'text') return <span key={i}>{renderText(block.text)}</span>
      return null
    })
  }
  return renderText(content)
}

function renderText(text) {
  if (!text) return null
  const lines = text.split('\n')
  const result = []
  let inCode = false
  let codeLines = []
  let codeLang = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true
        codeLang = line.slice(3).trim()
        codeLines = []
      } else {
        result.push(
          <pre key={i}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        )
        inCode = false
        codeLines = []
      }
      continue
    }
    if (inCode) { codeLines.push(line); continue }
    result.push(<span key={i}>{inlineMarkdown(line)}{'\n'}</span>)
  }
  if (inCode && codeLines.length) result.push(<pre key="last"><code>{codeLines.join('\n')}</code></pre>)
  return result
}

function inlineMarkdown(line) {
  // Split on **bold**, *italic*, `code`
  const parts = []
  let rest = line
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let m
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(rest.slice(0, m.index - last))
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>)
    else if (m[4]) parts.push(<code key={m.index}>{m[4]}</code>)
    rest = line.slice(m.index + m[0].length)
    last = m.index + m[0].length
  }
  if (rest) parts.push(rest)
  return parts.length ? parts : line
}

export default function Message({ role, content, isTyping, avatar = '🌙' }) {
  return (
    <div className={`message ${role}`}>
      <div className="message-avatar">
        {role === 'user' ? '你' : avatar}
      </div>
      <div className="message-bubble">
        {isTyping ? <span className="message-typing">▍</span> : renderContent(content)}
      </div>
    </div>
  )
}
