import { useEffect, useMemo, useRef, useState } from 'react'
import { databaseAPI } from '@/shared/api/database'
import { notify } from '@/shared/lib/notify.js'
import './DatabaseSchemaPage.css'

const STORAGE_KEY = 'pvp-tetris-admin:database-schema-layout:v1'
const CARD_WIDTH = 286
const CARD_HEADER_HEIGHT = 56
const FIELD_HEIGHT = 34

const categories = [
  { key: 'all', label: 'Все таблицы', matcher: () => true },
  { key: 'users', label: 'Пользователи', matcher: (name) => ['users', 'roles', 'accounts', 'auth_logs', 'email_verifications', 'user_sessions'].includes(name) },
  { key: 'games', label: 'Игры', matcher: (name) => name.startsWith('match_') || name === 'matches' || name.startsWith('game_') },
  { key: 'rating', label: 'Рейтинг', matcher: (name) => ['user_rank_stats', 'rating_history'].includes(name) },
  { key: 'support', label: 'Поддержка', matcher: (name) => name.startsWith('support_') },
  { key: 'donations', label: 'Донаты', matcher: (name) => name.startsWith('donation') },
  { key: 'analytics', label: 'Аналитика', matcher: (name) => ['site_visit_events', 'game_activity_events', 'admin_audit_logs'].includes(name) },
  { key: 'system', label: 'Система', matcher: (name) => ['schema_migrations'].includes(name) },
]

