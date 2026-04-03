import { formatNumber } from '../../utils/formatters';

export function ClickRayBadge({ count }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
      {formatNumber(count)} clickrays
    </span>
  );
}
