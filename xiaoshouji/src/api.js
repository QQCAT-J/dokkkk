const ENDPOINT = '/api/chat'

export async function streamMessage({ model, system, messages, onChunk, onDone, onError }) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        stream: true,
        ...(system ? { system } : {}),
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
