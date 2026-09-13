"""
Motor Decoder: Translates Descending Neuron (DN) spike trains into legal chess moves.
Implements biological population vector coding, rate integration, and winner-take-all
action selection among legal moves.
"""

from typing import List, Tuple, Optional, Any
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
      - For each legal move m (from_sq -> to_sq), the move's biological 'activation'
        is computed from:
          1. Spikes of DN[to_sq] (target destination excitation)
          2. Spikes of DN[from_sq] (source piece mobilization)
          3. Heuristic piece-square weighting modulated by MBON valence
      - Softmax temperature sampling or argmax selects the winning motor command.
    """

    def __init__(
        self,
        motor_ids: List[int],
        temperature: float = 0.5,
        stochastic: bool = True,
    ):
        self.motor_ids = motor_ids
        self.temperature = temperature
        self.stochastic = stochastic

    def decode_action(
        self,
        dn_spikes: np.ndarray,
        legal_moves: List[Any],
        board: Optional[Any] = None,
    ) -> Tuple[Any, float, np.ndarray]:
        """
        Decodes motor spikes into one chosen legal move.
        
        Args:
          dn_spikes: Array of shape (T, 64) or (64,) representing spike events in DNs
          legal_moves: List of legal moves (chess.Move or string representations)
          board: Optional chess.Board object
          
        Returns:
          chosen_move: Selected legal move
          confidence: Normalized probability of chosen move
          move_scores: Raw activation scores for each candidate legal move
        """
        if not legal_moves:
            raise ValueError("No legal moves provided to MotorDecoder.")

        # Compute total spike counts per DN across simulation window
        if dn_spikes.ndim == 2:
            dn_rates = np.sum(dn_spikes, axis=0).astype(np.float32)
        else:
            dn_rates = dn_spikes.astype(np.float32)

        move_scores = np.zeros(len(legal_moves), dtype=np.float32)

        for i, move in enumerate(legal_moves):
            if chess is not None and isinstance(move, chess.Move):
                from_sq = move.from_square
                to_sq = move.to_square
                is_capture = board.is_capture(move) if board is not None else False
                is_promotion = move.promotion is not None
            else:
                # String representation fallback (e.g., 'e2e4')
                move_str = str(move)
                from_sq = self._algebraic_to_sq(move_str[:2])
                to_sq = self._algebraic_to_sq(move_str[2:4])
                is_capture = False
                is_promotion = False

            # Primary drive: Target destination DN firing rate
            target_drive = dn_rates[to_sq] if 0 <= to_sq < 64 else 0.0
            
            # Secondary drive: Source origin DN firing rate
            source_drive = dn_rates[from_sq] if 0 <= from_sq < 64 else 0.0

            # Biological motor vigor score
            score = (target_drive * 1.5) + (source_drive * 0.8)

            # Innate predatory reflex: captures trigger innate motor release
            if is_capture:
                score += 2.0
            if is_promotion:
                score += 3.0

            # Add small baseline to ensure non-zero probability for all legal options
            move_scores[i] = score + 0.1

        # Softmax over legal move activations
        if self.temperature <= 0.01 or not self.stochastic:
            best_idx = int(np.argmax(move_scores))
            return legal_moves[best_idx], 1.0, move_scores

        scaled_scores = move_scores / self.temperature
        # Subtract max for numerical stability
        exp_scores = np.exp(scaled_scores - np.max(scaled_scores))
        probs = exp_scores / np.sum(exp_scores)

        # Sample based on probability distribution
        chosen_idx = int(np.random.choice(len(legal_moves), p=probs))
        chosen_move = legal_moves[chosen_idx]
        confidence = float(probs[chosen_idx])

        return chosen_move, confidence, move_scores

    def _algebraic_to_sq(self, alg: str) -> int:
        if len(alg) < 2:
            return 0
        file = ord(alg[0].lower()) - ord("a")
        rank = int(alg[1]) - 1
        return rank * 8 + file
