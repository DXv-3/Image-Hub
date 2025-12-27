import React, { useCallback } from 'react';
import { FileData } from '../types';

interface ImageUploadProps {
  label: string;
  id: string;
  data: FileData | null;
  onChange: (data: FileData) => void;
  onClear: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, id, data, onChange, onClear }) => {
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64String = (event.target.result as string).split(',')[1];
          const mimeType = file.type;
          
          onChange({
            file,
            previewUrl: URL.createObjectURL(file),
            base64: base64String,
            mimeType
          });
        }
      };
      
      reader.readAsDataURL(file);
    }
  }, [onChange]);

  const triggerInput = () => {
    document.getElementById(id)?.click();
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full group">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-bold text-accent uppercase tracking-widest">{label}</label>
        {data && <span className="text-[10px] text-green-400 font-mono">ASSET LOADED</span>}
      </div>
      
      <div 
        className={`
          relative flex-1 min-h-[250px] w-full rounded-2xl transition-all duration-500
          flex flex-col items-center justify-center overflow-hidden
          ${data 
            ? 'border border-accent/50 bg-black/40 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
            : 'border border-dashed border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}
        `}
      >
        {/* Tech Corner Markers */}
        {!data && (
            <>
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl-lg"></div>
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/20 rounded-tr-lg"></div>
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/20 rounded-bl-lg"></div>
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br-lg"></div>
            </>
        )}

        {data ? (
          <>
            <img 
              src={data.previewUrl} 
              alt={label} 
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity duration-300" 
            />
            {/* Scanner Line Animation */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/10 to-transparent w-full h-full translate-y-[-100%] animate-[scan_3s_linear_infinite]"></div>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
              <button 
                onClick={triggerInput}
                className="px-5 py-2 bg-black/60 border border-white/20 hover:border-accent hover:text-accent text-white rounded-xl backdrop-blur-md text-xs font-bold uppercase tracking-wide transition-all"
              >
                Replace
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="px-5 py-2 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-200 rounded-xl backdrop-blur-md text-xs font-bold uppercase tracking-wide transition-all"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <div 
            onClick={triggerInput}
            className="cursor-pointer flex flex-col items-center justify-center p-6 text-center w-full h-full relative z-10"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-accent/50">
                <svg className="w-8 h-8 text-gray-500 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            <span className="text-gray-300 font-bold tracking-wide group-hover:text-white transition-colors">UPLOAD SOURCE</span>
            <span className="text-gray-600 text-[10px] font-mono mt-1 uppercase">Supports JPG / PNG</span>
          </div>
        )}
        
        <input 
          id={id} 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </div>
    </div>
  );
};

export default ImageUpload;