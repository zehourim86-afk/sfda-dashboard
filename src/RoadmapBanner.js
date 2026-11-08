// Roadmap notice for a feature that is planned but not built yet (Faseh auto-sync,
// AI results extraction, …). Styles in mah-portal.css (.roadmap-banner).
// Props: { title, description, badge, compact? } — compact is the smaller variant.
export default function RoadmapBanner({ title, description, badge, compact = false }) {
  return (
    <div className={`roadmap-banner${compact ? ' roadmap-banner-compact' : ''}`} role="note">
      <svg className="roadmap-banner-icon" width={compact ? 16 : 18} height={compact ? 16 : 18} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" /><path d="M3 21v-5h5" />
        <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" /><path d="M21 3v5h-5" />
      </svg>
      <div className="roadmap-banner-text">
        <div className="roadmap-banner-title">{title}</div>
        <div className="roadmap-banner-desc">{description}</div>
      </div>
      {badge && <span className="roadmap-banner-badge">{badge}</span>}
    </div>
  );
}
