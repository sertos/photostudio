import React, { useState, useRef, useEffect } from 'react';
import { ActionType, ProcessingState, EditedResult, MusicTrack } from './types';
import { ICONS, MUSIC_OPTIONS, ACTION_PROMPTS } from './constants';
import { Button } from './components/Button';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { editImageWithGemini, animateImageWithVeo } from './services/geminiService';

const MAX_TRIALS = 3;
const STORAGE_KEY = 'solvra_photo_trials_count';

const SAMPLE_IMAGES = [
  {
    name: 'Retrato Vintage (1950s)',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    type: 'Restaurar / Colorear',
  },
  {
    name: 'Retrato Exterior',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    type: 'LinkedIn / Sin Reflejos',
  },
  {
    name: 'Paisaje Natural',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    type: 'Animar / Mejorar',
  }
];

export const App: React.FC = () => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<EditedResult | null>(null);
  const [history, setHistory] = useState<EditedResult[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Track trial count (max 3 tests allowed)
  const [trialsUsed, setTrialsUsed] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), MAX_TRIALS);
      }
    } catch {
      // ignore storage errors
    }
    return 0;
  });

  const [processingState, setProcessingState] = useState<ProcessingState>({
    isLoading: false,
    statusMessage: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  const remainingTrials = Math.max(0, MAX_TRIALS - trialsUsed);
  const isTrialLimitReached = trialsUsed >= MAX_TRIALS;

  // Clean up Blob URLs on unmount or replace
  useEffect(() => {
    return () => {
      if (result?.type === 'video' && result.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(result.dataUrl);
      }
    };
  }, [result]);

  // Handle music playback when video result is present
  useEffect(() => {
    if (result?.type === 'video' && selectedMusic && audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.log("Auto-play prevented by browser policy", e));
    }
  }, [result, selectedMusic]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setResult(null);
      setHistory([]);
      setErrorMessage(null);
      setSuccessMessage(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const loadSampleImage = async (url: string, name: string) => {
    try {
      setProcessingState({ isLoading: true, statusMessage: 'Cargando foto de muestra...' });
      setErrorMessage(null);
      const res = await fetch(url);
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      setPreviewUrl(localUrl);
      setSelectedFileName(name);
      setResult(null);
      setHistory([]);
    } catch (e: any) {
      setErrorMessage("No se pudo cargar la imagen de muestra.");
    } finally {
      setProcessingState({ isLoading: false, statusMessage: '' });
    }
  };

  // Convert url (Blob URL or remote) to Base64
  const getBase64FromUrl = async (url: string): Promise<{ base64: string, mimeType: string }> => {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const match = parts[0].match(/:(.*?);/);
      const mimeType = match ? match[1] : 'image/png';
      return { base64: parts[1], mimeType };
    }

    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const parts = base64String.split(',');
        const match = parts[0].match(/:(.*?);/);
        const mimeType = (match && match[1]) ? match[1] : (blob.type || 'image/jpeg');
        resolve({ base64: parts[1], mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper to resize image and get aspect ratio for video animation
  const optimizeImageForVideo = (base64: string, mimeType: string): Promise<{ base64: string, mimeType: string, ratio: '16:9' | '9:16' }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;
        const ratio: '16:9' | '9:16' = width >= height ? '16:9' : '9:16';

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          } else {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }

        if (width % 2 !== 0) width--;
        if (height % 2 !== 0) height--;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const newDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const parts = newDataUrl.split(',');
        resolve({ base64: parts[1], mimeType: 'image/jpeg', ratio });
      };
      
      img.onerror = () => resolve({ base64, mimeType, ratio: '9:16' });
      img.src = `data:${mimeType};base64,${base64}`;
    });
  };

  const handleAction = async (action: ActionType, overridePrompt?: string) => {
    // Check if user has exceeded max trials
    if (isTrialLimitReached) {
      setErrorMessage("Has alcanzado el límite de 3 pruebas permitidas para esta demostración con el fin de proteger el consumo de tokens.");
      return;
    }

    // Determine active source image (either last edited result or original preview)
    const sourceUrl = result?.dataUrl || previewUrl;
    
    if (!sourceUrl) {
      setErrorMessage("Por favor sube o selecciona una foto primero.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const isVideo = action === ActionType.ANIMATE;
    setProcessingState({
      isLoading: true,
      statusMessage: isVideo 
        ? 'Generando video cinematográfico con Google Veo...' 
        : 'Procesando y mejorando foto con Gemini IA...'
    });

    try {
      let { base64, mimeType } = await getBase64FromUrl(sourceUrl);
      let res: EditedResult;

      if (isVideo) {
        const optimized = await optimizeImageForVideo(base64, mimeType);
        base64 = optimized.base64;
        mimeType = optimized.mimeType;
        const targetAspectRatio = optimized.ratio;

        const prompt = overridePrompt || ACTION_PROMPTS[ActionType.ANIMATE];
        res = await animateImageWithVeo(base64, mimeType, prompt, targetAspectRatio);
      } else {
        res = await editImageWithGemini(base64, mimeType, action, overridePrompt);
      }

      if (result) {
        setHistory(prev => [...prev, result]);
      }
      setResult(res);

      // Increment trials count and persist
      const newTrialsUsed = Math.min(trialsUsed + 1, MAX_TRIALS);
      setTrialsUsed(newTrialsUsed);
      try {
        localStorage.setItem(STORAGE_KEY, newTrialsUsed.toString());
      } catch {
        // ignore
      }

      const remainingAfter = MAX_TRIALS - newTrialsUsed;
      const trialNotice = remainingAfter > 0 
        ? ` (Te quedan ${remainingAfter} de ${MAX_TRIALS} pruebas)` 
        : ' (Has usado tus 3 pruebas de demostración)';

      setSuccessMessage(
        (isVideo ? '¡Video generado exitosamente!' : '¡Foto modificada y mejorada con éxito!') + trialNotice
      );
    } catch (error: any) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      
      if (message.startsWith('Safety Block:')) {
        setErrorMessage(`Restricción de seguridad de Google Veo: ${message.replace('Safety Block: ', '')}`);
      } else {
        setErrorMessage(`Error al procesar la imagen: ${message}`);
      }
    } finally {
      setProcessingState({ isLoading: false, statusMessage: '' });
    }
  };

  const handleCustomPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    if (isTrialLimitReached) {
      setErrorMessage("Has alcanzado el límite de 3 pruebas permitidas.");
      return;
    }
    handleAction(ActionType.ENHANCE, customPrompt.trim());
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setResult(prev);
      setHistory(history.slice(0, -1));
      setSuccessMessage("Cambio deshecho.");
    } else {
      setResult(null);
      setSuccessMessage("Restaurado a la foto original.");
    }
  };

  const handleResetToOriginal = () => {
    setResult(null);
    setHistory([]);
    setSuccessMessage("Restaurado al estado original.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <ProcessingOverlay 
        isVisible={processingState.isLoading} 
        message={processingState.statusMessage} 
      />

      {/* Top Header */}
      <header className="w-full max-w-7xl flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.ENHANCE} />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 tracking-tight">
              Solvra Photo Studio
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">Edición fotográfica, restauración y animación impulsada por IA (Demostración)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Trial Limit Badge */}
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            isTrialLimitReached 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
          }`}>
            <span className="text-sm">{isTrialLimitReached ? '🔒' : '⚡'}</span>
            <span>
              {isTrialLimitReached ? 'Límite de pruebas alcanzado' : `Pruebas restantes: ${remainingTrials} de ${MAX_TRIALS}`}
            </span>
          </div>

          {previewUrl && (
            <button
              onClick={() => {
                setResult(null);
                setPreviewUrl(null);
                setSelectedFileName(null);
                setSelectedMusic(null);
                setHistory([]);
                setErrorMessage(null);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.CLOSE} />
              </svg>
              Nueva Imagen
            </button>
          )}
        </div>
      </header>

      {/* Trial Limit Notice Banner if maxed out */}
      {isTrialLimitReached && (
        <div className="w-full max-w-7xl mb-6 p-4 bg-amber-950/60 border border-amber-600/40 rounded-2xl flex items-center justify-between gap-3 text-amber-200 text-xs sm:text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-bold text-amber-300">Límite de 3 pruebas alcanzado:</span> Has completado el máximo de 3 pruebas permitidas en esta demo para proteger el consumo de tokens. Puedes seguir explorando y comparando el resultado en pantalla.
            </div>
          </div>
        </div>
      )}

      {/* Notification / Toast Banner */}
      {errorMessage && (
        <div className="w-full max-w-7xl mb-6 p-4 bg-red-950/80 border border-red-700/50 rounded-2xl flex items-start justify-between gap-3 text-red-200 text-sm backdrop-blur-sm animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-red-300">Aviso del sistema:</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200 p-1">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="w-full max-w-7xl mb-6 p-3 bg-emerald-950/80 border border-emerald-700/50 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 text-sm backdrop-blur-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 p-1">
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="w-full max-w-7xl flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left / Center: Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative group bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden aspect-[4/3] flex items-center justify-center shadow-2xl">
            
            {!previewUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div 
                  className="w-full max-w-md p-8 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-900/50 hover:bg-slate-800/40 transition-all flex flex-col items-center justify-center group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.UPLOAD} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    Sube una foto aquí
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Haz clic o arrastra un archivo (JPG, PNG, WEBP, HEIC)</p>
                </div>

                <div className="mt-6 flex flex-col items-center w-full max-w-md">
                  <p className="text-xs text-slate-500 mb-2 font-medium">O prueba con una foto de ejemplo:</p>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {SAMPLE_IMAGES.map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => loadSampleImage(sample.url, sample.name)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-left transition-all group flex flex-col items-center"
                      >
                        <img src={sample.url} alt={sample.name} className="w-full h-14 object-cover rounded-lg mb-1" />
                        <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center">{sample.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {result?.type === 'video' ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video 
                      src={result.dataUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="max-w-full max-h-full object-contain"
                    />
                    {selectedMusic && (
                      <audio 
                        ref={audioRef}
                        src={selectedMusic.url} 
                        loop 
                        autoPlay
                      />
                    )}
                  </div>
                ) : (
                  <>
                    {/* Compare Split View if result is present and compare mode enabled */}
                    {result && compareMode ? (
                      <div 
                        ref={compareContainerRef}
                        className="relative w-full h-full select-none cursor-ew-resize overflow-hidden"
                        onMouseMove={(e) => {
                          if (compareContainerRef.current) {
                            const rect = compareContainerRef.current.getBoundingClientRect();
                            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                            setSliderPosition((x / rect.width) * 100);
                          }
                        }}
                      >
                        {/* Original Image (Background) */}
                        <img 
                          src={previewUrl} 
                          alt="Original" 
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-300 z-10 border border-slate-700">
                          Original
                        </div>

                        {/* Edited Image (Clipped overlay) */}
                        <div 
                          className="absolute inset-0 overflow-hidden pointer-events-none"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img 
                            src={result.dataUrl} 
                            alt="Modificado" 
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ width: compareContainerRef.current?.clientWidth, maxWidth: 'none' }}
                          />
                        </div>
                        <div className="absolute top-3 right-3 bg-indigo-600/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-semibold text-white z-10 border border-indigo-500">
                          Editado con IA
                        </div>

                        {/* Divider Line */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-20"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-900 text-xs font-bold">
                            ↔
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={result ? result.dataUrl : previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                    )}
                  </>
                )}
                
                {/* Result watermark / Preview badge */}
                {result && (
                  <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-400 border border-slate-800 pointer-events-none z-20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                    <span>Solvra Studio • Vista Previa</span>
                  </div>
                )}

                {/* Image Actions Overlays */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
                  {result && result.type === 'image' && (
                    <button 
                      onClick={() => setCompareMode(!compareMode)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5 border ${
                        compareMode 
                          ? 'bg-indigo-600 text-white border-indigo-400' 
                          : 'bg-black/60 text-slate-200 hover:bg-black/80 border-slate-700'
                      }`}
                    >
                      <span>↔</span> {compareMode ? 'Vista normal' : 'Comparar Antes/Después'}
                    </button>
                  )}

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors border border-slate-700"
                    title="Cambiar foto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.UPLOAD} />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>
          
          {/* Status and Action Buttons Toolbar */}
          <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 px-2 gap-2 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-200">
                {selectedFileName || 'Sin archivo seleccionado'}
              </span>
              {result && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold">
                  {result.type === 'video' ? 'Video generado' : 'Foto modificada'}
                </span>
              )}
            </div>

            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                >
                  ↩ Deshacer
                </button>
                <button
                  onClick={handleResetToOriginal}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                >
                  ↺ Ver Original
                </button>
              </div>
            )}
          </div>

          {/* Custom Prompt Box for Custom AI Modification */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-indigo-400">✨</span> Instrucción personalizada con IA
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {isTrialLimitReached ? 'Límite alcanzado' : `${remainingTrials} pruebas disponibles`}
              </span>
            </label>
            <form onSubmit={handleCustomPromptSubmit} className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={isTrialLimitReached ? "Límite de 3 pruebas alcanzado" : "Ej: 'Añadir gafas de sol', 'Poner fondo de playa', 'Mejorar nitidez'..."}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached}
              />
              <button
                type="submit"
                disabled={!previewUrl || !customPrompt.trim() || processingState.isLoading || isTrialLimitReached}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>

        {/* Right: Controls & Presets */}
        <div className="lg:col-span-5 flex flex-col gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm h-fit">
          
          {/* Trial quota status bar */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span>⚡</span> Cuota de demostración:
              </span>
              <span className={`font-bold ${isTrialLimitReached ? 'text-amber-400' : 'text-indigo-400'}`}>
                {trialsUsed} / {MAX_TRIALS} usadas
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isTrialLimitReached ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${(trialsUsed / MAX_TRIALS) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {isTrialLimitReached 
                ? 'Has alcanzado el límite de 3 pruebas permitidas para cuidar los tokens.' 
                : `Tienes ${remainingTrials} de ${MAX_TRIALS} pruebas para transformar tus fotos.`}
            </p>
          </div>

          {/* Section 1: Fix & Repair */}
          <div>
            <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Restauración y Limpieza
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.RESTORE)}
                iconPath={ICONS.RESTORE}
                title="Restaura rostros desenfocados y detalles generales"
              >
                Restaurar Rostro
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.REPAIR_DAMAGES)}
                iconPath={ICONS.REPAIR_DAMAGES}
                title="Elimina manchas blancas, polvo, arrugas y rayones"
              >
                Arreglar Rayones
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.REMOVE_GLARE)}
                iconPath={ICONS.REMOVE_GLARE}
                title="Quita reflejos molestos y brillos de flash"
              >
                Quitar Reflejos
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.REMOVE_SHADOWS)}
                iconPath={ICONS.REMOVE_SHADOWS}
                title="Suaviza sombras duras en el rostro o fondo"
              >
                Quitar Sombras
              </Button>
            </div>
          </div>

          {/* Section 2: AI Style & Headshot */}
          <div className="border-t border-slate-800/80 pt-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
              Transformación Profesional
            </h2>
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.PROFESSIONAL_HEADSHOT_MALE)}
                iconPath={ICONS.PROFESSIONAL_MALE}
                title="Convierte la foto en retrato profesional para LinkedIn (Hombre)"
              >
                LinkedIn Hombre
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.PROFESSIONAL_HEADSHOT_FEMALE)}
                iconPath={ICONS.PROFESSIONAL_FEMALE}
                title="Convierte la foto en retrato profesional para LinkedIn (Mujer)"
              >
                LinkedIn Mujer
              </Button>
            </div>
            <Button 
              variant="secondary" 
              disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
              onClick={() => handleAction(ActionType.PASTEL_BACKGROUND)}
              iconPath={ICONS.PASTEL_BG}
              className="w-full"
              title="Aísla el sujeto y añade fondo suave en tonos crema o pastel"
            >
              Fondo Pastel / Estudio
            </Button>
          </div>

          {/* Section 3: Light & Color */}
          <div className="border-t border-slate-800/80 pt-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Color, Luz y Nitidez
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.COLORIZE)}
                iconPath={ICONS.COLORIZE}
                title="Colorea fotos en blanco y negro de forma realista"
              >
                Colorear B&N
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.ENHANCE)}
                iconPath={ICONS.ENHANCE}
                title="Mejora inteligente general de iluminación y balance"
              >
                Auto-Mejora
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.SHARPEN)}
                iconPath={ICONS.SHARPEN}
                title="Aumenta nitidez y definición de bordes"
              >
                Nitidez HD
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.BLACK_AND_WHITE)}
                iconPath={ICONS.BW}
                title="Convierte a blanco y negro artístico con alto contraste"
              >
                Blanco y Negro
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.INCREASE_BRIGHTNESS)}
                iconPath={ICONS.BRIGHTNESS}
                title="Aclara fotos oscuras sin quemar luces"
              >
                Más Iluminación
              </Button>
              <Button 
                variant="secondary" 
                disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
                onClick={() => handleAction(ActionType.INCREASE_SATURATION)}
                iconPath={ICONS.SATURATION}
                title="Colores más vivos y llamativos"
              >
                Vibrante
              </Button>
            </div>
          </div>

          {/* Section 4: Video Animation with Veo */}
          <div className="border-t border-slate-800/80 pt-5">
            <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Animar Foto a Video (Veo)
            </h2>
            
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Música de fondo (opcional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MUSIC_OPTIONS.map((track) => (
                  <button
                    key={track.id}
                    disabled={isTrialLimitReached}
                    onClick={() => setSelectedMusic(selectedMusic?.id === track.id ? null : track)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedMusic?.id === track.id
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
                    }`}
                  >
                    {selectedMusic?.id === track.id ? '♪ ' : ''}{track.name}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              variant="primary" 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none shadow-lg shadow-purple-600/20"
              disabled={!previewUrl || processingState.isLoading || isTrialLimitReached} 
              onClick={() => handleAction(ActionType.ANIMATE)}
              iconPath={ICONS.ANIMATE}
            >
              Animar en Video (Google Veo)
            </Button>
          </div>

          {/* Section 5: Demo Mode Notice (Replaces download section) */}
          <div className="border-t border-slate-800/80 pt-5">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Modo Solo Visualización</p>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Las descargas están deshabilitadas en esta versión de demostración. Puedes probar y visualizar los resultados en pantalla con el comparador interactivo hasta un máximo de 3 pruebas.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
