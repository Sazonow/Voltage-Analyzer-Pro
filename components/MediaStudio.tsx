import React, { useState, useEffect } from 'react';

interface MediaStudioProps {
  onClose: () => void;
}

const MediaStudio: React.FC<MediaStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'tts'>('video');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  // Video Config
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  // Image Config
  const [imageSize, setImageSize] = useState('1K');
  
  // TTS Config
  const [voiceName, setVoiceName] = useState('Kore');

  // Reset aspect ratio when switching tabs to ensure validity
  useEffect(() => {
    if (activeTab === 'video') {
      if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
        setAspectRatio('16:9');
      }
    }
  }, [activeTab]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setResultUrl(null);
    setStatus('Initializing...');

    try {
       // Lazy import
       const { GoogleGenAI, Modality } = await import("@google/genai");

       // Ensure API key for Veo using safe any-cast access
       if (activeTab === 'video') {
         // Cast window to any to access aistudio property without TS errors
         const win = window as any;
         if (win.aistudio) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await win.aistudio.openSelectKey();
            }
         }
       }

       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

       if (activeTab === 'video') {
           setStatus('Dreaming up video with Veo 3.1...');
           let operation = await ai.models.generateVideos({
               model: 'veo-3.1-fast-generate-preview',
               prompt: prompt,
               config: {
                   numberOfVideos: 1,
                   resolution: '720p',
                   aspectRatio: aspectRatio as any
               }
           });
           
           setStatus('Rendering pixels...');
           while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              operation = await ai.operations.getVideosOperation({operation});
           }
           
           const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
           if (uri) {
               const videoRes = await fetch(`${uri}&key=${process.env.API_KEY}`);
               const blob = await videoRes.blob();
               setResultUrl(URL.createObjectURL(blob));
           }

       } else if (activeTab === 'image') {
           setStatus('Designing with Gemini 3 Pro...');
           const response = await ai.models.generateContent({
               model: 'gemini-3-pro-image-preview',
               contents: { parts: [{ text: prompt }] },
               config: {
                   imageConfig: { 
                       aspectRatio: aspectRatio as any,
                       imageSize: imageSize as any 
                    }
               }
           });
           
           // Robustly find the image part
           let foundImage = false;
           if (response.candidates?.[0]?.content?.parts) {
               for (const part of response.candidates[0].content.parts) {
                   if (part.inlineData) {
                       setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
                       foundImage = true;
                       break;
                   }
               }
           }
           if (!foundImage) throw new Error("No image generated");

       } else if (activeTab === 'tts') {
           setStatus('Synthesizing voice...');
           const response = await ai.models.generateContent({
               model: 'gemini-2.5-flash-preview-tts',
               contents: { parts: [{ text: prompt }] },
               config: {
                   responseModalities: [Modality.AUDIO],
                   speechConfig: {
                       voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                   }
               }
           });
           
           const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
           if (base64Audio) {
               const binaryString = atob(base64Audio);
               const len = binaryString.length;
               const bytes = new Uint8Array(len);
               for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
               
               // Use 'as any' for webkitAudioContext fallback to prevent TS errors
               const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
               if (AudioContextClass) {
                   const ctx = new AudioContextClass({sampleRate: 24000});
                   
                   // Manually decode PCM for immediate playback
                   const dataInt16 = new Int16Array(bytes.buffer);
                   const float32 = new Float32Array(dataInt16.length);
                   for(let i=0; i<dataInt16.length; i++) float32[i] = dataInt16[i] / 32768.0;
                   
                   const buffer = ctx.createBuffer(1, float32.length, 24000);
                   buffer.copyToChannel(float32, 0);
                   
                   const source = ctx.createBufferSource();
                   source.buffer = buffer;
                   source.connect(ctx.destination);
                   source.start();
                   setStatus('Playing audio...');
               } else {
                   setStatus('Audio playback not supported in this browser');
               }
               
               setIsLoading(false);
               return; 
           }
       }

    } catch (e: any) {
        console.error(e);
        setStatus(`Error: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-all duration-500" onClick={onClose}></div>
       <div className="relative w-full max-w-5xl bg-[#0f172a]/90 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row h-[85vh] animate-blob backdrop-blur-2xl">
          
          {/* Sidebar */}
          <div className="w-full md:w-72 bg-black/40 border-r border-white/5 p-6 flex flex-col gap-3">
              <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3 tracking-tight">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                     <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-purple-200">Media Studio</span>
              </h2>
              
              <button onClick={() => setActiveTab('video')} className={`group relative p-4 rounded-2xl text-left font-bold transition-all flex items-center gap-4 overflow-hidden border ${activeTab === 'video' ? 'bg-blue-600/20 border-blue-500/50 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'border-transparent text-textMuted hover:bg-white/5 hover:text-white'}`}>
                  <div className={`absolute inset-0 bg-blue-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300`}></div>
                  <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <span className="relative z-10">Veo Video</span>
              </button>
              
              <button onClick={() => setActiveTab('image')} className={`group relative p-4 rounded-2xl text-left font-bold transition-all flex items-center gap-4 overflow-hidden border ${activeTab === 'image' ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-[0_0_20px_rgba(147,51,234,0.2)]' : 'border-transparent text-textMuted hover:bg-white/5 hover:text-white'}`}>
                  <div className={`absolute inset-0 bg-purple-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300`}></div>
                  <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="relative z-10">Image Gen</span>
              </button>
              
              <button onClick={() => setActiveTab('tts')} className={`group relative p-4 rounded-2xl text-left font-bold transition-all flex items-center gap-4 overflow-hidden border ${activeTab === 'tts' ? 'bg-green-600/20 border-green-500/50 text-white shadow-[0_0_20px_rgba(22,163,74,0.2)]' : 'border-transparent text-textMuted hover:bg-white/5 hover:text-white'}`}>
                  <div className={`absolute inset-0 bg-green-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300`}></div>
                  <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  <span className="relative z-10">Voice Synthesis</span>
              </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 flex flex-col overflow-y-auto bg-gradient-to-br from-transparent to-black/20">
              <h3 className="text-3xl font-black text-white mb-8 drop-shadow-lg">
                  {activeTab === 'video' && 'Animate with Veo 3.1'}
                  {activeTab === 'image' && 'Generate with Gemini 3'}
                  {activeTab === 'tts' && 'Neural Voice Synthesis'}
              </h3>

              <div className="space-y-6 flex-1 flex flex-col">
                  <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-30 group-focus-within:opacity-100 transition duration-500 blur"></div>
                      <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        className="relative w-full bg-[#050b14] border border-white/10 rounded-xl p-5 text-white placeholder-white/20 focus:outline-none h-40 resize-none text-lg leading-relaxed shadow-inner"
                        placeholder={activeTab === 'tts' ? "Type something for the model to say..." : "Describe your vision in detail..."}
                      ></textarea>
                  </div>

                  {/* Settings based on tab */}
                  <div className="flex flex-wrap gap-4">
                      {activeTab !== 'tts' && (
                        <div className="flex flex-col gap-2">
                             <label className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Aspect Ratio</label>
                             <select 
                                value={aspectRatio} 
                                onChange={e => setAspectRatio(e.target.value)} 
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors focus:bg-black outline-none cursor-pointer"
                             >
                                 <option value="16:9">16:9 (Landscape)</option>
                                 <option value="9:16">9:16 (Portrait)</option>
                                 {activeTab === 'image' && (
                                    <>
                                        <option value="1:1">1:1 (Square)</option>
                                        <option value="4:3">4:3</option>
                                        <option value="3:4">3:4</option>
                                    </>
                                 )}
                             </select>
                        </div>
                      )}
                      
                      {activeTab === 'image' && (
                          <div className="flex flex-col gap-2">
                             <label className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Resolution</label>
                             <select value={imageSize} onChange={e => setImageSize(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors focus:bg-black outline-none cursor-pointer">
                                 <option value="1K">1K (Standard)</option>
                                 <option value="2K">2K (High Detail)</option>
                                 <option value="4K">4K (Ultra)</option>
                             </select>
                          </div>
                      )}
                      
                      {activeTab === 'tts' && (
                          <div className="flex flex-col gap-2">
                             <label className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Voice Persona</label>
                             <select value={voiceName} onChange={e => setVoiceName(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors focus:bg-black outline-none cursor-pointer">
                                 <option value="Kore">Kore (Balanced)</option>
                                 <option value="Puck">Puck (Energetic)</option>
                                 <option value="Fenrir">Fenrir (Deep)</option>
                             </select>
                          </div>
                      )}
                  </div>

                  <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !prompt}
                    className="mt-4 w-full py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl text-white font-black text-lg shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_60px_-10px_rgba(79,70,229,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group border border-white/10"
                  >
                      {isLoading ? (
                          <span className="flex items-center justify-center gap-3">
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             <span className="animate-pulse">{status}</span>
                          </span>
                      ) : (
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Generate Magic
                          </span>
                      )}
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                  </button>

                  {/* Result Area */}
                  <div className={`flex-1 mt-6 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center transition-all duration-500 ${resultUrl || isLoading ? 'bg-black/50 min-h-[300px]' : 'bg-transparent min-h-0'}`}>
                      {isLoading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                             <div className="relative w-20 h-20">
                                <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                                <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin animation-delay-200"></div>
                                <div className="absolute inset-4 rounded-full border-b-2 border-green-500 animate-spin animation-delay-500"></div>
                             </div>
                             <p className="text-sm font-mono text-blue-300 animate-pulse">{status}</p>
                          </div>
                      )}
                      
                      {!isLoading && resultUrl && (
                         <div className="w-full h-full flex items-center justify-center p-2 animate-fade-in-up">
                            {activeTab === 'video' && <video src={resultUrl} controls autoPlay className="w-full h-full object-contain rounded-xl shadow-2xl" />}
                            {activeTab === 'image' && <img src={resultUrl} alt="Generated" className="w-full h-full object-contain rounded-xl shadow-2xl" />}
                            {activeTab === 'tts' && (
                                <div className="text-center p-8 bg-gradient-to-br from-green-500/10 to-transparent rounded-2xl border border-green-500/20">
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                        <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Audio Playing</h4>
                                    <p className="text-green-400 text-sm">Synthesized successfully via AudioContext</p>
                                </div>
                            )}
                         </div>
                      )}
                  </div>
              </div>
          </div>
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white/50 hover:text-white hover:bg-white/10 transition-colors z-50">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
       </div>
    </div>
  );
};

export default MediaStudio;