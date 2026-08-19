export default function Modal({ title, children, onClose, onConfirm, confirmLabel = '确认', danger = false }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>取消</button>
            <button
              className={`btn ${danger ? 'btn-ghost' : 'btn-primary'}`}
              style={danger ? { color: '#e08080', borderColor: '#8a3030' } : {}}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
