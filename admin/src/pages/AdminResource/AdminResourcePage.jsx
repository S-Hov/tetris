import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminDataTable } from '@/entities/adminTable/ui/AdminDataTable.jsx'
import { AdminUsersTable } from '@/entities/adminTable/ui/AdminUsersTable.jsx'
import { resourcesAPI } from '@/shared/api/resources'
import { adminResourceConfigs } from '@/shared/config/adminResources.js'
import { AdminModal } from '@/shared/ui/AdminModal'
import { notify } from '@/shared/lib/notify.js'
import './AdminResourcePage.css'

const DEFAULT_LIMIT = 25
const EDITOR_FILE_PREFIX = '__file_'

export function AdminResourcePage({ route }) {
  const config = adminResourceConfigs[route.resourceKey]
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState({ items: [], pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0 } })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [editorRow, setEditorRow] = useState(null)
  const [editorMode, setEditorMode] = useState('create')
  const [isSaving, setIsSaving] = useState(false)
  const [isRunningMigrations, setIsRunningMigrations] = useState(false)
  const [suggestions, setSuggestions] = useState({})

  const queryString = searchParams.toString()
  const query = useMemo(() => Object.fromEntries(new URLSearchParams(queryString).entries()), [queryString])

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await resourcesAPI.getList(config.key, {
          limit: DEFAULT_LIMIT,
          ...query,
        })

        if (isActive) {
          setData(response)
        }
      } catch (requestError) {
        const message = requestError.message || 'Не удалось загрузить данные'

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

    load()

    return () => {
      isActive = false
    }
  }, [config.key, query, refreshToken])

  useEffect(() => {
    const sources = Array.from(new Set((config.editorFields || [])
      .map((field) => field.suggestionSource)
      .filter(Boolean)))

    if (sources.length === 0) {
      return undefined
    }

    let isActive = true

    const loadSuggestions = async () => {
      try {
        const entries = await Promise.all(sources.map(async (source) => {
          const response = await resourcesAPI.getList(source, { limit: 100 })

          return [source, response.items || []]
        }))

        if (isActive) {
          setSuggestions(Object.fromEntries(entries))
        }
      } catch (requestError) {
        if (isActive) {
          notify.error(requestError.message || 'Не удалось загрузить подсказки справочников')
        }
      }
    }

    loadSuggestions()

    return () => {
      isActive = false
    }
  }, [config.editorFields])

  const setParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams)

    if (value) {
      nextParams.set(key, value)
    } else {
      nextParams.delete(key)
    }

    nextParams.set('page', '1')
    setSearchParams(nextParams)
  }

  const clearAdvancedFilters = () => {
    const nextParams = new URLSearchParams(searchParams)

    ;(config.advancedFilters || []).forEach((filter) => nextParams.delete(filter.key))
    nextParams.delete('search')
    nextParams.set('page', '1')
    setSearchParams(nextParams)
  }

  const handlePageChange = (page) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(page))
    setSearchParams(nextParams)
  }

  const resourceIdKey = config.idKey || config.primaryKey || 'id'

  const handleCreateClick = () => {
    setEditorMode('create')
    setEditorRow(createEmptyEditorRow(config))
  }

  const handleEditClick = (row) => {
    setEditorMode('edit')
    setEditorRow(createEditorRow(config, row))
  }

  const handleEditorChange = (key, value, option = null) => {
    setEditorRow((current) => ({
      ...(current || {}),
      [key]: value,
      ...(key === 'currency_network_id' && option
        ? {
          currency_code: option.currency_code || current?.currency_code || '',
          network_key: option.network_key || current?.network_key || '',
          network_name: option.network_name || option.network_key || current?.network_name || '',
        }
        : {}),
    }))
  }

  const handleEditorFileChange = (key, file) => {
    setEditorRow((current) => ({
      ...(current || {}),
      [`${EDITOR_FILE_PREFIX}${key}`]: file,
    }))
  }

  const handleEditorCancel = () => {
    setEditorRow(null)
    setEditorMode('create')
  }

  const handleEditorSubmit = async (event) => {
    event.preventDefault()

    if (!editorRow) {
      return
    }

    setIsSaving(true)

    try {
      const rowWithUploads = await uploadEditorFiles(config, editorRow)

      if (editorMode === 'edit') {
        await resourcesAPI.updateItem(config.key, rowWithUploads[resourceIdKey], buildEditorPayload(config, rowWithUploads))
        notify.success('Запись обновлена')
      } else {
        await resourcesAPI.createItem(config.key, buildEditorPayload(config, rowWithUploads))
        notify.success('Запись добавлена')
      }

      setEditorRow(null)
      setRefreshToken((value) => value + 1)
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось сохранить запись')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (row, status) => {
    try {
      await resourcesAPI.updateItemStatus(config.key, row[resourceIdKey], status)
      notify.success('Статус обновлён')
      setRefreshToken((value) => value + 1)
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось обновить статус')
    }
  }

  const handleDelete = async (row) => {
    const label = row.name || row.code || row.key || row.id

    if (!window.confirm(`Удалить запись «${label}»?`)) {
      return
    }

    try {
      await resourcesAPI.deleteItem(config.key, row[resourceIdKey])
      notify.success('Запись удалена')
      setRefreshToken((value) => value + 1)
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось удалить запись')
    }
  }

  const handleRunMigrations = async () => {
    setIsRunningMigrations(true)

    try {
      const result = await resourcesAPI.runMigrations()
      const appliedCount = result.applied?.length || 0
      const baselineCount = result.baseline?.length || 0

      if (appliedCount > 0) {
        notify.success(`Выполнено миграций: ${appliedCount}`)
      } else if (baselineCount > 0) {
        notify.success(`Зафиксировано базовых миграций: ${baselineCount}`)
      } else {
        notify.success('Новых миграций нет')
      }

      setRefreshToken((value) => value + 1)
    } catch (requestError) {
      notify.error(requestError.message || 'Не удалось выполнить миграции')
    } finally {
      setIsRunningMigrations(false)
    }
  }

  const isMigrationsResource = config.key === 'migrations'

  return (
    <section className="admin-page admin-resource-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">{config.section}</p>
          <h1 className="admin-page__title">{config.title}</h1>
          <p className="admin-page__description">
            {config.description || `Раздел показывает записи ресурса «${config.title}» и помогает быстро искать, фильтровать и проверять данные.`}
          </p>
        </div>
        <div className="admin-page__actions">
          {isMigrationsResource ? (
            <button
              className="admin-button admin-button--primary"
              disabled={isLoading || isRunningMigrations}
              type="button"
              onClick={handleRunMigrations}
            >
              {isRunningMigrations ? 'Выполняем миграции...' : 'Проверить и выполнить миграции'}
            </button>
          ) : null}
          <span>/api/admin/resources/{config.key}</span>
        </div>
      </header>

      {config.advancedFilters ? (
        <AdvancedFilters
          filters={config.advancedFilters}
          isLoading={isLoading}
          searchParams={searchParams}
          onClear={clearAdvancedFilters}
          onRefresh={() => setRefreshToken((value) => value + 1)}
          onSetParam={setParam}
        />
      ) : (
      <div className="admin-toolbar">
        <input
          aria-label="Поиск"
          onChange={(event) => setParam('search', event.target.value)}
          placeholder="Поиск"
          type="search"
          value={searchParams.get('search') || ''}
        />
        {(config.filters || []).map((filter) => (
          <select
            aria-label={filter.label}
            key={filter.key}
            onChange={(event) => setParam(filter.key, event.target.value)}
            value={searchParams.get(filter.key) || ''}
          >
            <option value="">{filter.label}: все</option>
            {filter.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ))}
        <button
          className="admin-button admin-button--primary"
          disabled={isLoading}
          type="button"
          onClick={() => setRefreshToken((value) => value + 1)}
        >
          Обновить данные
        </button>
      </div>
      )}

      {config.editable ? (
        <EditableResourcePanel
          config={config}
          isSaving={isSaving}
          mode={editorMode}
          row={editorRow}
          suggestions={suggestions}
          onCancel={handleEditorCancel}
          onChange={handleEditorChange}
          onCreate={handleCreateClick}
          onFileChange={handleEditorFileChange}
          onSubmit={handleEditorSubmit}
        />
      ) : null}

      {config.key === 'users' ? (
        <AdminUsersTable
          error={error}
          isLoading={isLoading}
          pagination={data.pagination}
          rows={data.items || []}
          onChanged={() => setRefreshToken((value) => value + 1)}
          onPageChange={handlePageChange}
        />
      ) : (
        <AdminDataTable
          config={config}
          error={error}
          isLoading={isLoading}
          pagination={data.pagination}
          rows={data.items || []}
          onStatusChange={config.editable ? handleStatusChange : undefined}
          onPageChange={handlePageChange}
          renderActions={config.editable ? (row) => (
            <div className="admin-resource-actions">
              <button type="button" onClick={() => handleEditClick(row)}>Изм.</button>
              <button className="admin-resource-actions__danger" type="button" onClick={() => handleDelete(row)}>Удалить</button>
            </div>
          ) : undefined}
        />
      )}
    </section>
  )
}

function EditableResourcePanel({ config, row, mode, isSaving, suggestions, onCancel, onChange, onCreate, onFileChange, onSubmit }) {
  if (!config.editorFields?.length) {
    return null
  }

  if (!row) {
    return (
      <section className="admin-resource-editor admin-resource-editor--closed">
        <div>
          <strong>Управление справочником</strong>
          <span>Добавляйте записи, редактируйте строки и переключайте статус прямо в таблице.</span>
        </div>
        <button className="admin-button admin-button--primary" type="button" onClick={onCreate}>
          Добавить запись
        </button>
      </section>
    )
  }

  const formId = `admin-resource-editor-${config.key}`

  return (
    <AdminModal
      actions={(
        <>
          <button type="button" onClick={onCancel}>Отмена</button>
          <button className="admin-button--primary" disabled={isSaving} form={formId} type="submit">
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </>
      )}
      isOpen={Boolean(row)}
      subtitle={config.title}
      title={mode === 'edit' ? 'Редактирование записи' : 'Новая запись'}
      onClose={isSaving ? undefined : onCancel}
    >
      <form className="admin-resource-editor admin-resource-editor--modal" id={formId} onSubmit={onSubmit}>
        <div className="admin-resource-editor__grid">
          {config.editorFields.map((field) => (
            <label className="admin-resource-editor__field" key={field.key}>
              <span>{field.label}</span>
              <EditorInput
                field={field}
                file={row[`${EDITOR_FILE_PREFIX}${field.key}`]}
                suggestions={suggestions[field.suggestionSource] || []}
                value={row[field.key]}
                onChange={(value, option) => onChange(field.key, value, option)}
                onFileChange={(file) => onFileChange(field.key, file)}
              />
            </label>
          ))}
        </div>
      </form>
    </AdminModal>
  )
}

function EditorInput({ field, file, suggestions, value, onChange, onFileChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    if (!previewUrl) {
      return undefined
    }

    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  if (field.type === 'select') {
    return (
      <select value={value ?? ''} required={field.required} onChange={(event) => onChange(event.target.value)}>
        {field.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    )
  }

  if (field.type === 'suggest') {
    const options = buildSuggestionOptions(field, suggestions)
    const normalizedValue = String(value ?? '')
    const visibleOptions = options
      .filter((option) => {
        const needle = normalizedValue.toLowerCase()

        return !needle || option.search.includes(needle)
      })
      .slice(0, 8)

    return (
      <div className="admin-suggest-field">
        <input
          autoComplete="off"
          placeholder={field.placeholder || ''}
          required={field.required}
          type="text"
          value={normalizedValue}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            onChange(event.target.value, null)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isOpen && visibleOptions.length > 0 ? (
          <div className="admin-suggest-field__menu">
            {visibleOptions.map((option) => (
              <button
                key={`${field.key}-${option.value}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value, option.item)
                  setIsOpen(false)
                }}
              >
                <strong>{option.value}</strong>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <input
        checked={Boolean(value)}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        placeholder={field.placeholder || ''}
        required={field.required}
        rows={3}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === 'image') {
    const assetUrl = previewUrl || getAdminAssetUrl(value)

    return (
      <div className="admin-image-field">
        {assetUrl ? (
          <span className="admin-image-field__preview">
            <img src={assetUrl} alt="" />
          </span>
        ) : (
          <span className="admin-image-field__empty">Нет изображения</span>
        )}
        <input
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
          type="file"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
        <input
          placeholder={field.placeholder || ''}
          type="text"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    )
  }

  return (
    <input
      placeholder={field.placeholder || ''}
      required={field.required}
      type={field.type || 'text'}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function buildSuggestionOptions(field, rows = []) {
  return rows.map((row) => {
    const value = String(row[field.suggestionValue] ?? '')
    const label = getSuggestionLabel(field, row)

    return {
      item: row,
      label,
      search: `${value} ${label}`.toLowerCase(),
      value,
    }
  }).filter((option) => option.value)
}

function getSuggestionLabel(field, row) {
  if (field.suggestionLabel === 'pairLabel') {
    const currency = row.currency_name ? `${row.currency_code} (${row.currency_name})` : row.currency_code
    const network = row.network_name ? `${row.network_name} (${row.network_key})` : row.network_key
    const standard = row.token_standard ? ` · ${row.token_standard}` : ''

    return `${currency} · ${network}${standard}`
  }

  const labelValue = row[field.suggestionLabel]

  if (!labelValue) {
    return ''
  }

  return field.suggestionValue && row[field.suggestionValue]
    ? `${labelValue}`
    : String(labelValue)
}

function createEmptyEditorRow(config) {
  return Object.fromEntries((config.editorFields || []).map((field) => [
    field.key,
    field.defaultValue ?? (field.type === 'checkbox' ? false : ''),
  ]))
}

function createEditorRow(config, row) {
  const idKey = config.idKey || config.primaryKey || 'id'
  const editorRow = Object.fromEntries((config.editorFields || []).map((field) => [
    field.key,
    row[field.key] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : ''),
  ]))

  editorRow[idKey] = row[idKey]

  return editorRow
}

function buildEditorPayload(config, row) {
  return Object.fromEntries((config.editorFields || []).map((field) => [field.key, row[field.key]]))
}

async function uploadEditorFiles(config, row) {
  let nextRow = row
  const uploadFields = (config.editorFields || []).filter((field) => field.upload)

  for (const field of uploadFields) {
    const file = nextRow?.[`${EDITOR_FILE_PREFIX}${field.key}`]

    if (!file) {
      continue
    }

    const response = await resourcesAPI.uploadResourceFile(config.key, field.key, file)
    nextRow = {
      ...nextRow,
      [field.key]: response.url,
    }
  }

  return nextRow
}

function getAdminAssetUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const baseUrl = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname
      ? `http://${window.location.hostname}:8880`
      : 'http://127.0.0.1:8880'
  )

  return `${baseUrl}${value}`
}

function AdvancedFilters({ filters, isLoading, searchParams, onClear, onRefresh, onSetParam }) {
  const activeCount = filters.filter((filter) => searchParams.get(filter.key)).length

  return (
    <section className="admin-advanced-filters">
      <div className="admin-advanced-filters__header">
        <div>
          <strong>Фильтры</strong>
          <span>{activeCount ? `Активно: ${activeCount}` : 'Можно комбинировать несколько условий'}</span>
        </div>
        <div>
          <button type="button" onClick={onClear}>Сбросить</button>
          <button className="admin-button--primary" disabled={isLoading} type="button" onClick={onRefresh}>
            Обновить
          </button>
        </div>
      </div>
      <div className="admin-advanced-filters__grid">
        {filters.map((filter) => (
          <label className="admin-advanced-filters__field" key={filter.key}>
            <span>{filter.label}</span>
            {filter.type === 'select' ? (
              <select
                value={searchParams.get(filter.key) || ''}
                onChange={(event) => onSetParam(filter.key, event.target.value)}
              >
                <option value="">Все</option>
                {filter.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                placeholder={filter.placeholder || ''}
                type={filter.type || 'text'}
                value={searchParams.get(filter.key) || ''}
                onChange={(event) => onSetParam(filter.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </section>
  )
}
