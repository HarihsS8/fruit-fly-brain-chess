"""
Vectorized Leaky Integrate-and-Fire (LIF) Neural Simulation Engine.
Supports synaptic conductances, refractory dynamics, and Dopamine-modulated STDP.
"""

from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict
import numpy as np


@dataclass
class NeuronParams:
    """Biophysical membrane parameters for insect LIF neurons."""
    tau_m: float = 20.0       # Membrane time constant (ms)
    v_rest: float = -70.0     # Resting potential (mV)
    v_reset: float = -75.0    # Post-spike reset potential (mV)
    v_thresh: float = -50.0   # Action potential firing threshold (mV)
    tau_ref: float = 2.0      # Absolute refractory period (ms)
    r_m: float = 10.0         # Membrane resistance (MOhm)


@dataclass
class SynapseParams:
    """Synaptic dynamics and STDP plasticity parameters."""
    tau_syn_exc: float = 5.0  # Excitatory post-synaptic current decay (ms)
    tau_syn_inh: float = 10.0 # Inhibitory decay (ms)
    stdp_lr: float = 0.005    # Learning rate for STDP
    tau_stdp: float = 15.0    # STDP temporal coincidence window (ms)
    w_min: float = 0.0        # Minimum synaptic weight
    w_max: float = 3.0        # Maximum synaptic weight


class LIFSpikingEngine:
    """
    High-performance vectorized simulation of LIF spiking dynamics.
    
    Mathematical Formulation:
      tau_m * (dV_i / dt) = -(V_i - V_rest) + R_m * (I_syn,i + I_ext,i)
      When V_i >= V_thresh:
        Spike event emitted S_i(t) = 1
        V_i -> V_reset
        Refractory timer set to tau_ref / dt
    """

    def __init__(
        self,
        num_neurons: int,
        weights: np.ndarray,
        plastic_mask: Optional[np.ndarray] = None,
        dt_ms: float = 1.0,
        neuron_params: Optional[NeuronParams] = None,
        synapse_params: Optional[SynapseParams] = None,
    ):
        self.num_neurons = num_neurons
        self.weights = weights.copy().astype(np.float32)
        self.plastic_mask = (
            plastic_mask.copy()
            if plastic_mask is not None
            else np.zeros((num_neurons, num_neurons), dtype=bool)
        )
        self.dt = dt_ms
        self.n_params = neuron_params or NeuronParams()
        self.s_params = synapse_params or SynapseParams()

        # State vectors
        self.v = np.full(num_neurons, self.n_params.v_rest, dtype=np.float32)
        self.refractory_timer = np.zeros(num_neurons, dtype=np.float32)
        self.i_syn = np.zeros(num_neurons, dtype=np.float32)

        # Traces for STDP
        self.pre_trace = np.zeros(num_neurons, dtype=np.float32)
        self.post_trace = np.zeros(num_neurons, dtype=np.float32)

        # History buffers for telemetry / plotting
        self.spike_history: List[np.ndarray] = []
        self.v_history: List[np.ndarray] = []
        self.time_ms: float = 0.0

    def reset_state(self):
        """Resets membrane potentials, timers, and traces to resting state."""
        self.v.fill(self.n_params.v_rest)
        self.refractory_timer.fill(0.0)
        self.i_syn.fill(0.0)
        self.pre_trace.fill(0.0)
        self.post_trace.fill(0.0)
        self.spike_history.clear()
        self.v_history.clear()
        self.time_ms = 0.0

    def step(
        self,
        i_ext: np.ndarray,
        dopamine_level: float = 0.0,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Advances the simulation by one discrete time step dt.
        
        Args:
          i_ext: External current injection array of shape (num_neurons,) [nA]
          dopamine_level: Modulatory reward signal for STDP (-1.0 to 1.0)
          
        Returns:
          Tuple of (spikes: bool array, v: membrane potential array)
        """
        dt = self.dt
        n_p = self.n_params
        s_p = self.s_params

        # 1. Decay synaptic currents: I_syn(t + dt) = I_syn(t) * exp(-dt / tau_syn)
        decay = np.exp(-dt / s_p.tau_syn_exc)
        self.i_syn *= decay

        # 2. Update refractory states
        is_refractory = self.refractory_timer > 0.0
        self.refractory_timer = np.maximum(0.0, self.refractory_timer - dt)

        # 3. Integrate membrane potential for non-refractory neurons
        dv = (
            -(self.v - n_p.v_rest) + n_p.r_m * (self.i_syn + i_ext)
        ) * (dt / n_p.tau_m)
        
        # Only update neurons not in absolute refractory period
        self.v = np.where(is_refractory, n_p.v_reset, self.v + dv)

        # 4. Spike detection & reset
        spikes = self.v >= n_p.v_thresh
        self.v[spikes] = n_p.v_reset
        self.refractory_timer[spikes] = n_p.tau_ref

        # 5. Propagate spikes across synaptic connectivity matrix
        if np.any(spikes):
            # Input to post-synaptic neurons: dot product of spikes with weights
            incoming_syn = np.dot(spikes.astype(np.float32), self.weights)
            self.i_syn += incoming_syn

        # 6. STDP Plasticity traces & Weight Updates (if dopamine present)
        decay_stdp = np.exp(-dt / s_p.tau_stdp)
        self.pre_trace = self.pre_trace * decay_stdp + spikes.astype(np.float32)
        self.post_trace = self.post_trace * decay_stdp + spikes.astype(np.float32)

        if abs(dopamine_level) > 1e-4 and np.any(self.plastic_mask):
            self._apply_dopamine_stdp(spikes, dopamine_level)

        # 7. Record metrics
        self.spike_history.append(spikes.copy())
        self.v_history.append(self.v.copy())
        self.time_ms += dt

        return spikes, self.v

    def _apply_dopamine_stdp(self, spikes: np.ndarray, dopamine: float):
        """Applies 3-factor Dopamine-modulated STDP to plastic synapses."""
        s_p = self.s_params
        # Pre-before-post (LTP candidate) and Post-before-pre (LTD candidate)
        # delta_w = dopamine * (post_spike * pre_trace - pre_spike * post_trace)
        pre_trace_col = self.pre_trace[:, np.newaxis]
        post_spikes_row = spikes[np.newaxis, :].astype(np.float32)
        
        post_trace_row = self.post_trace[np.newaxis, :]
        pre_spikes_col = spikes[:, np.newaxis].astype(np.float32)

        dw = dopamine * s_p.stdp_lr * (
            pre_trace_col * post_spikes_row - pre_spikes_col * post_trace_row
        )

        # Apply only to designated plastic synapses
        mask = self.plastic_mask
        self.weights[mask] = np.clip(
            self.weights[mask] + dw[mask],
            s_p.w_min,
            s_p.w_max,
        )

    def run_simulation(
        self,
        duration_ms: float,
        i_ext_fn,
        dopamine: float = 0.0,
    ) -> Dict[str, np.ndarray]:
        """Runs the network forward for duration_ms with a dynamic current function."""
        steps = int(duration_ms / self.dt)
        for step_idx in range(steps):
            t = step_idx * self.dt
            current = i_ext_fn(t)
            self.step(current, dopamine_level=dopamine)

        return {
            "spikes": np.array(self.spike_history),
            "voltage": np.array(self.v_history),
            "time_ms": np.arange(len(self.spike_history)) * self.dt,
        }
