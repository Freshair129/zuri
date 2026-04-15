const colorClasses = {
  green: 'bg-green-100 text-green-700 ring-green-600/20',
  red: 'bg-red-100 text-red-700 ring-red-600/20',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  blue: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  purple: 'bg-purple-100 text-purple-700 ring-purple-600/20',
  orange: 'bg-orange-100 text-orange-700 ring-orange-600/20',
};

export default function Badge({
  children,
  color = 'gray',
  dot = false,
  className = '',
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5
        text-xs font-medium ring-1 ring-inset
        ${colorClasses[color] || colorClasses.gray}
        ${className}
      `}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full bg-current`} />
      )}
      {children}
    </span>
  );
}
