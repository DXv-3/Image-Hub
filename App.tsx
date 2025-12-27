import React, { useState, useEffect, useRef } from 'react';
import ImageUpload from './components/ImageUpload';
import PromptHistory from './components/PromptHistory';
import { 
  generateRelationshipPhoto, 
  generateImage, 
  editImage, 
  generateVideo, 
  analyzeImage,
  analyzeFood,
  deepReasoning,
  generateSpeech
} from './services/geminiService';
import { 
  FileData, 
  AppState, 
  PromptHistoryItem, 
  AppMode, 
  AspectRatio, 
  ImageSize, 
  ResultType 
} from './types';

// Simple Markdown Parser Component
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-bold text-secondary mt-4 mb-2">{line.replace('### ', '')}</h3>;
        if (line.startsWith('## ')) return <h2 key={idx} className="text-xl font-bold text-primary mt-6 mb-2">{line.replace('## ', '')}</h2>;
        if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl font-black text-white mt-8 mb-4 border-b border-white/10 pb-2">{line.replace('# ', '')}</h1>;
        
        // Lists
        if (line.trim().startsWith('- ')) return <li key={idx} className="ml-4 text-gray-300 list-disc">{processText(line.replace('- ', ''))}</li>;
        
        // Sources/Links
        if (line.match(/\[(.*?)\]\((.*?)\)/)) {
           const parts = line.split(/(\[.*?\]\(.*?\))/g);
           return (
             <p key={idx} className="text-gray-300 text-sm leading-relaxed">
               {parts.map((part, pIdx) => {
                 const match = part.match(/\[(.*?)\]\((.*?)\)/);
                 if (match) return <a key={pIdx} href={match[2]} target="_blank" rel="noreferrer" className="text-accent hover:underline">{match[1]}</a>;
                 return processText(part);
               })}
             </p>
           )
        }

        // Standard Text
        if (line.trim() === '') return <br key={idx} />;
        return <p key={idx} className="text-gray-300 text-sm leading-relaxed">{processText(line)}</p>;
      })}
    </div>
  );
};

