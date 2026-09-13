"""
Unit tests for DrosophilaConnectome graph and circuit generation.
"""

import sys
import os
import unittest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from flychess.connectome import DrosophilaConnectome, NeuropilRegion, Neurotransmitter


class TestConnectome(unittest.TestCase):

    def setUp(self):
        self.connectome = DrosophilaConnectome(seed=42)

    def test_total_neuron_count(self):
        # 64 (OL) + 16 (Antennal) + 120 (KC) + 16 (MBON) + 8 (DAN) + 32 (CX) + 64 (DN) = 320
        self.assertEqual(self.connectome.total_neurons, 320)

    def test_sensory_motor_subsets(self):
        self.assertEqual(len(self.connectome.sensory_ids), 80)
        self.assertEqual(len(self.connectome.motor_ids), 64)

    def test_adjacency_matrix(self):
        adj = self.connectome.adjacency_matrix
        self.assertIsNotNone(adj)
        self.assertEqual(adj.shape, (320, 320))
        # Verify non-zero synaptic connections exist
        self.assertGreater(np.count_nonzero(adj), 500)

    def test_plasticity_mask(self):
        mask = self.connectome.plasticity_mask
        self.assertIsNotNone(mask)
        # Verify plastic synapses exist (e.g., KC -> MBON)
        self.assertGreater(np.count_nonzero(mask), 50)


if __name__ == "__main__":
    unittest.main()
