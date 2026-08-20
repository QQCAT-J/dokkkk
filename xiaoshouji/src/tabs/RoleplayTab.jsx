import { useState, useRef, useEffect } from 'react'
import {
  loadChars, newChar, updateChar, deleteChar,
  loadCharChats, newCharChat, deleteCharChat,
  addCharMessage, updateLastCharMessage,
} from '../store'
import { streamMessage } from '../api'
import Message from '../components/Message'
import ChatInput from '../components/ChatInput'
import Modal from '../components/Modal'

const EMOJIS = ['🎭','🌸','🌙','⭐','🔥','❄️','🌿','🦋','🐉','🗡️','👑','🌊','🌺','🐺','🦊','🎪']

function buildCharSystem(char, settings) {
  const parts = []
  if (char.persona)      parts.push(`【角色设定】\n${char.persona}`)
  if (char.world)        parts.push(`【世界观】\n${char.world}`)
  if (char.outputRules)  parts.push(`【输出要求】\n${char.outputRules}`)
  if (char.writingStyle) parts.push(`【文风参考】\n${char.writingStyle}`)
  if (char.worldBook?.length) {
    const wb = char.worldBook.filter(e => e.key && e.value).map(e => `${e.key}：${e.value}`).join('\n')
    if (wb) parts.push(`【世界书】\n${wb}`)
  }
  if (settings.profile)      parts.push(`【关于用户】\n${settings.profile}`)
  if (settings.instructions) parts.push(`【通用输出要求】\n${settings.instructions}`)
  return parts.join('\n\n') || undefined
}

