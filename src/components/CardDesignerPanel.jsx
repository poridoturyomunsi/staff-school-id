import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import IdCard from './IdCard';
import { Palette, Check, Save, Move, Sliders, Type, HelpCircle, AlertCircle } from 'lucide-react';

export default function CardDesignerPanel() {
  const { cardTemplate, updateCardTemplate, staffList } = useDatabase();

  // Pick first active staff for preview, or fall back to mock structure
  const previewStaff = staffList.length > 0 ? staffList[0] : {
    staff_number: 'STP/2026/000',
    full_name: 'St. Paul Preview Member',
    gender: 'Male',
    department: 'Administration',
    designation: 'Staff Representative',
    subjects: 'General Science',
    photo_url: '',
    signature_url: '',
    card_number: 'STP-PREVIEW-X'
  };

  const [form, setForm] = useState({
    font_family: 'Outfit',
    theme_color_primary: '#0369a1',
    theme_color_secondary: '#0c4a6e',
    theme_color_accent: '#d97706',
    watermark_opacity: 0.08,
    watermark_size: 'large',
    logo_size: 67
  });

  const [positions, setPositions] = useState({
    qr_position: { x: 81, y: 72 },
    photo_position: { x: 8, y: 30 }
  });

  const [cardSide, setCardSide] = useState('front');
  const [dragEnabled, setDragEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form with database template configuration
  useEffect(() => {
    if (cardTemplate) {
      const timer = setTimeout(() => {
        setForm({
          font_family: cardTemplate.font_family || 'Outfit',
          theme_color_primary: cardTemplate.theme_color_primary || '#0369a1',
          theme_color_secondary: cardTemplate.theme_color_secondary || '#0c4a6e',
          theme_color_accent: cardTemplate.theme_color_accent || '#d97706',
          watermark_opacity: cardTemplate.watermark_opacity !== undefined ? Number(cardTemplate.watermark_opacity) : 0.08,
          watermark_size: cardTemplate.watermark_size || 'large',
          logo_size: cardTemplate.logo_size !== undefined ? Number(cardTemplate.logo_size) : 67
        });
        setPositions({
          qr_position: cardTemplate.qr_position || { x: 81, y: 72 },
          photo_position: cardTemplate.photo_position || { x: 8, y: 30 }
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [cardTemplate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePositionChange = (element, coords) => {
    setPositions(prev => ({
      ...prev,
      [`${element}_position`]: coords
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');
    try {
      await updateCardTemplate({
        ...form,
        ...positions
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save layout template:", err);
      setErrorMessage(err.message || 'Error occurred while saving settings to the database.');
    } finally {
      setSaving(false);
    }
  };

  const defaultPresets = [
    { name: 'School Blue', primary: '#0369a1', secondary: '#0c4a6e', accent: '#d97706' },
    { name: 'Classic Gold', primary: '#1e293b', secondary: '#0f172a', accent: '#ca8a04' },
    { name: 'Pastel Teal', primary: '#0f766e', secondary: '#115e59', accent: '#d97706' },
    { name: 'Royal Crimson', primary: '#be123c', secondary: '#9f1239', accent: '#ca8a04' }
  ];

  return (
    <div className="space-y-6 font-outfit">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Palette className="h-5 w-5 text-sky-400" />
            Interactive Card Designer
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure identity card colors, typography, watermark opacities, and drag layout components.</p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-bounce">
              <Check className="h-4 w-4" /> Changes Saved Successfully
            </div>
          )}

          {errorMessage && (
            <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> {errorMessage}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Designer Sidebar Controls (4 cols) */}
        <div className="lg:col-span-4 bg-slate-800/40 border border-slate-800 p-5 rounded-2xl space-y-6 overflow-y-auto max-h-[85vh]">
          
          {/* Preset Themes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Palette className="h-3.5 w-3.5 text-sky-400" /> Quick Theme Presets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {defaultPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      theme_color_primary: preset.primary,
                      theme_color_secondary: preset.secondary,
                      theme_color_accent: preset.accent
                    }));
                  }}
                  className="p-2 bg-slate-900 border border-slate-700/60 rounded-xl hover:border-sky-500 hover:bg-slate-950 text-left transition"
                >
                  <div className="text-[10px] font-bold text-slate-200">{preset.name}</div>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5 text-sky-400" /> Custom Color Palette
            </h3>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">Primary Header Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="theme_color_primary"
                    value={form.theme_color_primary}
                    onChange={handleInputChange}
                    className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded"
                  />
                  <input 
                    type="text" 
                    name="theme_color_primary" 
                    value={form.theme_color_primary} 
                    onChange={handleInputChange} 
                    className="w-16 bg-slate-900 border border-slate-700 rounded text-[9px] px-1 py-0.5 text-center text-slate-300 font-mono" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">Secondary Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="theme_color_secondary"
                    value={form.theme_color_secondary}
                    onChange={handleInputChange}
                    className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded"
                  />
                  <input 
                    type="text" 
                    name="theme_color_secondary" 
                    value={form.theme_color_secondary} 
                    onChange={handleInputChange} 
                    className="w-16 bg-slate-900 border border-slate-700 rounded text-[9px] px-1 py-0.5 text-center text-slate-300 font-mono" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">Card Subtitle / Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="theme_color_accent"
                    value={form.theme_color_accent}
                    onChange={handleInputChange}
                    className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded"
                  />
                  <input 
                    type="text" 
                    name="theme_color_accent" 
                    value={form.theme_color_accent} 
                    onChange={handleInputChange} 
                    className="w-16 bg-slate-900 border border-slate-700 rounded text-[9px] px-1 py-0.5 text-center text-slate-300 font-mono" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* School Logo & Typography Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Type className="h-3.5 w-3.5 text-sky-400" /> School Logo & Typography
            </h3>

            {/* Header Logo size slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1">
                <span>Header School Logo Size</span>
                <span>{form.logo_size || 67}px</span>
              </div>
              <input
                type="range"
                min="32"
                max="80"
                step="2"
                value={form.logo_size || 67}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setForm(prev => ({ ...prev, logo_size: val }));
                }}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[8px] text-slate-500 leading-none">Increases top-left corner logo width/height.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Card Font Family</label>
              <select
                name="font_family"
                value={form.font_family}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="Outfit">Outfit (Recommended - Modern Rounded)</option>
                <option value="Inter">Inter (Professional Sans)</option>
                <option value="Courier">Courier Prime (Retro Monospace)</option>
              </select>
            </div>
          </div>

          {/* Watermark Protection */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5 text-sky-400" /> Watermark Configurations
            </h3>

            {/* Watermark Size Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1">
                <span>Center Watermark Size</span>
                <span className="capitalize font-bold text-sky-400">
                  {form.watermark_size === 'small' ? 'Small' : 
                   form.watermark_size === 'medium' ? 'Medium' : 
                   form.watermark_size === 'xl' ? 'Extra Large' : 'Large'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={
                  form.watermark_size === 'small' ? 1 :
                  form.watermark_size === 'medium' ? 2 :
                  form.watermark_size === 'xl' ? 4 : 3
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const sizes = { 1: 'small', 2: 'medium', 3: 'large', 4: 'xl' };
                  setForm(prev => ({ ...prev, watermark_size: sizes[val] }));
                }}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[8px] text-slate-500 leading-none">Extends logo watermark behind text. (60% to 85% area)</span>
            </div>

            {/* Watermark Opacity Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1">
                <span>Logo Watermark Opacity</span>
                <span>{Math.round(form.watermark_opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.20"
                step="0.01"
                value={form.watermark_opacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setForm(prev => ({ ...prev, watermark_opacity: val }));
                }}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[8px] text-slate-500 leading-none">Keeps watermark clear but readable (Recommended: 8% to 15%)</span>
            </div>
          </div>

          {/* Draggables details */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Move className="h-3.5 w-3.5 text-sky-400" /> Elements Layout Coordinate
            </h3>
            
            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/60 text-[10px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Webcam Photo:</span>
                <span className="text-sky-400 font-bold">X: {positions.photo_position.x}%, Y: {positions.photo_position.y}%</span>
              </div>
              <div className="flex justify-between">
                <span>Verification QR:</span>
                <span className="text-sky-400 font-bold">X: {positions.qr_position.x}%, Y: {positions.qr_position.y}%</span>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer select-none border border-slate-700/60 p-2 rounded-xl bg-slate-900/20">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                Enable Interactive Dragging
              </span>
              <input
                type="checkbox"
                checked={dragEnabled}
                onChange={(e) => setDragEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
              />
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-950/20 transition-all"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving Template...' : 'Save Changes'}
            </button>
          </div>

        </div>

        {/* Live Canvas Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-center items-center bg-slate-950/40 border border-slate-800 rounded-3xl p-8 space-y-6 min-h-[400px]">
          
          <div className="flex justify-between items-center w-full max-w-[480px]">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <HelpCircle className="h-4 w-4 text-sky-400" />
              {dragEnabled 
                ? 'Drag Photo & QR code directly on the card to reposition.' 
                : 'Turn on "Interactive Dragging" to move elements.'}
            </span>
            <div className="flex bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setCardSide('front')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  cardSide === 'front' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => setCardSide('back')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  cardSide === 'back' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Back Side
              </button>
            </div>
          </div>

          {/* Interactive Card Render */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-inner max-w-full overflow-x-auto">
            <IdCard
              staff={previewStaff}
              side={cardSide}
              width={480}
              isDesignerMode={dragEnabled && cardSide === 'front'}
              onElementPositionChange={handlePositionChange}
              templateOverride={{
                ...form,
                qr_position: positions.qr_position,
                photo_position: positions.photo_position
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-[480px] text-[10px] text-slate-500 bg-slate-800/20 p-4 rounded-2xl border border-slate-800/40 leading-relaxed">
            <div>
              <p className="font-bold text-slate-400 mb-1">DESIGN SPECIFICATIONS:</p>
              <p>• Size: 85.60mm × 53.98mm (CR80 Standard)</p>
              <p>• Subtle pastel patterns embedded automatically</p>
              <p>• Rounded borders optimized for PVC prints</p>
            </div>
            <div>
              <p className="font-bold text-slate-400 mb-1">WATERMARK & SECURITY:</p>
              <p>• Centered logo watermark (extends behind details)</p>
              <p>• Drag layout settings saved and reloaded automatically</p>
              <p>• Interactive SVG security lines prevent photo spoofing</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
