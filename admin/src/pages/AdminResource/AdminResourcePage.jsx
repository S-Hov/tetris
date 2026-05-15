import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminDataTable } from '@/entities/adminTable/ui/AdminDataTable.jsx'
import { AdminUsersTable } from '@/entities/adminTable/ui/AdminUsersTable.jsx'
import { resourcesAPI } from '@/shared/api/resources'
import { adminResourceConfigs } from '@/shared/config/adminResources.js'
import { notify } from '@/shared/lib/notify.js'
import './AdminResourcePage.css'

const DEFAULT_LIMIT = 25

export function AdminResourcePage({ route }) {
  const config = adminResourceConfigs[route.resourceKey]
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState({ items: [], pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0 } })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

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
        <span>/api/admin/resources/{config.key}</span>
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
          onPageChange={handlePageChange}
        />
      )}
    </section>
  )
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
