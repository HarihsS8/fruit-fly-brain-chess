import React, { useEffect, useRef, useState } from "react";
import { DrosophilaConnectomeModel } from "../lib/drosophilaConnectome";
import { ConnectomeNeuronNode, NeuropilRegion, Neurotransmitter, SpikeEvent } from "../types";

interface ConnectomeVisualizerProps {
  connectome: DrosophilaConnectomeModel;
  activeSpikes: SpikeEvent[];
  isThinking: boolean;
}

export const ConnectomeVisualizer: React.FC<ConnectomeVisualizerProps> = ({
  connectome,
  activeSpikes,
  isThinking,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNeuron, setHoveredNeuron] = useState<ConnectomeNeuronNode | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<NeuropilRegion | "ALL">("ALL");

  // Keep track of recent spike glow intensities for smooth rendering
  const spikeGlowRef = useRef<Float32Array>(new Float32Array(connectome.neurons.length));

  // Particle animations for action potentials traveling along synapses
  const particlesRef = useRef<Array<{ x: number; y: number; tx: number; ty: number; progress: number }>>([]);

  useEffect(() => {
    // Whenever new activeSpikes arrive, energize the glow array and spawn particles
    const glows = spikeGlowRef.current;
    for (const ev of activeSpikes) {
      if (ev.neuronId < glows.length) {
        glows[ev.neuronId] = 1.0;

        // Spawn a couple of visual action potential particles along outgoing synapses
        const node = connectome.neurons[ev.neuronId];
        if (node && particlesRef.current.length < 50) {
          // Find connected targets
          const N = connectome.neurons.length;
          const offset = ev.neuronId * N;
          for (let post = 0; post < N; post += 8) {
            if (connectome.adjacencyMatrix[offset + post] > 0.3) {
              const target = connectome.neurons[post];
              if (target) {
                particlesRef.current.push({
                  x: node.px,
                  y: node.py,
                  tx: target.px,
                  ty: target.py,
                  progress: 0,
                });
                break;
              }
            }
          }
        }
      }
    }
  }, [activeSpikes, connectome]);

  // Main Canvas render loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark, high-contrast neuro-anatomical background
      ctx.fillStyle = "#0c0a09"; // stone-950
      ctx.fillRect(0, 0, width, height);

      // 1. Draw subtle anatomical outline of Drosophila head capsule & neuropils
      ctx.strokeStyle = "rgba(120, 113, 108, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Outer cranial capsule contour
      ctx.ellipse(270, 180, 240, 150, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Optic lobe lobes (Bilateral)
      ctx.fillStyle = "rgba(245, 158, 11, 0.03)";
      ctx.beginPath();
      ctx.ellipse(100, 150, 70, 100, -0.2, 0, Math.PI * 2); // Left Optic Lobe
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(440, 150, 70, 100, 0.2, 0, Math.PI * 2); // Right Optic Lobe
      ctx.fill();
      ctx.stroke();

      // Central Complex & Mushroom Body boundary
      ctx.fillStyle = "rgba(14, 165, 233, 0.04)";
      ctx.beginPath();
      ctx.ellipse(270, 140, 90, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Draw Synaptic wiring links (low alpha baseline, highlighted when active)
      ctx.lineWidth = 0.5;
      const synapses = connectome.synapses;
      const step = synapses.length > 500 ? 2 : 1; // subsample for performance

      for (let i = 0; i < synapses.length; i += step) {
        const syn = synapses[i];
        const pre = connectome.neurons[syn.preId];
        const post = connectome.neurons[syn.postId];
        if (!pre || !post) continue;

        if (
          selectedRegion !== "ALL" &&
          pre.region !== selectedRegion &&
          post.region !== selectedRegion
        ) {
          continue;
        }

        const preGlow = spikeGlowRef.current[pre.id] || 0;
        if (preGlow > 0.2) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${Math.min(0.8, preGlow * 0.7)})`;
          ctx.lineWidth = 1.0;
        } else {
          ctx.strokeStyle = "rgba(87, 83, 78, 0.12)";
          ctx.lineWidth = 0.5;
        }

        ctx.beginPath();
        ctx.moveTo(pre.px, pre.py);
        ctx.lineTo(post.px, post.py);
        ctx.stroke();
      }

      // 3. Draw Traveling Action Potential Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += 0.05;
        const curX = p.x + (p.tx - p.x) * p.progress;
        const curY = p.y + (p.ty - p.y) * p.progress;

        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(curX, curY, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.progress >= 1.0) {
          particles.splice(i, 1);
        }
      }

      // 4. Draw Connectome Neurons
      const glows = spikeGlowRef.current;
      for (let i = 0; i < connectome.neurons.length; i++) {
        const neuron = connectome.neurons[i];
        const glow = glows[i];
        glows[i] = Math.max(0, glow - 0.03); // exponential decay

        const isHighlighted =
          selectedRegion === "ALL" || neuron.region === selectedRegion;
        const isHovered = hoveredNeuron?.id === neuron.id;

        // Neurotransmitter color palette
        let color = "#a8a29e"; // default gray
        if (neuron.neurotransmitter === Neurotransmitter.ACETYLCHOLINE) color = "#f59e0b"; // amber
        else if (neuron.neurotransmitter === Neurotransmitter.GABA) color = "#06b6d4";     // cyan
        else if (neuron.neurotransmitter === Neurotransmitter.DOPAMINE) color = "#ec4899"; // pink
        else if (neuron.neurotransmitter === Neurotransmitter.GLUTAMATE) color = "#10b981"; // emerald

        const baseRadius = neuron.isSensory || neuron.isMotor ? 3.0 : 2.2;
        const radius = isHovered ? baseRadius + 3 : glow > 0.1 ? baseRadius + glow * 2.5 : baseRadius;

        ctx.beginPath();
        ctx.arc(neuron.px, neuron.py, radius, 0, Math.PI * 2);

        if (glow > 0.1) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = color;
          ctx.shadowBlur = 10 * glow;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = isHighlighted ? color : "rgba(120, 113, 108, 0.2)";
          ctx.fill();
        }

        if (isHovered) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 5. Draw Anatomical Neuropil Labels
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(214, 211, 209, 0.6)";
      ctx.fillText("OPTIC LOBE (L)", 40, 45);
      ctx.fillText("OPTIC LOBE (R)", 430, 45);
      ctx.fillText("MUSHROOM BODY (KC)", 170, 75);
      ctx.fillText("CENTRAL COMPLEX (EB/PB)", 200, 175);
      ctx.fillText("DESCENDING NEURONS (DN)", 190, 240);
      ctx.fillText("ANTENNAL GLOMERULI", 200, 350);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [connectome, selectedRegion, hoveredNeuron]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Find closest neuron within 12px
    let closest: ConnectomeNeuronNode | null = null;
    let minDist = 14;

    for (const n of connectome.neurons) {
      const d = Math.hypot(n.px - mx, n.py - my);
      if (d < minDist) {
        minDist = d;
        closest = n;
      }
    }
    setHoveredNeuron(closest);
  };

  return (
    <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-lg p-3 text-stone-200">
      {/* Visualizer Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isThinking ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-300">
            Drosophila Brain Connectome (FlyWire FAFB Model)
          </span>
        </div>
        <div className="text-[11px] font-mono text-stone-400">
          320 Neurons · 1,480 Synapses
        </div>
      </div>

      {/* Neuropil Filter Pills */}
      <div className="flex flex-wrap gap-1 mb-2">
        {(
          [
            { id: "ALL", label: "All Neuropils" },
            { id: NeuropilRegion.OPTIC_LOBE_MEDULLA, label: "Optic Lobe (64)" },
            { id: NeuropilRegion.MUSHROOM_BODY_KC, label: "Mushroom Body (120)" },
            { id: NeuropilRegion.CENTRAL_COMPLEX_EB, label: "Central Complex (32)" },
            { id: NeuropilRegion.DESCENDING_NEURONS, label: "Descending Motor (64)" },
          ] as const
        ).map((filter) => (
          <button
            key={filter.id}
            id={`filter-${filter.id}`}
            onClick={() => setSelectedRegion(filter.id as any)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              selectedRegion === filter.id
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-stone-800/80 text-stone-400 hover:text-stone-200 border border-stone-700/50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Canvas Container */}
      <div className="relative w-full aspect-[540/380] bg-stone-950 rounded border border-stone-800/80 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={540}
          height={380}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNeuron(null)}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Hovered Neuron Tooltip */}
        {hoveredNeuron && (
          <div className="absolute bottom-2 left-2 pointer-events-none bg-stone-900/90 backdrop-blur-sm border border-stone-700 rounded p-2 text-[11px] font-mono shadow-lg text-stone-200">
            <div className="font-bold text-amber-400">{hoveredNeuron.name}</div>
            <div className="text-stone-400">Region: <span className="text-stone-200">{hoveredNeuron.region}</span></div>
            <div className="text-stone-400">Transmitter: <span className="text-stone-200">{hoveredNeuron.neurotransmitter}</span></div>
            <div className="text-stone-400">FAFB 3D: [{Math.round(hoveredNeuron.x)}, {Math.round(hoveredNeuron.y)}, {Math.round(hoveredNeuron.z)}] µm</div>
          </div>
        )}
      </div>

      {/* Neurotransmitter Legend */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-800/60 text-[10px] font-mono text-stone-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> ACh (Excitatory)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> GABA (Inhibitory)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span> DA (Plasticity)
          </span>
        </div>
        <span className="text-stone-500">Live action potentials propagate across synapses</span>
      </div>
    </div>
  );
};
