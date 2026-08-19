import { useState, useEffect, useRef } from 'react'
import {
  loadNovel, saveNovel,
  loadNovelChars, newNovelChar, updateNovelChar, deleteNovelChar,
  loadChapters, newChapter, updateChapter, deleteChapter,
  loadInspirations, addInspiration, deleteInspiration,
  loadWritingChats, newWritingChat,
  addWritingMessage, updateLastWritingMessage,
} from '../store'
import { streamMessage } from '../api'
import Message from '../components/Message'
import ChatInput from '../components/ChatInput'
import Modal from '../components/Modal'

const SUBTABS = [
  { id: 'write',  label: '写作', icon: '✍️' },
  { id: 'book',   label: '总纲', icon: '📖' },
  { id: 'chars',  label: '人物', icon: '👤' },
  { id: 'chapters', label: '章节', icon: '📑' },
  { id: 'ideas',  label: '灵感', icon: '💡' },
]

function buildWritingSystem({ novel, chars, chapter, settings }) {
  const parts = []
  if (novel.style)          parts.push(`【文风设定】\n${novel.style}`)
  if (novel.world)          parts.push(`【世界观】\n${novel.world}`)
  if (novel.outputRules)    parts.push(`【输出细则】\n${novel.outputRules}`)
  if (novel.coreSettings)   parts.push(`【核心设定】\n${novel.coreSettings}`)
  if (novel.forbidden)      parts.push(`【禁用内容】\n${novel.forbidden}`)
  if (novel.narrativeRules) parts.push(`【叙事规则】\n${novel.narrativeRules}`)

  if (chars.length) {
    const charText = chars.map(c => {
      const bits = [`◆ ${c.name}`]
      if (c.persona)       bits.push(`人设：${c.persona}`)
      if (c.relationships) bits.push(`人物关系：${c.relationships}`)
      if (c.status)        bits.push(`动态状态：${c.status}`)
      if (c.secrets)        bits.push(`已知秘密：${c.secrets}`)
      if (c.arc)            bits.push(`人物弧光：${c.arc}`)
      return bits.join('\n')
    }).join('\n\n')
    parts.push(`【人物库】\n${charText}`)
  }

  if (chapter) {
    const bits = []
    if (chapter.goal)          bits.push(`本章目标/限制：${chapter.goal}`)
    if (chapter.outline)       bits.push(`本章大纲：${chapter.outline}`)
    if (chapter.characters)    bits.push(`本章出场人物：${chapter.characters}`)
    if (chapter.foreshadowing) bits.push(`本章伏笔/灵感：${chapter.foreshadowing}`)
    if (bits.length) parts.push(`【当前章节 - ${chapter.title}】\n${bits.join('\n')}`)
  }

  if (settings.instructions) parts.push(`【通用输出要求】\n${settings.instructions}`)

  return parts.join('\n\n') || undefined
}

function BookPanel({ novel, onChange }) {
  const up = (k, v) => onChange({ ...novel, [k]: v })
  return (
    <div className="form-panel">
      <div className="field"><label>文风设定</label><textarea className="tall" value={novel.style} onChange={e => up('style', e.target.value)} placeholder="叙述人称、句式节奏、修辞偏好……" /></div>
      <div className="field"><label>世界观</label><textarea className="tall" value={novel.world} onChange={e => up('world', e.target.value)} placeholder="故事世界的规则、背景、设定……" /></div>
      <div className="field"><label>输出细则</label><textarea value={novel.outputRules} onChange={e => up('outputRules', e.target.value)} placeholder="每次输出的格式要求、字数、结构……" /></div>
      <div className="field"><label>核心设定</label><textarea value={novel.coreSettings} onChange={e => up('coreSettings', e.target.value)} placeholder="全书不可动摇的核心设定……" /></div>
      <div className="field"><label>禁用内容</label><textarea value={novel.forbidden} onChange={e => up('forbidden', e.target.value)} placeholder="绝对不能出现的内容……" /></div>
      <div className="field"><label>叙事规则</label><textarea value={novel.narrativeRules} onChange={e => up('narrativeRules', e.target.value)} placeholder="视角切换规则、时间线处理……" /></div>
    </div>
  )
}

