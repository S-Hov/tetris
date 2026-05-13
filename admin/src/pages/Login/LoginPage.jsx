import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth.js'
import { notify } from '@/shared/lib/notify.js'
import './LoginPage.css'

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await login(form)
      notify.success('Добро пожаловать в админку')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      notify.error(error.message || 'Нет доступа к админке')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__brand">
          <span>T</span>
          <div>
            <strong>PVP Tetris</strong>
            <small>Admin Console</small>
          </div>
        </div>

        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            onChange={handleChange}
            required
            type="email"
            value={form.email}
          />
        </label>

        <label>
          Пароль
          <input
            autoComplete="current-password"
            name="password"
            onChange={handleChange}
            required
            type="password"
            value={form.password}
          />
        </label>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Проверяем...' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