export function DatabaseSchemaPage() {
  const [schema, setSchema] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [positions, setPositions] = useState({})
  const [drag, setDrag] = useState(null)
  const designerRef = useRef(null)

  useEffect(() => {
    let isActive = true

    const loadSchema = async () => {
      setIsLoading(true)

      try {
        const response = await databaseAPI.getSchema()

        if (isActive) {
          setSchema(response)
          setPositions(loadStoredPositions(response.tables || []))
        }
      } catch (error) {
        notify.error(error.message || 'Не удалось загрузить схему базы данных')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadSchema()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!schema?.tables?.length) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  }, [positions, schema])

  useEffect(() => {
    if (!drag) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const rect = designerRef.current?.getBoundingClientRect()

      if (!rect) {
        return
      }

      setPositions((current) => ({
        ...current,
        [drag.table]: {
          x: Math.max(16, event.clientX - rect.left - drag.offsetX + designerRef.current.scrollLeft),
          y: Math.max(16, event.clientY - rect.top - drag.offsetY + designerRef.current.scrollTop),
        },
      }))
    }

    const handlePointerUp = () => setDrag(null)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [drag])

  const tables = useMemo(() => schema?.tables || [], [schema])
  const relationships = useMemo(() => schema?.relationships || [], [schema])
  const query = search.trim().toLowerCase()
  const activeMatcher = categories.find((category) => category.key === activeCategory)?.matcher || categories[0].matcher

  const tableMeta = useMemo(() => {
    const meta = new Map()

    tables.forEach((table) => {
      const position = positions[table.name] || { x: 0, y: 0 }
      const height = CARD_HEADER_HEIGHT + Math.max(1, table.columns.length) * FIELD_HEIGHT + 18
      const matchesSearch = !query || table.name.toLowerCase().includes(query) || table.columns.some((column) => column.name.toLowerCase().includes(query))
      const matchesCategory = activeMatcher(table.name)

      meta.set(table.name, {
        ...position,
        width: CARD_WIDTH,
        height,
        dimmed: !matchesSearch || !matchesCategory,
        highlighted: Boolean(query && matchesSearch),
      })
    })

    return meta
  }, [activeMatcher, positions, query, tables])

  const canvasSize = useMemo(() => {
    let width = 1280
    let height = 760

    tableMeta.forEach((meta) => {
      width = Math.max(width, meta.x + meta.width + 96)
      height = Math.max(height, meta.y + meta.height + 96)
    })

    return { width, height }
  }, [tableMeta])

  const categoryStats = useMemo(() => categories.map((category) => ({
    ...category,
    count: tables.filter((table) => category.matcher(table.name)).length,
  })), [tables])

  const handleDragStart = (event, tableName) => {
    const position = positions[tableName]
    const rect = designerRef.current?.getBoundingClientRect()

    if (!position || !rect) {
      return
    }

    setDrag({
      table: tableName,
      offsetX: event.clientX - rect.left + designerRef.current.scrollLeft - position.x,
      offsetY: event.clientY - rect.top + designerRef.current.scrollTop - position.y,
    })
  }

  const resetLayout = () => {
    const nextPositions = buildDefaultPositions(tables)
    setPositions(nextPositions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPositions))
  }

  return (
    <section className="admin-page database-schema-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">База данных</p>
          <h1 className="admin-page__title">Схема PostgreSQL</h1>
          <p className="admin-page__description">
            Интерактивная карта таблиц, ключей и внешних связей. Расположение карточек сохраняется локально в браузере.
          </p>
        </div>
        <div className="admin-page__actions">
          <button className="admin-button" type="button" onClick={resetLayout} disabled={isLoading || tables.length === 0}>
            Сбросить позиции
          </button>
          <button className="admin-button admin-button--primary" type="button" onClick={() => window.location.reload()}>
            Обновить
          </button>
        </div>
      </header>

      <div className="admin-stats-grid database-schema-page__stats">
        <StatCard label="Таблиц" value={isLoading ? '...' : formatNumber(schema?.stats?.tableCount)} hint="public schema" />
        <StatCard label="Записей" value={isLoading ? '...' : formatNumber(schema?.stats?.rowCount)} hint="точный COUNT" />
        <StatCard label="Связей" value={isLoading ? '...' : formatNumber(schema?.stats?.relationshipCount)} hint="foreign keys" />
        <StatCard label="Вес БД" value={isLoading ? '...' : formatBytes(schema?.stats?.totalBytes)} hint="таблицы и индексы" />
      </div>

      <section className="admin-panel database-schema-page__designer">
        <div className="database-schema-page__designer-header">
          <div>
            <h2 className="admin-panel__title">Дизайнер базы</h2>
            <p className="admin-panel__caption">Перетаскивайте таблицы мышью, ищите поля и подсвечивайте доменные группы.</p>
          </div>
          <div className="admin-toolbar database-schema-page__toolbar">
            <input
              aria-label="Поиск по таблицам и полям"
              placeholder="Поиск таблицы или поля"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="database-schema-page__categories" aria-label="Категории таблиц">
          {categoryStats.map((category) => (
            <button
              className={activeCategory === category.key ? 'is-active' : ''}
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
            >
              <span>{category.label}</span>
              <b>{category.count}</b>
            </button>
          ))}
        </div>

        <div className="database-designer" ref={designerRef}>
          {isLoading ? (
            <div className="database-designer__state">Загружаем структуру базы данных...</div>
          ) : (
            <div className="database-designer__canvas" style={{ width: canvasSize.width, height: canvasSize.height }}>
              <RelationshipLayer relationships={relationships} tableMeta={tableMeta} />
              {tables.map((table) => {
                const meta = tableMeta.get(table.name)

                return (
                  <DatabaseTableCard
                    key={table.name}
                    meta={meta}
                    table={table}
                    onDragStart={handleDragStart}
                  />
                )
              })}
            </div>
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

function RelationshipLayer({ relationships, tableMeta }) {
  return (
    <svg className="database-relationships" aria-hidden="true">
      <defs>
        <marker id="database-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="8" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" />
        </marker>
      </defs>
      {relationships.map((relationship) => {
        const from = tableMeta.get(relationship.fromTable)
        const to = tableMeta.get(relationship.toTable)

        if (!from || !to) {
          return null
        }

        const start = getAnchor(from, to)
        const end = getAnchor(to, from)
        const controlOffset = Math.max(80, Math.abs(end.x - start.x) * 0.42)
        const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
        const dimmed = from.dimmed || to.dimmed

        return (
          <g className={dimmed ? 'is-dimmed' : ''} key={relationship.name}>
            <path d={path} />
            <title>{`${relationship.fromTable}.${relationship.fromColumns.join(', ')} -> ${relationship.toTable}.${relationship.toColumns.join(', ')}`}</title>
          </g>
        )
      })}
    </svg>
  )
}

function DatabaseTableCard({ table, meta, onDragStart }) {
  if (!meta) {
    return null
  }

  return (
    <article
      className={`database-table-card ${meta.dimmed ? 'is-dimmed' : ''} ${meta.highlighted ? 'is-highlighted' : ''}`}
      style={{ transform: `translate(${meta.x}px, ${meta.y}px)` }}
    >
      <header className="database-table-card__header" onPointerDown={(event) => onDragStart(event, table.name)}>
        <div>
          <h3>{table.name}</h3>
          <span>{formatNumber(table.rowCount)} записей · {table.totalSize}</span>
        </div>
        <b>{table.columns.length}</b>
      </header>
      <div className="database-table-card__fields">
        {table.columns.map((column) => (
          <div className="database-table-card__field" key={column.name}>
            <div>
              <strong>{column.name}</strong>
              <span>{column.type}</span>
            </div>
            <div className="database-table-card__badges">
              {column.primaryKey && <i className="database-table-card__badge database-table-card__badge--pk">PK</i>}
              {column.foreignKey && <i className="database-table-card__badge database-table-card__badge--fk">FK</i>}
              {column.unique && <i className="database-table-card__badge database-table-card__badge--unique">UQ</i>}
              {!column.nullable && <i className="database-table-card__badge">NN</i>}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function getAnchor(source, target) {
  const sourceCenterX = source.x + source.width / 2
  const sourceCenterY = source.y + source.height / 2
  const targetCenterX = target.x + target.width / 2
  const targetCenterY = target.y + target.height / 2
  const useHorizontal = Math.abs(targetCenterX - sourceCenterX) >= Math.abs(targetCenterY - sourceCenterY)

  if (useHorizontal) {
    return {
      x: targetCenterX > sourceCenterX ? source.x + source.width : source.x,
      y: sourceCenterY,
    }
  }

  return {
    x: sourceCenterX,
    y: targetCenterY > sourceCenterY ? source.y + source.height : source.y,
  }
}

function loadStoredPositions(tables) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const tableNames = new Set(tables.map((table) => table.name))
    const hasAllTables = tables.every((table) => stored[table.name])

    if (hasAllTables) {
      return Object.fromEntries(Object.entries(stored).filter(([tableName]) => tableNames.has(tableName)))
    }
  } catch {
    // Ignore broken localStorage values and rebuild the layout.
  }

  return buildDefaultPositions(tables)
}

function buildDefaultPositions(tables) {
  const groupedTables = categories
    .filter((category) => category.key !== 'all')
    .flatMap((category) => tables.filter((table) => category.matcher(table.name)))
  const used = new Set()
  const orderedTables = [
    ...groupedTables.filter((table) => {
      if (used.has(table.name)) return false
      used.add(table.name)
      return true
    }),
    ...tables.filter((table) => !used.has(table.name)),
  ]

  return Object.fromEntries(orderedTables.map((table, index) => {
    const column = index % 4
    const row = Math.floor(index / 4)

    return [
      table.name,
      {
        x: 24 + column * 344,
        y: 24 + row * 360,
      },
    ]
  }))
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
