import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeState, SimulationStep } from '../types';
import { ArrowRight } from 'lucide-react';

interface VisualizerProps {
  currentStepData: SimulationStep;
  prevStepData: SimulationStep | undefined;
  isAnimating: boolean;
  animationDuration: number;
}

// Map chunk IDs to flat, distinct colors
const CHUNK_COLORS = [
  'bg-red-500',    // Chunk 0
  'bg-blue-500',   // Chunk 1
  'bg-green-500',  // Chunk 2
  'bg-yellow-500', // Chunk 3
];

const TEXT_COLORS = [
  'text-red-400',
  'text-blue-400',
  'text-green-400',
  'text-yellow-400',
];

const NodeComponent = ({ node, isCompleted }: { node: NodeState, isCompleted: boolean }) => {
  return (
    <div className="flex flex-col bg-slate-900 border border-slate-600 rounded-lg shadow-xl w-40 overflow-hidden z-20">
      {/* Node Header */}
      <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex justify-between items-center">
         <span className="text-slate-200 font-bold text-xs uppercase tracking-wider">Worker {node.id}</span>
         {isCompleted && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono border border-green-500/30">SYNCED</span>}
      </div>
     
      {/* Chunks Container */}
      <div className="p-2 space-y-1.5 bg-slate-900/50">
        {node.chunks.map((chunk) => (
          <div key={chunk.id} className="flex items-center gap-2">
             {/* Label */}
             <div className={`w-4 text-[10px] font-mono font-bold ${TEXT_COLORS[chunk.id]} opacity-70`}>
               C{chunk.id}
             </div>

             {/* Progress Bar Track */}
             <div className="flex-1 h-3 bg-slate-800 rounded-sm overflow-hidden flex gap-[1px] opacity-90">
                {/* 
                  Render 4 distinct slots. 
                  Fill them based on fillLevel.
                */}
                {[...Array(4)].map((_, idx) => {
                    const isFilled = idx < chunk.fillLevel;
                    return (
                        <div 
                            key={idx}
                            className={`flex-1 transition-all duration-300 ${isFilled ? chunk.color : 'bg-slate-800'}`} 
                        />
                    );
                })}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PacketProps {
    fromPos: { x: number, y: number }; 
    toPos: { x: number, y: number }; 
    chunkId: number;
    isAccumulated: boolean;
    duration: number;
}

const Packet: React.FC<PacketProps> = ({ 
    fromPos, 
    toPos, 
    chunkId,
    isAccumulated,
    duration
}) => {
    return (
        <motion.div
            initial={{ x: fromPos.x, y: fromPos.y, opacity: 0, scale: 0.8 }}
            animate={{ 
                x: toPos.x, 
                y: toPos.y, 
                opacity: [0, 1, 1, 1, 0], 
                scale: 1,
            }}
            transition={{ duration: duration / 1000, ease: "linear", times: [0, 0.1, 0.8, 0.9, 1] }}
            className="absolute z-50 pointer-events-none"
            style={{ marginLeft: -32, marginTop: -32, width: 64, height: 64 }}
        >
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                
                {/* Info Label Top */}
                <div className={`text-[10px] font-bold ${TEXT_COLORS[chunkId]} bg-slate-950/90 px-1.5 py-0.5 rounded mb-1 shadow-lg border border-slate-700 whitespace-nowrap`}>
                    Chunk {chunkId}
                </div>

                {/* The Packet Visual (The Data) */}
                <div className={`relative p-1 bg-slate-800 rounded-md shadow-2xl ${isAccumulated ? 'border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : `border border-slate-600`}`}>
                     {/* 
                        VISUALIZATION FIX: 
                        Whether it's partial or full, the SIZE of the data is P/N.
                        So we render ONE block.
                        We distinguish them by style (Solid vs Ghostly/Partial).
                     */}
                    <div className={`w-8 h-8 rounded-sm ${CHUNK_COLORS[chunkId]} ${isAccumulated ? 'opacity-100' : 'opacity-80'}`}>
                         {!isAccumulated && (
                             // Add a pattern or "partial" look for scatter phase
                             <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqgABJgwHg0gAAOQDQwY8Gg4xQvCgAAAAAElFTkSuQmCC')] opacity-30"></div>
                         )}
                    </div>
                </div>

                {/* Size Label Bottom */}
                <div className="mt-1 flex flex-col items-center">
                    <div className="text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1 rounded">
                        Size: <span className="text-green-400 font-bold">P/4</span>
                    </div>
                    <div className={`text-[8px] font-bold uppercase mt-0.5 ${isAccumulated ? 'text-white' : 'text-slate-500'}`}>
                        {isAccumulated ? 'Final Sum' : 'Partial Sum'}
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export const Visualizer: React.FC<VisualizerProps> = ({ currentStepData, prevStepData, isAnimating, animationDuration }) => {
  const [displayedNodeStates, setDisplayedNodeStates] = useState(currentStepData.nodeStates);
  const prevStepIndex = useRef(currentStepData.stepIndex);

  // Handle syncing node state update with packet animation
  useEffect(() => {
    const isMovingForward = currentStepData.stepIndex > prevStepIndex.current;
    prevStepIndex.current = currentStepData.stepIndex;

    // If we have transfers and we are moving forward (playing/next), we want to:
    // 1. Show the PREVIOUS state (before transfer)
    // 2. Animate the packet
    // 3. Update to CURRENT state (after transfer) when packet arrives
    if (isMovingForward && currentStepData.transfers.length > 0 && prevStepData) {
      // Start with previous state
      setDisplayedNodeStates(prevStepData.nodeStates);

      // Schedule update to current state
      // We aim for roughly when the packet hits the destination (around 80-90% of duration)
      const timeout = setTimeout(() => {
        setDisplayedNodeStates(currentStepData.nodeStates);
      }, animationDuration * 0.9);

      return () => clearTimeout(timeout);
    } else {
      // If moving backward, jumping, or no transfers (Idle/Completed), update immediately
      setDisplayedNodeStates(currentStepData.nodeStates);
    }
  }, [currentStepData, prevStepData, animationDuration]);

  const positions = [
    { x: '25%', y: '25%' }, // Node 0
    { x: '75%', y: '25%' }, // Node 1
    { x: '75%', y: '75%' }, // Node 2
    { x: '25%', y: '75%' }, // Node 3
  ];

  // Pixel offsets from center (300,300) assuming 600x600 container
  const spread = 150;
  const getPixelPos = (index: number) => {
    const map = [
        { x: -spread, y: -spread },
        { x: spread, y: -spread },
        { x: spread, y: spread },
        { x: -spread, y: spread }
    ];
    return map[index];
  };

  return (
    <div className="relative w-full max-w-xl aspect-square bg-slate-950 rounded-2xl border border-slate-800/80 shadow-2xl mx-auto p-4 flex items-center justify-center overflow-hidden">
      
      {/* Legend Overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur p-3 rounded-xl border border-slate-700 shadow-xl z-10 pointer-events-none">
        <div className="text-[10px] uppercase text-slate-500 font-bold mb-2">Model Parameters (P)</div>
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <div className="text-[10px] text-slate-300 font-mono">C0: 1st 25%</div>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <div className="text-[10px] text-slate-300 font-mono">C1: 2nd 25%</div>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <div className="text-[10px] text-slate-300 font-mono">C2: 3rd 25%</div>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                <div className="text-[10px] text-slate-300 font-mono">C3: 4th 25%</div>
            </div>
        </div>
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Ring Path */}
      <div className="absolute inset-[25%] rounded-[30px] border-4 border-slate-800/50"></div>
      
      {/* Directional Arrows on the ring */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[25%] left-[50%] -translate-x-1/2 -translate-y-1/2"><ArrowRight className="w-12 h-12 text-slate-200" /></div>
          <div className="absolute top-[50%] right-[25%] translate-x-1/2 -translate-y-1/2 rotate-90"><ArrowRight className="w-12 h-12 text-slate-200" /></div>
          <div className="absolute bottom-[25%] left-[50%] -translate-x-1/2 translate-y-1/2 rotate-180"><ArrowRight className="w-12 h-12 text-slate-200" /></div>
          <div className="absolute top-[50%] left-[25%] -translate-x-1/2 -translate-y-1/2 -rotate-90"><ArrowRight className="w-12 h-12 text-slate-200" /></div>
      </div>

      {/* Nodes */}
      {displayedNodeStates.map((node, i) => (
        <div 
            key={node.id} 
            className="absolute transition-all duration-500"
            style={{ 
                left: positions[i].x, 
                top: positions[i].y, 
                transform: 'translate(-50%, -50%)' 
            }}
        >
          <NodeComponent node={node} isCompleted={currentStepData.phase === 'COMPLETED'} />
        </div>
      ))}

      {/* Animation Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence>
            {currentStepData.transfers.length > 0 && (
                <div key={currentStepData.stepIndex} className="absolute inset-0 flex items-center justify-center">
                    {currentStepData.transfers.map((t, idx) => {
                        const start = getPixelPos(t.from);
                        const end = getPixelPos(t.to);
                        return (
                            <Packet 
                                key={`${currentStepData.stepIndex}-${idx}`}
                                fromPos={start}
                                toPos={end}
                                chunkId={t.chunkId}
                                isAccumulated={t.isAccumulated}
                                duration={animationDuration}
                            />
                        );
                    })}
                </div>
            )}
        </AnimatePresence>
      </div>

      {/* Center Label: Bandwidth Monitor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full px-6 py-3 flex flex-col items-center shadow-2xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Link Bandwidth</div>
              {currentStepData.transfers.length > 0 ? (
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-mono text-green-400 font-bold text-lg">P/4 <span className="text-xs text-slate-500">per link</span></span>
                 </div>
              ) : (
                 <div className="text-slate-600 font-mono text-sm">IDLE</div>
              )}
          </div>
      </div>

    </div>
  );
};
