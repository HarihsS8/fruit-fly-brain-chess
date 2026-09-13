"""
Example script: Run a complete chess match between FlyConnectomeChessAgent and Random or Self.
"""

import sys
import os
import time

# Ensure flychess package is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    import chess
except ImportError:
    print("Please install python-chess: pip install chess")
    sys.exit(1)

from flychess.agent import FlyConnectomeChessAgent
from flychess.chess_env import FlyChessEnv


def main():
    print("Initializing FlyChess Drosophila Connectome Engine...")
    env = FlyChessEnv()
    
    # White: Drosophila Connectome Agent
    white_fly = FlyConnectomeChessAgent(color=True, sim_duration_ms=40.0, temperature=0.3, seed=101)
    # Black: Second Drosophila Connectome Agent with different seed
    black_fly = FlyConnectomeChessAgent(color=False, sim_duration_ms=40.0, temperature=0.4, seed=202)

    print("\n--- Drosophila vs. Drosophila Match Beginning ---")
    move_num = 1

    while not env.board.is_game_over() and move_num <= 40:
        current_turn = env.board.turn
        agent = white_fly if current_turn == chess.WHITE else black_fly
        agent_name = "Fly-White" if current_turn == chess.WHITE else "Fly-Black"

        start_time = time.time()
        move, metrics = agent.select_move(env.board)
        elapsed = time.time() - start_time

        print(f"Move {move_num:02d} [{agent_name}]: {move.uci()} "
              f"(Spikes: {metrics['total_spikes']}, Conf: {metrics['confidence']:.2f}, Time: {elapsed*1000:.1f}ms)")

        env.step(move)
        move_num += 1

    print("\nMatch Concluded.")
    print("Final FEN:", env.board.fen())
    print("Result:", env.board.result())
    print("\nASCII Board:")
    print(env.render_ascii())


if __name__ == "__main__":
    main()
