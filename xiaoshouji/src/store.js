const get = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const set = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// ── Settings ──────────────────────────────────────────────────────────────
export const loadSettings = () => get('settings', {
  model: 'claude-sonnet-4-6',
  profile: '',
  instructions: '',
  customCSS: '',
})
export const saveSettings = (s) => set('settings', s)

// ── Chats ─────────────────────────────────────────────────────────────────
export const loadChats = () => get('chats', [])
export const saveChats = (chats) => set('chats', chats)

export const newChat = (chats) => {
  const chat = { id: uid(), title: '新对话', createdAt: Date.now(), messages: [] }
  const updated = [chat, ...chats]
  saveChats(updated)
  return { chats: updated, chat }
}

export const updateChat = (chats, id, patch) => {
  const updated = chats.map(c => c.id === id ? { ...c, ...patch } : c)
  saveChats(updated)
  return updated
}

export const deleteChat = (chats, id) => {
  const updated = chats.filter(c => c.id !== id)
  saveChats(updated)
  return updated
}

export const addMessage = (chats, chatId, msg) => {
  const message = { id: uid(), ...msg, timestamp: Date.now() }
  const updated = chats.map(c => {
    if (c.id !== chatId) return c
    const messages = [...c.messages, message]
    // Auto-title from first user message
    const title = c.title === '新对话' && msg.role === 'user'
      ? (typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || '新对话').slice(0, 20)
      : c.title
    return { ...c, messages, title }
  })
  saveChats(updated)
  return updated
}

export const updateLastMessage = (chats, chatId, text) => {
  const updated = chats.map(c => {
    if (c.id !== chatId) return c
    const messages = [...c.messages]
    if (messages.length > 0) {
      messages[messages.length - 1] = { ...messages[messages.length - 1], content: text }
    }
    return { ...c, messages }
  })
  saveChats(updated)
  return updated
}

// ── Characters ────────────────────────────────────────────────────────────
export const loadChars = () => get('chars', [])
export const saveChars = (chars) => set('chars', chars)

export const newChar = (chars) => {
  const char = {
    id: uid(),
    name: '新角色',
    emoji: '🎭',
    persona: '',
    world: '',
    outputRules: '',
    writingStyle: '',
    worldBook: [],
    createdAt: Date.now(),
  }
  const updated = [char, ...chars]
  saveChars(updated)
  return { chars: updated, char }
}

export const updateChar = (chars, id, patch) => {
  const updated = chars.map(c => c.id === id ? { ...c, ...patch } : c)
  saveChars(updated)
  return updated
}

export const deleteChar = (chars, id) => {
  const updated = chars.filter(c => c.id !== id)
  saveChars(updated)
  return updated
}

// ── Character chats ───────────────────────────────────────────────────────
export const loadCharChats = (charId) => get(`charchats_${charId}`, [])
export const saveCharChats = (charId, chats) => set(`charchats_${charId}`, chats)

export const newCharChat = (charId, chats) => {
  const chat = { id: uid(), title: '新对话', createdAt: Date.now(), messages: [] }
  const updated = [chat, ...chats]
  saveCharChats(charId, updated)
  return { chats: updated, chat }
}

export const updateCharChat = (charId, chats, id, patch) => {
  const updated = chats.map(c => c.id === id ? { ...c, ...patch } : c)
  saveCharChats(charId, updated)
  return updated
}

export const deleteCharChat = (charId, chats, id) => {
  const updated = chats.filter(c => c.id !== id)
  saveCharChats(charId, updated)
  return updated
}

export const addCharMessage = (charId, chats, chatId, msg) => {
  const message = { id: uid(), ...msg, timestamp: Date.now() }
  const updated = chats.map(c => {
    if (c.id !== chatId) return c
    const messages = [...c.messages, message]
    const title = c.title === '新对话' && msg.role === 'user'
      ? (typeof msg.content === 'string' ? msg.content : '新对话').slice(0, 20)
      : c.title
    return { ...c, messages, title }
  })
  saveCharChats(charId, updated)
  return updated
}

