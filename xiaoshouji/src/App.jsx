import { useState, useCallback, useEffect } from 'react'
import { loadSettings, saveSettings } from './store'
import ChatTab from './tabs/ChatTab'
import RoleplayTab from './tabs/RoleplayTab'
import WritingTab from './tabs/WritingTab'
import Modal from './components/Modal'

const TABS = [
  { id: 'chat',     icon: '💬', label: '聊天' },
  { id: 'roleplay', icon: '🎭', label: '角色' },
  { id: 'writing',  icon: '✍️', label: '写作' },
]

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku（快）' },
  { id: 'claude-sonnet-4-6',         label: 'Sonnet（推荐）' },
  { id: 'claude-opus-4-6',           label: 'Opus（强）' },
  { id: 'deepseek-chat',             label: 'DeepSeek' },
  { id: 'gemini-2.0-flash',          label: 'Gemini' },
]

export default function App() {
  const [tab, setTab] = useState('chat')
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    let styleTag = document.getElementById('user-custom-css')
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'user-custom-css'
      document.head.appendChild(styleTag)
    }
    styleTag.textContent = settings.customCSS || ''
  }, [settings.customCSS])

  const openSettings = () => {
    setDraft({ ...settings })
    setShowSettings(true)
  }

  const handleSave = () => {
    saveSettings(draft)
    setSettings(draft)
    setShowSettings(false)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">小克</div>
        <nav className="header-nav">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
        <button className="icon-btn" onClick={openSettings} title="设置">⚙️</button>
      </header>

      {tab === 'chat'     && <ChatTab     settings={settings} />}
      {tab === 'roleplay' && <RoleplayTab settings={settings} />}
      {tab === 'writing'  && <WritingTab  settings={settings} />}

      {showSettings && (
        <Modal title="设置" onClose={() => setShowSettings(false)} onConfirm={handleSave} confirmLabel="保存">
          <div className="field">
            <label>默认模型</label>
            <select className="field input" value={draft.model} onChange={e => setDraft(p => ({ ...p, model: e.target.value }))}>
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>关于我（Profile）</label>
            <textarea
              className="field"
              placeholder="你的名字、喜好、习惯……Claude 会记住这些"
              value={draft.profile}
              onChange={e => setDraft(p => ({ ...p, profile: e.target.value }))}
              rows={5}
            />
          </div>
          <div className="field">
            <label>输出指令（Instructions）</label>
            <textarea
              className="field"
              placeholder="对回复风格、格式、语气的要求"
              value={draft.instructions}
              onChange={e => setDraft(p => ({ ...p, instructions: e.target.value }))}
              rows={5}
            />
          </div>
          <div className="field">
            <label>自定义样式（CSS）</label>
            <textarea
              className="field"
              placeholder={'粘贴 CSS 来改变界面外观，例如：\n:root { --rose: #7aa8c9; }\n.header-logo { font-family: cursive; }'}
              value={draft.customCSS}
              onChange={e => setDraft(p => ({ ...p, customCSS: e.target.value }))}
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <p className="field-hint">主色调变量：--rose（强调色）--bg（背景）--bubble-user / --bubble-ai（气泡）--font-display（标题字体）</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
