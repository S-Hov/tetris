import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resourcesAPI } from '@/shared/api/resources'
import { notify } from '@/shared/lib/notify.js'

const USER_STATUSES = ['active', 'pending_verification', 'blocked', 'disabled']

export function AdminUsersTable({
  rows,
  pagination,
  isLoading,
  error,
  onPageChange,
  onChanged,
}) {
  const [forms, setForms] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / (pagination?.limit || 25)))
  const currentPage = pagination?.page || 1

  const colSpan = 8

  const hasChanges = useMemo(() => {
    return Object.fromEntries(rows.map((row) => {
      const form = getUserForm(row, forms)

      return [
        row.id,
        form.username !== (row.username || '') ||
          form.email !== (row.email || '') ||
          form.status !== (row.status || 'active'),
      ]
    }))
  }, [forms, rows])

  const updateForm = (row, field, value) => {
    setForms((currentForms) => ({
      ...currentForms,
      [row.id]: {
        ...getUserForm(row, currentForms),
        [field]: value,
      },
    }))
  }

  const saveUser = async (row) => {
    const payload = forms[row.id]

    if (!payload) {
      return
    }

    setSavingId(row.id)

    try {
      await resourcesAPI.updateUser(row.id, payload)
      notify.success('Данные пользователя сохранены')
      onChanged()
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось сохранить пользователя')
    } finally {
      setSavingId(null)
    }
  }

  const requestDelete = (row) => {
    toast.custom((toastInstance) => (
      <div className="admin-confirm">
        <strong>Удалить пользователя?</strong>
        <p>
          Аккаунт {row.username || `#${row.id}`} будет удалён. История матчей сохранится без привязки к аккаунту.
        </p>
        <div>
          <button type="button" onClick={() => toast.dismiss(toastInstance.id)}>
            Отмена
          </button>
          <button
            className="admin-confirm__danger"
            type="button"
            onClick={() => {
              toast.dismiss(toastInstance.id)
              deleteUser(row)
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    ), { duration: 10000 })
  }

  const deleteUser = async (row) => {
    setDeletingId(row.id)

    try {
      await resourcesAPI.deleteUser(row.id)
      notify.success('Пользователь удалён')
      onChanged()
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось удалить пользователя')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="admin-data-table admin-users-table">
      <div className="admin-data-table__scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: '72px' }}>ID</th>
              <th style={{ width: '86px' }}>Аватар</th>
              <th>Ник</th>
              <th>Email</th>
              <th style={{ width: '180px' }}>Статус</th>
              <th style={{ width: '86px' }}>Роль</th>
              <th style={{ width: '148px' }}>Создан</th>
              <th style={{ width: '210px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableState colSpan={colSpan} text="Загружаем данные..." />
            ) : error ? (
              <TableState colSpan={colSpan} text={error} />
            ) : rows.length === 0 ? (
              <TableState colSpan={colSpan} text="Пользователей пока нет" />
            ) : (
              rows.map((row) => {
                const form = getUserForm(row, forms)
                const disabled = savingId === row.id || deletingId === row.id

                return (
                  <tr key={row.id}>
                    <td>
                      <Link className="admin-user-link" to={`/users/${row.id}`}>#{row.id}</Link>
                    </td>
                    <td>
                      <UserAvatar src={row.avatar_url} name={row.username} />
                    </td>
                    <td>
                      <Link className="admin-user-field-link" to={`/users/${row.id}`}>
                        {row.username || `Пользователь #${row.id}`}
                      </Link>
                      <input
                        aria-label="Ник пользователя"
                        className="admin-table-input"
                        value={form.username}
                        onChange={(event) => updateForm(row, 'username', event.target.value)}
                      />
                    </td>
                    <td>
                      <Link className="admin-user-field-link" to={`/users/${row.id}`}>
                        {row.email || 'Почта не указана'}
                      </Link>
                      <input
                        aria-label="Почта пользователя"
                        className="admin-table-input"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateForm(row, 'email', event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        aria-label="Статус пользователя"
                        className="admin-table-input"
                        value={form.status}
                        onChange={(event) => updateForm(row, 'status', event.target.value)}
                      >
                        {USER_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>{row.role_id}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      <div className="admin-user-actions">
                        <button
                          disabled={disabled || !hasChanges[row.id]}
                          type="button"
                          onClick={() => saveUser(row)}
                        >
                          {savingId === row.id ? 'Сохраняем...' : 'Изменить'}
                        </button>
                        <button
                          className="admin-user-actions__danger"
                          disabled={disabled}
                          type="button"
                          onClick={() => requestDelete(row)}
                        >
                          {deletingId === row.id ? 'Удаляем...' : 'Удалить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="admin-data-table__footer">
        <span>{pagination?.total || 0} записей</span>
        <div>
          <button
            disabled={currentPage <= 1 || isLoading}
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
          >
            Назад
          </button>
          <strong>{currentPage} / {totalPages}</strong>
          <button
            disabled={currentPage >= totalPages || isLoading}
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
          >
            Вперёд
          </button>
        </div>
      </footer>
    </div>
  )
}

function TableState({ colSpan, text }) {
  return (
    <tr>
      <td className="admin-data-table__state" colSpan={colSpan}>{text}</td>
    </tr>
  )
}

function getUserForm(row, forms) {
  return forms[row.id] || {
    username: row.username || '',
    email: row.email || '',
    status: row.status || 'active',
  }
}

function UserAvatar({ src, name }) {
  const url = getAssetUrl(src)

  if (!url) {
    return <span className="admin-user-avatar">{String(name || '?').slice(0, 1).toUpperCase()}</span>
  }

  if (url.toLowerCase().includes('.webm')) {
    return (
      <span className="admin-user-avatar">
        <video src={url} autoPlay loop muted playsInline aria-label={name || 'Аватар'} />
      </span>
    )
  }

  return (
    <span className="admin-user-avatar">
      <img src={url} alt={name || 'Аватар'} />
    </span>
  )
}

function getAssetUrl(value) {
  if (!value) {
    return ''
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const baseUrl = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname
      ? `http://${window.location.hostname}:8880`
      : 'http://127.0.0.1:8880'
  )

  return `${baseUrl}${value}`
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
