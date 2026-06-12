import { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import StaffRegistrationForm from './StaffRegistrationForm';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Printer, 
  Grid, 
  List,
  UserCheck,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StaffDirectory({ onPrintSingle }) {
  const { staffList, deleteStaff, addStaff, addStaffBulk } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  
  // Registration form toggles
  const [showRegForm, setShowRegForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Bulk Upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = () => {
    const ws_data = [
      ["Staff ID", "Full Name", "Designation", "Department", "Gender", "Subjects", "Issue Date", "Expiry Date"],
      ["STP/2026/001", "Kibuuka Richard", "Head Teacher", "Administration", "Male", "General Paper", "2026-06-09", "2031-06-09"],
      ["STP/2026/002", "Nakamya Sarah", "Senior Teacher", "Humanities", "Female", "History, Geography", "2026-06-09", "2031-06-09"],
      ["STP/2026/003", "Mwesigwa Emmanuel", "Deputy Headteacher", "Administration", "Male", "General Paper", "", ""]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Staff Template");
    XLSX.writeFile(wb, "Staff_Import_Template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          throw new Error("The uploaded Excel file has no records.");
        }

        const newRecords = [];
        const errors = [];
        const existingStaffNumbers = new Set(staffList.map(s => s.staff_number.toLowerCase()));
        const uploadedStaffNumbersInFile = new Set();

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;

          const staffIdKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '').includes('id') || k.toLowerCase().includes('number'));
          const fullNameKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '').includes('fullname') || k.toLowerCase().includes('name'));
          const designationKey = Object.keys(row).find(k => k.toLowerCase().includes('designation') || k.toLowerCase().includes('role'));
          const departmentKey = Object.keys(row).find(k => k.toLowerCase().includes('department'));
          const genderKey = Object.keys(row).find(k => k.toLowerCase().includes('gender'));
          const subjectsKey = Object.keys(row).find(k => k.toLowerCase().includes('subject'));
          const issueDateKey = Object.keys(row).find(k => k.toLowerCase().includes('issue'));
          const expiryDateKey = Object.keys(row).find(k => k.toLowerCase().includes('expiry') || k.toLowerCase().includes('expire'));

          const staffNumber = (row[staffIdKey] || '').toString().trim();
          const fullName = (row[fullNameKey] || '').toString().trim();
          const designation = (row[designationKey] || '').toString().trim();
          const department = (row[departmentKey] || '').toString().trim();
          const genderRaw = (row[genderKey] || '').toString().trim();
          const subjects = (row[subjectsKey] || '').toString().trim();
          const issueDateRaw = (row[issueDateKey] || '').toString().trim();
          const expiryDateRaw = (row[expiryDateKey] || '').toString().trim();

          if (!staffNumber) {
            errors.push(`Row ${rowNum}: Staff ID is missing.`);
            return;
          }
          if (!fullName) {
            errors.push(`Row ${rowNum} (${staffNumber}): Full Name is missing.`);
            return;
          }

          if (existingStaffNumbers.has(staffNumber.toLowerCase())) {
            errors.push(`Row ${rowNum} (${staffNumber}): Staff ID already exists in the system database.`);
            return;
          }

          if (uploadedStaffNumbersInFile.has(staffNumber.toLowerCase())) {
            errors.push(`Row ${rowNum} (${staffNumber}): Duplicate Staff ID within the uploaded file.`);
            return;
          }

          uploadedStaffNumbersInFile.add(staffNumber.toLowerCase());

          let gender = 'Male';
          if (genderRaw.toLowerCase().startsWith('f')) {
            gender = 'Female';
          } else if (genderRaw.toLowerCase().startsWith('o')) {
            gender = 'Other';
          }

          const parseExcelDate = (val) => {
            if (!val) return '';
            if (!isNaN(val)) {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              return date.toISOString().split('T')[0];
            }
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
              }
            } catch (err) {}
            return val;
          };

          const issue_date = parseExcelDate(issueDateRaw);
          const expiry_date = parseExcelDate(expiryDateRaw);

          newRecords.push({
            staff_number: staffNumber,
            full_name: fullName,
            designation: designation || 'Classroom Teacher',
            department: department || 'Science',
            gender: gender,
            subjects: subjects,
            issue_date: issue_date,
            expiry_date: expiry_date,
            status: 'Active'
          });
        });

        if (errors.length > 0) {
          setUploadErrors(errors);
          setParsedData([]);
        } else {
          setUploadErrors([]);
          setParsedData(newRecords);
        }
      } catch (err) {
        setUploadErrors([`Failed to parse file: ${err.message}`]);
        setParsedData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportParsedData = async () => {
    setImporting(true);
    try {
      await addStaffBulk(parsedData);
      alert(`Successfully imported ${parsedData.length} staff records.`);
      setShowBulkUpload(false);
      setParsedData([]);
      setUploadErrors([]);
    } catch (err) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Are you sure you want to delete staff member ${name}? This action cannot be undone.`)) {
      try {
        await deleteStaff(id);
      } catch (err) {
        alert(err.message || "Failed to delete staff.");
      }
    }
  };

  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setShowRegForm(true);
  };

  const handleCreateNew = () => {
    setEditingStaff(null);
    setShowRegForm(true);
  };

  const handleFormCompleted = () => {
    setShowRegForm(false);
    setEditingStaff(null);
  };

  // Filtered List
  const filteredStaff = staffList.filter(s => {
    const matchesSearch = 
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staff_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = deptFilter === 'All' || s.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = [
    'Science',
    'Humanities',
    'Mathematics',
    'Languages',
    'Vocational',
    'Administration',
    'Support Staff',
    'Security'
  ];

  if (showRegForm) {
    return (
      <StaffRegistrationForm 
        key={editingStaff?.id || 'new'}
        editingStaff={editingStaff} 
        onCompleted={handleFormCompleted} 
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Directory Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-outfit">
            <UserCheck className="h-5 w-5 text-sky-400" />
            Staff Directory Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered staff, modify particulars, and trigger identity card previews.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-slate-950/20"
          >
            <Upload className="h-4 w-4 text-sky-400" /> Bulk Upload
          </button>
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-sky-950/20"
          >
            <Plus className="h-4 w-4" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="bg-slate-800/30 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Name, Staff ID, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Department filter */}
        <div className="w-full md:w-48 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="w-full md:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        {/* Grid/List toggler */}
        <div className="flex bg-slate-900 rounded-xl p-0.5 border border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'list' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'grid' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Grid View"
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Staff lists */}
      {filteredStaff.length === 0 ? (
        <div className="bg-slate-800/10 border border-slate-800/80 rounded-3xl p-12 text-center text-slate-500">
          <AlertTriangle className="h-10 w-10 text-amber-500/60 mx-auto mb-3" />
          <p className="text-sm font-semibold">No staff records match your query.</p>
          <p className="text-xs mt-1">Try clearing filters or adding a new record.</p>
        </div>
      ) : viewMode === 'list' ? (
        
        /* List Layout Table */
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4 w-12">Photo</th>
                  <th className="p-4">Staff ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Dept / Designation</th>
                  <th className="p-4 w-24">Status</th>
                  <th className="p-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="w-9 h-12 bg-slate-800 rounded border border-slate-700 overflow-hidden flex items-center justify-center">
                        {staff.photo_url ? (
                          <img src={staff.photo_url} alt="N/A" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] text-slate-500 font-mono">Avatar</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-300">{staff.staff_number}</td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-100 text-sm">{staff.full_name}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/80 rounded-md font-semibold text-[10px] mr-1.5">{staff.department}</span>
                      <span className="text-slate-300 font-medium">{staff.designation}</span>
                    </td>
                    <td className="p-4">
                      {staff.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(staff)}
                        className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition"
                        title="Edit Details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrintSingle(staff)}
                        className="p-1.5 bg-slate-800 text-sky-400 rounded-lg hover:bg-sky-500 hover:text-white transition"
                        title="Configure Card & Print"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(staff.id, staff.full_name)}
                        className="p-1.5 bg-slate-800 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition"
                        title="Remove Record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* Grid Layout Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div 
              key={staff.id} 
              className="bg-slate-800/30 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex gap-4 items-center transition-all hover:translate-y-[-2px]"
            >
              {/* Photo */}
              <div className="w-16 h-20 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {staff.photo_url ? (
                  <img src={staff.photo_url} alt="Pic" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] text-slate-500">No Photo</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded text-sky-400 border border-slate-700">{staff.staff_number}</span>
                  {staff.status === 'Active' ? (
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                  )}
                </div>
                <h4 className="font-extrabold text-slate-100 text-sm truncate mt-1.5">{staff.full_name}</h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{staff.designation}</p>
                <p className="text-[10px] text-slate-500 truncate">{staff.department} Dept</p>
                
                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(staff)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => onPrintSingle(staff)}
                    className="px-2 py-1 bg-sky-950/40 border border-sky-900 hover:bg-sky-500 hover:text-white text-sky-400 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                  >
                    <Printer className="h-3 w-3" /> Print Card
                  </button>
                  <button
                    onClick={() => handleDelete(staff.id, staff.full_name)}
                    className="px-2 py-1 bg-rose-950/20 border border-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-400 rounded text-[10px] font-semibold flex items-center gap-1 transition ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-sky-400" />
                <h3 className="text-md font-bold text-slate-100 font-outfit">Bulk Staff Upload</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkUpload(false);
                  setParsedData([]);
                  setUploadErrors([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950/30 p-3 rounded-xl border border-slate-800 gap-3">
                <div className="text-[11px] text-slate-400 leading-normal">
                  <p className="font-semibold text-slate-300 mb-0.5">Need a formatted Excel file?</p>
                  Use our standardized import template with sample columns and validation logic.
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Download Template
                </button>
              </div>

              {/* Upload Input Area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-6 text-center transition cursor-pointer relative bg-slate-950/10">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-slate-500" />
                  <p className="text-xs text-slate-300 font-bold">Drag and drop your Excel file here or click to browse</p>
                  <p className="text-[10px] text-slate-500">Supports .xlsx and .xls file formats</p>
                </div>
              </div>

              {/* Errors List */}
              {uploadErrors.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Errors Detected ({uploadErrors.length})
                  </div>
                  <ul className="text-[10px] text-rose-300 font-semibold space-y-1 list-disc pl-4 max-h-[150px] overflow-y-auto">
                    {uploadErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Parsed Data */}
              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Excel Validated Successfully! ({parsedData.length} records ready)
                  </div>
                  <div className="bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden max-h-[180px] overflow-y-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-400 font-bold border-b border-slate-800">
                          <th className="p-2">Staff ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Designation</th>
                          <th className="p-2">Department</th>
                          <th className="p-2">Gender</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/10 text-slate-300 font-medium">
                            <td className="p-2 font-mono">{row.staff_number}</td>
                            <td className="p-2 font-bold text-slate-100">{row.full_name}</td>
                            <td className="p-2">{row.designation}</td>
                            <td className="p-2">{row.department}</td>
                            <td className="p-2">{row.gender}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowBulkUpload(false);
                  setParsedData([]);
                  setUploadErrors([]);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-slate-250 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImportParsedData}
                disabled={importing || parsedData.length === 0}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                {importing ? 'Importing...' : `Import ${parsedData.length} Records`}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
