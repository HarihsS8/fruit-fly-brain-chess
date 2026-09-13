"""
Example script: Simulate a single chess position, capture spike rasters across
Drosophila brain regions, and plot or print spike statistics.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    import chess
except ImportError:
    chess = None

from flychess.agent import FlyConnectomeChessAgent


def main():
    print("Testing Drosophila connectome spike response to standard starting position...")
    agent = FlyConnectomeChessAgent(color=True, sim_duration_ms=60.0, dt_ms=1.0)
    
    if chess:
        board = chess.Board()
    else:
        # Fallback dummy representation
        board = {"legal_moves": ["e2e4", "d2d4", "g1f3", "b1c3"]}

    chosen_move, metrics = agent.select_move(board)

    print("\nSimulation Metrics:")
    print(f"  Chosen Move:           {metrics['chosen_move']}")
    print(f"  Selection Confidence:  {metrics['confidence'] * 100:.1f}%")
    print(f"  Total Neural Spikes:   {metrics['total_spikes']}")
    print(f"  Simulation Steps:      {metrics['simulation_steps']} (dt=1.0ms)")
    print("\nRegional Firing Rates (Hz):")
    for region, rate in metrics["neuropil_rates_hz"].items():
        bar = "█" * int(rate / 5.0)
        print(f"  {region:<25} : {rate:>6.1f} Hz  {bar}")


if __name__ == "__main__":
    main()
