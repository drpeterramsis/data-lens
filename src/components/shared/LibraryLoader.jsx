const LibraryLoader = ({
  isLoading,
  isEmpty,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No items found',
  emptyDesc  = '',
  children,
}) => {

  if (isLoading) {
    return (
      <div className="library-loading-state">

        {/* Spinner */}
        <div className="library-spinner-wrap">
          <div className="library-spinner" />
        </div>

        {/* Skeleton cards */}
        <div className="library-skeleton-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-icon" />
              <div className="skeleton-lines">
                <div className="skeleton-line long"  />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>

      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="library-empty-state">
        {EmptyIcon && <EmptyIcon size={40} />}
        <p className="empty-title">{emptyTitle}</p>
        {emptyDesc && (
          <p className="empty-desc">{emptyDesc}</p>
        )}
      </div>
    )
  }

  return children
}

export default LibraryLoader
