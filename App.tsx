import React, { useState, useEffect } from 'react';
import { SIMULATION_DATA } from './utils';
import { Visualizer } from './components/Visualizer';
import { MathExplainer } from './components/MathExplainer';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(4000); // Default slow: 4000ms per step

  // Auto-play logic
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= SIMULATION_DATA.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speedMs); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, speedMs]);

  const currentStepData = SIMULATION_DATA[stepIndex];
  const prevStepData = stepIndex > 0 ? SIMULATION_DATA[stepIndex - 1] : undefined;
  const progress = (stepIndex / (SIMULATION_DATA.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="text-center space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
            Ring All-Reduce Visualizer
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            Visualize how 4 workers synchronize gradients. <br/>
            Key concept: The data sent in every step is always size <span className="font-mono text-green-400">P/N</span>.
          </p>
        </header>

        {/* Controls Bar */}
        <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 sticky top-4 z-50">
          
          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors border border-slate-700"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all min-w-[140px] justify-center ${
                isPlaying 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 border border-blue-500'
              }`}
            >
              {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Play</>}
            </button>

            <button 
              onClick={() => setStepIndex(Math.min(SIMULATION_DATA.length - 1, stepIndex + 1))}
              disabled={stepIndex === SIMULATION_DATA.length - 1}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors border border-slate-700"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => { setIsPlaying(false); setStepIndex(0); }}
              className="p-2.5 rounded-full hover:bg-slate-700 text-slate-400 ml-2 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar & Info */}
          <div className="flex-1 w-full px-4">
            <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono uppercase tracking-wider">
              <span>Step {stepIndex} / {SIMULATION_DATA.length - 1}</span>
              <span className={currentStepData.phase === 'SCATTER_REDUCE' ? 'text-blue-400' : currentStepData.phase === 'ALL_GATHER' ? 'text-purple-400' : 'text-slate-500'}>
                {currentStepData.phase}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className={`h-full transition-all duration-300 ease-out ${currentStepData.phase === 'SCATTER_REDUCE' ? 'bg-blue-500' : currentStepData.phase === 'ALL_GATHER' ? 'bg-purple-500' : 'bg-slate-500'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-3 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-800">
             <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
               <Zap className="w-3 h-3" /> Speed
             </div>
             <input 
                type="range" 
                min="1000" 
                max="5000" 
                step="500" 
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="w-24 accent-blue-500 cursor-pointer"
                style={{ direction: 'rtl' }} // Make left side faster (lower ms) visually or just keep standard: Left=1000(Fast), Right=5000(Slow). Actually standard range: Right is Higher Value.
                // Let's standard: Left=1000ms(Fast), Right=5000ms(Slow).
             />
             <div className="text-xs font-mono text-slate-400 w-12 text-right">
               {(speedMs / 1000).toFixed(1)}s
             </div>
          </div>

        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Visualization (Larger) */}
          <div className="lg:col-span-7 space-y-6">
             {/* Description Box */}
             <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 min-h-[100px] flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Step Description</h3>
                <p className="text-lg md:text-xl text-slate-200 font-light leading-relaxed">
                  {currentStepData.description}
                </p>
             </div>
             
             <Visualizer 
                currentStepData={currentStepData} 
                prevStepData={prevStepData} 
                isAnimating={isPlaying}
                animationDuration={speedMs * 0.8} // Animation takes 80% of step time
             />
          </div>
          
          {/* Right: Explainer */}
          <div className="lg:col-span-5">
            <MathExplainer />
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;