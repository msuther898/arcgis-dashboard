export function ContentFilters({ filters, onFilterChange, owners = [], types = [] }) {
  const { hasClickrays, type, sharing, owner, search } = filters;

  const hasActiveFilters = hasClickrays || type || sharing || owner || search;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="text"
        placeholder="Search by name..."
        value={search || ''}
        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <select
        value={owner || ''}
        onChange={(e) =>
          onFilterChange({ ...filters, owner: e.target.value || null })
        }
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Owners</option>
        {owners.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <select
        value={type || ''}
        onChange={(e) =>
          onFilterChange({ ...filters, type: e.target.value || null })
        }
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={sharing || ''}
        onChange={(e) =>
          onFilterChange({ ...filters, sharing: e.target.value || null })
        }
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Sharing</option>
        <option value="public">Public</option>
        <option value="org">Organization</option>
        <option value="private">Private</option>
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={hasClickrays || false}
          onChange={(e) =>
            onFilterChange({ ...filters, hasClickrays: e.target.checked })
          }
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Has ClickRays
      </label>

      {hasActiveFilters && (
        <button
          onClick={() =>
            onFilterChange({
              hasClickrays: false,
              type: null,
              sharing: null,
              owner: null,
              search: '',
            })
          }
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
