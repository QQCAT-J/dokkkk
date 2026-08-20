const BUILTIN_ENDPOINTS = {
  'claude-haiku-4-5-20251001': '/api/chat',
  'claude-sonnet-4-6': '/api/chat',
  'claude-opus-4-6': '/api/chat',
  'deepseek-chat': '/api/deepseek',
  'gemini-2.0-flash': '/api/gemini',
}

export async function streamMessage({ model, system, messages, onChunk, onDone, onError, relayModels = [] }) {
  try {
    const isRelay = relayModels.some(m => m.value === model)
    const endpoint = BUILTIN_ENDPOINTS[model] || (isRelay ? '/api/relay' : '/api/chat')
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        stream: true,
        ...(system ? { system } : {}),
        ...(isRelay ? { relayModel: model } : {}),
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue
        try {
          const data = JSON.parse(raw)
          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            fullText += data.delta.text
            onChunk(data.delta.text, fullText)
          }
        } catch {}
      }
    }

    onDone(fullText)
  } catch (err) {
    onError(err.message || '请求失败')
  }
}

// Image file → base64 content block
export const fileToContentBlock = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result.split(',')[1]
    const mediaType = file.type || 'image/jpeg'
    resolve({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
  }
  reader.onerror = reject
  reader.readAsDataURL(file)
})
