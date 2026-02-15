import { SimulationStep, NodeState, ChunkState } from './types';

const NODES = 4;
const CHUNKS = 4;

const CHUNK_COLORS = [
  'bg-red-500',    // Chunk 0
  'bg-blue-500',   // Chunk 1
  'bg-green-500',  // Chunk 2
  'bg-yellow-500', // Chunk 3
];

const createInitialState = (): NodeState[] => {
  return Array.from({ length: NODES }, (_, nodeId) => ({
    id: nodeId,
    chunks: Array.from({ length: CHUNKS }, (_, chunkId) => ({
      id: chunkId,
      label: `C${chunkId}`,
      color: CHUNK_COLORS[chunkId],
      fillLevel: 1, // Start with own local gradient (1/4 of total needed)
      isFull: false,
    })),
  }));
};

// Deep copy helper
const cloneState = (state: NodeState[]): NodeState[] => {
  return JSON.parse(JSON.stringify(state));
};

export const generateSimulationSteps = (): SimulationStep[] => {
  const steps: SimulationStep[] = [];
  let currentState = createInitialState();

  // Initial State (Step -1 effectively, but we'll include it as step 0 start)
  steps.push({
    stepIndex: 0,
    phase: 'IDLE',
    description: 'Setup: The model parameters (P) are sliced into 4 equal partitions (Chunks C0-C3). Each worker starts with its own local gradients for all chunks.',
    transfers: [],
    nodeStates: cloneState(currentState),
  });

  // --- Phase 1: Scatter-Reduce ---
  // In this phase, we walk through the ring.
  // Step k: Node i sends chunk (i - k) to Node (i + 1).
  // Crucially, the target adds the *sender's current accumulation* to its own.
  for (let k = 0; k < NODES - 1; k++) {
    const nextState = cloneState(currentState);
    const transfers = [];

    for (let i = 0; i < NODES; i++) {
      const targetNode = (i + 1) % NODES;
      // Calculate which chunk is being sent.
      // Example N=4.
      // k=0: Node 0 sends C0. Node 1 sends C1...
      // k=1: Node 0 sends C3. Node 1 sends C0...
      const chunkIdToSend = ((i - k) % NODES + NODES) % NODES;
      
      transfers.push({
        from: i,
        to: targetNode,
        chunkId: chunkIdToSend,
        isAccumulated: false 
      });

      // LOGIC FIX:
      // The new fill level at target = Target's current level + Sender's current level
      // This correctly models accumulating partial sums.
      // e.g. Node A (level 1) -> Node B (level 1) => Node B becomes level 2.
      //      Node B (level 2) -> Node C (level 1) => Node C becomes level 3.
      const senderAmount = currentState[i].chunks[chunkIdToSend].fillLevel;
      const targetAmount = currentState[targetNode].chunks[chunkIdToSend].fillLevel;
      
      nextState[targetNode].chunks[chunkIdToSend].fillLevel = targetAmount + senderAmount;
      
      // If we reached N (4), it is fully reduced.
      if (nextState[targetNode].chunks[chunkIdToSend].fillLevel >= NODES) {
        nextState[targetNode].chunks[chunkIdToSend].fillLevel = NODES; // Cap visual at 4
        nextState[targetNode].chunks[chunkIdToSend].isFull = true;
      }
    }

    currentState = nextState;
    steps.push({
      stepIndex: steps.length,
      phase: 'SCATTER_REDUCE',
      description: `Scatter-Reduce Step ${k + 1}/${NODES - 1}: Workers pass their partial accumulations to the next neighbor. Note how the "fill level" grows as data is combined around the ring.`,
      transfers,
      nodeStates: cloneState(currentState),
    });
  }

  // --- Intermediate Step: Cleanup ---
  // Before All-Gather, let's visualize that each worker now ONLY cares about the chunk it fully owns.
  // We clear the partial sums of other chunks to make the broadcast phase clearer.
  const prunedState = cloneState(currentState);
  prunedState.forEach((node, i) => {
      // Node i is responsible for Chunk (i+1)%N
      // e.g. Node 0 responsible for C1
      //      Node 1 responsible for C2
      //      Node 2 responsible for C3
      //      Node 3 responsible for C0
      const ownedChunkId = (i + 1) % NODES;
      
      node.chunks.forEach(chunk => {
          if (chunk.id !== ownedChunkId) {
              chunk.fillLevel = 0; // Clear it visually
              chunk.isFull = false;
          }
      });
  });
  currentState = prunedState;
  
  steps.push({
      stepIndex: steps.length,
      phase: 'IDLE',
      description: "Intermediate Cleanup: Scatter-Reduce is complete. Partial sums of non-owned chunks are discarded. Each worker now holds exactly one fully reduced chunk (highlighted) ready to be broadcast.",
      transfers: [],
      nodeStates: cloneState(currentState),
  });


  // --- Phase 2: All-Gather ---
  // After Scatter-Reduce:
  // Node 0 holds full C1
  // Node 1 holds full C2
  // Node 2 holds full C3
  // Node 3 holds full C0
  // General: Node i holds full Chunk (i + 1) % N
  
  for (let k = 0; k < NODES - 1; k++) {
    const nextState = cloneState(currentState);
    const transfers = [];

    for (let i = 0; i < NODES; i++) {
      const targetNode = (i + 1) % NODES;
      
      // LOGIC FIX:
      // In Gather step k:
      // Start (k=0): Node i sends Chunk (i + 1), which it fully owns.
      // Next (k=1): Node i sends Chunk (i), which it received in previous step.
      // Formula: (i + 1 - k)
      const chunkIdToSend = ((i + 1 - k) % NODES + NODES) % NODES;

      transfers.push({
        from: i,
        to: targetNode,
        chunkId: chunkIdToSend,
        isAccumulated: true // This is the final value being broadcast
      });

      // Update next state: The target node simply receives the full chunk
      nextState[targetNode].chunks[chunkIdToSend].fillLevel = NODES;
      nextState[targetNode].chunks[chunkIdToSend].isFull = true;
    }

    currentState = nextState;
    steps.push({
      stepIndex: steps.length,
      phase: 'ALL_GATHER',
      description: `All-Gather Step ${k + 1}/${NODES - 1}: The fully reduced chunks are now broadcast around the ring. Workers receive the final values for chunks they were missing.`,
      transfers,
      nodeStates: cloneState(currentState),
    });
  }

  // Final Complete State
  steps.push({
    stepIndex: steps.length,
    phase: 'COMPLETED',
    description: 'All-Reduce Completed: Every worker now has the fully averaged gradients for all partitions (C0-C3). Total communication volume: 2(N-1) * P/N.',
    transfers: [],
    nodeStates: cloneState(currentState),
  });

  return steps;
};

export const SIMULATION_DATA = generateSimulationSteps();