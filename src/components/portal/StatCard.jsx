export function StatCard({ icon, label, value, className = '' }) {
  return (
    <article className={`stat-card ${className}`}>
      <div className="stat-card__content">
        <div className="stat-card__info">
          <div className="stat-card__icon" aria-hidden="true">
            {icon}
          </div>
          <span className="stat-card__label">{label}</span>
        </div>
        <span className="stat-card__value">{value}</span>
      </div>
    </article>
  )
}
