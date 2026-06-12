import { 
  LayoutDashboard, 
  Users, 
  Palette, 
  Printer, 
  Settings, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { isOffline, schoolSettings } = useDatabase();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', name: 'Staff Directory', icon: Users },
    { id: 'designer', name: 'Card Designer', icon: Palette },
    { id: 'printhub', name: 'Print Hub', icon: Printer },
    { id: 'settings', name: 'School Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col items-center text-center">
        {schoolSettings.school_logo_url ? (
          <img 
            src={schoolSettings.school_logo_url} 
            alt="School Logo" 
            className="w-16 h-16 object-contain mb-3 rounded-full border border-slate-700 bg-slate-800 p-1"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-sky-950 border border-sky-800 flex items-center justify-center mb-3 text-sky-400 font-bold text-xl">
            SP
          </div>
        )}
        <h1 className="text-md font-bold text-slate-100 line-clamp-2 tracking-wide font-outfit">
          {schoolSettings.school_name}
        </h1>
        <p className="text-xs text-sky-400 mt-1 italic line-clamp-1 font-medium">
          "{schoolSettings.motto || 'Education for Service'}"
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30 font-semibold scale-[1.02]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Connection Status & Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span>Database Mode:</span>
          {isOffline ? (
            <span className="flex items-center text-amber-500 font-semibold gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
            </span>
          ) : (
            <span className="flex items-center text-emerald-500 font-semibold gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Wifi className="h-3.5 w-3.5" />
              Supabase
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 text-center mt-3 border-t border-slate-800/60 pt-2">
          St. Paul Nasuti ID Gen v1.0.0
        </div>
      </div>
    </aside>
  );
}
