import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Save, Upload, Check, Landmark } from 'lucide-react';
import { makeSignatureTransparent, resizeImage } from '../utils/canvasHelpers';

export default function SchoolSettings() {
  const { schoolSettings, updateSchoolSettings, designations, addDesignation, updateDesignation, deleteDesignation } = useDatabase();

  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'designations'
  const [newDesignation, setNewDesignation] = useState('');
  const [editingDesignationId, setEditingDesignationId] = useState(null);
  const [editingDesignationName, setEditingDesignationName] = useState('');

  const [form, setForm] = useState({
    school_name: '',
    school_address: '',
    telephone: '',
    email: '',
    motto: '',
    verification_base_url: ''
  });

  const [logoUrl, setLogoUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [stampThreshold, setStampThreshold] = useState(200);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (schoolSettings) {
      const timer = setTimeout(() => {
        setForm({
          school_name: schoolSettings.school_name || '',
          school_address: schoolSettings.school_address || '',
          telephone: schoolSettings.telephone || '',
          email: schoolSettings.email || '',
          motto: schoolSettings.motto || '',
          verification_base_url: schoolSettings.verification_base_url || ''
        });
        setLogoUrl(schoolSettings.school_logo_url || '');
        setStampUrl(schoolSettings.school_stamp_url || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [schoolSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          // Compress school logo to max width 250px to save storage space
          const compressedLogo = await resizeImage(event.target.result, 250, 'image/png', 0.9);
          setLogoUrl(compressedLogo);
        } catch (err) {
          console.error("Logo compression error:", err);
          setLogoUrl(event.target.result); // Fallback
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          // Auto-remove stamp white background to make it transparent stamp PNG
          const transparentStamp = await makeSignatureTransparent(event.target.result, stampThreshold);
          setStampUrl(transparentStamp);
        } catch (err) {
          console.error("Stamp processing error:", err);
          setStampUrl(event.target.result); // Fallback
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateSchoolSettings({
        ...form,
        school_logo_url: logoUrl,
        school_stamp_url: stampUrl,
        verification_base_url: form.verification_base_url?.trim() || ''
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update school settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDesignation = async (e) => {
    e.preventDefault();
    if (!newDesignation.trim()) return;
    try {
      await addDesignation(newDesignation.trim());
      setNewDesignation('');
    } catch (err) {
      alert(err.message || 'Failed to add designation.');
    }
  };

  const handleStartEdit = (d) => {
    setEditingDesignationId(d.id);
    setEditingDesignationName(d.name);
  };

  const handleSaveEdit = async (id) => {
    if (!editingDesignationName.trim()) return;
    try {
      await updateDesignation(id, { name: editingDesignationName.trim() });
      setEditingDesignationId(null);
      setEditingDesignationName('');
    } catch (err) {
      alert(err.message || 'Failed to update designation.');
    }
  };

  const handleToggleStatus = async (d) => {
    try {
      const nextStatus = d.status === 'Active' ? 'Inactive' : 'Active';
      await updateDesignation(d.id, { status: nextStatus });
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-outfit">
            <Landmark className="h-5 w-5 text-sky-400" />
            School Configuration Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure school details, logos, stamps, and staff designations.</p>
        </div>
        
        {saveSuccess && activeSubTab === 'profile' && (
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-bounce">
            <Check className="h-4 w-4" /> Settings updated successfully!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 mb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'profile' ? 'text-sky-400 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          School Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('designations')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'designations' ? 'text-sky-400 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Designation Management
        </button>
      </div>

      {activeSubTab === 'profile' ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Info */}
          <div className="md:col-span-2 bg-slate-800/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              General Particulars
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">School Name</label>
              <input
                type="text"
                name="school_name"
                value={form.school_name}
                onChange={handleChange}
                placeholder="e.g. St. Paul Secondary School, Nasuti"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">P.O. Box & Address</label>
              <input
                type="text"
                name="school_address"
                value={form.school_address}
                onChange={handleChange}
                placeholder="e.g. P.O. Box 678, Nasuti, Iganga"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Telephone Contact</label>
                <input
                  type="text"
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="e.g. +256 701 234567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. info@stpaulnasuti.ac.ug"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">School Motto</label>
              <input
                type="text"
                name="motto"
                value={form.motto}
                onChange={handleChange}
                placeholder="e.g. Education for Service"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 italic"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Verification Base URL</label>
              <input
                type="url"
                name="verification_base_url"
                value={form.verification_base_url}
                onChange={handleChange}
                placeholder="Optional: https://your-domain.example or https://abcd.ngrok.io"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">If set, QR codes will use this base URL for verification links. Leave empty to use the app origin.</p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/20"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving Settings...' : 'Save School Profile'}
              </button>
            </div>
          </div>

          {/* Right 1 Col: Logo and Stamp uploads */}
          <div className="space-y-6">
            
            {/* Logo Uploader */}
            <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-300 mb-3 text-center w-full border-b border-slate-800 pb-1.5">
                School Logo
              </h4>
              
              <div className="w-28 h-28 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden mb-4 p-2 relative group">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                    <div 
                      onClick={() => setLogoUrl('')} 
                      className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-opacity"
                    >
                      Remove Logo
                    </div>
                  </>
                ) : (
                  <Landmark className="h-10 w-10 text-slate-600" />
                )}
              </div>

              <button
                type="button"
                onClick={() => document.getElementById('logo-file-input').click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Logo
              </button>
              <input
                type="file"
                id="logo-file-input"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            {/* Stamp Uploader */}
            <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-300 mb-3 text-center w-full border-b border-slate-800 pb-1.5">
                Authorised Signature / Stamp
              </h4>

              <div className="w-40 h-20 border border-slate-700 bg-white rounded flex items-center justify-center overflow-hidden mb-4 relative group p-1">
                <div 
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: 'radial-gradient(#000 20%, transparent 20%), radial-gradient(#000 20%, transparent 20%)',
                    backgroundPosition: '0 0, 4px 4px',
                    backgroundSize: '8px 8px'
                  }}
                />
                {stampUrl ? (
                  <>
                    <img src={stampUrl} alt="School Stamp" className="max-h-full max-w-full object-contain relative z-10" />
                    <div 
                      onClick={() => setStampUrl('')} 
                      className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-opacity z-20"
                    >
                      Remove Stamp
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-slate-400 font-medium text-center px-2">No Authorized Stamp/Sign Uploaded</div>
                )}
              </div>

              <div className="w-full mb-3 px-2">
                <div className="flex justify-between items-center text-[8px] text-slate-500 mb-1">
                  <span>Threshold (Luminance)</span>
                  <span>{stampThreshold}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="240"
                  value={stampThreshold}
                  onChange={(e) => setStampThreshold(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => document.getElementById('stamp-file-input').click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Stamp
              </button>
              <input
                type="file"
                id="stamp-file-input"
                accept="image/*"
                className="hidden"
                onChange={handleStampUpload}
              />
            </div>

          </div>
        </form>
      ) : (
        <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Designation Management Registry
            </h3>
          </div>

          {/* Creation form */}
          <form onSubmit={handleCreateDesignation} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. School Nurse, Head of IT..."
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/20"
            >
              Add Designation
            </button>
          </form>

          {/* Designations list */}
          <div className="border border-slate-800 bg-slate-950/20 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-850 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Designation Name</th>
                  <th className="p-3 w-32">Status</th>
                  <th className="p-3 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {designations.map((d) => {
                  const isEditing = editingDesignationId === d.id;
                  return (
                    <tr key={d.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingDesignationName}
                            onChange={(e) => setEditingDesignationName(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500 w-full font-semibold"
                          />
                        ) : (
                          d.name
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(d)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer hover:scale-105 transition-all ${
                            d.status === 'Active'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-slate-400 bg-slate-800/60 border-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                          {d.status}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(d.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDesignationId(null)}
                              className="px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-semibold"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(d)}
                              className="px-2.5 py-1 bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white rounded-lg text-[10px] font-bold"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete designation "${d.name}"?`)) {
                                  deleteDesignation(d.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-800 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded-lg text-[10px] font-bold"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
