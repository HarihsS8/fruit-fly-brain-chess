"""
Unit tests for sensory encoding and motor decoding pipeline.
"""

import sys
import os
import unittest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from flychess.sensory import SensoryEncoder
from flychess.motor import MotorDecoder


class TestSensoryMotor(unittest.TestCase):

    def setUp(self):
        self.sensory_ids = list(range(80))
        self.motor_ids = list(range(64))
        self.encoder = SensoryEncoder(self.sensory_ids, noise_std=0.0)
        self.decoder = MotorDecoder(self.motor_ids, temperature=0.5)

    def test_encode_dict_board(self):
        dummy_board = {"squares": {0: 5.0, 63: 2.0}}
        currents = self.encoder.encode_board(dummy_board, player_color=True)
        self.assertEqual(len(currents), 80)
        self.assertEqual(currents[0], 5.0)
        self.assertEqual(currents[63], 2.0)

    def test_motor_decoding(self):
        # Spike array with heavy firing in square e4 (file 4, rank 3 -> 3 * 8 + 4 = 28)
        dn_spikes = np.zeros(64, dtype=np.float32)
        dn_spikes[28] = 10.0  # high activation for target square e4

        legal_moves = ["e2e4", "d2d4", "g1f3", "b1c3"]
        chosen, conf, scores = self.decoder.decode_action(dn_spikes, legal_moves)
        self.assertIn(chosen, legal_moves)
        self.assertGreater(conf, 0.0)


if __name__ == "__main__":
    unittest.main()