function CharForm({ char, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...char })
  const up = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const addWb = () => setDraft(p => ({ ...p, worldBook: [...(p.worldBook || []), { key: '', value: '' }] }))
  const upWb = (i, k, v) => setDraft(p => ({
    ...p,
    worldBook: p.worldBook.map((e, j) => j === i ? { ...e, [k]: v } : e),
  }))
  const delWb = (i) => setDraft(p => ({ ...p, worldBook: p.worldBook.filter((_, j) => j !== i) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="form-panel">
        <div className="field">
          <label>头像</label>
          <div className="emoji-row">
            {EMOJIS.map(e => (
              <button key={e} className={`emoji-opt${draft.emoji === e ? ' active' : ''}`} onClick={() => up('emoji', e)}>{e}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>角色名</label>
          <input value={draft.name} onChange={e => up('name', e.target.value)} placeholder="角色名字" />
        </div>
        <div className="field">
          <label>人设</label>
          <textarea className="tall" value={draft.persona} onChange={e => up('persona', e.target.value)} placeholder="角色的性格、背景、外貌、说话方式……" />
        </div>
        <div className="field">
          <label>世界观</label>
          <textarea value={draft.world} onChange={e => up('world', e.target.value)} placeholder="故事发生的世界、时代背景……" />
        </div>
        <div className="field">
          <label>输出设定</label>
          <textarea value={draft.outputRules} onChange={e => up('outputRules', e.target.value)} placeholder="回复格式、长度、禁止内容……" />
        </div>
        <div className="field">
          <label>文风 / 样例对话</label>
          <textarea className="tall" value={draft.writingStyle} onChange={e => up('writingStyle', e.target.value)} placeholder="粘贴文风样例或示范对话……" />
        </div>
        <div className="field">
          <label>世界书</label>
          <div className="wb-list">
            {(draft.worldBook || []).map((e, i) => (
              <div key={i} className="wb-entry">
                <input value={e.key} onChange={ev => upWb(i, 'key', ev.target.value)} placeholder="关键词" style={{ maxWidth: 100 }} />
                <input value={e.value} onChange={ev => upWb(i, 'value', ev.target.value)} placeholder="说明" />
                <button className="wb-del" onClick={() => delWb(i)}>✕</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addWb} style={{ alignSelf: 'flex-start' }}>＋ 词条</button>
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>取消</button>
        <button className="btn btn-primary" onClick={() => onSave(draft)}>保存角色</button>
      </div>
    </div>
  )
}

function CharChat({ char, settings, onOpenSidebar, onEdit }) {
  const [chats, setChats] = useState(() => loadCharChats(char.id))
  const [activeChatId, setActiveChatId] = useState(() => loadCharChats(char.id)[0]?.id || null)
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState(settings.model)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef()

  const activeChat = chats.find(c => c.id === activeChatId) || null

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeChat?.messages?.length])

  const handleNew = () => {
    const { chats: c2, chat } = newCharChat(char.id, chats)
    setChats(c2)
    setActiveChatId(chat.id)
    setShowHistory(false)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    const updated = deleteCharChat(char.id, chats, id)
    setChats(updated)
    if (activeChatId === id) setActiveChatId(updated[0]?.id || null)
  }

  const handleSend = async (content) => {
    if (loading) return
    let currentChats = chats
    let currentChatId = activeChatId

    if (!currentChatId) {
      const { chats: c2, chat } = newCharChat(char.id, currentChats)
      currentChats = c2
      currentChatId = chat.id
      setChats(c2)
      setActiveChatId(chat.id)
    }

    let updated = addCharMessage(char.id, currentChats, currentChatId, { role: 'user', content })
    setChats(updated)
    updated = addCharMessage(char.id, updated, currentChatId, { role: 'assistant', content: '' })
    setChats(updated)
    setLoading(true)

    const chat = updated.find(c => c.id === currentChatId)
    const apiMessages = chat.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))

    await streamMessage({
      model,
      system: buildCharSystem(char, settings),
      messages: apiMessages,
      relayModels: settings.relayModels,
      onChunk: (_, full) => setChats(prev => updateLastCharMessage(char.id, prev, currentChatId, full)),
      onDone:  (full)   => { setChats(prev => updateLastCharMessage(char.id, prev, currentChatId, full || '（空响应）')); setLoading(false) },
      onError: (err)    => { setChats(prev => updateLastCharMessage(char.id, prev, currentChatId, `❌ ${err}`)); setLoading(false) },
    })
  }

  return (
    <div className="main-content">
      <div className="chat-header">
        <button className="icon-btn" onClick={onOpenSidebar}>☰</button>
        <span className="chat-header-avatar">{char.emoji}</span>
        <div>
          <div className="chat-header-name">{char.name}</div>
          {activeChat && <div className="chat-header-sub">{activeChat.title}</div>}
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" onClick={onEdit} title="编辑角色">✏️</button>
          <button className="icon-btn" onClick={() => setShowHistory(true)} title="对话记录">📋</button>
          <button className="icon-btn" onClick={handleNew} title="新对话">＋</button>
        </div>
      </div>

      {(!activeChat || activeChat.messages.length === 0) ? (
        <div className="empty">
          <div className="empty-icon">{char.emoji}</div>
          <h3>与 {char.name} 开始对话</h3>
        </div>
      ) : (
        <div className="messages">
          {activeChat.messages.map((msg, i) => (
            <Message
              key={msg.id || i}
              role={msg.role}
              content={msg.content}
              avatar={char.emoji}
              isTyping={loading && i === activeChat.messages.length - 1 && msg.role === 'assistant' && !msg.content}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={loading} model={model} onModelChange={setModel} relayModels={settings.relayModels} />

      {showHistory && (
        <Modal title="对话记录" onClose={() => setShowHistory(false)}>
          <button className="btn-new" onClick={handleNew}>＋ 新对话</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {chats.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className={`sidebar-item${c.id === activeChatId ? ' active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => { setActiveChatId(c.id); setShowHistory(false) }}
                >
                  {c.title}
                </button>
                <button className="icon-btn" onClick={e => handleDelete(e, c.id)} style={{ fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function RoleplayTab({ settings }) {
  const [chars, setChars] = useState(loadChars)
  const [activeCharId, setActiveCharId] = useState(null)
  const [view, setView] = useState('chat') // 'chat' | 'form'
  const [editingChar, setEditingChar] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const activeChar = chars.find(c => c.id === activeCharId) || null

  const handleNew = () => {
    const { chars: updated, char } = newChar(chars)
    setChars(updated)
    setEditingChar(char)
    setActiveCharId(char.id)
    setView('form')
    setSidebarOpen(false)
  }

  const handleEdit = () => {
    setEditingChar({ ...activeChar })
    setView('form')
  }

  const handleSaveChar = (draft) => {
    const updated = updateChar(chars, draft.id, draft)
    setChars(updated)
    setActiveCharId(draft.id)
    setView('chat')
  }

  const handleDelete = () => {
    const updated = deleteChar(chars, deleteTarget)
    setChars(updated)
    if (activeCharId === deleteTarget) { setActiveCharId(null); setView('chat') }
    setDeleteTarget(null)
  }

  const sidebar = (
    <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="sidebar-header">
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flex: 1 }}>角色列表</span>
        {sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>}
      </div>
      <div className="sidebar-list">
        <button className="btn-new" onClick={handleNew}>＋ 新角色</button>
        <div style={{ height: 8 }} />
        {chars.map(c => (
          <button
            key={c.id}
            className={`sidebar-item${c.id === activeCharId ? ' active' : ''}`}
            onClick={() => { setActiveCharId(c.id); setView('chat'); setSidebarOpen(false) }}
          >
            <span style={{ fontSize: 18 }}>{c.emoji}</span>
            <span className="sidebar-item-text">{c.name}</span>
            <span className="sidebar-item-del" onClick={e => { e.stopPropagation(); setDeleteTarget(c.id) }}>✕</span>
          </button>
        ))}
        {chars.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 16 }}>
            还没有角色
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="pane">
      {sidebar}
      <div className="main-content">
        {view === 'form' && editingChar ? (
          <>
            <div className="chat-header">
              <button className="icon-btn" onClick={() => setSidebarOpen(true)}>☰</button>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>
                {editingChar.id === activeCharId && chars.find(c => c.id === activeCharId)?.name !== '新角色'
                  ? `编辑 ${activeChar?.name}`
                  : '新角色'}
              </span>
            </div>
            <CharForm char={editingChar} onSave={handleSaveChar} onCancel={() => setView('chat')} />
          </>
        ) : activeChar ? (
          <CharChat
            key={activeChar.id}
            char={activeChar}
            settings={settings}
            onOpenSidebar={() => setSidebarOpen(true)}
            onEdit={handleEdit}
          />
        ) : (
          <div className="empty">
            <div className="empty-icon">🎭</div>
            <h3>选一个角色开始</h3>
            <p>从左侧选择角色，或者新建一个</p>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setSidebarOpen(true)}>打开角色列表</button>
          </div>
        )}
      </div>

      {deleteTarget && (
        <Modal
          title="删除角色"
          danger
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          confirmLabel="删除"
        >
          <p style={{ color: 'var(--text-muted)' }}>
            删除「{chars.find(c => c.id === deleteTarget)?.name}」及其所有对话记录，不可恢复。
          </p>
        </Modal>
      )}
    </div>
  )
}