function CharsPanel({ chars, setChars }) {
  const [editing, setEditing] = useState(null)
  const [delId, setDelId] = useState(null)

  const handleNew = () => {
    const { chars: updated, char } = newNovelChar(chars)
    setChars(updated)
    setEditing({ ...char })
  }
  const handleSave = () => {
    const updated = updateNovelChar(chars, editing.id, editing)
    setChars(updated)
    setEditing(null)
  }
  const handleDelete = () => {
    const updated = deleteNovelChar(chars, delId)
    setChars(updated)
    setDelId(null)
  }

  if (editing) {
    const up = (k, v) => setEditing(p => ({ ...p, [k]: v }))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="form-panel">
          <div className="field"><label>姓名</label><input value={editing.name} onChange={e => up('name', e.target.value)} /></div>
          <div className="field"><label>人设</label><textarea className="tall" value={editing.persona} onChange={e => up('persona', e.target.value)} placeholder="性格、外貌、背景……" /></div>
          <div className="field"><label>人设关系</label><textarea value={editing.relationships} onChange={e => up('relationships', e.target.value)} placeholder="与其他角色的关系……" /></div>
          <div className="field"><label>动态状态</label><textarea value={editing.status} onChange={e => up('status', e.target.value)} placeholder="当前处境、情绪、目标……随剧情更新" /></div>
          <div className="field"><label>已知秘密</label><textarea value={editing.secrets} onChange={e => up('secrets', e.target.value)} placeholder="读者/角色已知或未知的秘密……" /></div>
          <div className="field"><label>人物弧光</label><textarea value={editing.arc} onChange={e => up('arc', e.target.value)} placeholder="这个角色的成长/转变轨迹……" /></div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存人物</button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-panel">
      <button className="btn-new" onClick={handleNew}>＋ 新建人物</button>
      {chars.map(c => (
        <div key={c.id} className="inspiration-card" style={{ cursor: 'pointer' }} onClick={() => setEditing({ ...c })}>
          <strong style={{ fontSize: 14 }}>{c.name}</strong>
          {c.persona && <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>{c.persona.slice(0, 60)}{c.persona.length > 60 ? '…' : ''}</p>}
          <span className="inspiration-card-del" onClick={e => { e.stopPropagation(); setDelId(c.id) }}>✕</span>
        </div>
      ))}
      {chars.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>还没有人物</p>}
      {delId && (
        <Modal title="删除人物" danger onClose={() => setDelId(null)} onConfirm={handleDelete} confirmLabel="删除">
          <p style={{ color: 'var(--text-muted)' }}>删除「{chars.find(c => c.id === delId)?.name}」，不可恢复。</p>
        </Modal>
      )}
    </div>
  )
}

function ChaptersPanel({ chapters, setChapters, activeChapterId, setActiveChapterId }) {
  const [editing, setEditing] = useState(null)
  const [delId, setDelId] = useState(null)

  const handleNew = () => {
    const { chapters: updated, chapter } = newChapter(chapters)
    setChapters(updated)
    setEditing({ ...chapter })
  }
  const handleSave = () => {
    const updated = updateChapter(chapters, editing.id, editing)
    setChapters(updated)
    setEditing(null)
  }
  const handleDelete = () => {
    const updated = deleteChapter(chapters, delId)
    setChapters(updated)
    if (activeChapterId === delId) setActiveChapterId(null)
    setDelId(null)
  }

  if (editing) {
    const up = (k, v) => setEditing(p => ({ ...p, [k]: v }))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="form-panel">
          <div className="field"><label>章节标题</label><input value={editing.title} onChange={e => up('title', e.target.value)} /></div>
          <div className="field"><label>本章目标/限制</label><textarea value={editing.goal} onChange={e => up('goal', e.target.value)} placeholder="这一章要达成什么，不能做什么……" /></div>
          <div className="field"><label>本章剧情大纲</label><textarea className="tall" value={editing.outline} onChange={e => up('outline', e.target.value)} placeholder="事件顺序、关键转折……" /></div>
          <div className="field"><label>本章出场人物</label><input value={editing.characters} onChange={e => up('characters', e.target.value)} placeholder="用逗号分隔" /></div>
          <div className="field"><label>本章伏笔和灵感</label><textarea value={editing.foreshadowing} onChange={e => up('foreshadowing', e.target.value)} placeholder="要埋下或回收的伏笔、临时灵感……" /></div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存章节</button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-panel">
      <button className="btn-new" onClick={handleNew}>＋ 新建章节</button>
      {chapters.map(c => (
        <div
          key={c.id}
          className="inspiration-card"
          style={{ cursor: 'pointer', borderColor: activeChapterId === c.id ? 'var(--rose-dim)' : undefined }}
          onClick={() => setEditing({ ...c })}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14 }}>{c.title}</strong>
            <button
              className="btn btn-sm btn-ghost"
              onClick={e => { e.stopPropagation(); setActiveChapterId(c.id) }}
              style={activeChapterId === c.id ? { color: 'var(--rose)', borderColor: 'var(--rose-dim)' } : {}}
            >
              {activeChapterId === c.id ? '写作中' : '设为当前'}
            </button>
          </div>
          {c.outline && <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>{c.outline.slice(0, 60)}{c.outline.length > 60 ? '…' : ''}</p>}
          <span className="inspiration-card-del" onClick={e => { e.stopPropagation(); setDelId(c.id) }}>✕</span>
        </div>
      ))}
      {chapters.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>还没有章节</p>}
      {delId && (
        <Modal title="删除章节" danger onClose={() => setDelId(null)} onConfirm={handleDelete} confirmLabel="删除">
          <p style={{ color: 'var(--text-muted)' }}>删除「{chapters.find(c => c.id === delId)?.title}」，不可恢复。</p>
        </Modal>
      )}
    </div>
  )
}

function IdeasPanel({ inspirations, setInspirations }) {
  const [text, setText] = useState('')
  const add = () => {
    if (!text.trim()) return
    setInspirations(addInspiration(inspirations, text.trim()))
    setText('')
  }
  return (
    <div className="form-panel">
      <div className="field">
        <label>随手记一笔</label>
        <textarea
          className="inspiration-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="灵感、碎碎念、突然冒出来的一句话……"
        />
        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={add}>记下</button>
      </div>
      <div className="inspiration-grid">
        {inspirations.map(i => (
          <div key={i.id} className="inspiration-card">
            {i.content}
            <span className="inspiration-card-del" onClick={() => setInspirations(deleteInspiration(inspirations, i.id))}>✕</span>
          </div>
        ))}
      </div>
      {inspirations.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>还没有记录</p>}
    </div>
  )
}

