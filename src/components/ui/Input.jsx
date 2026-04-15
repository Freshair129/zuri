'use client';

export default function Input({
  label,
  id,
  error,
  icon: Icon,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <input
          id={id}
          className={`
            block w-full rounded-lg border bg-white text-sm text-gray-900
            placeholder:text-gray-400 transition-colors
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}
            ${Icon ? 'pl-10 pr-3 py-2' : 'px-3 py-2'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
