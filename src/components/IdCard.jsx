import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { useDatabase } from '../context/DatabaseContext';

// Helper to generate stylized SVG barcode
function BarcodeSVG({ value }) {
  // Simple pseudo-Code128 barcode generator
  // Maps characters to standard-looking bar patterns
  const chars = value.split('');
  const barPattern = chars.map((char) => {
    const code = char.charCodeAt(0);
    // Return a 7-bit binary string representation
    return (code * 11).toString(2).padStart(7, '0');
  }).join('101'); // Separators
  
  const fullPattern = '110101100' + barPattern + '110011011'; // Start + Pattern + Stop
  const width = 100 / fullPattern.length;

  return (
    <div className="flex flex-col items-center">
      <svg className="w-full h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
        <g fill="black">
          {fullPattern.split('').map((bit, idx) => {
            if (bit === '1') {
              return (
                <rect 
                  key={idx} 
                  x={idx * width} 
                  y={0} 
                  width={width * 1.05} 
                  height={30} 
                />
              );
            }
            return null;
          })}
        </g>
      </svg>
      <span className="text-[7px] tracking-[3px] text-slate-800 font-mono mt-0.5">{value}</span>
    </div>
  );
}

export default function IdCard({ 
  staff, 
  side = 'front', 
  width = 450, // default display width in pixels
  isDesignerMode = false,
  onElementPositionChange = null,
  templateOverride = null
}) {
  const { schoolSettings, cardTemplate } = useDatabase();
  const activeTemplate = templateOverride || cardTemplate;
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Drag state
  const cardRef = useRef(null);
  const bodyRef = useRef(null);
  const [activeDragElement, setActiveDragElement] = useState(null);
  const [positions, setPositions] = useState({
    qr: activeTemplate.qr_position || { x: 76.5, y: 22 },
    photo: activeTemplate.photo_position || { x: 4.5, y: 15 }
  });

  // Calculate height maintaining exact CR80 aspect ratio (85.60 mm by 53.98 mm)
  const height = width * (53.98 / 85.60);

  // Generate QR code URL
  useEffect(() => {
    if (staff) {
      // Dynamic verification link uses the printed card number token
      const token = staff.card_number || staff.staff_number;

      const DEFAULT_VERIFICATION_BASE_URL = import.meta.env.VITE_VERIFICATION_BASE_URL || 'https://my-public-domain.com';

      const getBaseUrl = () => {
        // Prefer explicit override from school settings when available
        if (schoolSettings?.verification_base_url) {
          return schoolSettings.verification_base_url.replace(/\/$/, '');
        }

        return DEFAULT_VERIFICATION_BASE_URL.replace(/\/$/, '');
      };

      const verifyUrl = `${getBaseUrl()}/verify/${encodeURIComponent(token)}`;

      QRCode.toDataURL(verifyUrl, {
        margin: 4,
        width: 125,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error("QR Code generation error:", err));
    }
  }, [staff, schoolSettings]);

  // Update internal positions when template changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPositions({
        qr: activeTemplate.qr_position || { x: 76.5, y: 22 },
        photo: activeTemplate.photo_position || { x: 4.5, y: 15 }
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTemplate]);

  // Handle Drag Events in Designer mode
  const handleMouseDown = (e, element) => {
    if (!isDesignerMode) return;
    e.preventDefault();
    setActiveDragElement(element);
  };

  const handleMouseMove = useCallback((e) => {
    if (!activeDragElement || !isDesignerMode || !cardRef.current || !bodyRef.current) return;
    
    const bodyRect = bodyRef.current.getBoundingClientRect();
    
    // Calculate percentage coordinates relative to the card body dimensions
    let pctX = ((e.clientX - bodyRect.left) / bodyRect.width) * 100;
    let pctY = ((e.clientY - bodyRect.top) / bodyRect.height) * 100;

    let minX = 0;
    let maxX = 100;
    let minY = 0;
    let maxY = 100;

    if (activeDragElement === 'photo') {
      const photoWidthPct = 22;
      const photoHeightPx = (bodyRect.width * (photoWidthPct / 100)) * (4 / 3);
      const photoHeightPct = (photoHeightPx / bodyRect.height) * 100;
      
      // Restrict photo to the left (X between 0% and 25% of card body width)
      minX = 0;
      maxX = 25;
      
      minY = 0;
      maxY = 100 - photoHeightPct;
    } else if (activeDragElement === 'qr') {
      const qrWidthPct = 16.1;
      const qrHeightPx = bodyRect.width * (qrWidthPct / 100);
      const qrHeightPct = (qrHeightPx / bodyRect.height) * 100;
      
      // Restrict QR code to the right (X between 75% and 83.9% of card body width)
      minX = 75;
      maxX = 100 - qrWidthPct;
      
      minY = 0;
      maxY = 100 - qrHeightPct;
    }

    pctX = Math.max(minX, Math.min(maxX, pctX));
    pctY = Math.max(minY, Math.min(maxY, pctY));

    const updated = {
      ...positions,
      [activeDragElement]: { x: Math.round(pctX), y: Math.round(pctY) }
    };
    
    setPositions(updated);

    if (onElementPositionChange) {
      onElementPositionChange(activeDragElement, updated[activeDragElement]);
    }
  }, [activeDragElement, isDesignerMode, positions, onElementPositionChange]);

  const handleMouseUp = useCallback(() => {
    setActiveDragElement(null);
  }, []);

  useEffect(() => {
    if (activeDragElement) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragElement, handleMouseMove, handleMouseUp]);

  if (!staff) {
    return (
      <div className="flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-400 rounded-xl" style={{ width, height }}>
        No staff selected
      </div>
    );
  }

  // Dynamic Styles & Scaling
  const scaleFactor = width / 450;
  const margin3mm = width * (3 / 85.60); // 3 mm internal margin scaled proportionally
  const fontClass = activeTemplate.font_family === 'Courier' 
    ? 'font-mono' 
    : activeTemplate.font_family === 'Inter' 
      ? 'font-sans' 
      : 'font-outfit';

  const isTeachingStaff = /teacher|head|director|principal/.test(staff.designation?.toLowerCase());

  // Watermark sizing for repeating security pattern
  const logoPatternSize = 
    activeTemplate.watermark_size === 'small' ? 60 :
    activeTemplate.watermark_size === 'medium' ? 80 :
    activeTemplate.watermark_size === 'xl' || activeTemplate.watermark_size === 'extra-large' || activeTemplate.watermark_size === 'extra_large' ? 120 : 100;

  const logoImgSize = 
    activeTemplate.watermark_size === 'small' ? 35 :
    activeTemplate.watermark_size === 'medium' ? 50 :
    activeTemplate.watermark_size === 'xl' || activeTemplate.watermark_size === 'extra-large' || activeTemplate.watermark_size === 'extra_large' ? 80 : 65;

  // Custom Uganda ID inspired pastel pattern background SVG
  const backgroundPattern = (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.24] z-0" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={activeTemplate.theme_color_primary} strokeWidth="0.5" strokeOpacity="0.4"/>
        </pattern>
        <pattern id="microtextPattern" width="280" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
          <text x="0" y="12" fontFamily="monospace" fontSize="3.5" fill={activeTemplate.theme_color_primary} opacity="0.35" fontWeight="bold">
            ST. PAUL SENIOR SECONDARY SCHOOL ST. PAUL SENIOR SECONDARY SCHOOL
          </text>
        </pattern>
        {schoolSettings.school_logo_url && (
          <pattern 
            id="logoWatermarkPattern" 
            width={logoPatternSize} 
            height={logoPatternSize} 
            patternUnits="userSpaceOnUse" 
            patternTransform="rotate(-20)"
          >
            <image 
              href={schoolSettings.school_logo_url} 
              x={(logoPatternSize - logoImgSize) / 2} 
              y={(logoPatternSize - logoImgSize) / 2} 
              width={logoImgSize} 
              height={logoImgSize} 
              opacity={activeTemplate.watermark_opacity !== undefined ? Number(activeTemplate.watermark_opacity) : 0.08} 
            />
          </pattern>
        )}
        <radialGradient id="cardGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.8" />
        </radialGradient>
      </defs>
      
      {/* Soft color curves */}
      <path d="M-10,120 Q60,40 180,110 T380,50 T480,90 L480,320 L-10,320 Z" fill="url(#cardGrad)" opacity="0.6"/>
      <path d="M-20,150 Q100,20 220,130 T420,90 T500,160" fill="none" stroke={activeTemplate.theme_color_primary} strokeWidth="1" opacity="0.2"/>
      <path d="M-10,180 Q80,50 200,160 T400,120 T520,180" fill="none" stroke="#f59e0b" strokeWidth="0.75" opacity="0.25"/>
      <path d="M0,80 C150,150 250,-50 480,100" fill="none" stroke={activeTemplate.theme_color_primary} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3"/>
      
      {/* Fine Guilloche Rosette - Concentric Rotated Ellipses */}
      <g stroke={activeTemplate.theme_color_primary} strokeWidth="0.3" fill="none" opacity="0.2">
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(0, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(15, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(30, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(45, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(60, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(75, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(90, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(105, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(120, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(135, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(150, 240, 160)" />
        <ellipse cx="240" cy="160" rx="140" ry="60" transform="rotate(165, 240, 160)" />
      </g>

      {/* Guilloche style circles */}
      <circle cx="240" cy="160" r="110" fill="none" stroke={activeTemplate.theme_color_primary} strokeWidth="0.5" strokeOpacity="0.15" />
      <circle cx="240" cy="160" r="95" fill="none" stroke={activeTemplate.theme_color_primary} strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="2 2" />
      <circle cx="240" cy="160" r="80" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.15" />

      {/* Grid Pattern overlay */}

      {/* Repeating Microtext security pattern */}
      <rect width="100%" height="100%" fill="url(#microtextPattern)" />

      {/* Grid Pattern overlay */}
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );

  return (
    <div 
      ref={cardRef}
      className={`relative bg-gradient-to-br from-slate-50 to-sky-100/60 shadow-xl overflow-hidden select-none border border-slate-300 rounded-[18px] text-slate-800 print:border-none print:shadow-none print:rounded-none ${fontClass}`}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        fontSize: `${width / 450 * 12}px` // Scale font sizes dynamically with card width
      }}
    >
      {/* CARD FRONT SIDE */}
      {side === 'front' && (
        <div 
          className="absolute inset-0 flex flex-col h-full justify-between z-10 border"
          style={{ 
            padding: `${margin3mm}px`,
            margin: `${margin3mm / 2}px`,
            borderRadius: '14px',
            borderColor: `${activeTemplate.theme_color_primary}40`
          }}
        >
          
          {/* Subtle Security Background Pattern */}
          {backgroundPattern}

          {/* Micro-printing Security Lines */}
          <span className="absolute left-[3px] top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[4.5px] tracking-[2px] text-slate-400/35 font-mono select-none pointer-events-none uppercase z-0">
            ST. PAUL SEC SCH ID SECURITY DOCUMENT
          </span>
          <span className="absolute right-[3px] top-1/2 -translate-y-1/2 rotate-90 origin-right text-[4.5px] tracking-[2px] text-slate-400/35 font-mono select-none pointer-events-none uppercase z-0">
            VERIFY VIA SECURITY QR CODE ON CARD
          </span>



          {/* Card Header */}
          <div className="flex items-center gap-[2%] border-b pb-[1%] z-10" style={{ borderColor: activeTemplate.theme_color_primary }}>
            {schoolSettings.school_logo_url ? (
              <img 
                src={schoolSettings.school_logo_url} 
                alt="Logo" 
                className="object-contain flex-shrink-0" 
                style={{ 
                  width: `${(activeTemplate.logo_size || 67) * scaleFactor}px`, 
                  height: `${(activeTemplate.logo_size || 67) * scaleFactor}px`
                }}
              />
            ) : (
              <div className="w-[10%] aspect-square rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs" style={{ minWidth: '32px' }}>SP</div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h2 
                className="font-black leading-none uppercase tracking-wide text-[108%]" 
                style={{ color: activeTemplate.theme_color_primary }}
              >
                {schoolSettings.school_name}
              </h2>
              <p className="text-[65%] text-slate-700 font-bold uppercase tracking-wider mt-1.5 leading-none">
                {schoolSettings.school_address}
              </p>
            </div>
            <div className="text-right self-center">
              <span 
                className="inline-block px-[5px] py-[1.5px] rounded text-[62%] font-extrabold uppercase tracking-widest text-white shadow-sm"
                style={{ backgroundColor: activeTemplate.theme_color_primary }}
              >
                Staff
              </span>
            </div>
          </div>

          {/* Card Body Contents */}
          <div ref={bodyRef} className="flex flex-1 py-0 gap-[3%] relative z-10">
            
            {/* Draggable Photo Container */}
            <div 
              className={`absolute border-2 bg-white flex items-center justify-center overflow-hidden shadow-md ${
                isDesignerMode ? 'draggable-element border-solid border-sky-500/80 cursor-move' : ''
              }`}
              style={{
                left: `${positions.photo.x}%`,
                top: `${positions.photo.y}%`,
                width: '22%',
                aspectRatio: '3/4',
                maxHeight: '75%',
                borderRadius: '8px',
                zIndex: activeDragElement === 'photo' ? 50 : 20,
                borderColor: activeTemplate.theme_color_primary
              }}
              onMouseDown={(e) => handleMouseDown(e, 'photo')}
            >
              {staff.photo_url ? (
                <img src={staff.photo_url} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[8px] text-slate-400 p-1 text-center bg-slate-50">
                  <span>No Photo</span>
                  <span>(Upload in Registration)</span>
                </div>
              )}
            </div>

            {/* Holographic Security Seal */}
            {schoolSettings.school_logo_url && (
              <div 
                className="absolute overflow-hidden rounded-full border border-white/50 shadow-lg flex items-center justify-center pointer-events-none select-none z-30 animate-pulse"
                style={{
                  left: `${positions.photo.x + 16.5}%`,
                  top: `${positions.photo.y + 22}%`,
                  width: '9%',
                  aspectRatio: '1',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(186, 230, 253, 0.8) 25%, rgba(244, 197, 247, 0.75) 50%, rgba(187, 247, 208, 0.8) 75%, rgba(255, 255, 255, 0.95) 100%)',
                  mixBlendMode: 'overlay',
                  boxShadow: '0 0 10px rgba(14, 165, 233, 0.6), inset 0 0 6px rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'hue-rotate(60deg) saturate(2.0)',
                  opacity: 0.9
                }}
              >
                <img 
                  src={schoolSettings.school_logo_url} 
                  alt="Hologram Seal" 
                  className="w-[75%] h-[75%] object-contain opacity-80 filter brightness-125 contrast-150 saturate-200 hue-rotate-[160deg]"
                />
              </div>
            )}

            {/* Middle Section: Staff Particulars */}
            <div 
              className="flex-1 flex flex-col justify-start select-none"
              style={{
                marginLeft: '31%', // offset past the absolute photo (ends at 29%)
                marginRight: '24.5%', // limit width so details do not overlap QR code area (starts at 76.5%)
                paddingTop: '0.5%' // Shift details upward slightly for a tighter and more professional layout
              }}
            >
              <div 
                className="w-[90%] mb-[2.5%] px-[4%] py-[1.2%] rounded-lg bg-gradient-to-r from-blue-700 to-sky-600 border border-white/20 shadow-md shadow-blue-900/20 flex items-center justify-center select-none"
              >
                <span className="text-white text-[60%] font-black tracking-widest uppercase font-outfit text-center leading-none">
                  STAFF IDENTITY CARD
                </span>
              </div>

              <div className="grid grid-cols-[42%_58%] gap-x-3 gap-y-2 text-[82%] text-slate-800 relative min-h-[120px]">
                <span className="text-slate-700 font-extrabold uppercase tracking-[0.16em]">NAME:</span>
                <span className="font-medium text-[100%] text-slate-900 uppercase leading-tight pl-1">{staff.full_name?.toUpperCase()}</span>

                <span className="text-slate-700 font-extrabold uppercase tracking-[0.16em]">STAFF NO:</span>
                <span className="font-medium text-slate-900 uppercase pl-1">{staff.staff_number?.toUpperCase()}</span>

                <span className="text-slate-700 font-extrabold uppercase tracking-[0.16em]">DESIGNATION:</span>
                <span className="font-medium text-slate-900 uppercase pl-1">{staff.designation?.toUpperCase()}</span>

                <span className="text-slate-700 font-extrabold uppercase tracking-[0.16em]">DEPARTMENT:</span>
                <span className="font-medium text-slate-900 uppercase pl-1">{staff.department?.toUpperCase()}</span>

                <span className="text-slate-700 font-extrabold uppercase tracking-[0.16em]">GENDER:</span>
                <span className="font-medium text-slate-900 uppercase pl-1">{staff.gender?.toUpperCase()}</span>

                {isTeachingStaff && staff.subjects && (
                  <>
                    <span className="text-slate-700 font-extrabold uppercase tracking-[0.16em]">SUBJECTS:</span>
                    <span className="font-medium text-slate-900 uppercase pl-1">{staff.subjects?.toUpperCase()}</span>
                  </>
                )}
              </div>
            </div>

            {/* Draggable QR Verification Container */}
            <div 
              className={`absolute bg-white p-[1.5%] flex flex-col items-center justify-center shadow-md rounded-xl border-2 ${
                isDesignerMode ? 'draggable-element border-solid border-sky-500/80 cursor-move' : ''
              }`}
              style={{
                left: `${positions.qr.x}%`,
                top: `${positions.qr.y}%`,
                width: '16.5%',
                zIndex: activeDragElement === 'qr' ? 50 : 20,
                borderColor: activeTemplate.theme_color_primary
              }}
              onMouseDown={(e) => handleMouseDown(e, 'qr')}
            >
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-full aspect-square" />
              ) : (
                <div className="w-full aspect-square bg-slate-100 flex items-center justify-center" />
              )}
              <span className="text-[38%] font-bold uppercase mt-0.5 tracking-wider text-center block w-full whitespace-nowrap" style={{ color: activeTemplate.theme_color_primary }}>
                SCAN TO VERIFY
              </span>
            </div>

          </div>

          {/* Card Footer: Divided into 4 equal columns with vertical dividers */}
          <div className="flex border-t border-slate-350 text-[76%] font-semibold text-slate-600 relative z-10 items-stretch h-[18%] mt-0.5">
            
            {/* Column 1: ISSUE DATE */}
            <div className="flex-1 flex flex-col justify-center items-center py-0.5 text-center">
              <span className="text-[78%] font-extrabold uppercase tracking-wider leading-none" style={{ color: activeTemplate.theme_color_primary }}>ISSUE DATE</span>
              <strong className="text-black text-[95%] mt-1 font-mono font-bold">
                {(() => {
                  if (staff.issue_date !== undefined) {
                    if (!staff.issue_date) return '';
                    const parts = staff.issue_date.split('-');
                    if (parts.length === 3) {
                      return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    return staff.issue_date;
                  }
                  const issue = staff.created_at ? staff.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
                  const [y, m, d] = issue.split('-');
                  return `${d}/${m}/${y}`;
                })()}
              </strong>
            </div>

            <div className="w-[1px] bg-slate-350 self-stretch my-1"></div>

            {/* Column 2: HOLDER'S SIGNATURE */}
            <div className="flex-1 flex flex-col justify-center items-center py-0.5 text-center">
              <span className="text-[78%] font-extrabold uppercase tracking-wider leading-none" style={{ color: activeTemplate.theme_color_primary }}>HOLDER'S SIGNATURE</span>
              <div className="h-7 flex items-center justify-center mt-1 w-full">
                {staff.signature_url ? (
                  <img 
                    src={staff.signature_url} 
                    alt="Holder Signature" 
                    className="max-h-full object-contain max-w-[140px] w-full filter brightness-[0.85] contrast-[1.25]" 
                  />
                ) : (
                  <div className="h-0.5 w-[85%] border-b border-solid border-slate-350" />
                )}
              </div>
            </div>

            <div className="w-[1px] bg-slate-350 self-stretch my-1"></div>

            {/* Column 3: AUTHORISED SIGNATURE */}
            <div className="flex-1 flex flex-col justify-center items-center py-0.5 text-center">
              <span className="text-[78%] font-extrabold uppercase tracking-wider leading-none" style={{ color: activeTemplate.theme_color_primary }}>AUTHORISED SIGNATURE</span>
              <div className="h-7 flex items-center justify-center mt-1 w-full">
                {schoolSettings.school_stamp_url ? (
                  <img 
                    src={schoolSettings.school_stamp_url} 
                    alt="Authorised Stamp/Sign" 
                    className="max-h-full object-contain max-w-[140px] w-full filter brightness-[0.85] contrast-[1.25]" 
                  />
                ) : (
                  <div className="h-0.5 w-[85%] border-b border-solid border-slate-350" />
                )}
              </div>
            </div>

            <div className="w-[1px] bg-slate-350 self-stretch my-1"></div>

            {/* Column 4: EXPIRY DATE */}
            <div className="flex-1 flex flex-col justify-center items-center py-0.5 text-center">
              <span className="text-[78%] font-extrabold uppercase tracking-wider leading-none" style={{ color: activeTemplate.theme_color_primary }}>EXPIRY DATE</span>
              <strong className="text-rose-700 text-[95%] mt-1 font-mono font-bold">
                {(() => {
                  if (staff.expiry_date !== undefined) {
                    if (!staff.expiry_date) return '';
                    const parts = staff.expiry_date.split('-');
                    if (parts.length === 3) {
                      return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    return staff.expiry_date;
                  }
                  const issue = staff.created_at ? staff.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
                  const [y, m, d] = issue.split('-');
                  return `${d}/${m}/${parseInt(y) + 5}`;
                })()}
              </strong>
            </div>

          </div>

        </div>
      )}

      {/* CARD BACK SIDE */}
      {side === 'back' && (
        <div 
          className="absolute inset-0 flex flex-col h-full justify-between z-10 bg-gradient-to-br from-slate-100 to-sky-50"
          style={{ padding: `${margin3mm}px` }}
        >
          
          {/* Subtle Security Background Pattern */}
          {backgroundPattern}

          {/* Watermark Logo (Center background - slightly larger) */}
          {schoolSettings.school_logo_url && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.06]">
              <img 
                src={schoolSettings.school_logo_url} 
                alt="Watermark" 
                className="w-[50%] h-[50%] object-contain"
              />
            </div>
          )}

          {/* Header Banner */}
          <div className="flex justify-between items-start border-b pb-2 border-slate-200 z-10">
            <div>
              <h3 className="font-extrabold uppercase text-[100%] text-slate-900">{schoolSettings.school_name}</h3>
              <p className="text-[75%] text-slate-500 font-semibold">{schoolSettings.school_address}</p>
            </div>
            <div className="text-right text-[75%] font-bold text-slate-600">
              ID Card Number: <span className="text-slate-900 font-mono font-bold">{staff.card_number}</span>
            </div>
          </div>

          {/* Rules and Statement */}
          <div className="my-auto text-[80%] leading-relaxed text-slate-700 font-medium space-y-1.5 z-10">
            <p className="font-bold text-slate-900 underline">CARD OWNERSHIP STATEMENT & RULES:</p>
            <p>1. This card is the property of St. Paul Secondary School, Nasuti.</p>
            <p>2. If found, please return to the school administration office at the address listed above.</p>
            <p>3. Loss of this card must be reported immediately to the School Principal or Head of Administration.</p>
          </div>

          {/* Contacts, Barcode and Ownership Statement */}
          <div className="flex justify-between items-end border-t pt-2 border-slate-200 z-10">
            <div className="text-[70%] text-slate-500 font-semibold space-y-0.5">
              <div>
                <span>TEL:</span> <strong className="text-slate-800">{schoolSettings.telephone}</strong>
              </div>
              <div>
                <span>EMAIL:</span> <strong className="text-slate-800">{schoolSettings.email}</strong>
              </div>
              {staff.serial_number && (
                <div>
                  <span>SERIAL:</span> <strong className="text-slate-800">{staff.serial_number}</strong>
                </div>
              )}
            </div>

            {/* Dynamic vector barcode representation */}
            <div className="w-[45%] max-w-[200px]">
              <BarcodeSVG value={staff.card_number} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
