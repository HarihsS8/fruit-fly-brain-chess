"""
Command-Line Interface (CLI) for FlyChess.
Allows playing games against the Drosophila agent, running automated evaluations,
inspecting the biological connectome, and training synaptic plasticity.
"""

import argparse
import sys
import time

try:
    import chess
except ImportError:
    chess = None

from .agent import FlyConnectomeChessAgent
from .chess_env import FlyChessEnv
from .connectome import DrosophilaConnectome


def cmd_inspect(args):
    """Prints connectome architectural anatomy and circuit statistics."""
    print("=========================================================")
    print("   Drosophila melanogaster Connectome Architecture (FlyChess)")
    print("=========================================================")
    conn = DrosophilaConnectome()
    summary = conn.summary()
    print(f"Total Model Neurons:  {conn.total_neurons}")
    print(f"Total Synapses:       {conn.total_synapses}")
    print("\nNeuropil Circuit Distribution:")
    for region, count in summary.items():
        print(f"  - {region:<25}: {count:>4} neurons")
    print("=========================================================")


def cmd_play(args):
    """Starts an interactive game of Human vs. Drosophila Connectome."""
    if chess is None:
        print("Error: python-chess is required. Install via: pip install chess")
        sys.exit(1)

    print("\nStarting Drosophila Chess Master (FlyChess) Match")
    print("-------------------------------------------------")
    env = FlyChessEnv()
    human_color = chess.WHITE if args.color.lower() == "white" else chess.BLACK
    fly_agent = FlyConnectomeChessAgent(
        color=(human_color == chess.BLACK),
        sim_duration_ms=args.sim_ms,
        temperature=args.temperature,
    )

    print(f"You are playing as {'White' if human_color == chess.WHITE else 'Black'}")
    print(f"Drosophila LIF simulation duration per move: {args.sim_ms} ms\n")

    while not env.board.is_game_over():
        print(env.render_ascii())
        print(f"\nTurn: {'White' if env.board.turn == chess.WHITE else 'Black'}")

        if env.board.turn == human_color:
            # Human move input
            valid = False
            while not valid:
                try:
                    move_uci = input("Enter move in UCI format (e.g., e2e4) or 'quit': ").strip()
                    if move_uci.lower() == "quit":
                        return
                    move = chess.Move.from_uci(move_uci)
                    if move in env.board.legal_moves:
                        valid = True
                        env.step(move)
                    else:
                        print("Illegal move! Legal moves:", [m.uci() for m in env.board.legal_moves][:8], "...")
                except Exception as e:
                    print("Invalid input format. Try again.", e)
        else:
            print("Drosophila connectome integrating sensory spikes & firing motor neurons...")
            start = time.time()
            move, metrics = fly_agent.select_move(env.board)
            elapsed = time.time() - start
            print(f"Fly selected move: {move.uci()} (confidence: {metrics['confidence']:.2f}, spikes: {metrics['total_spikes']}, time: {elapsed*1000:.1f}ms)")
            env.step(move)

    print("\nGame Over!")
    print("Result:", env.board.result())


def main():
    parser = argparse.ArgumentParser(description="FlyChess: Drosophila Connectome Chess CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Inspect command
    subparsers.add_parser("inspect", help="Inspect Drosophila connectome statistics")

    # Play command
    play_parser = subparsers.add_parser("play", help="Play against Drosophila connectome")
    play_parser.add_argument("--color", choices=["white", "black"], default="white", help="Human player color")
    play_parser.add_argument("--sim-ms", type=float, default=40.0, help="LIF simulation duration per move in ms")
    play_parser.add_argument("--temperature", type=float, default=0.4, help="Softmax motor action selection temperature")

    args = parser.parse_args()
    if args.command == "inspect":
        cmd_inspect(args)
    elif args.command == "play":
        cmd_play(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
