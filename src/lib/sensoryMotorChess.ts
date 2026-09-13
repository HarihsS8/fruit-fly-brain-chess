import { Chess, Move, Square } from "chess.js";
import { DrosophilaConnectomeModel } from "./drosophilaConnectome";
import { LIFSimulationEngine } from "./lifSimulation";
import { SimulationMetrics, NeuropilRegion, SpikeEvent } from "../types";

export class FlyChessController {
  public chess: Chess;
  public connectome: DrosophilaConnectomeModel;
  public lif: LIFSimulationEngine;
  public simulationDurationMs: number = 40; // 40ms simulation per move
  public temperature: number = 0.35;
  public isThinking: boolean = false;
  public recentSpikeEvents: SpikeEvent[] = [];
  public recentMetrics: SimulationMetrics | null = null;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.connectome = new DrosophilaConnectomeModel(42);
    this.lif = new LIFSimulationEngine(this.connectome);
  }

  public reset(fen?: string) {
    if (fen) {
      this.chess.load(fen);
    } else {
      this.chess.reset();
    }
    this.lif.reset();
    this.recentSpikeEvents = [];
    this.recentMetrics = null;
  }

  /**
   * Generates sensory currents (80 units: 64 squares + 16 tactical glomeruli)
   */
  public generateSensoryCurrents(playerColor: "w" | "b"): Float32Array {
    const totalN = this.connectome.neurons.length;
    const iExt = new Float32Array(totalN).fill(0);

    const pieceValues: Record<string, number> = {
      p: 1.0,
      n: 3.0,
      b: 3.25,
      r: 5.0,
      q: 9.0,
      k: 10.0,
    };

    let friendlyMaterial = 0;
    let enemyMaterial = 0;

    // 1. Optic Lobe 64 squares retinotopic projection
    const board = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        // Map 0..63 square index (rank 0..7, file 0..7)
        const sqIndex = (7 - r) * 8 + f;
        const sNeuronId = this.connectome.sensoryIds[sqIndex];
        const piece = board[r][f];

        if (piece) {
          const val = pieceValues[piece.type] || 1.0;
          const isFriendly = piece.color === playerColor;

          if (isFriendly) {
            iExt[sNeuronId] = 1.6 + (val / 9.0) * 2.2;
            friendlyMaterial += val;
          } else {
            iExt[sNeuronId] = 0.9 + (val / 9.0) * 1.6;
            enemyMaterial += val;
          }
        }
      }
    }

    // 2. Glomerular Tactical Units (16 units starting at index 64 of sensoryIds)
    const inCheck = this.chess.inCheck();
    const matDiff = friendlyMaterial - enemyMaterial;
    const legalCount = this.chess.moves().length;

    // Unit 0: In check warning
    if (inCheck) {
      iExt[this.connectome.sensoryIds[64]] = 3.8;
    }

    // Unit 1-2: Material balance valence
    if (matDiff > 0) {
      iExt[this.connectome.sensoryIds[65]] = Math.min(4.0, matDiff * 0.6);
    } else {
      iExt[this.connectome.sensoryIds[66]] = Math.min(4.0, Math.abs(matDiff) * 0.6);
    }

    // Unit 3: Mobility
    iExt[this.connectome.sensoryIds[67]] = Math.min(3.5, legalCount * 0.12);

    // Units 4-7: Center control (d4, e4, d5, e5)
    iExt[this.connectome.sensoryIds[68]] = 1.5;
    iExt[this.connectome.sensoryIds[69]] = 1.5;
    iExt[this.connectome.sensoryIds[70]] = 1.2;
    iExt[this.connectome.sensoryIds[71]] = 1.2;

    // Add mild biological sensory noise
    for (let i = 0; i < this.connectome.sensoryIds.length; i++) {
      const id = this.connectome.sensoryIds[i];
      iExt[id] += (Math.random() - 0.5) * 0.1;
      if (iExt[id] < 0) iExt[id] = 0;
    }

    return iExt;
  }

  /**
   * Runs the sensory-motor LIF loop for the current turn.
   * Returns selected Move and comprehensive telemetry.
   */
  public async computeFlyMove(
    onStepTick?: (step: number, totalSteps: number, activeSpikes: SpikeEvent[]) => void
  ): Promise<{ move: Move; metrics: SimulationMetrics }> {
    this.isThinking = true;
    this.lif.reset();

    const turn = this.chess.turn();
    const legalMoves = this.chess.moves({ verbose: true });

    if (legalMoves.length === 0) {
      this.isThinking = false;
      throw new Error("No legal moves available.");
    }

    const iExt = this.generateSensoryCurrents(turn);
    const totalSteps = Math.max(20, Math.floor(this.simulationDurationMs));
    const dnSpikeCounts = new Float32Array(64).fill(0);
    const regionalSpikeCounts: Record<string, number> = {};

    for (const r of Object.values(NeuropilRegion)) {
      regionalSpikeCounts[r] = 0;
    }

    let totalSpikes = 0;
    const allSpikesHistory: SpikeEvent[] = [];

    // Run LIF simulation across time steps
    for (let step = 0; step < totalSteps; step++) {
      const { spikes, activeSpikeEvents } = this.lif.step(iExt, 0);

      for (const ev of activeSpikeEvents) {
        ev.timeMs = step;
        allSpikesHistory.push(ev);
        regionalSpikeCounts[ev.region] = (regionalSpikeCounts[ev.region] || 0) + 1;
        totalSpikes++;
      }

      // Tally Descending Motor Neurons
      for (let m = 0; m < 64; m++) {
        const dnId = this.connectome.motorIds[m];
        if (spikes[dnId] === 1) {
          dnSpikeCounts[m] += 1;
        }
      }

      if (onStepTick && step % 5 === 0) {
        onStepTick(step, totalSteps, activeSpikeEvents);
        // Small non-blocking yield for UI rendering responsiveness
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }

    this.recentSpikeEvents = allSpikesHistory.slice(-150);

    // Motor decoding: Evaluate each legal move based on DN firing rates
    const moveScores: Array<{ move: Move; score: number }> = [];

    for (const m of legalMoves) {
      const fromSq = this._algebraicToSquareIndex(m.from);
      const toSq = this._algebraicToSquareIndex(m.to);

      const targetDrive = dnSpikeCounts[toSq] || 0;
      const sourceDrive = dnSpikeCounts[fromSq] || 0;

      let score = targetDrive * 1.8 + sourceDrive * 0.9;

      // Innate predatory reflex for captures
      if (m.captured) {
        score += 2.5;
      }
      if (m.promotion) {
        score += 3.5;
      }

      // Small exploration baseline
      score += 0.2 + Math.random() * 0.1;
      moveScores.push({ move: m, score });
    }

    // Softmax probabilities
    const temp = Math.max(0.05, this.temperature);
    const maxScore = Math.max(...moveScores.map((s) => s.score));
    const expScores = moveScores.map((s) => Math.exp((s.score - maxScore) / temp));
    const sumExp = expScores.reduce((acc, v) => acc + v, 0);
    const probs = expScores.map((v) => v / sumExp);

    // Sample move based on probability distribution
    let r = Math.random();
    let chosenIndex = 0;
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r <= cumulative) {
        chosenIndex = i;
        break;
      }
    }

    const chosen = moveScores[chosenIndex].move;
    const confidence = probs[chosenIndex];

    // Calculate regional firing rates in Hz
    const simDurationSec = this.simulationDurationMs / 1000.0;
    const regionalRatesHz: Record<string, number> = {};
    for (const [region, count] of Object.entries(regionalSpikeCounts)) {
      const neuronsInRegion = this.connectome.neurons.filter((n) => n.region === region).length;
      regionalRatesHz[region] = neuronsInRegion > 0 ? Math.round((count / (neuronsInRegion * simDurationSec)) * 10) / 10 : 0;
    }

    const candidateMoves = moveScores
      .map((ms, i) => ({
        move: ms.move.san,
        score: Math.round(ms.score * 100) / 100,
        probability: Math.round(probs[i] * 1000) / 10,
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 6);

    const metrics: SimulationMetrics = {
      chosenMove: chosen.san,
      confidence: Math.round(confidence * 100) / 100,
      totalSpikes,
      stepCount: totalSteps,
      durationMs: this.simulationDurationMs,
      regionalRatesHz,
      candidateMoves,
    };

    this.recentMetrics = metrics;
    this.isThinking = false;

    return { move: chosen, metrics };
  }

  private _algebraicToSquareIndex(sq: string): number {
    const file = sq.charCodeAt(0) - 97; // 'a' -> 0
    const rank = parseInt(sq[1], 10) - 1; // '1' -> 0
    return rank * 8 + file;
  }
}
