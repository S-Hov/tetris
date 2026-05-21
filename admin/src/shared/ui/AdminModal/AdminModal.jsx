import { useEffect } from 'react'
import './AdminModal.css'

export function AdminModal({
  actions,
  children,
  isOpen,
  subtitle,
  title,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add('admin-modal-open')

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('admin-modal-open')
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="admin-modal" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="admin-modal__dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-modal__header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button aria-label="Закрыть" className="admin-modal__close" type="button" onClick={onClose}>
            x
          </button>
        </header>
        <div className="admin-modal__body">
          {children}
        </div>
        {actions ? (
          <footer className="admin-modal__footer">
            {actions}
          </footer>
        ) : null}
      </section>
    </div>
  )
}
