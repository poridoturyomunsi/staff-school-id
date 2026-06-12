import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RefreshCw, Sun, Crop, Sparkles } from 'lucide-react';
import { processPhoto } from '../utils/canvasHelpers';

export default function PhotoCapture({ photoUrl, onPhotoProcessed }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'webcam'
  const [rawPhoto, setRawPhoto] = useState(null); // base64 source
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // Photo enhancements
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [removeBg, setRemoveBg] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(40);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  const applyFilters = useCallback(async () => {
    setProcessing(true);
    try {
      const result = await processPhoto(
        rawPhoto,
        brightness,
        contrast,
        removeBg,
        bgTolerance
      );
      onPhotoProcessed(result);
    } catch (err) {
      console.error("Error processing photo:", err);
    }
    setProcessing(false);
  }, [rawPhoto, brightness, contrast, removeBg, bgTolerance, onPhotoProcessed]);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream, stopCamera]);

  // Re-process when filters change
  useEffect(() => {
    if (rawPhoto) {
      const timer = setTimeout(() => {
        applyFilters();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [rawPhoto, brightness, contrast, removeBg, bgTolerance, applyFilters]);

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setMode('webcam');
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError('Could not access webcam. Please ensure permissions are granted.');
    }
  };


  const captureSnap = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 640; // Portrait crop standard
      const ctx = canvas.getContext('2d');
      
      // Calculate centered portrait crop from video
      const vWidth = videoRef.current.videoWidth;
      const vHeight = videoRef.current.videoHeight;
      const cropHeight = vHeight;
      const cropWidth = vHeight * (3 / 4); // 3:4 aspect ratio
      const startX = (vWidth - cropWidth) / 2;

      ctx.drawImage(
        videoRef.current,
        startX, 0, cropWidth, cropHeight, // source
        0, 0, canvas.width, canvas.height // destination
      );
      
      const snapUrl = canvas.toDataURL('image/jpeg');
      setRawPhoto(snapUrl);
      stopCamera();
      setMode('upload');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawPhoto(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleReset = () => {
    setRawPhoto(null);
    setBrightness(0);
    setContrast(0);
    setRemoveBg(true);
    setBgTolerance(40);
    onPhotoProcessed('');
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 backdrop-blur-sm shadow-inner">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <Camera className="h-4 w-4 text-sky-400" />
        Passport Photo Module
      </h3>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-4">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setMode('upload');
          }}
          className={`flex-1 pb-2 text-xs font-semibold text-center transition-all ${
            mode === 'upload' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Upload className="h-3.5 w-3.5 inline mr-1" />
          Upload File
        </button>
        <button
          type="button"
          onClick={startCamera}
          className={`flex-1 pb-2 text-xs font-semibold text-center transition-all ${
            mode === 'webcam' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Camera className="h-3.5 w-3.5 inline mr-1" />
          Capture Webcam
        </button>
      </div>

      {/* Upload mode container */}
      {mode === 'upload' && !rawPhoto && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-solid border-slate-700 hover:border-sky-500 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 text-center"
        >
          <Upload className="h-10 w-10 text-slate-400 mb-3" />
          <span className="text-xs text-slate-300 font-semibold">Drag & drop passport photo here</span>
          <span className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, WEBP</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      )}

      {/* Webcam live feed */}
      {mode === 'webcam' && (
        <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[3/4] max-h-[300px] flex items-center justify-center border border-slate-600">
          {cameraActive ? (
            <>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover scale-x-[-1]" 
                playsInline 
                muted 
              />
              {/* Oval Face Crop overlay guide */}
              <div className="absolute inset-0 border-[3px] border-emerald-500/30 rounded-full m-8 pointer-events-none flex items-center justify-center">
                <div className="w-[85%] h-[85%] border border-solid border-emerald-400/30 rounded-full flex flex-col justify-between p-6">
                  <span className="text-[8px] text-center text-emerald-400 uppercase font-black tracking-widest bg-slate-950/80 px-2 py-0.5 rounded self-center mt-2">Align Head Here</span>
                  <span className="text-[8px] text-center text-emerald-400 uppercase font-black tracking-widest bg-slate-950/80 px-2 py-0.5 rounded self-center mb-2">Shoulder line</span>
                </div>
              </div>
              <button
                type="button"
                onClick={captureSnap}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 text-xs font-bold transition-all"
              >
                <Camera className="h-4 w-4" /> Snap Photo
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center p-4 text-center">
              {cameraError ? (
                <p className="text-xs text-rose-400 font-semibold mb-3">{cameraError}</p>
              ) : (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400 mb-3" />
              )}
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-slate-700 text-slate-200 text-xs rounded hover:bg-slate-600"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor & Filters */}
      {rawPhoto && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
            {/* Raw Photo Preview */}
            <div className="w-20 aspect-[3/4] bg-slate-950 rounded border border-slate-600 overflow-hidden flex-shrink-0">
              <img src={rawPhoto} alt="Original" className="w-full h-full object-cover" />
            </div>
            
            {/* Processed Live Preview */}
            <div className="w-20 aspect-[3/4] bg-white rounded border-2 border-sky-500 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
              {photoUrl ? (
                <img src={photoUrl} alt="Processed" className="w-full h-full object-cover" />
              ) : (
                <div className="w-4 h-4 border-t-2 border-sky-500 animate-spin rounded-full" />
              )}
              {processing && (
                <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-b-2 border-white animate-spin rounded-full" />
                </div>
              )}
              <span className="absolute bottom-0.5 right-0.5 bg-sky-500 text-[6px] text-white font-bold px-1 rounded-sm uppercase">Preview</span>
            </div>

            <div className="flex-1 flex flex-col justify-between self-stretch">
              <div className="text-xs font-bold text-slate-200">Adjust Photo Parameters</div>
              <div className="text-[10px] text-slate-400">Processed live using canvas matrices. Adjust filters to enhance results.</div>
              <button
                type="button"
                onClick={handleReset}
                className="self-start text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-2"
              >
                <RefreshCw className="h-3 w-3" /> Reset Image
              </button>
            </div>
          </div>

          {/* Filters controls */}
          <div className="space-y-3 bg-slate-900/30 p-3 rounded-xl border border-slate-700/60">
            {/* Brightness */}
            <div>
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
                <span className="flex items-center gap-1"><Sun className="h-3.5 w-3.5 text-amber-500" /> Brightness</span>
                <span>{brightness > 0 ? `+${brightness}` : brightness}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
                <span className="flex items-center gap-1"><Crop className="h-3.5 w-3.5 text-indigo-400" /> Contrast</span>
                <span>{contrast > 0 ? `+${contrast}` : contrast}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Auto Background Removal Toggle */}
            <div className="border-t border-slate-700/60 pt-3 space-y-2">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  Auto Background Removal (White Key)
                </span>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
              </label>

              {removeBg && (
                <div>
                  <div className="flex justify-between items-center text-[9px] font-medium text-slate-500 mb-1">
                    <span>Tolerance (Background Matching Strength)</span>
                    <span>{bgTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={bgTolerance}
                    onChange={(e) => setBgTolerance(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
