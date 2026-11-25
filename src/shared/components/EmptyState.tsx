/**
 * The "nothing to report" state of a page that lists problems: a calm confirmation rather than a
 * bare line of text, so an empty page reads as good news and not as something that failed to load.
 */
const EmptyState = ({
  title,
  description,
  meta,
  tone = 'success',
}: {
  title: string;
  description?: string;
  /** A small supporting detail, such as the version that was checked */
  meta?: string;
  /** success is a green check (all clear); neutral is a search icon (nothing matched) */
  tone?: 'success' | 'neutral';
}) => (
  <div className="empty-state" role="status">
    <div
      className={`empty-state-icon${tone === 'neutral' ? ' empty-state-icon-neutral' : ''}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {tone === 'neutral' ? (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </>
        ) : (
          <path d="M20 6 9 17l-5-5" />
        )}
      </svg>
    </div>
    <div className="empty-state-title">{title}</div>
    {description && <p className="empty-state-description">{description}</p>}
    {meta && <div className="empty-state-meta">{meta}</div>}
  </div>
);

export default EmptyState;
