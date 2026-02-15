import React from 'react';

export const MathExplainer = () => {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl text-sm md:text-base leading-relaxed space-y-6">
      
      {/* Definitions Block */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider border-b border-slate-700 pb-2">Variables & Terminology</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-yellow-500/20 text-yellow-400 rounded-lg font-mono font-bold border border-yellow-500/30 text-lg">P</span>
                <div>
                    <div className="text-slate-200 font-bold text-sm">Model Parameters</div>
                    <div className="text-slate-400 text-xs">Total size of the model weights being trained.</div>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-pink-500/20 text-pink-400 rounded-lg font-mono font-bold border border-pink-500/30 text-lg">N</span>
                <div>
                    <div className="text-slate-200 font-bold text-sm">Number of Workers</div>
                    <div className="text-slate-400 text-xs">Count of GPUs/nodes in the ring (N=4 here).</div>
                </div>
            </div>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs text-slate-400">
           To parallelize, <strong>P</strong> is sliced into <strong>N</strong> equal chunks (C0, C1, C2, C3). 
           Size of each chunk = <span className="text-green-400 font-mono font-bold">P/N</span>.
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white flex flex-wrap items-center gap-2">
            Cost Analysis: Why 
            <span className="inline-flex items-center bg-slate-900 px-3 py-1 rounded-lg border border-slate-600">
                <span className="font-mono text-xl mr-1">2</span>
                <span className="flex flex-col items-center justify-center text-xs leading-none mx-1 font-mono">
                    <span className="border-b border-slate-400 pb-0.5 mb-0.5 block w-full text-center">N-1</span>
                    <span className="block">N</span>
                </span>
                <span className="font-mono text-xl ml-1">&times; P</span>
            </span>
            ?
        </h2>
        <p className="text-slate-400 text-sm">
            The total data transmitted is proportional to the model size, independent of the number of workers (as N grows large, <span className="font-mono text-xs">(N-1)/N &approx; 1</span>).
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-blue-400 font-bold text-lg mb-2 flex items-center gap-2">
            <span className="bg-blue-500/20 w-6 h-6 flex items-center justify-center rounded text-xs border border-blue-500/50">1</span>
            Phase 1: Scatter-Reduce
          </h3>
          <p className="mb-2 text-slate-300 text-sm">
            In each step, every worker sends <strong>one chunk</strong> (Size <span className="font-mono text-green-400">P/N</span>) to its neighbor.
            We repeat this for <span className="font-mono text-pink-400">N - 1</span> steps to fully reduce every chunk.
          </p>
          <div className="bg-slate-900 p-2 rounded border border-slate-700 font-mono text-center text-xs text-slate-400 flex justify-center items-center gap-2">
            Volume = <span className="text-pink-400">(N - 1)</span> &times; <span className="text-green-400">(P / N)</span>
          </div>
        </div>

        <div>
          <h3 className="text-purple-400 font-bold text-lg mb-2 flex items-center gap-2">
            <span className="bg-purple-500/20 w-6 h-6 flex items-center justify-center rounded text-xs border border-purple-500/50">2</span>
            Phase 2: All-Gather
          </h3>
          <p className="mb-2 text-slate-300 text-sm">
            Workers now broadcast the fully reduced chunks. Everyone sends their full chunk (Size <span className="font-mono text-green-400">P/N</span>) to the neighbor.
            Again, this takes <span className="font-mono text-pink-400">N - 1</span> steps.
          </p>
          <div className="bg-slate-900 p-2 rounded border border-slate-700 font-mono text-center text-xs text-slate-400 flex justify-center items-center gap-2">
             Volume = <span className="text-pink-400">(N - 1)</span> &times; <span className="text-green-400">(P / N)</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-white font-bold text-sm mb-3">Total Bandwidth Usage</h3>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl border border-blue-500/30 flex flex-col items-center justify-center gap-4">
          
          <div className="flex items-center gap-2 md:gap-4 text-sm md:text-base flex-wrap justify-center">
             <div className="flex flex-col items-center">
                <span className="text-xs text-blue-400 mb-1">Scatter</span>
                <div className="font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-700">
                    (N-1) &times; <span className="text-green-400">P/N</span>
                </div>
             </div>
             <div className="text-slate-500 font-light text-xl">+</div>
             <div className="flex flex-col items-center">
                <span className="text-xs text-purple-400 mb-1">Gather</span>
                <div className="font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-700">
                    (N-1) &times; <span className="text-green-400">P/N</span>
                </div>
             </div>
             <div className="text-slate-500 font-light text-xl">=</div>
          </div>

          <div className="bg-blue-600/20 px-4 py-2 rounded-lg border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <div className="flex items-center font-mono text-xl font-bold text-white">
                <span className="mr-2">2 &times;</span>
                <div className="flex flex-col items-center justify-center text-sm leading-none mx-1">
                    <span className="border-b-2 border-slate-300 pb-0.5 mb-0.5 w-full text-center">N - 1</span>
                    <span>N</span>
                </div>
                <span className="ml-2">&times; P</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};