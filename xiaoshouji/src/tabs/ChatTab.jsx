import { useState, useEffect, useRef } from 'react'
import {
  loadChats, newChat, updateChat, deleteChat,
  addMessage, updateLastMessage,
} from '../store'
import { streamMessage } from '../api'
import Message from '../components/Message'
import ChatInput from '../components/ChatInput'

function buildSystem(settings) {
  const parts = []
  if (settings.profile) parts.push(`【关于用户】\n${settings.profile}`)
  if (settings.instructions) parts.push(`【输出要求】\n${settings.instructions}`)
  return parts.join('\n\n') || undefined
}

function toApiMessages(messages) {
  return messages.map(m => ({ role: m.role, content: m.content }))
}

export default function ChatTab({ settings }) {
  const [chats, setChats] = useState(loadChats)
  const [activeChatId, setActiveChatId] = useState(() => loadChats()[0]?.id || null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [model, setModel] = useState(settings.model)
  const messagesEndRef = useRef()

  const activeChat = chats.find(c => c.id === activeChatId) || null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages?.length, loading])

  useEffect(() => { setModel(settings.model) }, [settings.model])

  const handleNew = () => {
    const { chats: updated, chat } = newChat(chats)
    setChats(updated)
    setActiveChatId(chat.id)
    setSidebarOpen(false)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    const updated = deleteChat(chats, id)
    setChats(updated)
    if (activeChatId === id) setActiveChatId(updated[0]?.id || null)
  }

  const handleSend = async (content) => {
    if (loading) return
    let currentChats = chats
    let currentChatId = activeChatId

    // Create chat if none
    if (!currentChatId) {
      const { chats: c2, chat } = newChat(currentChats)
      currentChats = c2
      currentChatId = chat.id
      setChats(c2)
      setActiveChatId(chat.id)
    }

    // Add user message
    let updated = addMessage(currentChats, currentChatId, { role: 'user', content })
    setChats(updated)

    // Add placeholder AI message
    updated = addMessage(updated, currentChatId, { role: 'assistant', content: '' })
    setChats(updated)
    setLoading(true)

    const chat = updated.find(c => c.id === currentChatId)
    const apiMessages = toApiMessages(chat.messages.slice(0, -1)) // exclude placeholder

    await streamMessage({
      model,
      system: buildSystem(settings),
      messages: apiMessages,
      onChunk: (_, full) => {
        setChats(prev => updateLastMessage(prev, currentChatId, full))
      },
      onDone: (full) => {
        setChats(prev => updateLastMessage(prev, currentChatId, full || '（空响应）'))
        setLoading(false)
      },
      onError: (err) => {
        setChats(prev => updateLastMessage(prev, currentChatId, `❌ ${err}`))
        setLoading(false)
      },
    })
  }

  const sidebar = (
    <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="sidebar-header">
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flex: 1 }}>聊天记录</span>
        {sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>}
      </div>
      <div className="sidebar-list">
        <button className="btn-new" onClick={handleNew}>＋ 新对话</button>
        <div style={{ height: 8 }} />
        {chats.map(c => (
          <button
            key={c.id}
            className={`sidebar-item${c.id === activeChatId ? ' active' : ''}`}
            onClick={() => { setActiveChatId(c.id); setSidebarOpen(false) }}
          >
            <span style={{ fontSize: 14 }}>💬</span>
            <span className="sidebar-item-text">{c.title}</span>
            <span className="sidebar-item-del" onClick={e => handleDelete(e, c.id)}>✕</span>
          </button>
        ))}
        {chats.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 16 }}>
            还没有对话
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="pane">
      {sidebar}
      <div className="main-content">
        {/* Toolbar */}
        <div className="chat-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="历史记录">☰</button>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>
            {activeChat?.title || '新对话'}
          </span>
          {activeChatId && (
            <button
              className="icon-btn"
              style={{ marginLeft: 'auto' }}
              title="清空此对话"
              onClick={() => {
                const updated = updateChat(chats, activeChatId, { messages: [], title: '新对话' })
                setChats(updated)
              }}
            >🗑</button>
          )}
        </div>

        {/* Messages */}
        {(!activeChat || activeChat.messages.length === 0) ? (
          <div className="empty">
            <div className="empty-icon">💬</div>
            <h3>开始聊天</h3>
            <p>和 Claude 说点什么吧</p>
          </div>
        ) : (
          <div className="messages">
            {activeChat.messages.map((msg, i) => (
              <Message
                key={msg.id || i}
                role={msg.role}
                content={msg.content}
                isTyping={loading && i === activeChat.messages.length - 1 && msg.role === 'assistant' && !msg.content}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={loading}
          model={model}
          onModelChange={setModel}
        />
      </div>
    </div>
  )
}
