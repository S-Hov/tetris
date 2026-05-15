import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resourcesAPI } from '@/shared/api/resources'
import { notify } from '@/shared/lib/notify.js'
import './AdminUserEditPage.css'

const USER_STATUSES = ['active', 'pending_verification', 'blocked', 'disabled']
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/webm']

export function AdminUserEditPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [form, setForm] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadUser = async () => {
      setIsLoading(true)

      try {
        const response = await resourcesAPI.getUserDetails(userId)

        if (isActive) {
          setData(response)
          setForm(createForm(response))
        }
      } catch (requestError) {
        notify.error(requestError.message || 'Не удалось загрузить пользователя')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isActive = false
    }
  }, [userId])

  const currentAvatar = useMemo(
    () => getAssetUrl(data?.user?.avatar_url),
    [data?.user?.avatar_url]
  )

  const setField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!AVATAR_TYPES.includes(file.type)) {
      notify.error('Поддерживаются PNG, JPG, GIF, WEBP, AVIF и WEBM')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      notify.error('Аватар не должен быть больше 2 МБ')
      event.target.value = ''
      return
    }

    setAvatarFile(file)
  }

  const saveUser = async (event) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      await resourcesAPI.manageUser(userId, form)

      if (avatarFile) {
        await resourcesAPI.updateUserAvatar(userId, avatarFile)
      }

      notify.success('Пользователь сохранён')
      navigate(`/users/${userId}`)
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось сохранить пользователя')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAccount = (account) => {
    toast.custom((toastInstance) => (
      <div className="admin-confirm">
        <strong>Удалить способ входа?</strong>
        <p>Пользователь больше не сможет войти через {account.provider}.</p>
        <div>
          <button type="button" onClick={() => toast.dismiss(toastInstance.id)}>Отмена</button>
          <button
            className="admin-confirm__danger"
            type="button"
            onClick={async () => {
              toast.dismiss(toastInstance.id)
              try {
                await resourcesAPI.deleteUserAccount(userId, account.id)
                const response = await resourcesAPI.getUserDetails(userId)
                setData(response)
                notify.success('Способ входа удалён')
              } catch (requestError) {
                notify.error(requestError.message || 'Не удалось удалить способ входа')
              }
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    ), { duration: 10000 })
  }

  const deleteUser = () => {
    toast.custom((toastInstance) => (
      <div className="admin-confirm">
        <strong>Удалить аккаунт?</strong>
        <p>Аккаунт будет удалён без восстановления. История матчей останется без привязки к пользователю.</p>
        <div>
          <button type="button" onClick={() => toast.dismiss(toastInstance.id)}>Отмена</button>
          <button
            className="admin-confirm__danger"
            type="button"
            onClick={async () => {
              toast.dismiss(toastInstance.id)
              setIsDeleting(true)

              try {
                await resourcesAPI.deleteUser(userId)
                notify.success('Пользователь удалён')
                navigate('/users')
              } catch (requestError) {
                notify.error(requestError.message || 'Не удалось удалить пользователя')
              } finally {
                setIsDeleting(false)
              }
            }}
          >
            Удалить аккаунт
          </button>
        </div>
      </div>
    ), { duration: 10000 })
  }

  if (isLoading || !form) {
    return (
      <section className="admin-page admin-user-edit">
        <div className="admin-panel admin-user-edit__state">Загружаем форму управления...</div>
      </section>
    )
  }

  return (
    <form className="admin-page admin-user-edit" onSubmit={saveUser}>
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Управление пользователем #{userId}</p>
          <h1 className="admin-page__title">{data.user.username}</h1>
        </div>
        <div className="admin-page__actions">
          <Link className="admin-button" to={`/users/${userId}`}>Назад</Link>
          <button className="admin-button admin-button--primary" disabled={isSaving} type="submit">
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </header>

      <section className="admin-user-edit__grid">
        <article className="admin-panel">
          <h2 className="admin-panel__title">Аккаунт</h2>
          <div className="admin-user-edit__avatar-row">
            <UserAvatar src={currentAvatar} name={form.username} />
            <label className="admin-user-edit__upload">
              <input accept={AVATAR_TYPES.join(',')} type="file" onChange={handleAvatarChange} />
              <span>{avatarFile ? avatarFile.name : 'Заменить аватар'}</span>
              <small>PNG, JPG, GIF, WEBP, AVIF, WEBM до 2 МБ</small>
            </label>
          </div>
          <Field label="Никнейм" value={form.username} onChange={(value) => setField('username', value)} />
          <Field label="Почта" type="email" value={form.email} onChange={(value) => setField('email', value)} />
          <label className="admin-user-edit__field">
            <span>Статус</span>
            <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
              {USER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <Field label="ID роли" type="number" value={form.role_id} onChange={(value) => setField('role_id', value)} />
        </article>

        <article className="admin-panel">
          <h2 className="admin-panel__title">Пароль</h2>
          <p className="admin-panel__caption">
            Текущий пароль не отображается. Заполните оба поля, чтобы установить новый.
          </p>
          <Field label="Новый пароль" type="password" value={form.newPassword} onChange={(value) => setField('newPassword', value)} />
          <Field label="Подтверждение пароля" type="password" value={form.confirmPassword} onChange={(value) => setField('confirmPassword', value)} />
        </article>
      </section>

      <section className="admin-user-edit__grid">
        <article className="admin-panel">
          <h2 className="admin-panel__title">Рейтинг</h2>
          <div className="admin-user-edit__rank-grid">
            <Field label="RP" type="number" value={form.rankPoints} onChange={(value) => setField('rankPoints', value)} />
            <Field label="MMR" type="number" value={form.mmr} onChange={(value) => setField('mmr', value)} />
            <Field label="Победы" type="number" value={form.wins} onChange={(value) => setField('wins', value)} />
            <Field label="Поражения" type="number" value={form.losses} onChange={(value) => setField('losses', value)} />
            <Field label="Ничьи" type="number" value={form.draws} onChange={(value) => setField('draws', value)} />
            <Field label="Всего матчей" type="number" value={form.totalMatches} onChange={(value) => setField('totalMatches', value)} />
            <Field label="Solo рекорд" type="number" value={form.bestSoloScore} onChange={(value) => setField('bestSoloScore', value)} />
          </div>
        </article>

        <article className="admin-panel">
          <h2 className="admin-panel__title">Способы входа</h2>
          <div className="admin-user-edit__accounts">
            <div className="admin-user-edit__account">
              <div>
                <strong>password</strong>
                <span>{data.user.has_password ? 'Доступен' : 'Не установлен'}</span>
              </div>
              <small>Управляется через блок пароля</small>
            </div>
            {data.accounts?.map((account) => (
              <div className="admin-user-edit__account" key={account.id}>
                <div>
                  <strong>{account.provider}</strong>
                  <span>{account.provider_account_id}</span>
                </div>
                <button type="button" onClick={() => deleteAccount(account)}>Удалить</button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-panel admin-user-edit__danger">
        <div>
          <h2 className="admin-panel__title">Опасная зона</h2>
          <p className="admin-panel__caption">Удаление аккаунта нельзя отменить из админки.</p>
        </div>
        <button disabled={isDeleting} type="button" onClick={deleteUser}>
          {isDeleting ? 'Удаляем...' : 'Удалить аккаунт'}
        </button>
      </section>
    </form>
  )
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <label className="admin-user-edit__field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function UserAvatar({ src, name }) {
  if (!src) {
    return <span className="admin-user-edit__avatar">{String(name || '?').slice(0, 1).toUpperCase()}</span>
  }

  if (src.toLowerCase().includes('.webm')) {
    return (
      <span className="admin-user-edit__avatar">
        <video src={src} autoPlay loop muted playsInline aria-label={name || 'Аватар'} />
      </span>
    )
  }

  return (
    <span className="admin-user-edit__avatar">
      <img src={src} alt={name || 'Аватар'} />
    </span>
  )
}

function createForm(data) {
  return {
    username: data.user.username || '',
    email: data.user.email || '',
    status: data.user.status || 'active',
    role_id: data.user.role_id || 1,
    newPassword: '',
    confirmPassword: '',
    rankPoints: data.rankStats?.rankPoints ?? 0,
    mmr: data.rankStats?.mmr ?? 1000,
    wins: data.rankStats?.wins ?? 0,
    losses: data.rankStats?.losses ?? 0,
    draws: data.rankStats?.draws ?? 0,
    totalMatches: data.rankStats?.totalMatches ?? 0,
    bestSoloScore: data.rankStats?.bestSoloScore ?? 0,
  }
}

function getAssetUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('blob:')) return value

  const baseUrl = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname
      ? `http://${window.location.hostname}:8880`
      : 'http://127.0.0.1:8880'
  )

  return `${baseUrl}${value}`
}
