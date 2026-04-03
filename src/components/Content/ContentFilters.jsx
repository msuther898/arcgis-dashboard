export function ContentFilters({ filters, onFilterChange, owners = [], types = [] }) {
  const { hasClickrays, type, sharing, owner, search, archiveCandidates, showArchived } = filters;

  const hasActiveFilters = hasClickrays || type || sharing || owner || search || archiveCandidates || showArchived;

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

      <label className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer">
        <input
          type="checkbox"
          checked={archiveCandidates || false}
          onChange={(e) =>
            onFilterChange({ ...filters, archiveCandidates: e.target.checked })
          }
          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
        />
        💾 Archive Candidates
      </label>

      <label className="flex items-center gap-2 text-sm text-purple-700 cursor-pointer">
        <input
          type="checkbox"
          checked={showArchived || false}
          onChange={(e) =>
            onFilterChange({ ...filters, showArchived: e.target.checked })
          }
          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
        />
        📦 Archived to MinIO
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
              archiveCandidates: false,
              showArchived: false,
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
