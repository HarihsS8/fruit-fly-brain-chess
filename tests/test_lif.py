"""
Unit tests for Leaky Integrate-and-Fire (LIF) simulation engine.
"""

import sys
import os
import unittest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from flychess.lif_engine import LIFSpikingEngine, NeuronParams, SynapseParams


class TestLIFEngine(unittest.TestCase):

    def test_subthreshold_integration(self):
        # 1 neuron, no recurrent connections
        w = np.zeros((1, 1), dtype=np.float32)
        engine = LIFSpikingEngine(num_neurons=1, weights=w, dt_ms=1.0)
        
        # Inject subthreshold current (0.5 nA)
        i_ext = np.array([0.5], dtype=np.float32)
        spikes, v = engine.step(i_ext)
        
        # Membrane should depolarize above -70 mV
        self.assertFalse(spikes[0])
        self.assertGreater(v[0], -70.0)

    def test_spike_generation_and_reset(self):
        # 1 neuron with large suprathreshold current
        w = np.zeros((1, 1), dtype=np.float32)
        engine = LIFSpikingEngine(num_neurons=1, weights=w, dt_ms=1.0)
        
        i_ext = np.array([5.0], dtype=np.float32)
        spiked = False
        for _ in range(25):
            spikes, v = engine.step(i_ext)
            if spikes[0]:
                spiked = True
                # Next step must reflect post-spike reset/refractory state
                self.assertEqual(v[0], engine.n_params.v_reset)
                break
        self.assertTrue(spiked, "Neuron failed to fire under suprathreshold input")


if __name__ == "__main__":
    unittest.main()
