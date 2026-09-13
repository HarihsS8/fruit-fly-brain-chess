"""
FlyChessEnv: Reinforcement learning and evaluation environment for connectome agents.
"""

from typing import Tuple, Dict, Any, Optional
import numpy as np

try:
    import chess
except ImportError:
    chess = None


class FlyChessEnv:
    """
    Standard chess environment interfacing with the Drosophila connectome agent.
    Provides sensory state observations, reward signals, and legal move step execution.
    """

    def __init__(self, fen: Optional[str] = None):
        if chess is None:
            raise ImportError(
                "python-chess is required for FlyChessEnv. Install with: pip install chess"
            )
        self.board = chess.Board(fen) if fen else chess.Board()
        self.history = []
        self.prev_material_balance = 0.0

    def reset(self, fen: Optional[str] = None) -> "chess.Board":
        """Resets board to initial state or specified FEN."""
        if fen:
            self.board.set_fen(fen)
        else:
            self.board.reset()
        self.history.clear()
        self.prev_material_balance = self._calculate_material(chess.WHITE) - self._calculate_material(chess.BLACK)
        return self.board

    def step(self, move: "chess.Move") -> Tuple["chess.Board", float, bool, Dict[str, Any]]:
        """
        Applies a move and returns (next_board, reward, is_done, info).
        
        Reward formulation:
          +10.0 for Checkmate win
          +2.0  for Check
          +Material delta for captures
          -10.0 for Checkmate loss
          0.0 for Draw
        """
        player = self.board.turn
        is_capture = self.board.is_capture(move)
        captured_piece = self.board.piece_at(move.to_square) if is_capture else None

        self.board.push(move)
        self.history.append(move)

        is_done = self.board.is_game_over()
        reward = 0.0

        if is_done:
            outcome = self.board.outcome()
            if outcome and outcome.winner is not None:
                reward = 10.0 if outcome.winner == player else -10.0
            else:
                reward = 0.0  # Draw
        else:
            if self.board.is_check():
                reward += 1.5

            if is_capture and captured_piece:
                p_vals = {1: 1.0, 2: 3.0, 3: 3.25, 4: 5.0, 5: 9.0}
                reward += p_vals.get(captured_piece.piece_type, 1.0) * 0.5

        info = {
            "fen": self.board.fen(),
            "turn": "white" if self.board.turn == chess.WHITE else "black",
            "move_count": len(self.history),
            "is_check": self.board.is_check(),
            "is_game_over": is_done,
        }

        return self.board, reward, is_done, info

    def _calculate_material(self, color: bool) -> float:
        values = {
            chess.PAWN: 1.0,
            chess.KNIGHT: 3.0,
            chess.BISHOP: 3.25,
            chess.ROOK: 5.0,
            chess.QUEEN: 9.0,
        }
        total = 0.0
        for pt, val in values.items():
            total += len(self.board.pieces(pt, color)) * val
        return total

    def render_ascii(self) -> str:
        """Returns standard ASCII board."""
        return str(self.board)