// Helper to bold text wrapped in **
const processText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const App: React.FC = () => {
  // Global State
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [mode, setMode] = useState<AppMode>(AppMode.COMPOSITE);
  
  // Inputs
  const [bgImage, setBgImage] = useState<FileData | null>(null);
  const [refImage, setRefImage] = useState<FileData | null>(null); // Only for Composite
  const [description, setDescription] = useState<string>('');
  
  // Configs
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Outputs
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [resultContent, setResultContent] = useState<string | null>(null);
  const [resultType, setResultType] = useState<ResultType>('image');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [statusText, setStatusText] = useState<string>("Processing...");
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check API Key
  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
    
    try {
      const savedHistory = localStorage.getItem('natural_insert_history');
      if (savedHistory) setPromptHistory(JSON.parse(savedHistory));
    } catch (e) { console.error(e); }
  }, []);

  const handleApiKeySelect = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      await aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const addToHistory = (text: string) => {
    if (!text.trim()) return;
    setPromptHistory(prev => {
      if (prev.length > 0 && prev[0].text === text) return prev;
      const newItem = { id: crypto.randomUUID(), text: text.trim(), timestamp: Date.now() };
      const newHistory = [newItem, ...prev].slice(0, 20);
      localStorage.setItem('natural_insert_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const getStatusMessage = (m: AppMode) => {
    switch(m) {
        case AppMode.ANIMATE: return "Rendering frames (this may take a moment)...";
        case AppMode.REASON: return "Accessing knowledge base & thinking...";
        case AppMode.ANALYZE: return "Inspecting pixels...";
        case AppMode.CULINARY: return "Identifying ingredients...";
        case AppMode.COMPOSITE: return "Blending realities...";
        default: return "Generating...";
    }
  }

  const handleAction = async () => {
    setAppState(AppState.GENERATING);
    setStatusText(getStatusMessage(mode));
    setErrorMessage(null);
    setResultContent(null);
    setIsPlayingAudio(false);
    
    try {
      let result = '';
      let type: ResultType = 'image';

      switch (mode) {
        case AppMode.COMPOSITE:
          if (!bgImage || !refImage) throw new Error("Missing images");
          result = await generateRelationshipPhoto(bgImage.base64, bgImage.mimeType, refImage.base64, refImage.mimeType, description);
          type = 'image';
          break;
        case AppMode.GENERATE:
          result = await generateImage(description, imageSize, aspectRatio);
          type = 'image';
          break;
        case AppMode.EDIT:
          if (!bgImage) throw new Error("Missing image");
          result = await editImage(bgImage.base64, bgImage.mimeType, description);
          type = 'image';
          break;
        case AppMode.ANIMATE:
          if (!bgImage) throw new Error("Missing image");
          result = await generateVideo(bgImage.base64, bgImage.mimeType, description, aspectRatio);
          type = 'video';
          break;
        case AppMode.ANALYZE:
          if (!bgImage) throw new Error("Missing image");
          result = await analyzeImage(bgImage.base64, bgImage.mimeType, description);
          type = 'text';
          break;
        case AppMode.CULINARY:
          if (!bgImage) throw new Error("Missing food image");
          result = await analyzeFood(bgImage.base64, bgImage.mimeType, description);
          type = 'text';
          break;
        case AppMode.REASON:
          if (!description) throw new Error("Missing prompt");
          result = await deepReasoning(description);
          type = 'text';
          break;
      }

      setResultContent(result);
      setResultType(type);
      setAppState(AppState.SUCCESS);
      addToHistory(description);
    } catch (e: any) {
      setErrorMessage(e.message);
      setAppState(AppState.ERROR);
    }
  };

  const handleSpeak = async () => {
    if (!resultContent || resultType !== 'text') return;
    if (isPlayingAudio) return; // Prevent double click

    try {
      setIsPlayingAudio(true);
      setStatusText("Synthesizing Audio...");
      
      const arrayBuffer = await generateSpeech(resultContent);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      
      // Decode raw PCM (Int16 to Float32)
      const dataInt16 = new Int16Array(arrayBuffer);
      const float32Data = new Float32Array(dataInt16.length);
      for (let i = 0; i < dataInt16.length; i++) {
        float32Data[i] = dataInt16[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();

    } catch (e) {
      console.error("Audio playback failed", e);
      setIsPlayingAudio(false);
      setErrorMessage("Audio generation failed");
    }
  };

  const chainResultToInput = async (targetMode: AppMode) => {
    if (!resultContent) return;

    if (resultType === 'image') {
      try {
        const res = await fetch(resultContent);
        const blob = await res.blob();
        const file = new File([blob], "chained_image.png", { type: "image/png" });
        const base64 = resultContent.split(',')[1];
        
        const newFileData: FileData = {
          file,
          previewUrl: resultContent,
          base64: base64,
          mimeType: "image/png"
        };
        
        setBgImage(newFileData);
        setRefImage(null);
        setDescription("");
      } catch (e) {
        console.error("Failed to chain image", e);
      }
    } else if (resultType === 'text') {
      setDescription(resultContent);
    }

    setMode(targetMode);
    setResultContent(null);
    setAppState(AppState.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canSubmit = () => {
    if (appState === AppState.GENERATING) return false;
    if (mode === AppMode.REASON) return !!description;
    if (mode === AppMode.GENERATE && !description) return false;
    
    if ([AppMode.COMPOSITE, AppMode.EDIT, AppMode.ANIMATE, AppMode.ANALYZE, AppMode.CULINARY].includes(mode)) {
       if (!bgImage) return false;
    }
    
    if (mode === AppMode.COMPOSITE && (!refImage || !isVerified)) return false;
    
    return true;
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-20 w-72 h-72 bg-secondary opacity-30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-20 w-72 h-72 bg-accent opacity-30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary opacity-30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

        <div className="relative z-10 glass-panel p-12 rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full">
           <h1 className="text-6xl font-extrabold mb-2 gradient-text tracking-tighter">OMNI</h1>
           <p className="text-xl text-gray-300 font-light mb-8">The Universal Creative Engine</p>
           
           <div className="space-y-4">
             <button onClick={handleApiKeySelect} className="w-full py-4 rounded-xl font-bold text-white btn-glow transform hover:scale-[1.02] transition-all shadow-lg">
               Initialize System
             </button>
             <p className="text-xs text-gray-500 font-mono">
               Accessing Gemini 3 Pro, Veo, and Imagen Models
             </p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-accent/30 selection:text-white pb-20">
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-glow"></div>
         <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5 bg-opacity-60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent via-primary to-secondary flex items-center justify-center shadow-lg group-hover:shadow-accent/50 transition-all duration-300">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tight text-white leading-none">OMNI<span className="text-accent">.</span>AI</h1>
               <span className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">Creative Studio</span>
             </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
               <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse"></span>
               SYSTEM ONLINE
            </div>
          </div>
        </div>
        
        {/* Floating Navigation */}
        <div className="border-t border-white/5 bg-black/20">
           <div className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto custom-scrollbar py-3">
             {Object.values(AppMode).map((m) => (
               <button
                 key={m}
                 onClick={() => { setMode(m); setResultContent(null); }}
                 className={`
                   px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap border
                   ${mode === m 
                     ? 'bg-white/10 border-accent/50 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                     : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5'}
                 `}
               >
                 {m === AppMode.CULINARY ? '🍳 Culinary' : 
                  m === AppMode.REASON ? '🧠 Reason' : 
                  m.charAt(0) + m.slice(1).toLowerCase().replace('_', ' ')}
               </button>
             ))}
           </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-40 pb-12 space-y-8">
        
        {/* Hero Title for Current Mode */}
        <div className="mb-8">
           <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 uppercase tracking-tighter">
             {mode.replace('_', ' ')}
           </h2>
           <p className="text-primary font-mono text-sm mt-2 opacity-80">
             /// {mode === AppMode.COMPOSITE ? 'Multi-Modal Integration' : 'Generative Sequence Initiated'}
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Image Inputs with Glass Styling */}
            {mode === AppMode.COMPOSITE && (
              <div className="grid grid-cols-2 gap-4 h-[280px]">
                <ImageUpload id="bg" label="Background" data={bgImage} onChange={setBgImage} onClear={() => setBgImage(null)} />
                <ImageUpload id="ref" label="Subject" data={refImage} onChange={setRefImage} onClear={() => setRefImage(null)} />
              </div>
            )}

            {(mode === AppMode.EDIT || mode === AppMode.ANIMATE || mode === AppMode.ANALYZE || mode === AppMode.CULINARY) && (
               <div className="h-[300px]">
                 <ImageUpload id="main-img" label="Source Input" data={bgImage} onChange={setBgImage} onClear={() => setBgImage(null)} />
               </div>
            )}

            {/* Command Center */}
            <div className="glass-panel rounded-3xl p-6 space-y-5">
               {/* Prompt Input */}
               <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-accent uppercase tracking-widest">
                      {mode === AppMode.ANALYZE ? 'Data Query' : 'Directives'}
                    </label>
                  </div>
                  <textarea
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-gray-100 placeholder-gray-600 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-all resize-none font-mono text-sm h-32 custom-scrollbar"
                    placeholder={
                      mode === AppMode.ANALYZE ? "Identify specific elements..." : 
                      mode === AppMode.REASON ? "Query the knowledge base..." :
                      "Enter generation parameters..."
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  
                  <PromptHistory 
                    history={promptHistory}
                    onSelect={setDescription}
                    onDelete={(id) => {
                      const nh = promptHistory.filter(i => i.id !== id);
                      setPromptHistory(nh);
                      localStorage.setItem('natural_insert_history', JSON.stringify(nh));
                    }}
                    onClear={() => { setPromptHistory([]); localStorage.removeItem('natural_insert_history'); }}
                  />
               </div>

               {/* Tech Controls */}
               <div className="grid grid-cols-2 gap-4">
                 {(mode === AppMode.GENERATE || mode === AppMode.ANIMATE || mode === AppMode.COMPOSITE) && (
                   <div className="group">
                     <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">Aspect Ratio</label>
                     <div className="relative">
                       <select 
                         value={aspectRatio} 
                         onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-sm text-gray-200 appearance-none focus:border-accent outline-none font-mono"
                       >
                         {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(r => (
                           <option key={r} value={r}>{r}</option>
                         ))}
                       </select>
                       <div className="absolute right-3 top-3.5 pointer-events-none">
                         <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {(mode === AppMode.GENERATE || mode === AppMode.COMPOSITE) && (
                   <div className="group">
                     <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">Resolution</label>
                     <div className="relative">
                       <select 
                         value={imageSize} 
                         onChange={(e) => setImageSize(e.target.value as ImageSize)}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-sm text-gray-200 appearance-none focus:border-accent outline-none font-mono"
                       >
                         {['1K', '2K', '4K'].map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                       <div className="absolute right-3 top-3.5 pointer-events-none">
                         <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                       </div>
                     </div>
                   </div>
                 )}
               </div>

               {/* Verification (Only for Composite) */}
               {mode === AppMode.COMPOSITE && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                    <input 
                      type="checkbox" 
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-accent bg-transparent focus:ring-accent"
                    />
                    <span className="text-xs text-gray-400">I confirm ownership of uploaded assets.</span>
                  </div>
               )}
            </div>

            {/* Launch Button */}
            <button
              onClick={handleAction}
              disabled={!canSubmit()}
              className={`
                w-full py-5 px-6 rounded-2xl font-black text-lg tracking-wider uppercase transition-all duration-300 relative overflow-hidden
                ${!canSubmit()
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-white/5' 
                  : 'btn-glow text-white shadow-[0_0_30px_rgba(167,139,250,0.4)] hover:shadow-[0_0_50px_rgba(167,139,250,0.6)] transform hover:-translate-y-1 active:scale-95'}
              `}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                 {appState === AppState.GENERATING ? (
                   <>
                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span>{statusText}</span>
                   </>
                 ) : (
                   <>
                     <span>EXECUTE {mode}</span>
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </>
                 )}
              </div>
            </button>
            
            {/* Error Message */}
            {appState === AppState.ERROR && errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm font-mono flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                  <p className="font-bold text-red-400 mb-1">SYSTEM ERROR</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Output Column */}
          <div className="lg:col-span-7">
             <div className="glass-panel rounded-3xl p-3 h-full min-h-[600px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-secondary opacity-50"></div>
                
                <div className="flex-1 bg-black/40 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/5">
                   {resultContent ? (
                     <div className="w-full h-full relative group">
                       {resultType === 'image' && (
                         <img src={resultContent} alt="Result" className="w-full h-full object-contain" />
                       )}
                       {resultType === 'video' && (
                         <video src={resultContent} controls autoPlay loop className="w-full h-full object-contain" />
                       )}
                       {resultType === 'text' && (
                         <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar">
                            <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white max-w-none">
                              <MarkdownRenderer content={resultContent} />
                            </div>
                         </div>
                       )}
                       
                       {/* Floating Action Bar */}
                       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl glass-panel opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0 z-20">
                         <a href={resultContent} download="omni-result" className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Download">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                         </a>

                         {resultType === 'text' && (
                            <button 
                              onClick={handleSpeak} 
                              disabled={isPlayingAudio}
                              className={`p-3 rounded-xl transition-colors ${isPlayingAudio ? 'bg-accent text-black animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                              title="Read Aloud"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </button>
                         )}
                         
                         {resultType === 'image' && (
                           <>
                             <div className="w-px h-6 bg-white/10 mx-1"></div>
                             <button onClick={() => chainResultToInput(AppMode.ANIMATE)} className="px-4 py-2 text-xs font-bold text-white bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-lg backdrop-blur-sm">Animate</button>
                             <button onClick={() => chainResultToInput(AppMode.EDIT)} className="px-4 py-2 text-xs font-bold text-white bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-lg backdrop-blur-sm">Edit</button>
                             <button onClick={() => chainResultToInput(AppMode.ANALYZE)} className="px-4 py-2 text-xs font-bold text-white bg-teal-500/20 hover:bg-teal-500/40 border border-teal-500/30 rounded-lg backdrop-blur-sm">Analyze</button>
                           </>
                         )}
                       </div>
                     </div>
                   ) : (
                     <div className="text-center p-12 opacity-40">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                           <div className="w-16 h-16 rounded-full bg-white/5"></div>
                        </div>
                        <p className="text-xl font-light tracking-wide text-white">READY FOR INPUT</p>
                        <p className="text-sm text-gray-500 font-mono mt-2">Waiting for generation cycle...</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;