"""
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
