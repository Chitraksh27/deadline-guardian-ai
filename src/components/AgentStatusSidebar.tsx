import React from 'react';
import { LayoutDashboard, Target, Calendar, PieChart, Briefcase, Plug, Bell, Settings, HelpCircle, Activity } from 'lucide-react';
import { Workspace } from '../types.ts';

interface NavigationSidebarProps {
  currentView: string;
  setView: (view: string) => void;
  userName: string;
  userEmail: string;
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onWorkspaceSwitch: (id: string | null) => void;
}

export const AgentStatusSidebar: React.FC<NavigationSidebarProps> = React.memo(({
  currentView,
  setView,
  userName,
  userEmail,
  workspaces,
  selectedWorkspaceId,
  onWorkspaceSwitch,
}) => {
  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'goals', label: 'Goals', icon: Target },
  ] as const;

  const secondaryNavItems = [
    { id: 'workspaces', label: 'Workspaces', icon: Briefcase },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full">
      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        {/* Workspace Switcher */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 flex items-center">
            <Briefcase className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Active Workspace
          </p>
          <select
            value={selectedWorkspaceId || ''}
            onChange={(e) => onWorkspaceSwitch(e.target.value || null)}
            aria-label="Active Workspace"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:border-slate-900 transition-colors cursor-pointer"
          >
            <option value="">Personal Space</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1" aria-label="Main Navigation">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <nav className="space-y-1" aria-label="Secondary Navigation">
          <div className="h-px bg-slate-100 my-4" />
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'settings' && currentView === 'preferences');
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Card Footer */}
      <div className="border-t border-slate-200 p-6 bg-slate-50">
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('profile')}>
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {userName ? userName.slice(0, 2) : 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-900 truncate tracking-wide">
              {userName || 'Loading...'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{userEmail}</div>
          </div>
        </div>
      </div>
    </aside>
  );
});
