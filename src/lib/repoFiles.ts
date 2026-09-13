import { RepoFile } from "../types";

export const REPOSITORY_FILES: RepoFile[] = [
  {
    path: "flychess/__init__.py",
    name: "__init__.py",
    language: "python",
    category: "core",
    content: `"""
FlyChess: Drosophila melanogaster connectome-based Leaky Integrate-and-Fire chess engine.
"""

__version__ = "0.1.0"
__author__ = "FlyChess Team"

from .connectome import DrosophilaConnectome, NeuropilRegion, NeuronType
from .lif_engine import LIFSpikingEngine, SynapseParams, NeuronParams
from .sensory import SensoryEncoder
from .motor import MotorDecoder
from .agent import FlyConnectomeChessAgent
from .chess_env import FlyChessEnv

__all__ = [
    "DrosophilaConnectome",
    "NeuropilRegion",
    "NeuronType",
    "LIFSpikingEngine",
    "SynapseParams",
    "NeuronParams",
    "SensoryEncoder",
    "MotorDecoder",
    "FlyConnectomeChessAgent",
    "FlyChessEnv",
]
`,
  },
  {
    path: "flychess/connectome.py",
    name: "connectome.py",
    language: "python",
    category: "core",
    content: `"""
Biological Drosophila Connectome Graph Generator & Neuropil Circuit Mapper.
Inspired by FlyWire/FAFB whole-brain Drosophila connectome datasets.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Tuple, Optional
import numpy as np


class NeuropilRegion(str, Enum):
    """Major functional neuropils in the adult Drosophila melanogaster brain."""
    OPTIC_LOBE_LAMINA = "OL_LAMINA"        # Primary photoreceptor integration (L1-L5)
    OPTIC_LOBE_MEDULLA = "OL_MEDULLA"      # Visual columns (Mi1, Tm1, Tm2) - spatial features
    OPTIC_LOBE_LOBULA = "OL_LOBULA"        # Motion & threat detection (T4, T5, LPLC)
    ANTENNAL_LOBE = "ANTENNAL_LOBE"        # Chemosensory glomeruli (evaluative valence)
    CENTRAL_COMPLEX_PB = "CX_PB"           # Protocerebral Bridge - spatial phase & balance
    CENTRAL_COMPLEX_EB = "CX_EB"           # Ellipsoid Body (Ring neurons) - heading & board direction
    CENTRAL_COMPLEX_FB = "CX_FB"           # Fan-shaped Body - navigational integration & context
    MUSHROOM_BODY_KC = "MB_KC"             # Kenyon Cells - high-dimensional sparse associative memory
    MUSHROOM_BODY_MBON = "MB_MBON"         # Mushroom Body Output Neurons - learned valence/evaluation
    MUSHROOM_BODY_DAN = "MB_DAN"           # Dopaminergic Neurons - reward/punishment reinforcement
    DESCENDING_NEURONS = "DESCENDING_NEURONS" # Descending Neurons (DNs) - motor command transmission


class Neurotransmitter(str, Enum):
    """Primary neurotransmitter systems."""
    ACETYLCHOLINE = "ACh"   # Excitatory (fast ionotropic nAChR)
    GABA = "GABA"           # Inhibitory (hyperpolarizing GABA-A)
    GLUTAMATE = "Glu"       # Inhibitory in insect motor/synapses (GluCl) or excitatory
    DOPAMINE = "DA"         # Modulatory plasticity signal (Dop1R, Dop2R)


@dataclass
class ConnectomeNeuron:
    """Represents a single neuron in the Drosophila connectome model."""
    id: int
    name: str
    region: NeuropilRegion
    neurotransmitter: Neurotransmitter
    is_sensory: bool = False
    is_motor: bool = False
    x: float = 0.0  # 3D stereotaxic coordinate (micrometers in FAFB space)
    y: float = 0.0
    z: float = 0.0


@dataclass
class SynapticConnection:
    """Synapse between pre- and post-synaptic neurons with weight and delay."""
    pre_id: int
    post_id: int
    weight: float
    delay_ms: float = 1.0
    is_plastic: bool = False  # STDP plastic (e.g. KC -> MBON synapses)


class DrosophilaConnectome:
    """
    Constructs and manages a biologically parameterized Drosophila brain circuit.
    
    Architecture summary:
      - 64 Optic Lobe Sensory columns (Lamina + Medulla) mapping the 8x8 chessboard
      - 16 Threat / Glomerular Evaluative sensory units
      - 120 Kenyon Cells (Mushroom Body) for sparse non-linear board representation
      - 16 MBONs for valence / heuristic evaluation
      - 8 Dopaminergic neurons (DAN) for reinforcement signals
      - 32 Central Complex units (Ring neurons, PB columns, FB layers)
      - 64 Descending Motor Neurons (DNs) driving candidate moves
    """

    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)
        self.neurons: Dict[int, ConnectomeNeuron] = {}
        self.connections: List[SynapticConnection] = []
        self.adjacency_matrix: Optional[np.ndarray] = None
        self.plasticity_mask: Optional[np.ndarray] = None
        
        self.sensory_ids: List[int] = []
        self.motor_ids: List[int] = []
        self.kc_ids: List[int] = []
        self.mbon_ids: List[int] = []
        self.dan_ids: List[int] = []
        self.cx_ids: List[int] = []

        self._build_connectome()

    def _build_connectome(self):
        # 64 Optic Lobe Columns + 16 Glomeruli + 120 KCs + 16 MBONs + 8 DANs + 32 CX + 64 DNs = 320 total
        ...
`,
  },
  {
    path: "flychess/lif_engine.py",
    name: "lif_engine.py",
    language: "python",
    category: "core",
    content: `"""
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
    ...
`,
  },
  {
    path: "flychess/sensory.py",
    name: "sensory.py",
    language: "python",
    category: "core",
    content: `"""
Sensory Encoder: Maps chess board states to Drosophila sensory neuron currents.
Translates 8x8 squares, piece types, attacks, and mobility into retinotopic optic lobe
activations and olfactory-like glomerular valence currents.
"""

import numpy as np

try:
    import chess
except ImportError:
    chess = None


class SensoryEncoder:
    """
    Translates python-chess Board objects into continuous sensory currents
    injected into the 80 sensory neurons (64 Optic Lobe + 16 Glomerular).
    """

    PIECE_VALUES = {
        1: 1.0,   # Pawn
        2: 3.0,   # Knight
        3: 3.25,  # Bishop
        4: 5.0,   # Rook
        5: 9.0,   # Queen
        6: 100.0, # King
    }

    def __init__(self, sensory_ids, noise_std: float = 0.05):
        self.sensory_ids = sensory_ids
        self.noise_std = noise_std
        self.optic_ids = sensory_ids[:64]
        self.glomerular_ids = sensory_ids[64:80]

    def encode_board(self, board, player_color=True) -> np.ndarray:
        ...
`,
  },
  {
    path: "flychess/motor.py",
    name: "motor.py",
    language: "python",
    category: "core",
    content: `"""
Motor Decoder: Translates Descending Neuron (DN) spike trains into legal chess moves.
Implements biological population vector coding, rate integration, and winner-take-all
action selection among legal moves.
"""

import numpy as np

try:
    import chess
except ImportError:
    chess = None


class MotorDecoder:
    """
    Decodes the spiking activity of 64 Descending Neurons (DNs) into legal chess moves.
    
    Mapping Strategy:
      - 64 DNs map to the 64 target destination squares on the board.
      - For each legal move m (from_sq -> to_sq), activation is evaluated from:
          1. Spikes of DN[to_sq] (target destination excitation)
          2. Spikes of DN[from_sq] (source piece mobilization)
          3. Predatory capture release reflex
      - Softmax temperature sampling or argmax selects the winning motor command.
    """
    ...
`,
  },
  {
    path: "flychess/agent.py",
    name: "agent.py",
    language: "python",
    category: "core",
    content: `"""
FlyConnectomeChessAgent: Drosophila brain-inspired autonomous chess playing agent.
Orchestrates sensory retinotopic encoding, LIF spike propagation across neuropils,
descending motor decoding, and dopaminergic plasticity.
"""

from .connectome import DrosophilaConnectome
from .lif_engine import LIFSpikingEngine
from .sensory import SensoryEncoder
from .motor import MotorDecoder


class FlyConnectomeChessAgent:
    """
    Autonomous chess agent powered by a biological Drosophila connectome circuit
    and Leaky Integrate-and-Fire spiking dynamics.
    """
    ...
`,
  },
  {
    path: "flychess/chess_env.py",
    name: "chess_env.py",
    language: "python",
    category: "core",
    content: `"""
FlyChessEnv: Reinforcement learning and evaluation environment for connectome agents.
"""

import chess


class FlyChessEnv:
    """
    Standard chess environment interfacing with the Drosophila connectome agent.
    Provides sensory state observations, reward signals, and legal move step execution.
    """
    ...
`,
  },
  {
    path: "flychess/cli.py",
    name: "cli.py",
    language: "python",
    category: "core",
    content: `"""
Command-Line Interface (CLI) for FlyChess.
Allows playing games against the Drosophila agent, running automated evaluations,
inspecting the biological connectome, and training synaptic plasticity.
"""

import argparse
from flychess.agent import FlyConnectomeChessAgent
from flychess.chess_env import FlyChessEnv
from flychess.connectome import DrosophilaConnectome
...
`,
  },
  {
    path: "config/default_config.yaml",
    name: "default_config.yaml",
    language: "yaml",
    category: "config",
    content: `# FlyChess Default Configuration File
connectome:
  seed: 42
  optic_lobe_columns: 64
  tactical_glomeruli: 16
  kenyon_cells: 120
  mbon_units: 16
  dan_dopamine_units: 8
  central_complex_units: 32
  descending_motor_neurons: 64

lif_neuron:
  tau_m: 20.0        # Membrane time constant (ms)
  v_rest: -70.0      # Resting potential (mV)
  v_reset: -75.0     # Reset potential (mV)
  v_thresh: -50.0    # Action potential threshold (mV)
  tau_ref: 2.0       # Absolute refractory period (ms)
  r_m: 10.0          # Membrane resistance (Megaohms)

synapse:
  tau_syn_exc: 5.0   # Excitatory current decay (ms)
  tau_syn_inh: 10.0  # Inhibitory current decay (ms)
  stdp_lr: 0.005     # Spike-Timing-Dependent Plasticity learning rate
  tau_stdp: 15.0     # STDP coincidence window (ms)

simulation:
  dt_ms: 1.0         # Numerical integration step size (ms)
  duration_ms: 40.0  # Brain simulation duration per chess move decision (ms)

motor:
  temperature: 0.4   # Action selection exploration temperature
  capture_boost: 2.0 # Biological predatory reflex bias for captures
`,
  },
  {
    path: "examples/play_game.py",
    name: "play_game.py",
    language: "python",
    category: "example",
    content: `"""
Example script: Run a complete chess match between FlyConnectomeChessAgent and Random or Self.
"""

import chess
from flychess.agent import FlyConnectomeChessAgent
from flychess.chess_env import FlyChessEnv

def main():
    env = FlyChessEnv()
    white_fly = FlyConnectomeChessAgent(color=True, sim_duration_ms=40.0)
    black_fly = FlyConnectomeChessAgent(color=False, sim_duration_ms=40.0)

    while not env.board.is_game_over():
        agent = white_fly if env.board.turn == chess.WHITE else black_fly
        move, metrics = agent.select_move(env.board)
        env.step(move)
`,
  },
  {
    path: "examples/visualize_spikes.py",
    name: "visualize_spikes.py",
    language: "python",
    category: "example",
    content: `"""
Example script: Simulate a single chess position, capture spike rasters across
Drosophila brain regions, and plot or print spike statistics.
"""

from flychess.agent import FlyConnectomeChessAgent
import chess

def main():
    agent = FlyConnectomeChessAgent(color=True, sim_duration_ms=60.0)
    board = chess.Board()
    move, metrics = agent.select_move(board)
    print("Regional Firing Rates (Hz):", metrics["neuropil_rates_hz"])
`,
  },
  {
    path: "tests/test_connectome.py",
    name: "test_connectome.py",
    language: "python",
    category: "test",
    content: `import unittest
from flychess.connectome import DrosophilaConnectome

class TestConnectome(unittest.TestCase):
    def setUp(self):
        self.connectome = DrosophilaConnectome(seed=42)

    def test_total_neuron_count(self):
        self.assertEqual(self.connectome.total_neurons, 320)

    def test_sensory_motor_subsets(self):
        self.assertEqual(len(self.connectome.sensory_ids), 80)
        self.assertEqual(len(self.connectome.motor_ids), 64)
`,
  },
  {
    path: "tests/test_lif.py",
    name: "test_lif.py",
    language: "python",
    category: "test",
    content: `import unittest
import numpy as np
from flychess.lif_engine import LIFSpikingEngine

class TestLIFEngine(unittest.TestCase):
    def test_subthreshold_integration(self):
        w = np.zeros((1, 1), dtype=np.float32)
        engine = LIFSpikingEngine(num_neurons=1, weights=w, dt_ms=1.0)
        i_ext = np.array([0.5], dtype=np.float32)
        spikes, v = engine.step(i_ext)
        self.assertFalse(spikes[0])
        self.assertGreater(v[0], -70.0)
`,
  },
  {
    path: "tests/test_sensory_motor.py",
    name: "test_sensory_motor.py",
    language: "python",
    category: "test",
    content: `import unittest
import numpy as np
from flychess.sensory import SensoryEncoder
from flychess.motor import MotorDecoder

class TestSensoryMotor(unittest.TestCase):
    def test_motor_decoding(self):
        decoder = MotorDecoder(list(range(64)), temperature=0.5)
        dn_spikes = np.zeros(64, dtype=np.float32)
        dn_spikes[28] = 10.0  # target e4
        legal_moves = ["e2e4", "d2d4", "g1f3"]
        chosen, conf, scores = decoder.decode_action(dn_spikes, legal_moves)
        self.assertIn(chosen, legal_moves)
`,
  },
  {
    path: "requirements.txt",
    name: "requirements.txt",
    language: "text",
    category: "build",
    content: `chess>=1.10.0
numpy>=1.24.0
scipy>=1.10.0
pyyaml>=6.0
rich>=13.0.0
matplotlib>=3.7.0
pytest>=7.0.0
networkx>=3.0
`,
  },
  {
    path: "pyproject.toml",
    name: "pyproject.toml",
    language: "toml",
    category: "build",
    content: `[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "flychess"
version = "0.1.0"
description = "Drosophila melanogaster connectome-based Leaky Integrate-and-Fire chess engine"
readme = "README.md"
requires-python = ">=3.9"
`,
  },
  {
    path: "setup.py",
    name: "setup.py",
    language: "python",
    category: "build",
    content: `from setuptools import setup, find_packages

setup(
    name="flychess",
    version="0.1.0",
    packages=find_packages(),
    install_requires=["chess>=1.10.0", "numpy>=1.24.0", "scipy>=1.10.0", "pyyaml>=6.0", "rich>=13.0.0"],
)
`,
  },
  {
    path: "README.md",
    name: "README.md",
    language: "markdown",
    category: "doc",
    content: `# FlyChess: Drosophila melanogaster Connectome Chess Engine 🪰♟️

Simulates a biological fruit fly (*Drosophila melanogaster*) brain connectome using a Leaky Integrate-and-Fire (LIF) spiking neural network to play legal, tactical chess.
Based on FlyWire & FAFB electron microscopy connectome datasets.
`,
  },
];
