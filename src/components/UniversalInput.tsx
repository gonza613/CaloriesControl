'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { processTextInput, processNutritionLabelPhoto, ProcessInputResult } from '@/actions/processInput'
import { Send, Camera, X, Image, Loader2, CheckCircle2, AlertCircle, Info, ImagePlus } from 'lucide-react'

type ToastState = ProcessInputResult & { id: number }

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const isLogged = toast.status === 'logged'
  const isNeedPhoto = toast.status === 'need_photo'
  const isError = toast.status === 'error'

  const colorClass = isLogged ? 'success' : isNeedPhoto ? 'warning' : isError ? 'error' : 'info'
  const Icon = isLogged ? CheckCircle2 : isNeedPhoto ? Camera : isError ? AlertCircle : Info
  const iconColor = isLogged
    ? 'var(--color-success)'
    : isNeedPhoto
    ? 'var(--color-warning)'
    : isError
    ? 'var(--color-danger)'
    : 'var(--color-carbs)'

  // Parse markdown bold
  const renderMessage = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} style={{ color: 'var(--color-text)', fontWeight: 700 }}>{part}</strong> : part
    )
  }

  return (
    <div className={`ai-toast ${colorClass}`}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: '0.1rem' }} />
        <p style={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
          {renderMessage(toast.message)}
        </p>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-subtle)', flexShrink: 0, display: 'flex',
          }}
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default function UniversalInput() {
  const [text, setText] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [pendingFoodName, setPendingFoodName] = useState<string | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [history, setHistory] = useState<{ role: string; parts: { text: string }[] }[]>([])
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('calories_chat_history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const today = new Date().toLocaleDateString()
        if (parsed.date === today && Array.isArray(parsed.messages)) {
          setHistory(parsed.messages)
        } else {
          localStorage.removeItem('calories_chat_history')
        }
      } catch (e) {
        console.error('Error loading history:', e)
      }
    }
  }, [])

  const updateHistory = (newMessages: { role: string; parts: { text: string }[] }[]) => {
    setHistory(newMessages)
    localStorage.setItem('calories_chat_history', JSON.stringify({
      date: new Date().toLocaleDateString(),
      messages: newMessages
    }))
  }

  const showToast = (result: ProcessInputResult) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ ...result, id: Date.now() })

    // Auto-dismiss logged confirmations after 4s
    if (result.status === 'logged') {
      toastTimerRef.current = setTimeout(() => setToast(null), 4000)
    }
  }

  // When need_photo, store the pending food name and show upload area
  useEffect(() => {
    if (toast?.status === 'need_photo' && 'foodName' in toast) {
      setPendingFoodName(toast.foodName)
      setShowPhotoUpload(true)
    }
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isPending) return

    const input = text.trim()
    setText('')
    
    // Optimistically prepare the new history with user input
    const userMessage = { role: 'user', parts: [{ text: input }] }
    const newHistory = [...history, userMessage]

    startTransition(async () => {
      // Pass only the last 10 messages to avoid large context and hallucinations
      const historyToPass = history.slice(-10)
      const result = await processTextInput(input, historyToPass)
      
      if (result.status !== 'error') {
        // Only save successful/info responses to history
        const modelMessage = { role: 'model', parts: [{ text: result.message }] }
        // Store up to 20 messages (10 turns) in localStorage
        updateHistory([...newHistory, modelMessage].slice(-20))
      }
      
      showToast(result)
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
    setToast(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('image', file)
      if (pendingFoodName) {
        formData.append('food_name', pendingFoodName)
      }

      const result = await processNutritionLabelPhoto(formData)
      showToast(result)
      if (result.status === 'logged') {
        setPendingFoodName(null)
      }
    })

    // Reset the input
    if (photoRef.current) photoRef.current.value = ''
  }

  const handleCameraClick = () => {
    fileRef.current?.click()
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <Toast toast={toast} onClose={() => { setToast(null); if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }} />
      )}

      {/* Loading indicator */}
      {isPending && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(var(--nav-height) + var(--input-bar-height) + 0.75rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          Analizando con IA...
        </div>
      )}

      {/* Photo upload area (when need_photo) */}
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
                onClick={() => { setShowPhotoUpload(false); setPendingFoodName(null); setToast(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={() => photoRef.current?.click()}
              style={{
                width: '100%',
                padding: '1.25rem',
                background: 'var(--color-surface-2)',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--color-text-muted)',
                transition: 'border-color 0.15s ease',
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

      {/* Universal Input Bar */}
      <div className="input-bar">
        <div className="input-bar-inner">
          {/* Hidden file inputs */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          {/* Camera button */}
          <button
            className="camera-btn"
            onClick={handleCameraClick}
            disabled={isPending}
            title="Subir foto de tabla nutricional"
            aria-label="Subir foto"
            id="btn-camera"
          >
            <Image size={18} />
          </button>

          {/* Text Input */}
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
            <input
              className="universal-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ej: "Comí 2 huevos revueltos con tostadas"'
              disabled={isPending}
              autoComplete="off"
              autoCapitalize="sentences"
              id="input-universal"
              aria-label="Registrar comida"
            />

            {/* Send button */}
            <button
              type="submit"
              className="send-btn"
              disabled={!text.trim() || isPending}
              title="Registrar"
              aria-label="Registrar comida"
              id="btn-send"
            >
              {isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
