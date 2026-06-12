import { useDatabase } from '../context/DatabaseContext';
import { ShieldCheck, ShieldAlert, User, ArrowLeft } from 'lucide-react';

export default function QRVerification({ cardNumber, onBackToApp }) {
  const { staffList, schoolSettings } = useDatabase();
  
  // Find staff by matching card number or staff number (decoded value)
  const staff = cardNumber 
    ? staffList.find(s => {
        const normalized = cardNumber.trim().toLowerCase();
        return s.card_number?.toLowerCase() === normalized || s.staff_number?.toLowerCase() === normalized;
      }) || null 
    : null;

  const getFormattedDates = (staff) => {
    const format = (date) => {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    };

    // 1. Issue Date
    let issueDateStr = '';
    let issueDateObj = null;
    if (staff.issue_date) {
      const parts = staff.issue_date.split('-');
      if (parts.length === 3) {
        issueDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        issueDateObj = new Date(staff.issue_date);
      } else {
        issueDateStr = staff.issue_date;
      }
    } else if (staff.created_at) {
      issueDateObj = new Date(staff.created_at);
      issueDateStr = format(issueDateObj);
    } else {
      issueDateObj = new Date();
      issueDateStr = format(issueDateObj);
    }

    // 2. Expiry Date
    let expiryDateStr = '';
    let expiryDateObj = null;
    if (staff.expiry_date) {
      const parts = staff.expiry_date.split('-');
      if (parts.length === 3) {
        expiryDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        expiryDateObj = new Date(staff.expiry_date);
      } else {
        expiryDateStr = staff.expiry_date;
      }
    } else if (issueDateObj) {
      expiryDateObj = new Date(issueDateObj);
      expiryDateObj.setFullYear(issueDateObj.getFullYear() + 5);
      expiryDateStr = format(expiryDateObj);
    } else {
      expiryDateObj = new Date();
      expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 5);
      expiryDateStr = format(expiryDateObj);
    }

    const isExpired = expiryDateObj ? new Date() > expiryDateObj : false;

    return {
      issueDateStr,
      expiryDateStr,
      isExpired
    };
  };

  const dates = staff ? getFormattedDates(staff) : null;
  const cardStatus = staff
    ? (staff.status !== 'Active' ? 'Inactive' : (dates?.isExpired ? 'Expired' : 'Active'))
    : null;
  const isValidStaff = cardStatus === 'Active';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-radial-gradient from-sky-950/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center space-y-6">
        
        {/* Subtle decorative security circles */}
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -translate-x-12 translate-y-12 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* School Logo */}
        <div className="flex flex-col items-center">
          {schoolSettings.school_logo_url ? (
            <img 
              src={schoolSettings.school_logo_url} 
              alt="School Logo" 
              className="w-16 h-16 object-contain rounded-full border border-slate-700 bg-slate-800 p-1 mb-2"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-sky-950 border border-sky-850 flex items-center justify-center mb-2 text-sky-400 font-bold text-lg">
              SP
            </div>
          )}
          <h1 className="text-md font-extrabold text-slate-100 uppercase tracking-wide">
            {schoolSettings.school_name}
          </h1>
          <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">
            "{schoolSettings.motto || 'Education for Service'}"
          </p>
        </div>

        {/* Verification Status Title */}
        <div className="border-t border-b border-slate-800/80 py-4 space-y-2 relative z-10">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
            QR CODE VERIFICATION REPORT
          </div>
          
          {staff ? (
            <div className="space-y-3">
              {isValidStaff ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                    <ShieldCheck className="h-9 w-9" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      VALID STAFF ID CARD
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <ShieldAlert className="h-9 w-9" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      INVALID OR INACTIVE STAFF ID CARD
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldAlert className="h-9 w-9" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  INVALID OR INACTIVE STAFF ID CARD
                </span>
              </div>
              <p className="text-xs text-slate-500">The card code does not match any registered records in the school system.</p>
            </div>
          )}
        </div>

        {/* Staff details card */}
        {staff && (
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl text-left space-y-3 relative z-10">
            <div className="flex gap-4">
              {/* Photo */}
              <div className="w-16 h-20 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {staff.photo_url ? (
                  <img src={staff.photo_url} alt="Staff photo" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-slate-700" />
                )}
              </div>
              {/* Main Particulars */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-700 text-sky-400 px-2 py-0.5 rounded self-start">
                  Card No: {staff.card_number}
                </div>
                <h3 className="font-black text-slate-100 text-base mt-2 truncate leading-tight">{staff.full_name}</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">{staff.designation}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{staff.department} Department</p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 space-y-2 text-[11px] font-medium text-slate-400">
              <div className="flex justify-between">
                <span>Staff ID Number:</span>
                <span className="text-slate-200 font-bold">{staff.staff_number}</span>
              </div>
              {staff.serial_number && (
                <div className="flex justify-between">
                  <span>Serial Number:</span>
                  <span className="text-slate-200 font-bold">{staff.serial_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Gender:</span>
                <span className="text-slate-200 font-bold">{staff.gender}</span>
              </div>
              {staff.subjects && (
                <div className="flex justify-between">
                  <span>Subjects:</span>
                  <span className="text-slate-200 font-bold truncate max-w-[200px]">{staff.subjects}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Card Issue Date:</span>
                <span className="text-slate-200 font-bold">{dates.issueDateStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Card Expiry Date:</span>
                <span className={`font-bold ${dates.isExpired ? 'text-rose-400' : 'text-slate-200'}`}>{dates.expiryDateStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Card Status:</span>
                <span className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                  cardStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {cardStatus}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-850 pt-2 text-[9px] text-slate-500">
                <span>Verification Time:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToApp}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Admin Console
          </button>
        </div>

      </div>
    </div>
  );
}
