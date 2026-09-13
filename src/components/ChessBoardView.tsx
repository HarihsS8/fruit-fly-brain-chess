import React, { useState } from "react";
import { Chess, Square, PieceSymbol, Color } from "chess.js";

interface ChessBoardViewProps {
  chess: Chess;
  isFlyThinking: boolean;
  userColor: "w" | "b";
  onUserMove: (from: Square, to: Square) => void;
  lastMove: { from: string; to: string } | null;
}

// Crisp Unicode / SVG piece representations
const PIECE_SYMBOLS: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({
  chess,
  isFlyThinking,
  userColor,
  onUserMove,
  lastMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const board = chess.board();
  const turn = chess.turn();
  const isUserTurn = turn === userColor && !isFlyThinking;
  const isCheck = chess.inCheck();
  const isGameOver = chess.isGameOver();

  // Get legal moves from the currently selected square
  const legalDestinations = selectedSquare
    ? chess
        .moves({ square: selectedSquare, verbose: true })
        .map((m) => m.to as Square)
    : [];

  const handleSquareClick = (square: Square) => {
    if (!isUserTurn || isGameOver) return;

    if (selectedSquare) {
      if (legalDestinations.includes(square)) {
        onUserMove(selectedSquare, square);
        setSelectedSquare(null);
        return;
      }
      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }
    }

    const piece = chess.get(square);
    if (piece && piece.color === userColor) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  // Captured pieces count
  const initialPieces: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const currentWhitePieces: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const currentBlackPieces: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== "k") {
        if (p.color === "w") currentWhitePieces[p.type]++;
        else currentBlackPieces[p.type]++;
      }
    }
  }

  const whiteCaptured: string[] = [];
  const blackCaptured: string[] = [];
  for (const [type, count] of Object.entries(initialPieces)) {
    const lostWhite = count - (currentWhitePieces[type] || 0);
    for (let i = 0; i < lostWhite; i++) whiteCaptured.push("w" + type);
    const lostBlack = count - (currentBlackPieces[type] || 0);
    for (let i = 0; i < lostBlack; i++) blackCaptured.push("b" + type);
  }

  return (
    <div className="flex flex-col items-center select-none">
      {/* Opponent Info Header */}
      <div className="w-full max-w-[420px] flex items-center justify-between px-2 py-1.5 mb-1 bg-stone-100 rounded-md border border-stone-200 text-xs text-stone-700">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span className="font-semibold text-stone-900">
            Drosophila Connectome Agent ({userColor === "w" ? "Black" : "White"})
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-stone-500">
          {whiteCaptured.map((p, i) => (
            <span key={i} className="text-stone-700 text-sm">{PIECE_SYMBOLS[p]}</span>
          ))}
        </div>
      </div>

      {/* Main Chessboard 8x8 */}
      <div className="relative p-2 bg-stone-800 rounded-lg shadow-md border border-stone-700">
        <div className="grid grid-cols-8 grid-rows-8 w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] border border-stone-700">
          {Array.from({ length: 64 }).map((_, idx) => {
            const row = Math.floor(idx / 8);
            const col = idx % 8;
            const rank = 8 - row;
            const file = String.fromCharCode(97 + col);
            const square = `${file}${rank}` as Square;
            const isLight = (row + col) % 2 === 0;
            const piece = board[row][col];
            const isSelected = selectedSquare === square;
            const isLegal = legalDestinations.includes(square);
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isKingInCheck = piece?.type === "k" && piece.color === turn && isCheck;

            return (
              <div
                key={square}
                id={`square-${square}`}
                onClick={() => handleSquareClick(square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                  isLight ? "bg-[#f0d9b5]" : "bg-[#b58863]"
                } ${isSelected ? "ring-3 ring-amber-500 ring-inset" : ""} ${
                  isLastMoveFrom || isLastMoveTo ? "bg-amber-200/80" : ""
                } ${isKingInCheck ? "bg-red-400/90" : ""}`}
              >
                {/* Coordinates */}
                {col === 0 && (
                  <span className="absolute top-0.5 left-1 text-[10px] font-bold text-stone-600/70 pointer-events-none">
                    {rank}
                  </span>
                )}
                {row === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-stone-600/70 pointer-events-none">
                    {file}
                  </span>
                )}

                {/* Legal Move Marker */}
                {isLegal && (
                  <div
                    className={`absolute z-10 rounded-full ${
                      piece
                        ? "w-8 h-8 border-4 border-amber-600/70"
                        : "w-3 h-3 bg-amber-700/60"
                    }`}
                  />
                )}

                {/* Piece Graphic */}
                {piece && (
                  <span
                    className={`text-3xl sm:text-4xl filter drop-shadow transition-transform ${
                      piece.color === "w" ? "text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-stone-900"
                    } ${isSelected ? "scale-110" : "hover:scale-105"}`}
                  >
                    {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Thinking Overlay */}
        {isFlyThinking && (
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center text-white z-20">
            <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-mono tracking-wide text-amber-200 font-semibold">
              Propagating Spikes in Connectome...
            </span>
          </div>
        )}
      </div>

      {/* User Info Footer */}
      <div className="w-full max-w-[420px] flex items-center justify-between px-2 py-1.5 mt-1 bg-stone-100 rounded-md border border-stone-200 text-xs text-stone-700">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isUserTurn ? "bg-amber-500 ring-2 ring-amber-200" : "bg-stone-400"}`}></span>
          <span className="font-semibold text-stone-900">
            You ({userColor === "w" ? "White" : "Black"})
          </span>
          {isUserTurn && <span className="text-[11px] text-amber-700 font-medium">Your turn</span>}
        </div>
        <div className="flex items-center gap-1 font-mono text-stone-500">
          {blackCaptured.map((p, i) => (
            <span key={i} className="text-stone-700 text-sm">{PIECE_SYMBOLS[p]}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
