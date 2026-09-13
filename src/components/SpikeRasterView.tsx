import React, { useRef, useEffect } from "react";
import { SimulationMetrics, SpikeEvent, NeuropilRegion } from "../types";

interface SpikeRasterViewProps {
  metrics: SimulationMetrics | null;
  activeSpikes: SpikeEvent[];
  isThinking: boolean;
}

export const SpikeRasterView: React.FC<SpikeRasterViewProps> = ({
  metrics,
  activeSpikes,
  isThinking,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Buffer of recent spikes for rolling raster display
  const rollingSpikesRef = useRef<Array<{ id: number; time: number; region: NeuropilRegion }>>([]);
  const clockRef = useRef<number>(0);

  useEffect(() => {
    if (activeSpikes.length > 0) {
      clockRef.current += 1;
      const now = clockRef.current;
      for (const sp of activeSpikes) {
        rollingSpikesRef.current.push({
          id: sp.neuronId,
          time: now,
          region: sp.region,
        });
      }
      // Keep within max 600 spikes
      if (rollingSpikesRef.current.length > 600) {
        rollingSpikesRef.current = rollingSpikesRef.current.slice(-400);
      }
    }
  }, [activeSpikes]);

  // Draw raster canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark background
    ctx.fillStyle = "#1c1917"; // stone-900
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(68, 64, 60, 0.4)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Neuropil tier bands
    // 0..79: Sensory (Optic Lobe & Glomeruli)
    // 80..199: Mushroom Body KCs
    // 200..223: MBONs & DANs
    // 224..255: Central Complex (EB/PB)
    // 256..319: Descending Motor Neurons
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(168, 162, 158, 0.5)";
    ctx.fillText("DESCENDING (DN)", 4, 18);
    ctx.fillText("CENTRAL COMPLEX (CX)", 4, 48);
    ctx.fillText("MUSHROOM BODY (KC/MBON)", 4, 88);
    ctx.fillText("OPTIC LOBE & SENSORY", 4, 135);

    const now = clockRef.current;
    const windowMs = 50; // horizontal time window

    for (const sp of rollingSpikesRef.current) {
      const dt = now - sp.time;
      if (dt > windowMs) continue;

      const x = width - (dt / windowMs) * width;
      // Invert Y so motor neurons sit near top, sensory at bottom
      const y = height - (sp.id / 320) * height;

      // Color based on region
      if (sp.id >= 256) {
        ctx.fillStyle = "#f59e0b"; // amber for motor DNs
      } else if (sp.id >= 224) {
        ctx.fillStyle = "#06b6d4"; // cyan for central complex
      } else if (sp.id >= 80) {
        ctx.fillStyle = "#a855f7"; // purple for mushroom body
      } else {
        ctx.fillStyle = "#10b981"; // emerald for sensory
      }

      ctx.fillRect(x - 1, y - 1, 2, 2.5);
    }
  }, [activeSpikes]);

  return (
    <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-lg p-3 text-stone-200">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
        <span className="font-mono text-xs font-semibold text-stone-300">
          Neural Spike Raster Plot (Multi-Neuropil LIF Spikes)
        </span>
        <span className="text-[10px] font-mono text-amber-400">
          {isThinking ? "Recording Spike Trains..." : "Idle / Resting State"}
        </span>
      </div>

      {/* Raster Canvas */}
      <div className="relative w-full aspect-[500/150] bg-stone-950 rounded border border-stone-800 overflow-hidden mb-3">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full h-full block"
        />
      </div>

      {/* Regional Firing Rate Telemetry Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {metrics?.regionalRatesHz ? (
          Object.entries(metrics.regionalRatesHz).slice(0, 4).map(([region, rate]) => {
            const numRate = Number(rate);
            return (
              <div key={region} className="p-2 bg-stone-950/80 rounded border border-stone-800">
                <div className="text-[10px] text-stone-400 truncate mb-1" title={region}>
                  {region.replace("CENTRAL_COMPLEX_", "CX_").replace("MUSHROOM_BODY_", "MB_").replace("OPTIC_LOBE_", "OL_")}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-amber-400">{numRate} Hz</span>
                  <div className="w-12 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min(100, (numRate / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-2 text-stone-500 text-[11px]">
            Make a move or click &quot;Simulate Fly Move&quot; to inspect real-time firing rates.
          </div>
        )}
      </div>
    </div>
  );
};
