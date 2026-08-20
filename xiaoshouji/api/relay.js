export const config = { runtime: 'edge' }

// 中转站配置：如果以后要换地址或加模型，改这里就行
const RELAY_BASE_URL = 'https://sea.tpapi.fun/v1/chat/completions'

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

  const apiKey = process.env.RELAY_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '未配置 RELAY_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const openaiMessages = []
    if (body.system) openaiMessages.push({ role: 'system', content: body.system })
    for (const m of body.messages) {
      const content = Array.isArray(m.content)
        ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : m.content
      openaiMessages.push({ role: m.role, content })
    }

    // relayModel 由前端传入 body.relayModel 指定，默认走 claude-fable-5
    const relayModel = body.relayModel || 'claude-fable-5'

    const upstream = await fetch(RELAY_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: relayModel,
        messages: openaiMessages,
        stream: true,
        max_tokens: 8000,
      }),
    })

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
            if (raw === '[DONE]') continue
            try {
              const data = JSON.parse(raw)
              const delta = data.choices?.[0]?.delta?.content
              if (delta) {
                const chunk = { type: 'content_block_delta', delta: { type: 'text_delta', text: delta } }
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
