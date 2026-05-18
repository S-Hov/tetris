import { Link } from 'react-router-dom'

export function AdminDataTable({
  config,
  rows,
  pagination,
  isLoading,
  error,
  onPageChange,
  onStatusChange,
  renderActions,
}) {
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / (pagination?.limit || 25)))
  const currentPage = pagination?.page || 1

  return (
    <div className="admin-data-table">
      <div className="admin-data-table__scroll">
        <table>
          <thead>
            <tr>
              {config.columns.map((column) => (
                <th key={column.key} style={{ width: column.width }}>
                  {column.label}
                </th>
              ))}
              {renderActions ? <th style={{ width: '150px' }}>Действия</th> : null}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableState colSpan={config.columns.length + (renderActions ? 1 : 0)} text="Загружаем данные..." />
            ) : error ? (
              <TableState colSpan={config.columns.length + (renderActions ? 1 : 0)} text={error} />
            ) : rows.length === 0 ? (
              <TableState colSpan={config.columns.length + (renderActions ? 1 : 0)} text="Данных пока нет" />
            ) : (
              rows.map((row, index) => (
                <tr key={row[config.primaryKey || 'id'] ?? row.id ?? row.name ?? `${config.key}-${index}`}>
                  {config.columns.map((column) => (
                    <td key={column.key} className={column.truncate ? 'is-truncated' : ''}>
                      {formatCell(row[column.key], column, row, config, onStatusChange)}
                    </td>
                  ))}
                  {renderActions ? <td>{renderActions(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="admin-data-table__footer">
        <span>
          {pagination?.total || 0} записей
        </span>
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
            Вперед
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

function formatCell(value, column, row, config, onStatusChange) {
  if (value === null || value === undefined || value === '') {
    return <span className="cell-muted">-</span>
  }

  if (column.type === 'userLink') {
    return <Link className="admin-table-link" to={`/users/${value}`}>#{value}</Link>
  }

  if (column.type === 'userNameLink') {
    return row.user_id
      ? <Link className="admin-table-link" to={`/users/${row.user_id}`}>{String(value)}</Link>
      : String(value)
  }

  if (column.type === 'userEmailLink') {
    return row.user_id
      ? <Link className="admin-table-link" to={`/users/${row.user_id}`}>{String(value)}</Link>
      : String(value)
  }

  if (column.type === 'pageLink') {
    const href = normalizePageHref(value)

    return (
      <a className="admin-table-link" href={href} target="_blank" rel="noreferrer">
        {String(value)}
      </a>
    )
  }

  if (column.type === 'matchLink' || column.key === 'match_id' || (config.key === 'matches' && column.key === 'id')) {
    return <Link className="admin-table-link" to={`/matches/${value}`}>#{value}</Link>
  }

  if (column.type === 'matchTeamLink' || (config.key === 'matchTeams' && column.key === 'id')) {
    return <Link className="admin-table-link" to={`/matches/teams/${value}`}>#{value}</Link>
  }

  if (column.type === 'datetime') {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  if (column.type === 'boolean') {
    return <span className={`cell-bool cell-bool--${value ? 'yes' : 'no'}`}>{value ? 'Да' : 'Нет'}</span>
  }

  if (column.type === 'avatar') {
    return <TableAvatar src={value} name={row.username || row.nickname || row.user_id} />
  }

  if (column.type === 'deviceInfo') {
    return (
      <span className="admin-device-cell" title={row.user_agent || String(value)}>
        {formatDeviceInfo(value, row.user_agent)}
      </span>
    )
  }

  if (column.type === 'number') {
    return Number(value).toLocaleString('ru-RU')
  }

  if (column.type === 'json') {
    return <code>{JSON.stringify(value)}</code>
  }

  if (column.type === 'badge') {
    return <span className="cell-badge">{String(value)}</span>
  }

  if (column.type === 'inlineStatus') {
    const options = config.statusOptions || ['active', 'inactive']

    if (!onStatusChange) {
      return <span className="cell-badge">{String(value)}</span>
    }

    return (
      <select
        className="admin-inline-status"
        value={String(value)}
        onChange={(event) => onStatusChange(row, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    )
  }

  if (column.type === 'iconSymbol') {
    return <span className="admin-icon-symbol">{String(value)}</span>
  }

  if (typeof value === 'object') {
    return <code>{JSON.stringify(value)}</code>
  }

  return String(value)
}

function TableAvatar({ src, name }) {
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

function normalizePageHref(value) {
  const path = String(value || '/')

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const clientOrigin = getClientOrigin()

  return clientOrigin ? `${clientOrigin}${normalizedPath}` : normalizedPath
}

function getClientOrigin() {
  if (import.meta.env.VITE_CLIENT_URL) {
    return import.meta.env.VITE_CLIENT_URL.replace(/\/+$/, '')
  }

  if (typeof window === 'undefined') {
    return ''
  }

  if (window.location.port === '5174') {
    return `${window.location.protocol}//${window.location.hostname}:5173`
  }

  return window.location.origin
}

function getAssetUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const baseUrl = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname
      ? `http://${window.location.hostname}:8880`
      : 'http://127.0.0.1:8880'
  )

  return `${baseUrl}${value}`
}

function formatDeviceInfo(deviceType, userAgent) {
  const details = parseUserAgent(userAgent)
  const parts = [
    formatDeviceType(deviceType),
    details.os,
    details.browser,
    details.device,
  ].filter(Boolean)

  return parts.length ? parts.join(' · ') : 'Неизвестно'
}

function formatDeviceType(value) {
  const labels = {
    desktop: 'Десктоп',
    mobile: 'Мобилка',
    tablet: 'Планшет',
    bot: 'Бот',
    unknown: 'Неизвестно',
  }

  return labels[value] || String(value || '')
}

function parseUserAgent(userAgent) {
  const value = String(userAgent || '')

  if (!value) {
    return { browser: '', os: '', device: '' }
  }

  const browser = value.includes('Edg/')
    ? 'Edge'
    : value.includes('OPR/') || value.includes('Opera/')
      ? 'Opera'
      : value.includes('Firefox/')
        ? 'Firefox'
        : value.includes('CriOS/') || value.includes('Chrome/')
          ? 'Chrome'
          : value.includes('Version/') && value.includes('Safari/')
            ? 'Safari'
            : value.includes('Safari/')
              ? 'Safari'
              : ''

  const os = value.includes('Windows')
    ? 'Windows'
    : value.includes('Android')
      ? 'Android'
      : value.includes('iPhone') || value.includes('iPad')
        ? 'iOS'
        : value.includes('Mac OS')
          ? 'macOS'
          : value.includes('Linux')
            ? 'Linux'
            : ''

  const device = value.includes('iPhone')
    ? 'iPhone'
    : value.includes('iPad')
      ? 'iPad'
      : /SamsungBrowser|SM-|SAMSUNG/i.test(value)
        ? 'Samsung'
        : value.includes('Macintosh')
          ? 'Mac'
          : ''

  return { browser, os, device }
}
