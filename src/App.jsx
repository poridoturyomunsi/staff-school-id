import { useState, useEffect } from 'react';
import { DatabaseProvider } from './context/DatabaseContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StaffDirectory from './components/StaffDirectory';
import CardDesignerPanel from './components/CardDesignerPanel';
import PrintHub from './components/PrintHub';
import SchoolSettings from './components/SchoolSettings';
import QRVerification from './components/QRVerification';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedPrintId, setPreselectedPrintId] = useState(null);
  const [verifyCardNumber, setVerifyCardNumber] = useState(null);

  // Check URL parameters or pathname for QR scan verification
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const verifyVal = decodeURIComponent(path.substring('/verify/'.length));
      if (verifyVal) {
        const timer = setTimeout(() => {
          setVerifyCardNumber(verifyVal);
        }, 0);
        return () => clearTimeout(timer);
      }
    } else {
      const params = new URLSearchParams(window.location.search);
      const verifyVal = params.get('verify');
      if (verifyVal) {
        const timer = setTimeout(() => {
          setVerifyCardNumber(verifyVal);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleBackToApp = () => {
    // Clear URL parameters and path
    window.history.pushState({}, document.title, '/');
    setVerifyCardNumber(null);
  };

  const handlePrintShortcut = (staff) => {
    setPreselectedPrintId(staff.id);
    setActiveTab('printhub');
  };

  // If we leave print hub, clear preselected ID
  useEffect(() => {
    if (activeTab !== 'printhub') {
      const timer = setTimeout(() => {
        setPreselectedPrintId(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // If viewing QR verification page
  if (verifyCardNumber) {
    return (
      <QRVerification 
        cardNumber={verifyCardNumber} 
        onBackToApp={handleBackToApp} 
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
      
      {/* Sidebar - Hide during printing */}
      <div className="no-print">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 no-print-layout relative">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Tab Renderers */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              setActiveTab={setActiveTab} 
              onPrintSingle={handlePrintShortcut} 
            />
          )}

          {activeTab === 'directory' && (
            <StaffDirectory 
              onPrintSingle={handlePrintShortcut} 
            />
          )}

          {activeTab === 'designer' && (
            <CardDesignerPanel />
          )}

          {activeTab === 'printhub' && (
            <PrintHub 
              preselectedStaffId={preselectedPrintId} 
            />
          )}

          {activeTab === 'settings' && (
            <SchoolSettings />
          )}

        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
