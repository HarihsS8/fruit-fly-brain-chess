export enum NeuropilRegion {
  OPTIC_LOBE_LAMINA = "OL_LAMINA",
  OPTIC_LOBE_MEDULLA = "OL_MEDULLA",
  OPTIC_LOBE_LOBULA = "OL_LOBULA",
  ANTENNAL_LOBE = "ANTENNAL_LOBE",
  CENTRAL_COMPLEX_PB = "CX_PB",
  CENTRAL_COMPLEX_EB = "CX_EB",
  CENTRAL_COMPLEX_FB = "CX_FB",
  MUSHROOM_BODY_KC = "MB_KC",
  MUSHROOM_BODY_MBON = "MB_MBON",
  MUSHROOM_BODY_DAN = "MB_DAN",
  DESCENDING_NEURONS = "DESCENDING_NEURONS",
}

export enum Neurotransmitter {
  ACETYLCHOLINE = "ACh",
  GABA = "GABA",
  GLUTAMATE = "Glu",
  DOPAMINE = "DA",
}

export interface ConnectomeNeuronNode {
  id: number;
  name: string;
  region: NeuropilRegion;
  neurotransmitter: Neurotransmitter;
  isSensory?: boolean;
  isMotor?: boolean;
  x: number; // anatomical coordinates in microns
  y: number;
  z: number;
  // 2D projection for canvas rendering
  px: number;
  py: number;
}

export interface SynapseLink {
  preId: number;
  postId: number;
  weight: number;
  isPlastic?: boolean;
}

export interface SimulationMetrics {
  chosenMove: string;
  confidence: number;
  totalSpikes: number;
  stepCount: number;
  durationMs: number;
  regionalRatesHz: Record<string, number>;
  candidateMoves: Array<{ move: string; score: number; probability: number }>;
}

export interface SpikeEvent {
  neuronId: number;
  timeMs: number;
  region: NeuropilRegion;
}

export interface RepoFile {
  path: string;
  name: string;
  language: string;
  content: string;
  category: "core" | "config" | "example" | "test" | "doc" | "build";
}
