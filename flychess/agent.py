"""
FlyConnectomeChessAgent: Drosophila brain-inspired autonomous chess playing agent.
Orchestrates sensory retinotopic encoding, LIF spike propagation across neuropils,
descending motor decoding, and dopaminergic plasticity.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np

try:
    import chess
except ImportError:
    chess = None

from .connectome import DrosophilaConnectome, NeuropilRegion
from .lif_engine import LIFSpikingEngine, NeuronParams, SynapseParams
from .sensory import SensoryEncoder
from .motor import MotorDecoder


class FlyConnectomeChessAgent:
    """
    Autonomous chess agent powered by a biological Drosophila connectome circuit
    and Leaky Integrate-and-Fire spiking dynamics.
    """

    def __init__(
        self,
        color: bool = True,  # True for White, False for Black
        sim_duration_ms: float = 40.0,
        dt_ms: float = 1.0,
        temperature: float = 0.4,
        enable_stdp: bool = True,
        seed: int = 42,
    ):
        self.color = color
        self.sim_duration_ms = sim_duration_ms
        self.dt_ms = dt_ms
        self.enable_stdp = enable_stdp

        # 1. Instantiate Connectome
        self.connectome = DrosophilaConnectome(seed=seed)
        
        # 2. Instantiate LIF Spiking Engine
        self.lif = LIFSpikingEngine(
            num_neurons=self.connectome.total_neurons,
            weights=self.connectome.adjacency_matrix,
            plastic_mask=self.connectome.plasticity_mask if enable_stdp else None,
            dt_ms=dt_ms,
        )

        # 3. Sensory and Motor interfaces
        self.sensory = SensoryEncoder(sensory_ids=self.connectome.sensory_ids)
        self.motor = MotorDecoder(
            motor_ids=self.connectome.motor_ids,
            temperature=temperature,
        )

        # Telemetry metrics from the last decision
        self.last_metrics: Dict[str, Any] = {}

    def select_move(
        self,
        board: Any,
        dopamine_reward: float = 0.0,
    ) -> Tuple[Any, Dict[str, Any]]:
        """
        Executes a full sensory-motor cycle to select a legal chess move.
        
        Steps:
          1. Reset transient membrane potential to resting baseline.
          2. Encode current chess position into sensory current injections.
          3. Simulate network spiking dynamics for T milliseconds.
          4. Extract Descending Neuron (DN) spike counts.
          5. Decode into a legal chess move.
          6. Apply dopamine-modulated STDP if reward was provided.
        """
        # Reset transient voltage states
        self.lif.reset_state()

        # Step 1: Encode board state
        sensory_currents = self.sensory.encode_board(board, player_color=self.color)
        
        # Prepare full external current vector for all neurons
        total_n = self.connectome.total_neurons
        i_ext = np.zeros(total_n, dtype=np.float32)
        for idx, s_id in enumerate(self.connectome.sensory_ids):
            i_ext[s_id] = sensory_currents[idx]

        # Step 2: Simulate LIF spiking dynamics
        steps = int(self.sim_duration_ms / self.dt_ms)
        dn_spikes_list = []
        all_spikes_list = []

        for _ in range(steps):
            spikes, v = self.lif.step(i_ext, dopamine_level=dopamine_reward if self.enable_stdp else 0.0)
            all_spikes_list.append(spikes)
            # Extract motor spikes
            dn_spikes_list.append(spikes[self.connectome.motor_ids])

        dn_spikes_arr = np.array(dn_spikes_list)  # Shape: (steps, 64)
        all_spikes_arr = np.array(all_spikes_list) # Shape: (steps, total_n)

        # Step 3: Get legal moves
        if chess is not None and isinstance(board, chess.Board):
            legal_moves = list(board.legal_moves)
        elif hasattr(board, "legal_moves"):
            legal_moves = list(board.legal_moves)
        else:
            legal_moves = board.get("legal_moves", [])

        if not legal_moves:
            raise RuntimeError("Agent cannot select move: no legal moves available.")

        # Step 4: Motor decoding
        chosen_move, confidence, scores = self.motor.decode_action(
            dn_spikes=dn_spikes_arr,
            legal_moves=legal_moves,
            board=board,
        )

        # Step 5: Neuropil firing rate telemetry
        firing_rates = {}
        for region in NeuropilRegion:
            region_ids = [n.id for n in self.connectome.neurons.values() if n.region == region]
            if region_ids:
                region_spikes = all_spikes_arr[:, region_ids]
                # Rate in Hz (spikes / sec)
                duration_sec = self.sim_duration_ms / 1000.0
                hz = float(np.sum(region_spikes) / (len(region_ids) * duration_sec))
                firing_rates[region.value] = round(hz, 2)

        self.last_metrics = {
            "chosen_move": str(chosen_move),
            "confidence": confidence,
            "total_spikes": int(np.sum(all_spikes_arr)),
            "neuropil_rates_hz": firing_rates,
            "simulation_steps": steps,
            "candidate_moves_count": len(legal_moves),
        }

        return chosen_move, self.last_metrics

    def reward(self, delta_reward: float):
        """Signals reward/punishment (dopamine burst) for reinforcement."""
        if self.enable_stdp:
            # Inject instantaneous dopamine burst across plastic synapses
            self.lif.step(
                np.zeros(self.connectome.total_neurons, dtype=np.float32),
                dopamine_level=float(np.clip(delta_reward, -1.0, 1.0)),
            )
