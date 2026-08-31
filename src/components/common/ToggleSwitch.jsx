const ToggleSwitch = ({
  enabled,
  onChange,
  disabled = false,
  label,
  description,
  id,
}) => {
  const switchId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {label && (
          <label htmlFor={switchId} className="text-sm font-medium text-gray-100">
            {label}
          </label>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        )}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${enabled ? "bg-indigo-600" : "bg-gray-600"}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
