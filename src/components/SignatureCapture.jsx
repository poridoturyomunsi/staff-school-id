import { useState, useRef, useEffect, useCallback } from 'react';
import { PenTool, Upload, RefreshCw, Sparkles } from 'lucide-react';
import { makeSignatureTransparent } from '../utils/canvasHelpers';

export default function SignatureCapture({ signatureUrl, onSignatureProcessed, label = "Staff Signature" }) {
  const [mode, setMode] = useState('draw'); // 'draw' | 'upload'
  const [rawSignature, setRawSignature] = useState(null); // base64 source
  const [threshold, setThreshold] = useState(210);
  const [isDrawing, setIsDrawing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // Start with white background so transparency filter works standard
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setRawSignature(null);
      onSignatureProcessed('');
    }
  }, [onSignatureProcessed]);

  const applyFilters = useCallback(async () => {
    setProcessing(true);
    try {
      const result = await makeSignatureTransparent(rawSignature, threshold);
      onSignatureProcessed(result);
    } catch (err) {
      console.error("Signature transparency conversion error:", err);
    }
    setProcessing(false);
  }, [rawSignature, threshold, onSignatureProcessed]);

  // Initialize canvas with basic styles
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Set line style
      ctx.strokeStyle = '#0284c7'; // Deep blue ink
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      clearCanvas();
    }
  }, [mode, clearCanvas]);

  // Re-process when filter parameters change
  useEffect(() => {
    if (rawSignature) {
      const timer = setTimeout(() => {
        applyFilters();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [rawSignature, threshold, applyFilters]);

  // Canvas Drawing
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Get mouse or touch coords
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Convert canvas to image
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setRawSignature(dataUrl);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawSignature(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setRawSignature(null);
    setThreshold(210);
    onSignatureProcessed('');
    if (mode === 'draw') {
      clearCanvas();
    }
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 backdrop-blur-sm shadow-inner">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-sky-400" />
          {label} Module
        </span>
        {rawSignature && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
            Captured
          </span>
        )}
      </h3>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-4">
        <button
          type="button"
          onClick={() => {
            setMode('draw');
          }}
          className={`flex-1 pb-2 text-xs font-semibold text-center transition-all ${
            mode === 'draw' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <PenTool className="h-3.5 w-3.5 inline mr-1" />
          Draw Canvas
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('upload');
          }}
          className={`flex-1 pb-2 text-xs font-semibold text-center transition-all ${
            mode === 'upload' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Upload className="h-3.5 w-3.5 inline mr-1" />
          Upload Image
        </button>
      </div>

      {/* Draw Mode */}
      {mode === 'draw' && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={350}
            height={130}
            className="w-full h-32 bg-white rounded-xl border border-slate-600 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-500 font-medium">Draw signature inside the white box</span>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Clear Box
            </button>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && !rawSignature && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-solid border-slate-700 hover:border-sky-500 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 text-center"
        >
          <Upload className="h-8 w-8 text-slate-400 mb-2" />
          <span className="text-xs text-slate-300 font-semibold">Upload signature scan or photo</span>
          <span className="text-[9px] text-slate-500 mt-1">Accepts PNG, JPG, or SVG</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      )}

      {/* Editor & Filter Controls */}
      {rawSignature && (
        <div className="space-y-4 mt-4 border-t border-slate-700/60 pt-4">
          <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
            {/* Processed Live Preview */}
            <div className="w-24 h-12 bg-white border border-slate-300 rounded flex items-center justify-center relative overflow-hidden flex-shrink-0">
              {/* Checkerboard transparent background style */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(#000 20%, transparent 20%), radial-gradient(#000 20%, transparent 20%)',
                  backgroundPosition: '0 0, 4px 4px',
                  backgroundSize: '8px 8px'
                }}
              />
              {signatureUrl ? (
                <img src={signatureUrl} alt="Transparent Signature" className="max-h-full max-w-full object-contain relative z-10" />
              ) : (
                <div className="w-4 h-4 border-t-2 border-sky-500 animate-spin rounded-full" />
              )}
              {processing && (
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center z-20">
                  <div className="w-4 h-4 border-b-2 border-white animate-spin rounded-full" />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between self-stretch">
              <div className="text-xs font-bold text-slate-200">Signature Processed</div>
              <div className="text-[9px] text-slate-400">Background removed to transparent PNG. Auto-scaled for PVC printing.</div>
              <button
                type="button"
                onClick={handleReset}
                className="self-start text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1"
              >
                <RefreshCw className="h-3 w-3" /> Clear & Redo
              </button>
            </div>
          </div>

          {/* Threshold adjustment for transparency */}
          <div className="space-y-2 bg-slate-900/30 p-3 rounded-xl border border-slate-700/60">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
              <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-sky-400" /> Background removal threshold</span>
              <span>{threshold}</span>
            </div>
            <input
              type="range"
              min="100"
              max="245"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="text-[9px] text-slate-500">Lower values protect light ink colors. Higher values clear light borders and paper grains.</div>
          </div>
        </div>
      )}
    </div>
  );
}
