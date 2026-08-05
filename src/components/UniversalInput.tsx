'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { processTextInput, processNutritionLabelPhoto } from '@/actions/processInput'
import { Send, Camera, X, Image, Loader2, ImagePlus, MessageSquare, ChevronDown } from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'ai'
  text: string
  status?: 'logged' | 'need_photo' | 'info' | 'error'
  id: number
}

type HistoryEntry = { role: string; parts: { text: string }[] }

export default function UniversalInput() {
  const [text, setText] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingFoodName, setPendingFoodName] = useState<string | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('calories_chat_history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const today = new Date().toLocaleDateString()
        if (parsed.date === today && Array.isArray(parsed.messages)) {
          setHistory(parsed.messages)
          // Convert history to chat bubbles
          const bubbles: ChatMessage[] = parsed.messages.map((m: HistoryEntry, i: number) => ({
            role: m.role === 'user' ? 'user' : 'ai',
            text: m.parts[0]?.text ?? '',
            id: i,
          }))
          if (bubbles.length > 0) {
            setChatMessages(bubbles)
            setChatOpen(true)
          }
        } else {
          localStorage.removeItem('calories_chat_history')
        }
      } catch (e) {
        console.error('Error loading history:', e)
      }
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, chatOpen, isPending])

  const updateHistory = (newMessages: HistoryEntry[]) => {
    setHistory(newMessages)
    localStorage.setItem('calories_chat_history', JSON.stringify({
      date: new Date().toLocaleDateString(),
      messages: newMessages
    }))
  }

  const addMessage = (role: 'user' | 'ai', text: string, status?: ChatMessage['status']) => {
    setChatMessages(prev => [...prev, { role, text, status, id: Date.now() }])
    setChatOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isPending) return

    const input = text.trim()
    setText('')

    addMessage('user', input)

    const historyToPass = history.slice(-10)
    const userEntry: HistoryEntry = { role: 'user', parts: [{ text: input }] }
    const newHistory = [...history, userEntry]

    startTransition(async () => {
      const result = await processTextInput(input, historyToPass)

      addMessage('ai', result.message, result.status)

      if (result.status !== 'error') {
        const modelEntry: HistoryEntry = { role: 'model', parts: [{ text: result.message }] }
        updateHistory([...newHistory, modelEntry].slice(-20))
      }

      if (result.status === 'need_photo' && 'foodName' in result) {
        setPendingFoodName(result.foodName)
        setShowPhotoUpload(true)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setShowPhotoUpload(false)
    addMessage('user', `📸 Foto de tabla nutricional${pendingFoodName ? ` (${pendingFoodName})` : ''}`)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('image', file)
      if (pendingFoodName) formData.append('food_name', pendingFoodName)

      const result = await processNutritionLabelPhoto(formData)
      addMessage('ai', result.message, result.status)

      if (result.status === 'logged') setPendingFoodName(null)
    })

    if (photoRef.current) photoRef.current.value = ''
    if (fileRef.current) fileRef.current.value = ''
  }

  const clearChat = () => {
    setChatMessages([])
    setChatOpen(false)
    setHistory([])
    localStorage.removeItem('calories_chat_history')
  }

  // Strip markdown bold for display
  const renderText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )
  }

  const getBubbleAccent = (status?: ChatMessage['status']) => {
    if (status === 'logged') return 'var(--color-success)'
    if (status === 'need_photo') return 'var(--color-warning)'
    if (status === 'error') return 'var(--color-danger)'
    return 'var(--color-primary)'
  }

  return (
    <>
      {/* ── Chat Panel ───────────────────────────────────────────────── */}
      {chatOpen && chatMessages.length > 0 && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Asistente
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                className="chat-panel-btn"
                onClick={() => setChatOpen(false)}
                title="Minimizar"
                aria-label="Minimizar chat"
              >
                <ChevronDown size={14} />
              </button>
              <button
                className="chat-panel-btn"
                onClick={clearChat}
                title="Limpiar chat"
                aria-label="Limpiar chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.role}`}
                style={msg.role === 'ai' ? {
                  borderLeft: `2px solid ${getBubbleAccent(msg.status)}`,
                } : {}}
              >
                {renderText(msg.text)}
              </div>
            ))}

            {/* Loading indicator */}
            {isPending && (
              <div className="chat-bubble ai loading">
                <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span>Analizando...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </div>
      )}

      {/* ── Photo Upload Sheet ────────────────────────────────────────── */}
      {showPhotoUpload && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(var(--nav-height) + var(--input-bar-height))',
            left: 0, right: 0,
            zIndex: 44,
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            padding: '1rem',
          }}
        >
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                📸 Subir foto de tabla nutricional
              </span>
              <button
                onClick={() => { setShowPhotoUpload(false); setPendingFoodName(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={() => photoRef.current?.click()}
              style={{
                width: '100%', padding: '1.25rem',
                background: 'var(--color-surface-2)',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <ImagePlus size={28} color="var(--color-primary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Elegir foto</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                Tomá la foto de frente con buena iluminación
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <div className="input-bar">
        <div className="input-bar-inner">
          {/* Hidden file inputs */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} aria-hidden="true" />
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} aria-hidden="true" />

          {/* Camera button */}
          <button
            className="camera-btn"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            title="Subir foto de tabla nutricional"
            aria-label="Subir foto"
            id="btn-camera"
          >
            <Image size={18} />
          </button>

          {/* Text Input + Send */}
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className="universal-input"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='¿Qué comiste?'
                disabled={isPending}
                autoComplete="off"
                autoCapitalize="sentences"
                id="input-universal"
                aria-label="Registrar comida"
              />
              {/* Chat toggle when minimized */}
              {!chatOpen && chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  style={{
                    position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'var(--color-primary-bg)',
                    border: 'none', borderRadius: 'var(--radius-full)',
                    padding: '0.2rem 0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)',
                  }}
                  aria-label="Ver conversación"
                >
                  <MessageSquare size={11} />
                  {chatMessages.length}
                </button>
              )}
            </div>

            <button
              type="submit"
              className="send-btn"
              disabled={!text.trim() || isPending}
              title="Registrar"
              aria-label="Registrar comida"
              id="btn-send"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
