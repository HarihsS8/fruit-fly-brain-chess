import React, { useState, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { FlyChessController } from "./lib/sensoryMotorChess";
import { ChessBoardView } from "./components/ChessBoardView";
import { ConnectomeVisualizer } from "./components/ConnectomeVisualizer";
import { SpikeRasterView } from "./components/SpikeRasterView";
import { RepoExplorer } from "./components/RepoExplorer";
import { BlueprintDocs } from "./components/BlueprintDocs";
import { SpikeEvent, SimulationMetrics } from "./types";
import { Play, RotateCcw, Zap, Terminal, BookOpen, Layers, Dna, Activity, Sliders } from "lucide-react";

export default function App() {
  const [controller] = useState(() => new FlyChessController());
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"game" | "repo" | "blueprint">("game");

  // Game state
  const [userColor, setUserColor] = useState<"w" | "b">("w");
  const [isFlyThinking, setIsFlyThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [activeSpikes, setActiveSpikes] = useState<SpikeEvent[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [simDuration, setSimDuration] = useState(40);
  const [temperature, setTemperature] = useState(0.35);

  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  const triggerUpdate = () => setRenderTrigger((t) => t + 1);

  // Execute fly move via sensory-motor LIF integration
  const runFlyMove = async () => {
    if (controller.chess.isGameOver() || isFlyThinking) return;

    setIsFlyThinking(true);
    controller.simulationDurationMs = simDuration;
    controller.temperature = temperature;

    try {
      const { move, metrics: resMetrics } = await controller.computeFlyMove((step, total, spikes) => {
        setActiveSpikes(spikes);
      });

      controller.chess.move(move);
      setLastMove({ from: move.from, to: move.to });
      setMetrics(resMetrics);
      triggerUpdate();
    } catch (err) {
      console.error("Fly move error:", err);
    } finally {
      setIsFlyThinking(false);
    }
  };

  // Human player move handler
  const handleUserMove = (from: Square, to: Square) => {
    if (isFlyThinking || controller.chess.isGameOver()) return;

    try {
      const move = controller.chess.move({ from, to, promotion: "q" });
      if (move) {
        setLastMove({ from: move.from, to: move.to });
        triggerUpdate();

        // If not game over, trigger Drosophila move
        if (!controller.chess.isGameOver()) {
          setTimeout(() => {
            runFlyMove();
          }, 300);
        }
      }
    } catch (e) {
      // Invalid move attempt
    }
  };

  // Reset board
  const handleReset = () => {
    setAutoPlay(false);
    controller.reset();
    setLastMove(null);
    setActiveSpikes([]);
    setMetrics(null);
    triggerUpdate();
  };

  // Autoplay loop (Fly vs Fly)
  useEffect(() => {
    let timer: any;
    if (autoPlay && !isFlyThinking && !controller.chess.isGameOver()) {
      timer = setTimeout(() => {
        runFlyMove();
      }, 700);
    }
    return () => clearTimeout(timer);
  }, [autoPlay, isFlyThinking, renderTrigger]);

  const chess = controller.chess;
  const isGameOver = chess.isGameOver();
  const history = chess.history();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navigation Bar */}
      <header className="border-b border-stone-800/80 bg-stone-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-stone-950 shadow-md">
              <Dna className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm sm:text-base font-bold tracking-tight text-stone-100">
                  FlyChess
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700">
                  Drosophila Connectome LIF Engine
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono hidden sm:block">
                Biological fruit fly brain simulation mapped to chess sensory-motor circuits
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 font-mono text-xs">
            <button
              id="tab-game"
              onClick={() => setActiveTab("game")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "game"
                  ? "bg-stone-800 text-amber-400 font-bold shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Interactive Match</span>
            </button>

            <button
              id="tab-repo"
              onClick={() => setActiveTab("repo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "repo"
                  ? "bg-stone-800 text-amber-400 font-bold shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Repository &amp; Code</span>
            </button>

            <button
              id="tab-blueprint"
              onClick={() => setActiveTab("blueprint")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "blueprint"
                  ? "bg-stone-800 text-amber-400 font-bold shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Circuit Blueprint</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === "game" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chess Board & Move List */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <ChessBoardView
                chess={chess}
                isFlyThinking={isFlyThinking}
                userColor={userColor}
                onUserMove={handleUserMove}
                lastMove={lastMove}
              />

              {/* Game Status Banner */}
              {isGameOver && (
                <div className="mt-3 w-full max-w-[420px] p-2.5 bg-red-950/80 border border-red-800 rounded-md text-center text-xs font-mono text-red-200">
                  Game Finished: {chess.isCheckmate() ? "Checkmate!" : "Draw / Stalemate"}
                </div>
              )}

              {/* Action Controls */}
              <div className="mt-4 w-full max-w-[420px] bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-stone-300 font-semibold border-b border-stone-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Simulation Controls
                  </span>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200 px-2 py-0.5 rounded hover:bg-stone-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Game
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-simulate-move"
                    onClick={runFlyMove}
                    disabled={isFlyThinking || isGameOver}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-xs rounded transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Simulate Fly Move
                  </button>

                  <button
                    id="btn-toggle-autoplay"
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 font-mono font-bold text-xs rounded transition-colors border ${
                      autoPlay
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    {autoPlay ? "Pause Autoplay" : "Fly vs Fly (Autoplay)"}
                  </button>
                </div>

                {/* Hyperparameters Sliders */}
                <div className="space-y-2 text-[11px] font-mono text-stone-400 pt-1 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <span>LIF Simulation Window:</span>
                    <span className="text-stone-200 font-bold">{simDuration} ms (dt=1.0ms)</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={simDuration}
                    onChange={(e) => setSimDuration(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-stone-800 rounded cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span>Motor Softmax Temp:</span>
                    <span className="text-stone-200 font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-stone-800 rounded cursor-pointer"
                  />
                </div>

                {/* Move History */}
                <div className="pt-2 border-t border-stone-800">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-mono mb-1">
                    Move History ({history.length} ply)
                  </div>
                  <div className="max-h-20 overflow-y-auto font-mono text-[11px] text-stone-300 bg-stone-950 p-2 rounded border border-stone-800 flex flex-wrap gap-x-3 gap-y-1">
                    {history.length === 0 ? (
                      <span className="text-stone-600">No moves played yet</span>
                    ) : (
                      history.map((m, idx) => (
                        <span key={idx} className="inline-block">
                          {idx % 2 === 0 && (
                            <span className="text-stone-500 mr-1">{Math.floor(idx / 2) + 1}.</span>
                          )}
                          <span className={idx % 2 === 0 ? "text-stone-200" : "text-amber-400"}>
                            {m}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Connectome Canvas, Spikes, & Decision Telemetry */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* Connectome Canvas Visualizer */}
              <ConnectomeVisualizer
                connectome={controller.connectome}
                activeSpikes={activeSpikes}
                isThinking={isFlyThinking}
              />

              {/* Spike Raster Plot */}
              <SpikeRasterView
                metrics={metrics}
                activeSpikes={activeSpikes}
                isThinking={isFlyThinking}
              />

              {/* Decision Metrics Card */}
              {metrics && (
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-3 text-xs font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
                    <span className="font-bold text-amber-400">
                      Latest Decision Telemetry: Move {metrics.chosenMove}
                    </span>
                    <span className="text-stone-400">
                      Confidence: {(metrics.confidence * 100).toFixed(1)}% · Total Spikes: {metrics.totalSpikes}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                      Top Candidate Descending Neuron (DN) Move Activations:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {metrics.candidateMoves.map((cand, idx) => (
                        <div
                          key={idx}
                          className={`p-1.5 rounded border ${
                            idx === 0
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold"
                              : "bg-stone-950 border-stone-800 text-stone-400"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{cand.move}</span>
                            <span>{cand.probability}%</span>
                          </div>
                          <div className="w-full bg-stone-800 h-1 rounded-full mt-1 overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full"
                              style={{ width: `${cand.probability}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "repo" && <RepoExplorer />}

        {activeTab === "blueprint" && <BlueprintDocs />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-4 px-4 text-center text-xs font-mono text-stone-500">
        FlyChess Connectome Engine · Built with Drosophila melanogaster FAFB Connectome Data &amp; Leaky Integrate-and-Fire Dynamics
      </footer>
    </div>
  );
}
