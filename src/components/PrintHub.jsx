import { useState, Fragment } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import IdCard from './IdCard';
import { 
  Printer, 
  CheckSquare, 
  Square, 
  Layers, 
  Search, 
  HelpCircle
} from 'lucide-react';

export default function PrintHub({ preselectedStaffId = null }) {
  const { staffList, logPrint } = useDatabase();
  const [selectedIds, setSelectedIds] = useState(preselectedStaffId ? [preselectedStaffId] : []);
  const [searchTerm, setSearchTerm] = useState('');
  const [printLayout, setPrintLayout] = useState('front-and-back'); // 'front-only' | 'back-only' | 'front-and-back'

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const selectAll = () => {
    const activeStaffIds = staffList.filter(s => s.status === 'Active').map(s => s.id);
    setSelectedIds(activeStaffIds);
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  const filteredStaff = staffList.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staff_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trigger browser print
  const handlePrint = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one staff card to print.");
      return;
    }

    // Log prints to print history database
    for (const id of selectedIds) {
      await logPrint(id);
    }

    // Trigger standard browser print window
    window.print();
  };

  const selectedStaffObjects = staffList.filter(s => selectedIds.includes(s.id));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-outfit">
            <Printer className="h-5 w-5 text-sky-400" />
            PVC Card Printing Hub
          </h2>
          <p className="text-xs text-slate-400 mt-1">Select staff members, choose card layout configurations, and print to CR80 PVC sizes.</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={selectedIds.length === 0}
          className={`px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-sky-950/20 ${
            selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-850 border border-slate-800 text-slate-500 shadow-none' : ''
          }`}
        >
          <Printer className="h-4.5 w-4.5" /> Print Selected ({selectedIds.length})
        </button>
      </div>

      {/* Grid selector - Hidden during print */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* Left Column: Selection Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-800/40 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Staff Selector
            </h3>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={selectAll} 
                className="text-[10px] text-sky-400 hover:text-sky-300 font-bold bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg"
              >
                Select All
              </button>
              <button 
                type="button" 
                onClick={selectNone} 
                className="text-[10px] text-slate-500 hover:text-slate-400 font-semibold bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by name/ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Staff selection scrollbox */}
          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 border border-slate-800 bg-slate-950/20 p-2 rounded-xl">
            {filteredStaff.map((staff) => {
              const isSelected = selectedIds.includes(staff.id);
              return (
                <div
                  key={staff.id}
                  onClick={() => toggleSelect(staff.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition select-none ${
                    isSelected 
                      ? 'bg-sky-950/30 border border-sky-850 text-slate-200' 
                      : 'hover:bg-slate-800/40 border border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-sky-400 flex-shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-600 flex-shrink-0" />
                  )}
                  
                  {/* Photo Thumbnail */}
                  <div className="w-6 h-8 bg-slate-800 rounded border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {staff.photo_url ? (
                      <img src={staff.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[6px] text-slate-500 font-mono">Pic</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[11px] truncate">{staff.full_name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{staff.staff_number} | {staff.designation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Print Configuration & Previews (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/40 border border-slate-800 p-5 rounded-2xl space-y-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Layout & Page Settings
          </h3>

          {/* Layout controls */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">Card Sides to Print</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPrintLayout('front-and-back')}
                className={`py-3 px-2.5 border rounded-xl flex flex-col items-center gap-1.5 transition text-center ${
                  printLayout === 'front-and-back' 
                    ? 'border-sky-500 bg-sky-950/20 text-sky-400 font-bold' 
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span className="text-[10px]">Front & Back</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintLayout('front-only')}
                className={`py-3 px-2.5 border rounded-xl flex flex-col items-center gap-1.5 transition text-center ${
                  printLayout === 'front-only' 
                    ? 'border-sky-500 bg-sky-950/20 text-sky-400 font-bold' 
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span className="text-[10px]">Front Only</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintLayout('back-only')}
                className={`py-3 px-2.5 border rounded-xl flex flex-col items-center gap-1.5 transition text-center ${
                  printLayout === 'back-only' 
                    ? 'border-sky-500 bg-sky-950/20 text-sky-400 font-bold' 
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span className="text-[10px]">Back Only</span>
              </button>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-200 mb-1">Uganda National ID / PVC Printing Guide:</p>
              <p className="mb-1">1. When the print dialog opens, set the target paper size to **CR80** or custom card size (**85.6mm × 53.98mm**).</p>
              <p className="mb-1">2. Enable **Background graphics** and set margins to **None** in the printer properties dialog.</p>
              <p>3. Use high-resolution settings for PVC card printers to ensure the security wave patterns print clearly.</p>
            </div>
          </div>

          {/* Selected Cards Previews list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Selected Cards Queue ({selectedIds.length})</h4>
            {selectedIds.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-6 text-center bg-slate-950/20 border border-slate-800 rounded-xl">
                No cards selected. Select staff on the left panel to preview printable output.
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 bg-slate-950/20 p-4 rounded-2xl border border-slate-800 max-h-[350px]">
                {selectedStaffObjects.map((staff) => (
                  <div key={staff.id} className="flex-shrink-0 space-y-3 scale-75 origin-top -mr-20 -mb-16">
                    <div className="text-sm font-bold text-slate-200 font-mono text-center mb-1 bg-slate-900 px-3 py-1 rounded-full border border-slate-850">
                      ID: {staff.staff_number}
                    </div>
                    {printLayout !== 'back-only' && (
                      <IdCard staff={staff} side="front" width={340} />
                    )}
                    {printLayout !== 'front-only' && (
                      <IdCard staff={staff} side="back" width={340} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Hidden Print Container - ONLY visible during printing via media query in index.css */}
      <div className="hidden print:block print-card-container">
        {selectedStaffObjects.map((staff) => (
          <Fragment key={staff.id}>
            {printLayout !== 'back-only' && (
              <div className="print-page pvc-card-print">
                <IdCard staff={staff} side="front" width={1011} /> {/* Width 1011px is 85.6mm at 300 DPI for high-quality PDF output */}
              </div>
            )}
            {printLayout !== 'front-only' && (
              <div className="print-page pvc-card-print">
                <IdCard staff={staff} side="back" width={1011} />
              </div>
            )}
          </Fragment>
        ))}
      </div>

    </div>
  );
}
