import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onUpload: (files: File[]) => void;
  isLoading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      
      <div className="w-full max-w-xl relative z-10 animate-fade-in-up">
        
        {/* Title Section - Volumetric Text */}
        <div className="text-center mb-12 animate-float">
          <div className="inline-block relative">
            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-blue-600 tracking-tighter drop-shadow-2xl">
              Voltage
              <br />
              Analyzer
            </h1>
            <div className="absolute -inset-10 bg-blue-500/10 blur-[60px] rounded-full z-[-1] animate-pulse-slow"></div>
          </div>
          <p className="text-blue-200/60 mt-6 text-lg font-light tracking-[0.2em] uppercase">
            System Monitoring & Diagnostics
          </p>
        </div>

        {/* Drop Zone - Living Glass */}
        <div
          className={`
            relative group cursor-pointer glass-panel rounded-[2rem] p-12 transition-all duration-700
            flex flex-col items-center justify-center text-center overflow-hidden
            ${isDragOver 
              ? 'border-accent scale-105 shadow-[0_0_80px_rgba(59,130,246,0.3)] bg-accent/5' 
              : 'hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]'}
            ${isLoading ? 'pointer-events-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1"></div>
          
          {/* Scanning Line Effect */}
          {isLoading && (
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[200%] w-full animate-scan pointer-events-none"></div>
          )}

          {isLoading ? (
            <div className="relative z-10 flex flex-col items-center">
               <div className="w-24 h-24 mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                  <div className="absolute inset-0 rounded-full border-t-4 border-accent animate-spin shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute inset-4 rounded-full border-r-4 border-purple-500 animate-spin animation-delay-200"></div>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-accent font-bold animate-pulse">
                    PARSING
                  </div>
               </div>
               <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">System Analysis</h3>
               <p className="text-sm text-textMuted/80">Decoding telemetry streams...</p>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center transition-transform duration-500 group-hover:-translate-y-2">
              <div className={`
                w-24 h-24 mb-8 rounded-3xl flex items-center justify-center 
                bg-gradient-to-br from-white/10 to-white/5 border border-white/10
                shadow-2xl backdrop-blur-md transition-all duration-500
                ${isDragOver ? 'rotate-12 scale-110 bg-accent/20 border-accent/30' : 'group-hover:rotate-3 group-hover:scale-105 group-hover:bg-white/10 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]'}
              `}>
                <svg className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Upload Log File</h3>
              <p className="text-textMuted mb-10 font-light text-lg">Drag & drop or click to initiate scan</p>
              
              <div className="px-10 py-4 bg-white text-black font-bold rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300">
                Select Files
              </div>
            </div>
          )}
          
          <input 
            type="file" 
            multiple 
            accept=".log,.json,.txt,.JSON,.LOG" 
            className="hidden" 
            ref={inputRef} 
            onChange={handleChange}
          />
        </div>
        
        {/* Animated Dots */}
        {!isLoading && (
            <div className="mt-12 flex justify-center gap-3 opacity-30">
                {[1,2,3].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white animate-pulse" style={{animationDelay: `${i*300}ms`}}></div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;