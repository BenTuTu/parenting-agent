import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import MarkdownIt from 'markdown-it'
import './Playground.css'

/**
 * Playground：直接调用服务端 POST /api/agent/chat（SSE 流式）。
 *
 * API 地址优先级：页面「设置」里填写的值（localStorage） > 构建时 API_BASE > 同源。
 * 本地 `pnpm dev` 时同源的 /api 会被 Rspress 开发服务器代理到 http://localhost:3000。
 *
 * 组件依赖 localStorage，只在浏览器端渲染（页面中用 <NoSSR> 包裹）。
 */

interface ToolEvent {
  callId: string
  name: string
  arguments?: string
  result?: string
  done: boolean
}

type Status = 'streaming' | 'done' | 'error' | 'aborted'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  tools: ToolEvent[]
  status?: Status
}

/** 服务端 SSE 事件 */
type StreamEvent =
  | { delta: string }
  | { tool: { phase: 'start' | 'end'; callId: string; name: string; arguments?: string; result?: string } }
  | { done: true; sessionId: string }
  | { error: string }

const STORAGE = {
  session: 'pa-playground-session',
  apiBase: 'pa-playground-api-base',
  verbose: 'pa-playground-verbose',
}

const TOOL_LABELS: Record<string, string> = {
  calc_age_stage: '换算月龄',
  get_milestones: '查询发育里程碑',
  get_care_guide: '查询护理指南',
  search_wiki: '检索知识库',
  read_wiki_page: '阅读知识文章',
}

const EXAMPLES = [
  '宝宝8个月，长了两颗牙，多大可以开始刷牙？',
  '10个月宝宝应该会什么？',
  '2岁宝宝晚上总是醒，怎么办？',
  '该不该给宝宝用安抚奶嘴？',
]

// html: false —— 模型输出中的 HTML 一律转义，避免 XSS
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const DEFAULT_API_BASE = __PLAYGROUND_API_BASE__

const newSessionId = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

let nextId = 1

export default function Playground() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem(STORAGE.session) || newSessionId()
    localStorage.setItem(STORAGE.session, saved)
    return saved
  })
  const [apiBase, setApiBase] = useState(() => localStorage.getItem(STORAGE.apiBase) ?? '')
  const [verbose, setVerbose] = useState(() => localStorage.getItem(STORAGE.verbose) !== 'false')
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const endpoint = useMemo(
    () => `${(apiBase.trim() || DEFAULT_API_BASE).replace(/\/+$/, '')}/api/agent/chat`,
    [apiBase],
  )

  useEffect(() => localStorage.setItem(STORAGE.apiBase, apiBase.trim()), [apiBase])
  useEffect(() => localStorage.setItem(STORAGE.verbose, String(verbose)), [verbose])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])
  useEffect(() => () => controllerRef.current?.abort(), [])

  /** 不可变地更新某条消息 */
  const patch = useCallback((id: number, fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((list) => list.map((m) => (m.id === id ? fn(m) : m)))
  }, [])

  const applyEvent = useCallback(
    (id: number, event: StreamEvent) => {
      if ('delta' in event) {
        patch(id, (m) => ({ ...m, content: m.content + event.delta }))
      } else if ('tool' in event) {
        const t = event.tool
        patch(id, (m) => {
          if (t.phase === 'start') {
            if (m.tools.some((x) => x.callId === t.callId)) return m
            return {
              ...m,
              tools: [...m.tools, { callId: t.callId, name: t.name, arguments: t.arguments, done: false }],
            }
          }
          return {
            ...m,
            tools: m.tools.map((x) => (x.callId === t.callId ? { ...x, result: t.result, done: true } : x)),
          }
        })
      } else if ('error' in event) {
        throw new Error(event.error)
      } else if ('done' in event) {
        patch(id, (m) => ({ ...m, status: 'done' }))
      }
    },
    [patch],
  )

  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || loading) return
      setInput('')

      const userId = nextId++
      const botId = nextId++
      setMessages((list) => [
        ...list,
        { id: userId, role: 'user', content: question, tools: [] },
        { id: botId, role: 'assistant', content: '', tools: [], status: 'streaming' },
      ])
      setLoading(true)
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: question, stream: true, verbose }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}${detail ? `：${detail.slice(0, 200)}` : ''}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''
          for (const frame of frames) {
            for (const line of frame.split('\n')) {
              if (line.startsWith('data:')) applyEvent(botId, JSON.parse(line.slice(5).trim()))
            }
          }
        }
        patch(botId, (m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          patch(botId, (m) => ({ ...m, status: 'aborted' }))
        } else {
          const reason = err instanceof TypeError ? '无法连接到服务端' : String((err as Error)?.message ?? err)
          const hint =
            `> ⚠️ 请求失败：${reason}\n>\n` +
            `> 请确认服务已启动（\`pnpm dev\`），并检查「设置」里的 API 地址：\`${endpoint}\``
          patch(botId, (m) => ({
            ...m,
            status: 'error',
            content: m.content ? `${m.content}\n\n${hint}` : hint,
          }))
        }
      } finally {
        setLoading(false)
        controllerRef.current = null
      }
    },
    [loading, endpoint, sessionId, verbose, applyEvent, patch],
  )

  const stop = () => controllerRef.current?.abort()

  const resetChat = () => {
    stop()
    const old = sessionId
    const fresh = newSessionId()
    setMessages([])
    setSessionId(fresh)
    localStorage.setItem(STORAGE.session, fresh)
    // 尽力清理服务端旧会话，失败不影响新会话
    fetch(`${endpoint}/${encodeURIComponent(old)}`, { method: 'DELETE' }).catch(() => {})
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="pg">
      <header className="pg-header">
        <div>
          <h1>🌱 Playground</h1>
          <p>直接和小芽聊聊宝宝的事。回答仅供科普参考，不能替代医生面诊。</p>
        </div>
        <div className="pg-actions">
          <button type="button" className="pg-ghost" onClick={() => setShowSettings((v) => !v)}>
            ⚙️ 设置
          </button>
          <button
            type="button"
            className="pg-ghost"
            disabled={!messages.length && !loading}
            onClick={resetChat}
          >
            🧹 新对话
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="pg-settings">
          <label>
            <span>API 地址</span>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder={DEFAULT_API_BASE || '留空 = 同源（本地开发经代理转发到 localhost:3000）'}
            />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={verbose} onChange={(e) => setVerbose(e.target.checked)} />
            <span>显示工具调用过程</span>
          </label>
          <p className="pg-hint">
            当前请求：<code>POST {endpoint}</code> · 会话：<code>{sessionId}</code>
          </p>
        </div>
      )}

      <div ref={listRef} className="pg-list">
        {!messages.length && (
          <div className="pg-empty">
            <div className="pg-empty-emoji">👶</div>
            <p>可以先告诉我宝宝的出生日期，或者试试这些问题：</p>
            <div className="pg-examples">
              {EXAMPLES.map((q) => (
                <button type="button" key={q} onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`pg-msg pg-${m.role}`}>
            <div className="pg-avatar">{m.role === 'user' ? '🧑' : '🌱'}</div>
            <div className="pg-bubble">
              {m.tools.length > 0 && (
                <div className="pg-tools">
                  {m.tools.map((t) => (
                    <details key={t.callId} className="pg-tool">
                      <summary>
                        <span className={`pg-dot${t.done ? ' done' : ''}`} />
                        {TOOL_LABELS[t.name] ?? t.name}
                        {t.result && <span className="pg-tool-result"> · {t.result}</span>}
                      </summary>
                      <code>
                        {t.name}({t.arguments})
                      </code>
                    </details>
                  ))}
                </div>
              )}
              {m.role === 'user' ? (
                <div className="pg-text">{m.content}</div>
              ) : (
                m.content && (
                  <div className="pg-text pg-md" dangerouslySetInnerHTML={{ __html: md.render(m.content) }} />
                )
              )}
              {m.status === 'streaming' && !m.content && (
                <div className="pg-typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              {m.status === 'aborted' && <div className="pg-meta">已停止生成</div>}
            </div>
          </div>
        ))}
      </div>

      <form
        className="pg-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="例如：宝宝发烧38.2度怎么办？（Enter 发送，Shift+Enter 换行）"
        />
        {loading ? (
          <button type="button" className="pg-stop" onClick={stop}>
            停止
          </button>
        ) : (
          <button type="submit" className="pg-send" disabled={!input.trim()}>
            发送
          </button>
        )}
      </form>
    </div>
  )
}
