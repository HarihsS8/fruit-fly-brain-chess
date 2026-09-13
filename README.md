# FlyChess: Drosophila melanogaster Connectome Chess Engine 🪰♟️

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Neuro-AI](https://img.shields.io/badge/Connectome-FlyWire%20%2F%20FAFB-green.svg)](https://flywire.ai)

> **FlyChess** bridges computational neuroscience and game intelligence by simulating a biological fruit fly (*Drosophila melanogaster*) brain connectome using a Leaky Integrate-and-Fire (LIF) spiking neural network to play legal, tactical chess.

---

## 🔬 Biological Background & Motivation

The adult *Drosophila melanogaster* brain contains approximately **139,255 neurons and over 50 million synapses**, as charted by the groundbreaking FlyWire and FAFB electron microscopy datasets (Schlegel et al. 2023, Dorkenwald et al. 2024). Despite its minuscule volume (~0.05 mm³), the fruit fly demonstrates remarkable sensory-motor integration, celestial compass orientation, associative olfactory learning, and agile flight steering.

**Can an invertebrate biological connectome play chess?**
While a fly brain cannot natively parse chess rules, its evolutionarily optimized neuropil architecture—spanning retinotopic visual columns, central compass rings, sparse memory lobes, and descending motor neurons—provides a fascinating substrate for bio-plausible embodied decision-making.

---

## 🧠 Neuropil Circuit Architecture

FlyChess models 320 biophysically parameterized neurons distributed across the canonical insect brain neuropils:

```
                  [ 8x8 Chessboard State + Threats ]
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
        [ Optic Lobe (64 Mi1/Tm1) ]   [ Antennal Glomeruli (16) ]
         (Retinotopic Grid 8x8)        (Material & Valence Alarm)
                   │                           │
                   ├───────────────────────────┤
                   ▼                           ▼
        [ Central Complex (CX) ]      [ Mushroom Body (MB) ]
        - Protocerebral Bridge (PB)   - Kenyon Cells (120 KCs)
        - Ellipsoid Body (EB Ring)    - MBONs (16 Output Neurons)
        (Spatial Orientation & Vigor) - DANs (8 Dopaminergic Neurons)
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                 [ Descending Neurons (64 DNs) ]
                  (Population Motor Vector Coding)
                                 │
                                 ▼
                     [ Legal Chess Move Output ]
```

### 1. Optic Lobe & Visual Columns (`OL_MEDULLA`, `OL_LAMINA`)
- **64 Columnar Neurons (Mi1, Tm1)** map the 8x8 chess squares retinotopically.
- Encodes friendly and enemy piece presence, square control, and line-of-sight visual threats.

### 2. Antennal Lobe Glomeruli (`ANTENNAL_LOBE`)
- **16 Tactical Units** encoding global evaluation metrics: check alerts, material balance disparity, center control, and king safety into continuous current injections.

### 3. Central Complex (`CX_EB`, `CX_PB`)
- **16 Ellipsoid Body (EB) Ring Neurons** and **16 Protocerebral Bridge (PB) columns** forming a recurrent ring attractor that maintains spatial orientation across the board.

### 4. Mushroom Body (`MB_KC`, `MB_MBON`, `MB_DAN`)
- **120 Kenyon Cells (KCs)**: Sparse, non-linear associative representation (each KC samples 5–7 sensory claws with high spike thresholds).
- **16 Mushroom Body Output Neurons (MBONs)**: Learned valence evaluation (cholinergic excitation vs. GABAergic avoidance).
- **8 Dopaminergic Neurons (DANs)**: PPL1/PAM clusters that inject dopamine bursts following material gain (+capture) or checkmate, driving **Spike-Timing-Dependent Plasticity (STDP)**.

### 5. Descending Neurons (`DESCENDING_NEURONS`)
- **64 Descending Neurons (DNs)** projecting to thoracic motor ganglia. Each DN corresponds to board destination squares, integrating CX steering commands and MBON valence biases.

---

## ⚡ Mathematical Formulation

### 1. Leaky Integrate-and-Fire (LIF) Dynamics
The subthreshold membrane potential $V_i(t)$ of neuron $i$ satisfies:

$$\tau_m \frac{dV_i(t)}{dt} = -(V_i(t) - V_{\text{rest}}) + R_m \left( I_{\text{syn},i}(t) + I_{\text{ext},i}(t) \right)$$

When $V_i(t) \ge V_{\text{thresh}}$ (default $-50\text{ mV}$):
1. A discrete spike event $S_i(t) = 1$ is emitted.
2. $V_i(t)$ is clamped to reset potential $V_{\text{reset}} = -75\text{ mV}$.
3. The neuron enters an absolute refractory period $\tau_{\text{ref}} = 2.0\text{ ms}$.

### 2. Synaptic Current Kinetics
Spikes elicit exponential post-synaptic currents:

$$I_{\text{syn},i}(t) = \sum_{j} W_{ji} \cdot (S_j * \alpha)(t)$$

where $\tau_{\text{syn}} \approx 5.0\text{ ms}$ for cholinergic excitation and $10.0\text{ ms}$ for GABAergic inhibition.

### 3. Dopamine-Modulated STDP
Synaptic plasticity on KC $\to$ MBON projections follows a 3-factor Hebbian rule:

$$\Delta W_{ji} = \eta \cdot \text{DA}(t) \cdot \left[ S_i(t) \cdot \bar{S}_j(t) - S_j(t) \cdot \bar{S}_i(t) \right]$$

where $\text{DA}(t)$ is modulatory dopamine release triggered by material captures or game rewards.

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/flychess-lab/flychess.git
cd flychess

# Install dependencies
pip install -r requirements.txt

# Or install in editable development mode
pip install -e .
```

---

## 🎮 Quickstart

### 1. Interactive Play vs. Drosophila Connectome
```bash
# Play as White against the fly brain
flychess play --color white --sim-ms 40.0 --temperature 0.3
```

### 2. Inspect Connectome Anatomy
```bash
flychess inspect
```

### 3. Run Automated Match (Drosophila vs. Drosophila)
```bash
python examples/play_game.py
```

### 4. Neural Spike Raster Diagnostics
```bash
python examples/visualize_spikes.py
```

---

## 📂 Repository Layout

```
flychess/
├── flychess/
│   ├── __init__.py          # Package exports
│   ├── connectome.py        # Neuropil graph & synaptic wiring
│   ├── lif_engine.py        # Vectorized LIF spiking simulation
│   ├── sensory.py           # Chess-to-retina sensory encoding
│   ├── motor.py             # Descending neuron motor decoding
│   ├── agent.py             # Autonomous connectome chess agent
│   ├── chess_env.py         # Gym-like environment & rewards
│   └── cli.py               # Command-line interface
├── config/
│   └── default_config.yaml  # Biophysical simulation parameters
├── examples/
│   ├── play_game.py         # Match simulation script
│   └── visualize_spikes.py  # Neuropil spike rate visualization
├── tests/
│   ├── test_connectome.py   # Connectome structural unit tests
│   ├── test_lif.py          # Membrane potential integration tests
│   └── test_sensory_motor.py# Encoding/decoding tests
├── requirements.txt         # Core dependencies
├── pyproject.toml           # PEP 517 build config
├── setup.py                 # Setuptools packaging
└── README.md                # Documentation & biological specification
```

---

## 🧪 Running Unit Tests

```bash
pytest tests/
# Or via standard unittest:
python -m unittest discover -s tests
```

---

## 📜 References
1. **FlyWire Consortium** (Dorkenwald et al., 2024). *Neuronal wiring diagram of an adult brain.* Nature.
2. **Schlegel et al.** (2023). *Whole-brain annotation and multi-connectome marker mapping of Drosophila melanogaster.* bioRxiv.
3. **Seelig, J. D., & Jayaraman, V.** (2015). *Neural dynamics for landmark orientation and heading in the Drosophila central complex.* Nature, 521(7551), 186–191.
4. **Aso, Y., et al.** (2014). *The neuronal architecture of the mushroom body provides a logic for associative learning.* eLife, 3, e04577.
