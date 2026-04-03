import { useState } from 'react';
import { useGroupMembers } from '../../hooks/useGroups';

function GroupItem({ group, token, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const { data: members, isLoading } = useGroupMembers(
    token,
    expanded ? group.id : null
  );

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => onSelect(group.id)}
      >
        <button
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="text-sm font-medium text-gray-700 truncate flex-1">
          {group.title}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {group.memberCount || 0}
        </span>
      </div>

      {expanded && (
        <div className="bg-gray-50 px-4 py-2">
          {isLoading ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-1">
              {members?.owner && (
                <div className="text-xs text-gray-600">
                  <span className="text-gray-400">Owner:</span> {members.owner}
                </div>
              )}
              {members?.admins?.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="text-gray-400">Admins:</span>{' '}
                  {members.admins.join(', ')}
                </div>
              )}
              {members?.users?.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="text-gray-400">Members:</span>{' '}
                  {members.users.slice(0, 5).join(', ')}
                  {members.users.length > 5 && ` +${members.users.length - 5} more`}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GroupList({ groups, token, selectedGroup, onSelectGroup }) {
  return (
    <div className="py-2">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Groups
      </div>

      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
          !selectedGroup ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => onSelectGroup(null)}
      >
        <span className="w-5 h-5 flex items-center justify-center text-gray-400">
          📁
        </span>
        <span className="text-sm font-medium text-gray-700">All Content</span>
      </div>

      {groups?.map((group) => (
        <GroupItem
          key={group.id}
          group={group}
          token={token}
          isSelected={selectedGroup === group.id}
          onSelect={onSelectGroup}
        />
      ))}
    </div>
  );
}
