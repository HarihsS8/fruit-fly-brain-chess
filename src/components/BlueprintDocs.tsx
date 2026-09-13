import React from "react";
import { BookOpen, Cpu, Zap, Dna, Terminal, CheckCircle2 } from "lucide-react";

export const BlueprintDocs: React.FC = () => {
  return (
    <div className="flex flex-col space-y-6 text-stone-200">
      {/* Intro Card */}
      <div className="p-5 bg-stone-900 border border-stone-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Dna className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-stone-100 font-mono uppercase tracking-wide">
            Project Blueprint: Drosophila Connectome Chess (FlyChess)
          </h2>
        </div>
        <p className="text-sm text-stone-300 leading-relaxed">
          The adult fruit fly (*Drosophila melanogaster*) possesses an intensely efficient brain
          consisting of <strong>139,255 neurons and over 50 million synapses</strong> (FlyWire/FAFB
          dataset). FlyChess bridges real connectomic wiring patterns with Leaky Integrate-and-Fire (LIF)
          spiking simulations to evaluate chess positions and execute valid chess moves without symbolic
          minimax search.
        </p>
      </div>

      {/* Neuropil Circuit Mapping Breakdown */}
      <div className="p-5 bg-stone-900 border border-stone-800 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wide">
            Neuropil-to-Chess Computational Circuit
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded">
            <div className="text-amber-400 font-bold mb-1">1. Optic Lobe (Mi1 & Tm1 Columns)</div>
            <p className="text-stone-400 leading-relaxed">
              64 visual columns map the 8x8 chessboard retinotopically. Excitatory input currents scale
              with piece presence, spatial rank/file coordinates, and line-of-sight visual attacks.
            </p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded">
            <div className="text-amber-400 font-bold mb-1">2. Antennal Lobe Glomeruli</div>
            <p className="text-stone-400 leading-relaxed">
              16 evaluative tactical glomeruli encode global valence: check status alarm currents,
              material disparity, center mobility, and king danger into steady sensory currents.
            </p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded">
            <div className="text-amber-400 font-bold mb-1">3. Mushroom Body (120 Kenyon Cells + MBONs)</div>
            <p className="text-stone-400 leading-relaxed">
              High-dimensional sparse expansion layer. Each KC receives 5-7 random sensory claws.
              Synapses onto MBONs are modulated via dopaminergic reinforcement (PAM/PPL1 clusters).
            </p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded">
            <div className="text-amber-400 font-bold mb-1">4. Central Complex (EB Ring & PB Columns)</div>
            <p className="text-stone-400 leading-relaxed">
              Ring attractor dynamics provide global compass heading and board orientation context,
              integrating sensory tension to drive motor exploration vigor.
            </p>
          </div>

          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded md:col-span-2">
            <div className="text-amber-400 font-bold mb-1">5. Descending Motor Neurons (64 DN Channels)</div>
            <p className="text-stone-400 leading-relaxed">
              Project to thoracic ganglia motor centers. Firing rates across the 64 target square DNs are
              integrated with source square activation and an innate predatory capture reflex to select
              the winning legal chess move via softmax population voting.
            </p>
          </div>
        </div>
      </div>

      {/* Biophysical Formulations */}
      <div className="p-5 bg-stone-900 border border-stone-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wide">
            Biophysical Leaky Integrate-and-Fire Dynamics
          </h3>
        </div>

        <div className="space-y-3 text-xs font-mono text-stone-300">
          <div className="p-3 bg-stone-950 rounded border border-stone-800">
            <div className="text-stone-400 text-[11px] mb-1">// Membrane Potential Integration</div>
            <div className="text-amber-300 font-bold text-sm">
              τ_m · (dV_i / dt) = -(V_i - V_rest) + R_m · (I_syn,i + I_ext,i)
            </div>
            <div className="text-stone-400 text-[11px] mt-1">
              Parameters: τ_m = 20.0 ms, V_rest = -70.0 mV, V_reset = -75.0 mV, V_thresh = -50.0 mV, τ_ref = 2.0 ms
            </div>
          </div>

          <div className="p-3 bg-stone-950 rounded border border-stone-800">
            <div className="text-stone-400 text-[11px] mb-1">// 3-Factor Dopamine-Modulated STDP Rule</div>
            <div className="text-cyan-300 font-bold text-sm">
              ΔW_ji = η · DA(t) · [ S_post · pre_trace - S_pre · post_trace ]
            </div>
            <div className="text-stone-400 text-[11px] mt-1">
              Reward DA(t) is pulsed upon capturing opponent material or delivering checks.
            </div>
          </div>
        </div>
      </div>

      {/* CLI Quickstart */}
      <div className="p-5 bg-stone-900 border border-stone-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wide">
            Running Python Repository Locally
          </h3>
        </div>

        <div className="bg-stone-950 rounded p-3 font-mono text-xs text-stone-300 border border-stone-800 space-y-2">
          <div className="text-stone-500"># 1. Clone or extract downloaded repository</div>
          <div className="text-amber-400">git clone https://github.com/flychess-lab/flychess.git</div>
          <div className="text-amber-400">cd flychess &amp;&amp; pip install -r requirements.txt</div>
          
          <div className="text-stone-500 pt-2"># 2. Play Human vs. Drosophila Connectome in CLI</div>
          <div className="text-emerald-400">flychess play --color white --sim-ms 40.0 --temperature 0.3</div>
          
          <div className="text-stone-500 pt-2"># 3. Inspect Connectome statistics</div>
          <div className="text-emerald-400">flychess inspect</div>

          <div className="text-stone-500 pt-2"># 4. Run automated test suite</div>
          <div className="text-cyan-400">pytest tests/</div>
        </div>
      </div>
    </div>
  );
};
