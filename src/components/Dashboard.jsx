import { useDatabase } from '../context/DatabaseContext';
import { 
  Users, 
  UserCheck, 
  Printer, 
  Sliders, 
  Landmark, 
  PlusCircle, 
  Database,
  History
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const { staffList, printHistory, schoolSettings, isOffline } = useDatabase();

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.status === 'Active').length;
  const totalPrints = printHistory.length;

  // Department counts
  const deptCounts = staffList.reduce((acc, curr) => {
    acc[curr.department] = (acc[curr.department] || 0) + 1;
    return acc;
  }, {});

  const lastPrints = printHistory.slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-850 to-slate-900 border border-sky-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white font-outfit tracking-wide m-0">
              Welcome to St. Paul ID Administration Hub
            </h1>
            <p className="text-xs text-sky-200 mt-1.5 max-w-2xl font-medium leading-relaxed">
              Design, manage, and print PVC-quality, secure identity cards for St. Paul Secondary School, Nasuti staff. Monitor registration logs, webcam uploads, and scan codes.
            </p>
          </div>
          <div className="bg-slate-950/40 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-xs text-slate-300 font-semibold self-stretch md:self-auto flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-1">
              <Landmark className="h-4 w-4" /> {schoolSettings.school_name}
            </div>
            <div className="text-[10px] text-slate-400 italic">Motto: "{schoolSettings.motto}"</div>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Registered */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Registered Staff</span>
            <div className="text-2xl font-black text-slate-100 font-outfit mt-0.5">{totalStaff}</div>
          </div>
        </div>

        {/* Card 2: Active Cards */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Identity Cards</span>
            <div className="text-2xl font-black text-slate-100 font-outfit mt-0.5">{activeStaff}</div>
          </div>
        </div>

        {/* Card 3: Total Prints */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">PVC Cards Printed</span>
            <div className="text-2xl font-black text-slate-100 font-outfit mt-0.5">{totalPrints}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left statistics, Right Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Dept Breakdown and Prints Log */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Department breakdown */}
          <div className="bg-slate-800/20 border border-slate-800/60 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              Staff Distribution by Department
            </h3>

            {totalStaff === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No staff registered yet. Go to Directory to add staff.</p>
            ) : (
              <div className="space-y-3 pt-2">
                {Object.entries(deptCounts).map(([dept, count]) => {
                  const percentage = Math.round((count / totalStaff) * 100);
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300 font-semibold">{dept}</span>
                        <span className="text-slate-400">{count} staff ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Print History log */}
          <div className="bg-slate-800/20 border border-slate-800/60 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <History className="h-4 w-4 text-sky-400" /> Recent Print Jobs Log
            </h3>
            
            {lastPrints.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No cards printed yet. Print cards from the Print Hub.</p>
            ) : (
              <div className="divide-y divide-slate-800/80 font-mono text-[11px] text-slate-400">
                {lastPrints.map((log) => (
                  <div key={log.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="text-slate-200 font-bold">{log.staff?.full_name || 'Deleted Staff'}</span>
                      <span className="text-slate-500 ml-2">({log.staff?.staff_number || 'N/A'})</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>{new Date(log.printed_at).toLocaleString()}</span>
                      <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Success</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: Quick Actions & Database info */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl space-y-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Quick Admin Actions
            </h3>
            
            <button
              onClick={() => setActiveTab('directory')}
              className="w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition text-left group"
            >
              <div className="flex items-center gap-3">
                <PlusCircle className="h-5 w-5 text-sky-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Register Staff</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Add, take webcam capture & sign</div>
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 text-xs transition">→</span>
            </button>

            <button
              onClick={() => setActiveTab('designer')}
              className="w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition text-left group"
            >
              <div className="flex items-center gap-3">
                <Sliders className="h-5 w-5 text-violet-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Customize ID Template</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Drag QR & Photo, change colors & fonts</div>
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 text-xs transition">→</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition text-left group"
            >
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Configure School</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Update school motto, stamp & logo</div>
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 text-xs transition">→</span>
            </button>
          </div>

          {/* Database diagnostic panel */}
          <div className="bg-slate-800/10 border border-slate-800/80 p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Database className="h-4 w-4 text-sky-400" /> System Diagnostics
            </h3>
            <div className="text-[10px] text-slate-400 leading-relaxed space-y-2">
              <p>• <strong>Connection Status:</strong> {isOffline ? 'Offline (IndexedDB Mode)' : 'Online (Supabase DB)'}</p>
              <p>• <strong>Workspace Root:</strong> <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono text-[9px]">C:\Users\user\Desktop\STAFF ID</code></p>
              <p>• <strong>Cached Staff Records:</strong> {staffList?.length || 0}</p>
              <p className="border-t border-slate-800/80 pt-2 text-[9px] text-slate-500">
                To sync to cloud, configure your <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-500 font-mono">.env</code> with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
