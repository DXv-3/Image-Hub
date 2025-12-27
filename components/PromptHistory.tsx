import React from 'react';
import { PromptHistoryItem } from '../types';

interface PromptHistoryProps {
  history: PromptHistoryItem[];
  onSelect: (text: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const PromptHistory: React.FC<PromptHistoryProps> = ({ history, onSelect, onDelete, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-6 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          Recent Logs
        </h3>
        <button 
          onClick={onClear}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors uppercase font-mono"
        >
          Purge All
        </button>
      </div>

      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
        {history.map((item) => (
          <div 
            key={item.id}
            className="group relative flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
            onClick={() => onSelect(item.text)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 line-clamp-2 font-mono leading-relaxed group-hover:text-white transition-colors">
                <span className="text-accent opacity-50 mr-2">&gt;</span>{item.text}
              </p>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromptHistory;