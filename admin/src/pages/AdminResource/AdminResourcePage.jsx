import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminDataTable } from '@/entities/adminTable/ui/AdminDataTable.jsx'
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
        </div>
        <span>/api/admin/resources/{config.key}</span>
      </header>

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

      <AdminDataTable
        config={config}
        error={error}
        isLoading={isLoading}
        pagination={data.pagination}
        rows={data.items || []}
        onPageChange={handlePageChange}
      />
    </section>
  )
}
