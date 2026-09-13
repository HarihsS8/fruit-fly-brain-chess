"""
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
        """Constructs neurons across neuropils and connects them following anatomical motifs."""
        cur_id = 0

        # 1. Sensory: 64 Optic Lobe Columns (Medulla Mi1/Tm1 mapping 8x8 board squares)
        for rank in range(8):
            for file in range(8):
                sq_name = f"{chr(ord('a') + file)}{rank + 1}"
                # 3D placement: Left/Right optic lobes
                hemisphere = -1.0 if file < 4 else 1.0
                neuron = ConnectomeNeuron(
                    id=cur_id,
                    name=f"OL_Mi1_{sq_name}",
                    region=NeuropilRegion.OPTIC_LOBE_MEDULLA,
                    neurotransmitter=Neurotransmitter.ACETYLCHOLINE,
                    is_sensory=True,
                    x=hemisphere * (180.0 + file * 15.0),
                    y=-50.0 + rank * 12.0,
                    z=40.0 + (rank % 2) * 10.0,
                )
                self.neurons[cur_id] = neuron
                self.sensory_ids.append(cur_id)
                cur_id += 1

        # 2. Sensory: 16 Threat & Tactical Evaluative Glomeruli (Antennal / Lobula Plate)
        for i in range(16):
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"Tactical_Glomerulus_{i:02d}",
                region=NeuropilRegion.ANTENNAL_LOBE,
                neurotransmitter=Neurotransmitter.ACETYLCHOLINE,
                is_sensory=True,
                x=-60.0 + (i % 8) * 15.0,
                y=-120.0,
                z=10.0 + (i // 8) * 20.0,
            )
            self.neurons[cur_id] = neuron
            self.sensory_ids.append(cur_id)
            cur_id += 1

        # 3. Mushroom Body: 120 Kenyon Cells (KCs) - sparse coding expansion
        for i in range(120):
            sub_type = "alpha_beta" if i < 60 else "gamma"
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"KC_{sub_type}_{i:03d}",
                region=NeuropilRegion.MUSHROOM_BODY_KC,
                neurotransmitter=Neurotransmitter.ACETYLCHOLINE,
                x=-120.0 + (i % 20) * 12.0,
                y=80.0 + (i % 5) * 8.0,
                z=90.0 + (i // 20) * 15.0,
            )
            self.neurons[cur_id] = neuron
            self.kc_ids.append(cur_id)
            cur_id += 1

        # 4. Mushroom Body Output Neurons (MBONs): 16 units (valence & move bias)
        for i in range(16):
            # Half excitatory (cholinergic), half inhibitory (GABAergic)
            nt = Neurotransmitter.ACETYLCHOLINE if i < 8 else Neurotransmitter.GABA
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"MBON_{i:02d}",
                region=NeuropilRegion.MUSHROOM_BODY_MBON,
                neurotransmitter=nt,
                x=-40.0 + (i % 8) * 10.0,
                y=50.0,
                z=60.0 + (i // 8) * 20.0,
            )
            self.neurons[cur_id] = neuron
            self.mbon_ids.append(cur_id)
            cur_id += 1

        # 5. Dopaminergic Neurons (DANs - PPL1 / PAM clusters): 8 units for reinforcement
        for i in range(8):
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"DAN_PAM_{i:02d}",
                region=NeuropilRegion.MUSHROOM_BODY_DAN,
                neurotransmitter=Neurotransmitter.DOPAMINE,
                x=-30.0 + i * 8.0,
                y=30.0,
                z=50.0,
            )
            self.neurons[cur_id] = neuron
            self.dan_ids.append(cur_id)
            cur_id += 1

        # 6. Central Complex (CX): 32 units (16 Protocerebral Bridge, 16 Ellipsoid Body ring neurons)
        for i in range(16):
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"CX_EB_Ring_{i:02d}",
                region=NeuropilRegion.CENTRAL_COMPLEX_EB,
                neurotransmitter=Neurotransmitter.GABA,
                x=-20.0 + (i % 4) * 12.0,
                y=-10.0,
                z=80.0 + (i // 4) * 8.0,
            )
            self.neurons[cur_id] = neuron
            self.cx_ids.append(cur_id)
            cur_id += 1

        for i in range(16):
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"CX_PB_Column_{i:02d}",
                region=NeuropilRegion.CENTRAL_COMPLEX_PB,
                neurotransmitter=Neurotransmitter.ACETYLCHOLINE,
                x=-50.0 + i * 6.5,
                y=10.0,
                z=110.0,
            )
            self.neurons[cur_id] = neuron
            self.cx_ids.append(cur_id)
            cur_id += 1

        # 7. Descending Motor Neurons (DNs): 64 output channels for action candidate selection
        for i in range(64):
            neuron = ConnectomeNeuron(
                id=cur_id,
                name=f"DN_p{i:02d}",
                region=NeuropilRegion.DESCENDING_NEURONS,
                neurotransmitter=Neurotransmitter.ACETYLCHOLINE,
                is_motor=True,
                x=-80.0 + (i % 8) * 22.0,
                y=-80.0,
                z=-20.0 - (i // 8) * 10.0,
            )
            self.neurons[cur_id] = neuron
            self.motor_ids.append(cur_id)
            cur_id += 1

        self._wire_circuits()

    def _wire_circuits(self):
        """Generates biologically inspired synaptic connections between regions."""
        total_n = len(self.neurons)
        adj = np.zeros((total_n, total_n), dtype=np.float32)
        plastic = np.zeros((total_n, total_n), dtype=bool)

        # A. Sensory to Kenyon Cells (Sparse Claw Convergence: each KC receives ~5-7 inputs)
        for kc_id in self.kc_ids:
            num_claws = self.rng.integers(5, 8)
            sampled_sensory = self.rng.choice(self.sensory_ids, size=num_claws, replace=False)
            for s_id in sampled_sensory:
                w = float(self.rng.uniform(0.6, 1.2))
                adj[s_id, kc_id] = w
                self.connections.append(SynapticConnection(s_id, kc_id, w, delay_ms=1.5))

        # B. Sensory to Central Complex (Ring neurons for global spatial orientation)
        for s_id in self.sensory_ids[:64]: # 64 board squares
            eb_target = self.cx_ids[s_id % 16]
            w = float(self.rng.uniform(0.3, 0.7))
            adj[s_id, eb_target] += w
            self.connections.append(SynapticConnection(s_id, eb_target, w, delay_ms=1.0))

        # C. Central Complex Internal Loop (PB columns <-> EB Ring ring attractor)
        for i in range(16):
            eb_id = self.cx_ids[i]
            pb_id = self.cx_ids[16 + i]
            # Mutual recurrence
            w1 = float(self.rng.uniform(0.4, 0.8))
            w2 = float(self.rng.uniform(0.4, 0.8))
            adj[eb_id, pb_id] = w1
            adj[pb_id, eb_id] = w2
            self.connections.append(SynapticConnection(eb_id, pb_id, w1, delay_ms=0.8))
            self.connections.append(SynapticConnection(pb_id, eb_id, w2, delay_ms=0.8))

        # D. Kenyon Cells -> MBONs (High dimensional associative layer, STDP plastic)
        for kc_id in self.kc_ids:
            # Each KC projects to a subset of MBONs
            targets = self.rng.choice(self.mbon_ids, size=4, replace=False)
            for mbon_id in targets:
                w = float(self.rng.uniform(0.1, 0.5))
                adj[kc_id, mbon_id] = w
                plastic[kc_id, mbon_id] = True
                self.connections.append(SynapticConnection(kc_id, mbon_id, w, delay_ms=1.2, is_plastic=True))

        # E. Central Complex -> Descending Neurons (Spatial steering)
        for cx_id in self.cx_ids:
            dn_targets = self.rng.choice(self.motor_ids, size=6, replace=False)
            for dn_id in dn_targets:
                w = float(self.rng.uniform(0.3, 0.7))
                adj[cx_id, dn_id] += w
                self.connections.append(SynapticConnection(cx_id, dn_id, w, delay_ms=2.0))

        # F. MBONs -> Descending Neurons (Valence-driven action biasing)
        for mbon_id in self.mbon_ids:
            is_inhibitory = self.neurons[mbon_id].neurotransmitter == Neurotransmitter.GABA
            sign = -1.0 if is_inhibitory else 1.0
            for dn_id in self.motor_ids:
                if self.rng.random() < 0.35:
                    w = sign * float(self.rng.uniform(0.2, 0.6))
                    adj[mbon_id, dn_id] += w
                    self.connections.append(SynapticConnection(mbon_id, dn_id, w, delay_ms=1.8))

        # G. Lateral Inhibition within Descending Neurons (Winner-take-all dynamics)
        for dn_a in self.motor_ids:
            for dn_b in self.motor_ids:
                if dn_a != dn_b and self.rng.random() < 0.15:
                    w = -float(self.rng.uniform(0.1, 0.3)) # GABAergic mutual inhibition
                    adj[dn_a, dn_b] += w
                    self.connections.append(SynapticConnection(dn_a, dn_b, w, delay_ms=0.5))

        self.adjacency_matrix = adj
        self.plasticity_mask = plastic

    @property
    def total_neurons(self) -> int:
        return len(self.neurons)

    @property
    def total_synapses(self) -> int:
        return len(self.connections)

    def summary(self) -> Dict[str, int]:
        """Returns neuropil distribution breakdown."""
        counts = {}
        for n in self.neurons.values():
            counts[n.region.value] = counts.get(n.region.value, 0) + 1
        return counts
