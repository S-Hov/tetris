export function AdminDataTable({
  config,
  rows,
  pagination,
  isLoading,
  error,
  onPageChange,
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
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableState colSpan={config.columns.length} text="Загружаем данные..." />
            ) : error ? (
              <TableState colSpan={config.columns.length} text={error} />
            ) : rows.length === 0 ? (
              <TableState colSpan={config.columns.length} text="Данных пока нет" />
            ) : (
              rows.map((row, index) => (
                <tr key={row.id ?? row.name ?? `${config.key}-${index}`}>
                  {config.columns.map((column) => (
                    <td key={column.key} className={column.truncate ? 'is-truncated' : ''}>
                      {formatCell(row[column.key], column)}
                    </td>
                  ))}
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

function formatCell(value, column) {
  if (value === null || value === undefined || value === '') {
    return <span className="cell-muted">-</span>
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

  if (column.type === 'number') {
    return Number(value).toLocaleString('ru-RU')
  }

  if (column.type === 'json') {
    return <code>{JSON.stringify(value)}</code>
  }

  if (column.type === 'badge') {
    return <span className="cell-badge">{String(value)}</span>
  }

  if (typeof value === 'object') {
    return <code>{JSON.stringify(value)}</code>
  }

  return String(value)
}
