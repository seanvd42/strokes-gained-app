interface CategoryBadgeProps {
  name: string;
  color: string;
}

export function CategoryBadge({ name, color }: CategoryBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
