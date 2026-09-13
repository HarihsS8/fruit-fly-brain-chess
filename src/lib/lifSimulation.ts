import { DrosophilaConnectomeModel } from "./drosophilaConnectome";
import { SpikeEvent, NeuropilRegion } from "../types";

export interface LIFParams {
  tauM: number;      // 20.0 ms
  vRest: number;     // -70.0 mV
  vReset: number;    // -75.0 mV
  vThresh: number;   // -50.0 mV
  tauRef: number;    // 2.0 ms
  rM: number;        // 10.0 MOhm
  tauSyn: number;    // 5.0 ms
  dt: number;        // 1.0 ms
  stdpLr: number;    // 0.005
}

export const DEFAULT_LIF_PARAMS: LIFParams = {
  tauM: 20.0,
  vRest: -70.0,
  vReset: -75.0,
  vThresh: -50.0,
  tauRef: 2.0,
  rM: 10.0,
  tauSyn: 5.0,
  dt: 1.0,
  stdpLr: 0.005,
};

export class LIFSimulationEngine {
  private connectome: DrosophilaConnectomeModel;
  private params: LIFParams;
  public v: Float32Array;
  public iSyn: Float32Array;
  public refractoryTimer: Float32Array;
  public preTrace: Float32Array;
  public postTrace: Float32Array;

  constructor(connectome: DrosophilaConnectomeModel, params: LIFParams = DEFAULT_LIF_PARAMS) {
    this.connectome = connectome;
    this.params = params;
    const n = connectome.neurons.length;
    this.v = new Float32Array(n).fill(params.vRest);
    this.iSyn = new Float32Array(n).fill(0);
    this.refractoryTimer = new Float32Array(n).fill(0);
    this.preTrace = new Float32Array(n).fill(0);
    this.postTrace = new Float32Array(n).fill(0);
  }

  public reset() {
    this.v.fill(this.params.vRest);
    this.iSyn.fill(0);
    this.refractoryTimer.fill(0);
    this.preTrace.fill(0);
    this.postTrace.fill(0);
  }

  public step(iExt: Float32Array, dopamine: number = 0): { spikes: Uint8Array; activeSpikeEvents: SpikeEvent[] } {
    const n = this.connectome.neurons.length;
    const p = this.params;
    const dt = p.dt;
    const decaySyn = Math.exp(-dt / p.tauSyn);
    const decayStdp = Math.exp(-dt / 15.0);

    const spikes = new Uint8Array(n);
    const activeSpikeEvents: SpikeEvent[] = [];

    // 1. Decay synaptic current & STDP traces
    for (let i = 0; i < n; i++) {
      this.iSyn[i] *= decaySyn;
      this.preTrace[i] *= decayStdp;
      this.postTrace[i] *= decayStdp;
    }

    // 2. Subthreshold membrane integration
    for (let i = 0; i < n; i++) {
      if (this.refractoryTimer[i] > 0) {
        this.refractoryTimer[i] = Math.max(0, this.refractoryTimer[i] - dt);
        this.v[i] = p.vReset;
      } else {
        const dv = (-(this.v[i] - p.vRest) + p.rM * (this.iSyn[i] + iExt[i])) * (dt / p.tauM);
        this.v[i] += dv;

        // 3. Spike threshold check
        if (this.v[i] >= p.vThresh) {
          spikes[i] = 1;
          this.v[i] = p.vReset;
          this.refractoryTimer[i] = p.tauRef;
          this.preTrace[i] += 1;
          this.postTrace[i] += 1;

          activeSpikeEvents.push({
            neuronId: i,
            timeMs: 0,
            region: this.connectome.neurons[i].region,
          });
        }
      }
    }

    // 4. Synaptic transmission: pre-synaptic spikes inject into post-synaptic currents
    const adj = this.connectome.adjacencyMatrix;
    for (let pre = 0; pre < n; pre++) {
      if (spikes[pre] === 1) {
        const rowOffset = pre * n;
        for (let post = 0; post < n; post++) {
          const w = adj[rowOffset + post];
          if (w !== 0) {
            this.iSyn[post] += w;
          }
        }
      }
    }

    // 5. Dopamine-modulated STDP on plastic synapses
    if (Math.abs(dopamine) > 0.001) {
      const plastic = this.connectome.plasticMask;
      for (let pre = 0; pre < n; pre++) {
        const rowOffset = pre * n;
        for (let post = 0; post < n; post++) {
          if (plastic[rowOffset + post] === 1) {
            const dw = dopamine * p.stdpLr * (this.preTrace[pre] * spikes[post] - spikes[pre] * this.postTrace[post]);
            if (dw !== 0) {
              adj[rowOffset + post] = Math.min(3.0, Math.max(0.0, adj[rowOffset + post] + dw));
            }
          }
        }
      }
    }

    return { spikes, activeSpikeEvents };
  }
}
