import { Home, Map, Wallet, Sparkles, Settings } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "map", label: "Map", icon: Map },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function BottomNavigation({ activeTab, onChange, isAdmin }) {
  const visibleTabs = tabs.filter((tab) => tab.id !== "ai" || isAdmin);

  return (
    // Column count follows the visible tabs — the CSS hardcodes 5, which left
    // a stretched gap when non-admins see only 4 tabs.
    <nav className="bottom-nav" aria-label="Primary navigation" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={"tab-button " + (active ? "is-active" : "")}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.8 : 2.2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
