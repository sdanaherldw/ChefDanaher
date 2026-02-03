interface SkeletonProps {
  className?: string;
}

export function SkeletonText({ className = '' }: SkeletonProps & { variant?: 'short' | 'medium' | 'full' }) {
  return <div className={`skeleton skeleton-text ${className}`} />;
}

export function SkeletonRecipeCard() {
  return (
    <div className="skeleton-recipe-card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-meta" />
      <div className="skeleton-tags">
        <div className="skeleton skeleton-tag" />
        <div className="skeleton skeleton-tag" />
      </div>
    </div>
  );
}

export function SkeletonDayCard() {
  return (
    <div className="skeleton-day-card">
      <div className="skeleton skeleton-header" />
      <div className="skeleton skeleton-date" />
      <div className="skeleton skeleton-content" />
    </div>
  );
}

export function SkeletonGrocerySection() {
  return (
    <div className="skeleton-grocery-section">
      <div className="skeleton skeleton-section-title" />
      <div className="skeleton skeleton-item" style={{ width: '80%' }} />
      <div className="skeleton skeleton-item" style={{ width: '65%' }} />
      <div className="skeleton skeleton-item" style={{ width: '90%' }} />
    </div>
  );
}

export function SkeletonRecipeList({ count = 3 }: { count?: number }) {
  return (
    <div className="recipe-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRecipeCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCalendarGrid() {
  return (
    <div className="calendar-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonDayCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGroceryList() {
  return (
    <div className="grocery-sections">
      <SkeletonGrocerySection />
      <SkeletonGrocerySection />
      <SkeletonGrocerySection />
    </div>
  );
}
