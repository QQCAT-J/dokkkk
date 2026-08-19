import { useState, useRef } from 'react'
import { fileToContentBlock } from '../api'

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku' },
  { id: 'claude-sonnet-4-6',         label: 'Sonnet' },
  { id: 'claude-opus-4-6',           label: 'Opus' },
  { id: 'deepseek-chat',             label: 'DeepSeek' },
  { id: 'gemini-2.0-flash',          label: 'Gemini' },
]

export default function ChatInput({ onSend, disabled, model, onModelChange }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState([]) // { preview, block }
  const fileRef = useRef()

  const send = async () => {
    const trimmed = text.trim()
    if (!trimmed && images.length === 0) return
    if (disabled) return

    let content
    if (images.length > 0) {
      content = [
        ...images.map(img => img.block),
        { type: 'text', text: trimmed || '（图片）' },
      ]
    } else {
      content = trimmed
    }

    setText('')
    setImages([])
    onSend(content)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    e.target.value = ''
    const newImgs = await Promise.all(files.map(async f => {
      const block = await fileToContentBlock(f)
      const preview = URL.createObjectURL(f)
      return { preview, block }
    }))
    setImages(prev => [...prev, ...newImgs])
  }

  return (
    <div className="input-area">
      {images.length > 0 && (
        <div className="input-attach-preview">
          {images.map((img, i) => (
            <div key={i} className="attach-thumb">
              <img src={img.preview} alt="" />
              <button className="attach-thumb-del" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="input-row">
        <textarea
          className="input-box"
          placeholder="说点什么……"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          style={{ height: 'auto', minHeight: 40 }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
          }}
        />
        <button className="send-btn" onClick={send} disabled={disabled || (!text.trim() && images.length === 0)}>
          ↑
        </button>
      </div>
      <div className="input-toolbar">
        <button className="icon-btn" title="上传图片" onClick={() => fileRef.current?.click()}>🖼</button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFile} />
        <select className="model-select" value={model} onChange={e => onModelChange(e.target.value)}>
          {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
    </div>
  )
}
