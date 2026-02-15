export type Phase = 'SCATTER_REDUCE' | 'ALL_GATHER' | 'COMPLETED' | 'IDLE';

export interface ChunkState {
  id: number;
  label: string;
  color: string;
  fillLevel: number; // 0 to 4 (representing 0/4 to 4/4 accumulation)
  isFull: boolean;
}

export interface NodeState {
  id: number;
  chunks: ChunkState[];
}

export interface SimulationStep {
  stepIndex: number;
  phase: Phase;
  description: string;
  transfers: {
    from: number;
    to: number;
    chunkId: number;
    isAccumulated: boolean; // True if sending a partial sum, False if sending final result (Gather)
  }[];
  nodeStates: NodeState[];
}