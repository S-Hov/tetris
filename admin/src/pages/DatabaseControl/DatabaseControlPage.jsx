import { useEffect, useMemo, useState } from 'react'
import {
  databaseAPI,
  downloadDatabaseBackup,
  downloadDatabaseExport,
} from '@/shared/api/database'
import { notify } from '@/shared/lib/notify.js'
import './DatabaseControlPage.css'

const importModes = [
  { key: 'append', label: 'Добавить строки' },
  { key: 'replace', label: 'Заменить таблицы' },
]

export function DatabaseControlPage() {
  const [control, setControl] = useState({ tables: [], backups: [], stats: {} })
  const [selectedTables, setSelectedTables] = useState([])
  const [importFile, setImportFile] = useState(null)
  const [importMode, setImportMode] = useState('append')
  const [restoreMode, setRestoreMode] = useState('replace')
  const [busyAction, setBusyAction] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let isActive = true

    const loadControl = async () => {
      setBusyAction((current) => current || 'load')

      try {
        const response = await databaseAPI.getControl()

        if (isActive) {
          setControl(response)
          setSelectedTables((current) => current.length > 0 ? current : (response.tables || []).map((table) => table.name))
        }
      } catch (error) {
        notify.error(error.message || 'Не удалось загрузить панель управления БД')
      } finally {
        if (isActive) {
          setBusyAction((current) => current === 'load' ? '' : current)
        }
      }
    }

    loadControl()

    return () => {
      isActive = false
    }
  }, [refreshToken])

  const tables = useMemo(() => control.tables || [], [control.tables])
  const backups = useMemo(() => control.backups || [], [control.backups])
  const selectedSet = useMemo(() => new Set(selectedTables), [selectedTables])
  const selectedStats = useMemo(() => {
    const selected = tables.filter((table) => selectedSet.has(table.name))

    return {
      tables: selected.length,
      rows: selected.reduce((sum, table) => sum + Number(table.rowCount || 0), 0),
      bytes: selected.reduce((sum, table) => sum + Number(table.totalBytes || 0), 0),
    }
  }, [selectedSet, tables])

  const isBusy = Boolean(busyAction)

  const toggleTable = (tableName) => {
    setSelectedTables((current) => current.includes(tableName)
      ? current.filter((name) => name !== tableName)
      : [...current, tableName])
  }

  const selectAll = () => setSelectedTables(tables.map((table) => table.name))
  const clearSelection = () => setSelectedTables([])

  const handleExport = async () => {
    await runAction('export', async () => {
      await downloadDatabaseExport(selectedTables)
      notify.success('Экспорт подготовлен')
    })
  }

  const handleCreateBackup = async () => {
    await runAction('backup', async () => {
      await databaseAPI.createBackup(selectedTables)
      notify.success('Резервная копия создана')
      setRefreshToken((value) => value + 1)
    })
  }

  const handleImport = async () => {
    if (!importFile) {
      notify.error('Выберите JSON-файл резервной копии')
      return
    }

    if (importMode === 'replace' && !window.confirm('Заменить выбранные таблицы данными из файла? Текущие строки будут удалены.')) {
      return
    }

    await runAction('import', async () => {
      const result = await databaseAPI.importBackup(importFile, {
        mode: importMode,
        tables: selectedTables,
      })

      notify.success(`Импортировано строк: ${formatNumber(result.stats?.rowCount)}`)
      setImportFile(null)
      setRefreshToken((value) => value + 1)
    })
  }

  const handleDownloadBackup = async (backup) => {
    await runAction(`download:${backup.fileName}`, async () => {
      await downloadDatabaseBackup(backup.fileName)
    })
  }

  const handleRestoreBackup = async (backup) => {
    const message = restoreMode === 'replace'
      ? `Восстановить резервную копию ${backup.fileName} с заменой таблиц?`
      : `Импортировать резервную копию ${backup.fileName} поверх текущих данных?`

    if (!window.confirm(message)) {
      return
    }

    await runAction(`restore:${backup.fileName}`, async () => {
      const result = await databaseAPI.restoreBackup(backup.fileName, {
        mode: restoreMode,
        tables: selectedTables,
      })

      notify.success(`Восстановлено строк: ${formatNumber(result.stats?.rowCount)}`)
      setRefreshToken((value) => value + 1)
    })
  }

  const handleDeleteBackup = async (backup) => {
    if (!window.confirm(`Удалить резервную копию ${backup.fileName}?`)) {
      return
    }

    await runAction(`delete:${backup.fileName}`, async () => {
      await databaseAPI.deleteBackup(backup.fileName)
      notify.success('Резервная копия удалена')
      setRefreshToken((value) => value + 1)
    })
  }

  const runAction = async (action, callback) => {
    setBusyAction(action)

    try {
      await callback()
    } catch (error) {
      notify.error(error.message || 'Операция с базой данных не выполнена')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="admin-page database-control-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">База данных</p>
          <h1 className="admin-page__title">Контроль и резервные копии</h1>
          <p className="admin-page__description">
            Экспорт, импорт, резервное копирование и восстановление таблиц PostgreSQL из защищенной админской зоны.
          </p>
        </div>
        <div className="admin-page__actions">
          <button className="admin-button" disabled={isBusy} type="button" onClick={() => setRefreshToken((value) => value + 1)}>
            Обновить
          </button>
          <button className="admin-button admin-button--primary" disabled={isBusy || selectedTables.length === 0} type="button" onClick={handleCreateBackup}>
            Создать backup
          </button>
        </div>
      </header>

      <div className="admin-stats-grid database-control-page__stats">
        <StatCard label="Таблиц выбрано" value={formatNumber(selectedStats.tables)} hint={`${formatNumber(tables.length)} всего`} />
        <StatCard label="Строк в выборке" value={formatNumber(selectedStats.rows)} hint="по текущей БД" />
        <StatCard label="Размер выборки" value={formatBytes(selectedStats.bytes)} hint="таблицы и индексы" />
        <StatCard label="Backup-файлов" value={formatNumber(backups.length)} hint="локальное хранилище" />
      </div>

      <div className="database-control-page__grid">
        <section className="admin-panel database-control-page__tables">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Таблицы</h2>
              <p className="admin-panel__caption">Выберите всю базу или конкретные таблицы для операций.</p>
            </div>
            <span>{selectedTables.length}/{tables.length}</span>
          </div>
          <div className="database-control-page__table-actions">
            <button type="button" onClick={selectAll}>Все</button>
            <button type="button" onClick={clearSelection}>Снять</button>
          </div>
          <div className="database-table-picker">
            {tables.map((table) => (
              <label className="database-table-picker__row" key={table.name}>
                <input
                  checked={selectedSet.has(table.name)}
                  type="checkbox"
                  onChange={() => toggleTable(table.name)}
                />
                <span>
                  <strong>{table.name}</strong>
                  <small>{formatNumber(table.rowCount)} строк · {table.totalSize}</small>
                </span>
                <b>{table.columnsCount}</b>
              </label>
            ))}
          </div>
        </section>

        <section className="admin-panel database-control-page__operations">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Операции</h2>
              <p className="admin-panel__caption">Экспортируйте выборку, создавайте backup или импортируйте JSON-файл.</p>
            </div>
          </div>

          <div className="database-operation-list">
            <article className="database-operation">
              <div>
                <strong>Экспорт</strong>
                <span>Скачиваемый JSON со строками выбранных таблиц.</span>
              </div>
              <button disabled={isBusy || selectedTables.length === 0} type="button" onClick={handleExport}>
                Экспортировать
              </button>
            </article>

            <article className="database-operation">
              <div>
                <strong>Резервная копия</strong>
                <span>Файл сохраняется на сервере в хранилище backup-ов.</span>
              </div>
              <button disabled={isBusy || selectedTables.length === 0} type="button" onClick={handleCreateBackup}>
                Создать
              </button>
            </article>

            <article className="database-operation database-operation--import">
              <div>
                <strong>Импорт из файла</strong>
                <span>Поддерживается формат backup-а этой панели.</span>
              </div>
              <div className="database-operation__controls">
                <input
                  accept="application/json,.json"
                  type="file"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                />
                <select value={importMode} onChange={(event) => setImportMode(event.target.value)}>
                  {importModes.map((mode) => (
                    <option key={mode.key} value={mode.key}>{mode.label}</option>
                  ))}
                </select>
                <button disabled={isBusy || !importFile || selectedTables.length === 0} type="button" onClick={handleImport}>
                  Импортировать
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section className="admin-panel database-control-page__backups">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">Резервные копии</h2>
            <p className="admin-panel__caption">Список JSON backup-ов, созданных через админку.</p>
          </div>
          <select className="database-control-page__restore-mode" value={restoreMode} onChange={(event) => setRestoreMode(event.target.value)}>
            {importModes.map((mode) => (
              <option key={mode.key} value={mode.key}>Restore: {mode.label}</option>
            ))}
          </select>
        </div>

        <div className="database-backup-list">
          <div className="database-backup-list__head">
            <span>Файл</span>
            <span>Состав</span>
            <span>Размер</span>
            <span>Создан</span>
            <span />
          </div>
          {backups.length > 0 ? backups.map((backup) => (
            <div className="database-backup-list__row" key={backup.fileName}>
              <span>
                <strong title={backup.fileName}>{backup.fileName}</strong>
                <small>{backup.scope === 'all' ? 'Полная база' : 'Выбранные таблицы'}</small>
              </span>
              <span>{formatNumber(backup.tableCount)} табл. · {formatNumber(backup.rowCount)} строк</span>
              <span>{backup.size}</span>
              <span>{formatDateTime(backup.createdAt)}</span>
              <div>
                <button disabled={isBusy} type="button" onClick={() => handleDownloadBackup(backup)}>Скачать</button>
                <button disabled={isBusy || selectedTables.length === 0} type="button" onClick={() => handleRestoreBackup(backup)}>Restore</button>
                <button className="database-backup-list__danger" disabled={isBusy} type="button" onClick={() => handleDeleteBackup(backup)}>Удалить</button>
              </div>
            </div>
          )) : (
            <div className="admin-panel__empty">Резервные копии пока не созданы</div>
          )}
        </div>
      </section>
    </section>
  )
}

function StatCard({ label, value, hint }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className="admin-stat-card__trend admin-stat-card__trend--neutral">{hint}</small>
    </article>
  )
}

function formatNumber(value = 0) {
  return Number(value || 0).toLocaleString('ru-RU')
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toLocaleString('ru-RU', { maximumFractionDigits: size >= 10 ? 0 : 1 })} ${units[unitIndex]}`
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
