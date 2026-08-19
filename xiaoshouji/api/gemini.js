export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '未配置 GEMINI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const contents = body.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(m.content)
        ? m.content.map(b => {
            if (b.type === 'text') return { text: b.text }
            if (b.type === 'image') return { inline_data: { mime_type: b.source.media_type, data: b.source.data } }
            return { text: '' }
          })
        : [{ text: m.content }],
    }))

    const geminiBody = {
      contents,
      ...(body.system ? { systemInstruction: { parts: [{ text: body.system }] } } : {}),
      generationConfig: { maxOutputTokens: 8000 },
    }

    const model = 'gemini-2.0-flash'
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    )

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '')
      return new Response(JSON.stringify({ error: errText || `HTTP ${upstream.status}` }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue
            try {
              const data = JSON.parse(raw)
              const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('')
              if (text) {
                const chunk = { type: 'content_block_delta', delta: { type: 'text_delta', text } }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
              }
            } catch {}
          }
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
