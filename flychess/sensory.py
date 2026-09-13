"""
Sensory Encoder: Maps chess board states to Drosophila sensory neuron currents.
Translates 8x8 squares, piece types, attacks, and mobility into retinotopic optic lobe
activations and olfactory-like glomerular valence currents.
"""

from typing import Dict, List, Optional
import numpy as np

try:
    import chess
except ImportError:
    chess = None  # Handled gracefully if python-chess is not installed in raw env


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

    def __init__(self, sensory_ids: List[int], noise_std: float = 0.05):
        self.sensory_ids = sensory_ids
        self.noise_std = noise_std
        # 64 optic lobe squares, 16 tactical glomeruli
        self.optic_ids = sensory_ids[:64]
        self.glomerular_ids = sensory_ids[64:80]

    def encode_board(self, board, player_color=True) -> np.ndarray:
        """
        Encodes a python-chess board or custom board structure into an array
        of external currents (I_ext) for each sensory neuron.
        
        Args:
          board: chess.Board instance or dictionary
          player_color: True for White, False for Black
          
        Returns:
          currents: numpy array of length len(self.sensory_ids) in nanoamperes (nA)
        """
        currents = np.zeros(len(self.sensory_ids), dtype=np.float32)

        if chess is not None and isinstance(board, chess.Board):
            currents = self._encode_python_chess(board, player_color)
        elif isinstance(board, dict):
            currents = self._encode_dict(board, player_color)
        else:
            # Fallback for mock or FEN string
            currents = self._encode_fen(str(board), player_color)

        # Inject physiological sensory noise (biological stochasticity)
        if self.noise_std > 0:
            currents += np.random.normal(0, self.noise_std, size=currents.shape)

        return np.maximum(0.0, currents)

    def _encode_python_chess(self, board: "chess.Board", player_color: bool) -> np.ndarray:
        currents = np.zeros(len(self.sensory_ids), dtype=np.float32)

        white_material = 0.0
        black_material = 0.0

        # 1. Optic Lobe 64-square retinotopic grid
        for sq in range(64):
            piece = board.piece_at(sq)
            if piece is not None:
                val = self.PIECE_VALUES.get(piece.piece_type, 1.0)
                is_friendly = (piece.color == player_color)
                
                # Excitatory signal for friendly piece presence, scaled by value
                # Opponent pieces mapped with spatial threat weighting
                if is_friendly:
                    currents[sq] = 1.5 + (val / 9.0) * 2.0
                    if piece.color == chess.WHITE:
                        white_material += val
                    else:
                        black_material += val
                else:
                    # Enemy piece visual footprint
                    currents[sq] = 0.8 + (val / 9.0) * 1.5
                    if piece.color == chess.WHITE:
                        white_material += val
                    else:
                        black_material += val

                # Attacked squares increase sensory salience (visual threat detector)
                enemy_color = not player_color
                if board.is_attacked_by(enemy_color, sq):
                    currents[sq] += 1.2

        # 2. Glomerular Tactical Units (evaluative valence, checks, center control)
        # Unit 0: In check?
        if board.is_check():
            currents[64] = 3.5  # High danger alarm

        # Unit 1-2: Material balance
        my_mat = white_material if player_color else black_material
        opp_mat = black_material if player_color else white_material
        diff = my_mat - opp_mat
        if diff > 0:
            currents[65] = min(4.0, diff * 0.5)  # Advantage glomerulus
        else:
            currents[66] = min(4.0, abs(diff) * 0.5)  # Disadvantage glomerulus

        # Unit 3: Mobility (number of legal moves)
        legal_count = board.legal_moves.count()
        currents[67] = min(3.5, legal_count * 0.1)

        # Unit 4-7: Center square control (d4, e4, d5, e5)
        center_squares = [chess.D4, chess.E4, chess.D5, chess.E5]
        for idx, c_sq in enumerate(center_squares):
            attackers = len(board.attackers(player_color, c_sq))
            currents[68 + idx] = float(attackers) * 0.8

        # Unit 8-15: Piece-specific activity detectors
        for idx, pt in enumerate([chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]):
            pieces = board.pieces(pt, player_color)
            currents[72 + idx] = float(len(pieces)) * 0.5

        return currents

    def _encode_dict(self, data: dict, player_color: bool) -> np.ndarray:
        """Encodes from standard dictionary representing 64 squares."""
        currents = np.zeros(len(self.sensory_ids), dtype=np.float32)
        squares = data.get("squares", {})
        for sq_idx in range(64):
            val = squares.get(sq_idx, 0.0)
            currents[sq_idx] = float(val)
        return currents

    def _encode_fen(self, fen_str: str, player_color: bool) -> np.ndarray:
        """Parses FEN string directly if python-chess is unavailable."""
        currents = np.zeros(len(self.sensory_ids), dtype=np.float32)
        parts = fen_str.split(" ")[0].split("/")
        sq = 56
        for row in parts:
            col = 0
            for char in row:
                if char.isdigit():
                    col += int(char)
                else:
                    is_white = char.isupper()
                    p_val = {"p": 1, "n": 3, "b": 3, "r": 5, "q": 9, "k": 10}.get(char.lower(), 1)
                    idx = sq + col
                    if 0 <= idx < 64:
                        currents[idx] = float(p_val) / 3.0
                    col += 1
            sq -= 8
        return currents