function WritePanel({ novel, novelChars, chapters, activeChapterId, settings }) {
  const [chats, setChats] = useState(loadWritingChats)
  const [activeChatId, setActiveChatId] = useState(() => loadWritingChats()[0]?.id || null)
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState(settings.model)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef()

  const activeChat = chats.find(c => c.id === activeChatId) || null
  const activeChapter = chapters.find(c => c.id === activeChapterId) || null

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeChat?.messages?.length])

  const handleNew = () => {
    const { chats: updated, chat } = newWritingChat(chats)
    setChats(updated)
    setActiveChatId(chat.id)
    setShowHistory(false)
  }

  const handleSend = async (content) => {
    if (loading) return
    let currentChats = chats
    let currentChatId = activeChatId
    if (!currentChatId) {
      const { chats: c2, chat } = newWritingChat(currentChats)
      currentChats = c2
      currentChatId = chat.id
      setChats(c2)
      setActiveChatId(chat.id)
    }
    let updated = addWritingMessage(currentChats, currentChatId, { role: 'user', content })
    setChats(updated)
    updated = addWritingMessage(updated, currentChatId, { role: 'assistant', content: '' })
    setChats(updated)
    setLoading(true)

    const chat = updated.find(c => c.id === currentChatId)
    const apiMessages = chat.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))

    await streamMessage({
      model,
      system: buildWritingSystem({ novel, chars: novelChars, chapter: activeChapter, settings }),
      messages: apiMessages,
      onChunk: (_, full) => setChats(prev => updateLastWritingMessage(prev, currentChatId, full)),
      onDone:  (full)   => { setChats(prev => updateLastWritingMessage(prev, currentChatId, full || '（空响应）')); setLoading(false) },
      onError: (err)    => { setChats(prev => updateLastWritingMessage(prev, currentChatId, `❌ ${err}`)); setLoading(false) },
    })
  }

  return (
    <div className="main-content">
      <div className="chat-header">
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {activeChapter ? `当前章节：${activeChapter.title}` : '未选择章节'}
        </span>
        <div className="chat-header-actions">
          <button className="icon-btn" onClick={() => setShowHistory(true)} title="创作记录">📋</button>
          <button className="icon-btn" onClick={handleNew} title="新建创作">＋</button>
        </div>
      </div>

      {(!activeChat || activeChat.messages.length === 0) ? (
        <div className="empty">
          <div className="empty-icon">✍️</div>
          <h3>开始创作</h3>
          <p>设定好总纲、人物、章节后，在这里开始写</p>
        </div>
      ) : (
        <div className="messages">
          {activeChat.messages.map((msg, i) => (
            <Message key={msg.id || i} role={msg.role} content={msg.content} avatar="✍️"
              isTyping={loading && i === activeChat.messages.length - 1 && msg.role === 'assistant' && !msg.content} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={loading} model={model} onModelChange={setModel} />

      {showHistory && (
        <Modal title="创作记录" onClose={() => setShowHistory(false)}>
          <button className="btn-new" onClick={handleNew}>＋ 新建创作</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {chats.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className={`sidebar-item${c.id === activeChatId ? ' active' : ''}`} style={{ flex: 1 }}
                  onClick={() => { setActiveChatId(c.id); setShowHistory(false) }}>{c.title}</button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function WritingTab({ settings }) {
  const [subtab, setSubtab] = useState('write')
  const [novel, setNovel] = useState(loadNovel)
  const [novelChars, setNovelChars] = useState(loadNovelChars)
  const [chapters, setChapters] = useState(loadChapters)
  const [inspirations, setInspirations] = useState(loadInspirations)
  const [activeChapterId, setActiveChapterId] = useState(null)

  const handleNovelChange = (updated) => { setNovel(updated); saveNovel(updated) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="writing-nav">
        {SUBTABS.map(t => (
          <button key={t.id} className={`writing-nav-btn${subtab === t.id ? ' active' : ''}`} onClick={() => setSubtab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {subtab === 'write'    && <WritePanel novel={novel} novelChars={novelChars} chapters={chapters} activeChapterId={activeChapterId} settings={settings} />}
        {subtab === 'book'     && <BookPanel novel={novel} onChange={handleNovelChange} />}
        {subtab === 'chars'    && <CharsPanel chars={novelChars} setChars={setNovelChars} />}
        {subtab === 'chapters' && <ChaptersPanel chapters={chapters} setChapters={setChapters} activeChapterId={activeChapterId} setActiveChapterId={setActiveChapterId} />}
        {subtab === 'ideas'    && <IdeasPanel inspirations={inspirations} setInspirations={setInspirations} />}
      </div>
    </div>
  )
}
