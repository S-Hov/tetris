import { Link } from 'react-router-dom'
import './NotFoundPage.css'

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div>
        <strong>404</strong>
        <h1>Страница не найдена</h1>
        <Link to="/dashboard">Вернуться в админку</Link>
      </div>
    </main>
  )
}
