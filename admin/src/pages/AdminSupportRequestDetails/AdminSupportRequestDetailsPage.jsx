import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { resourcesAPI } from '@/shared/api/resources'
import { ensureAdminSocket, adminSocket } from '@/shared/api/socket'
import { notify } from '@/shared/lib/notify.js'
import './AdminSupportRequestDetailsPage.css'

const CATEGORY_LABELS = {
  bug: 'Ошибка в игре',
  idea: 'Идея или предложение',
  mode: 'Игровой режим',
  balance: 'Баланс',
  other: 'Другое обращение',
}

const CHANNEL_LABELS = {
  email: 'Email',
  telegram: 'Telegram',
  admin: 'Админка',
}

export function AdminSupportRequestDetailsPage() {
  const { requestId } = useParams()
  const [request, setRequest] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [isSocketConnected, setIsSocketConnected] = useState(() => adminSocket.connected)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    let isActive = true

    const loadRequest = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await resourcesAPI.getSupportRequestDetails(requestId)

        if (isActive) {
          setRequest(response.request || null)
          setMessages(response.messages || [])
        }
      } catch (requestError) {
        const message = requestError.message || 'Не удалось загрузить обращение'

        if (isActive) {
          setError(message)
        }

        notify.error(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadRequest()

    return () => {
      isActive = false
    }
  }, [requestId])

  useEffect(() => {
    const socket = ensureAdminSocket()

    const joinRequest = () => {
      setIsSocketConnected(true)
      socket.emit('support:join', { requestId }, (response) => {
        if (response?.success === false) {
          notify.error(response.message || 'Не удалось подключить чат обращения')
          return
        }

        if (response?.request) {
          setRequest((current) => ({ ...(current || {}), ...response.request }))
        }

        if (Array.isArray(response?.messages)) {
          setMessages((current) => mergeMessages(current, response.messages))
        }
      })
    }

    const handleDisconnect = () => {
      setIsSocketConnected(false)
    }

    const handleMessage = (payload) => {
      if (String(payload?.requestId) !== String(requestId) || !payload.message) {
        return
      }

      setMessages((current) => appendMessage(current, payload.message))

      if (payload.request) {
        setRequest((current) => ({ ...(current || {}), ...payload.request }))
      }
    }

    const handleUpdated = (payload) => {
      if (String(payload?.requestId) !== String(requestId) || !payload.request) {
        return
      }

      setRequest((current) => ({ ...(current || {}), ...payload.request }))
    }

    socket.on('connect', joinRequest)
    socket.on('disconnect', handleDisconnect)
    socket.on('support:message', handleMessage)
    socket.on('support:updated', handleUpdated)

    if (socket.connected) {
      joinRequest()
    }

    return () => {
      socket.emit('support:leave', { requestId })
      socket.off('connect', joinRequest)
      socket.off('disconnect', handleDisconnect)
      socket.off('support:message', handleMessage)
      socket.off('support:updated', handleUpdated)
    }
  }, [requestId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const replyHint = useMemo(() => {
    if (!request) {
      return ''
    }

    if (request.preferred_channel === 'telegram') {
      return request.telegram_linked_at
        ? 'Ответ уйдет пользователю в Telegram.'
        : 'Telegram еще не привязан, отправить ответ пока нельзя.'
    }

    return request.contact_email
      ? `Ответ уйдет на ${request.contact_email}.`
      : 'Email не указан, отправить ответ пока нельзя.'
  }, [request])

  const canSendReply = Boolean(
    replyText.trim() &&
    !isSending &&
    request &&
    !['closed', 'spam'].includes(request.status) &&
    (
      (request.preferred_channel === 'telegram' && request.telegram_linked_at && request.telegram_chat_id) ||
      (request.preferred_channel === 'email' && request.contact_email)
    )
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSendReply) {
      return
    }

    setIsSending(true)

    try {
      const response = await resourcesAPI.replySupportRequest(requestId, replyText)

      setReplyText('')
      setRequest(response.request || request)
      setMessages(response.messages || messages)
      notify.success('Ответ отправлен')
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось отправить ответ')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <section className="admin-page admin-support-request">
        <div className="admin-panel admin-support-request__state">Загружаем обращение...</div>
      </section>
    )
  }

  if (error || !request) {
    return (
      <section className="admin-page admin-support-request">
        <div className="admin-panel admin-support-request__state">
          <strong>Обращение не открыто</strong>
          <span>{error || 'Запись обращения не найдена'}</span>
          <Link className="admin-button" to="/support/requests">Вернуться к обращениям</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page admin-support-request">
      <header className="admin-page__header admin-support-request__hero">
        <div>
          <p className="admin-page__eyebrow">Обращение #{request.id}</p>
          <h1 className="admin-page__title">{CATEGORY_LABELS[request.category] || request.title || 'Поддержка'}</h1>
          <p>{request.title ? `Тема пользователя: ${request.title}` : 'Тема сформирована по категории обращения'}</p>
        </div>
        <div className="admin-support-request__status">
          <span className="cell-badge">{request.status}</span>
          <strong>{CHANNEL_LABELS[request.preferred_channel] || request.preferred_channel}</strong>
          <small>{formatDate(request.created_at)}</small>
        </div>
      </header>

      <section className="admin-support-request__info">
        <Meta label="Категория" value={CATEGORY_LABELS[request.category] || request.category} />
        <Meta label="Приоритет" value={request.priority || '-'} />
        <Meta label="TG linked" value={request.telegram_linked_at ? formatDate(request.telegram_linked_at) : 'Нет'} />
        <Meta label="Обновлено" value={formatDate(request.updated_at)} />
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">Данные обращения</h2>
            <p className="admin-panel__caption">Контакты, связь с аккаунтом и технический контекст.</p>
          </div>
          <Link className="admin-button" to="/support/requests">К списку</Link>
        </div>
        <div className="admin-support-request__details">
          <Detail label="User ID" value={request.user_id ? <Link to={`/users/${request.user_id}`}>#{request.user_id}</Link> : '-'} />
          <Detail label="Имя" value={request.contact_name || '-'} />
          <Detail label="Email" value={request.contact_email || '-'} />
          <Detail label="Telegram" value={formatTelegram(request)} />
          <Detail label="Telegram user id" value={request.telegram_user_id || '-'} />
          <Detail label="Telegram chat id" value={request.telegram_chat_id || '-'} />
          <Detail label="Страница" value={request.page_url || '-'} />
          <Detail label="Вложение" value={request.attachment_url || '-'} />
          <Detail label="Создано" value={formatDate(request.created_at)} />
          <Detail label="Закрыто" value={formatDate(request.resolved_at)} />
        </div>
        <article className="admin-support-request__message">
          <span>Первое сообщение</span>
          <p>{request.message || '-'}</p>
        </article>
        {request.client_context ? (
          <pre className="admin-support-request__context">{JSON.stringify(request.client_context, null, 2)}</pre>
        ) : null}
      </section>

      <section className="admin-panel admin-support-request__chat-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">Чат с пользователем</h2>
            <p className="admin-panel__caption">{replyHint}</p>
          </div>
          <span className={isSocketConnected ? 'admin-support-request__online' : 'admin-support-request__offline'}>
            {isSocketConnected ? 'online' : 'offline'}
          </span>
        </div>

        <div className="admin-support-request__chat">
          {messages.length ? messages.map((message) => (
            <article
              className={`admin-support-request__bubble admin-support-request__bubble--${message.sender_type}`}
              key={message.id}
            >
              <div>
                <strong>{message.sender_label || getSenderLabel(message.sender_type)}</strong>
                <span>{CHANNEL_LABELS[message.channel] || message.channel} · {formatDate(message.created_at)}</span>
              </div>
              <p>{message.message_text}</p>
            </article>
          )) : (
            <p className="admin-panel__empty">История сообщений пока пустая</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="admin-support-request__reply" onSubmit={handleSubmit}>
          <textarea
            placeholder="Напишите ответ пользователю"
            rows={4}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
          />
          <button className="admin-button admin-button--primary" disabled={!canSendReply} type="submit">
            {isSending ? 'Отправляем...' : 'Отправить'}
          </button>
        </form>
      </section>
    </section>
  )
}

function Meta({ label, value }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Detail({ label, value }) {
  return (
    <div className="admin-support-request__detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function appendMessage(messages, message) {
  if (messages.some((item) => String(item.id) === String(message.id))) {
    return messages
  }

  return [...messages, message].sort((left, right) => (
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime() ||
    Number(left.id) - Number(right.id)
  ))
}

function mergeMessages(existingMessages, incomingMessages) {
  const merged = [...existingMessages]

  for (const message of incomingMessages) {
    if (!merged.some((item) => String(item.id) === String(message.id))) {
      merged.push(message)
    }
  }

  return merged.sort((left, right) => (
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime() ||
    Number(left.id) - Number(right.id)
  ))
}

function formatTelegram(request) {
  if (request.telegram_username) {
    const username = String(request.telegram_username).replace(/^@/, '')

    return <a href={`https://t.me/${username}`} target="_blank" rel="noreferrer">@{username}</a>
  }

  if (request.telegram_user_id) {
    return `tg:${request.telegram_user_id}`
  }

  if (request.telegram_chat_id) {
    return `chat:${request.telegram_chat_id}`
  }

  return '-'
}

function getSenderLabel(senderType) {
  if (senderType === 'admin') {
    return 'Поддержка'
  }

  if (senderType === 'system') {
    return 'Система'
  }

  return 'Пользователь'
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
