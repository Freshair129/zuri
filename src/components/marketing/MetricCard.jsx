import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({
  label,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendLabel,
  icon: Icon,
  className = '',
}) {
  const isPositive = trend > 0;
  const isNeutral = trend === 0 || trend == null;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Icon className="h-5 w-5 text-indigo-600" />
          </div>
        )}
      </div>

      <p className="text-3xl font-bold text-gray-900 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>

      {trend != null && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isNeutral ? 'text-gray-400' : isPositive ? 'text-green-600' : 'text-red-500'
        }`}>
          {isNeutral ? (
            <Minus className="h-4 w-4" />
          ) : isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : ''}{trend}%
            {trendLabel && <span className="text-gray-400 font-normal ml-1">{trendLabel}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
