export default function MobileTabBar({ tabs, activeTab, onChange }) {
  return (
    <nav
      className="native-mobile-tab-bar sticky z-30 -mx-4 border-b border-exeer-border bg-md-surface/95 px-4 backdrop-blur-md dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]/95"
      aria-label="أقسام اللوحة"
    >
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain py-2.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-h-[40px] shrink-0 rounded-xl px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-md-primary-container text-exeer-primary shadow-sm dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]"
                  : "bg-transparent text-exeer-muted hover:bg-exeer-hover dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface-hover)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
