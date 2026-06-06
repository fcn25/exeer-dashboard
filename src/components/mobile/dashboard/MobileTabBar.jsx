export default function MobileTabBar({ tabs, activeTab, onChange }) {
  return (
    <nav
      className="sticky top-[45px] z-30 -mx-4 border-b border-gray-100 bg-white/95 px-4 backdrop-blur-sm"
      aria-label="أقسام اللوحة"
    >
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-h-[40px] shrink-0 rounded-xl px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-exeer-primary text-white shadow-sm"
                  : "bg-gray-50 text-exeer-muted hover:bg-gray-100"
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
