import {
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
}) {
  const isPositive = trend === 'up';

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-title">
          {title}
        </span>

        <div className="stat-card-icon">
          <Icon size={19} />
        </div>
      </div>

      <h2 className="stat-card-value">
        {value}
      </h2>

      <div className="stat-card-bottom">
        <span
          className={`stat-change ${
            isPositive ? 'positive' : 'negative'
          }`}
        >
          {isPositive ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}

          {change}
        </span>

        <span className="stat-description">
          {description}
        </span>
      </div>
    </div>
  );
}

export default StatCard;