export const updateLastCharMessage = (charId, chats, chatId, text) => {
  const updated = chats.map(c => {
    if (c.id !== chatId) return c
    const messages = [...c.messages]
    if (messages.length > 0) messages[messages.length - 1] = { ...messages[messages.length - 1], content: text }
    return { ...c, messages }
  })
  saveCharChats(charId, updated)
  return updated
}

// ── Novel (Writing) ───────────────────────────────────────────────────────
export const loadNovel = () => get('novel', {
  style: '', world: '', outputRules: '', coreSettings: '', forbidden: '', narrativeRules: '',
})
export const saveNovel = (n) => set('novel', n)

export const loadNovelChars = () => get('novelChars', [])
export const saveNovelChars = (chars) => set('novelChars', chars)

export const newNovelChar = (chars) => {
  const char = { id: uid(), name: '新人物', persona: '', relationships: '', status: '', secrets: '', arc: '' }
  const updated = [...chars, char]
  saveNovelChars(updated)
  return { chars: updated, char }
}

export const updateNovelChar = (chars, id, patch) => {
  const updated = chars.map(c => c.id === id ? { ...c, ...patch } : c)
  saveNovelChars(updated)
  return updated
}

export const deleteNovelChar = (chars, id) => {
  const updated = chars.filter(c => c.id !== id)
  saveNovelChars(updated)
  return updated
}

export const loadChapters = () => get('chapters', [])
export const saveChapters = (chapters) => set('chapters', chapters)

export const newChapter = (chapters) => {
  const chapter = {
    id: uid(),
    title: `第${chapters.length + 1}章`,
    goal: '', outline: '', characters: '', foreshadowing: '', inspiration: '',
  }
  const updated = [...chapters, chapter]
  saveChapters(updated)
  return { chapters: updated, chapter }
}

export const updateChapter = (chapters, id, patch) => {
  const updated = chapters.map(c => c.id === id ? { ...c, ...patch } : c)
  saveChapters(updated)
  return updated
}

export const deleteChapter = (chapters, id) => {
  const updated = chapters.filter(c => c.id !== id)
  saveChapters(updated)
  return updated
}

export const loadInspirations = () => get('inspirations', [])
export const saveInspirations = (ins) => set('inspirations', ins)

export const addInspiration = (inspirations, content) => {
  const item = { id: uid(), content, createdAt: Date.now() }
  const updated = [item, ...inspirations]
  saveInspirations(updated)
  return updated
}

export const deleteInspiration = (inspirations, id) => {
  const updated = inspirations.filter(i => i.id !== id)
  saveInspirations(updated)
  return updated
}

// ── Writing chat ──────────────────────────────────────────────────────────
export const loadWritingChats = () => get('writingChats', [])
export const saveWritingChats = (chats) => set('writingChats', chats)

export const newWritingChat = (chats) => {
  const chat = { id: uid(), title: '新创作', createdAt: Date.now(), messages: [], chapterId: null }
  const updated = [chat, ...chats]
  saveWritingChats(updated)
  return { chats: updated, chat }
}

export const updateWritingChat = (chats, id, patch) => {
  const updated = chats.map(c => c.id === id ? { ...c, ...patch } : c)
  saveWritingChats(updated)
  return updated
}

export const addWritingMessage = (chats, chatId, msg) => {
  const message = { id: uid(), ...msg, timestamp: Date.now() }
  const updated = chats.map(c => {
    if (c.id !== chatId) return c
    const messages = [...c.messages, message]
    const title = c.title === '新创作' && msg.role === 'user'
      ? (typeof msg.content === 'string' ? msg.content : '新创作').slice(0, 20)
      : c.title
    return { ...c, messages, title }
  })
  saveWritingChats(updated)
  return updated
}

export const updateLastWritingMessage = (chats, chatId, text) => {
  const updated = chats.map(c => {
    if (c.id !== chatId) return c
    const messages = [...c.messages]
    if (messages.length > 0) messages[messages.length - 1] = { ...messages[messages.length - 1], content: text }
    return { ...c, messages }
  })
  saveWritingChats(updated)
  return updated
}

export { uid }
