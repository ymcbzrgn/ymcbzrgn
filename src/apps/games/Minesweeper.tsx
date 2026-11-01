/**
 * Minesweeper Game
 * Classic mine-finding puzzle game
 * Left-click to reveal, right-click to flag
 */

import { useState, useEffect } from 'react';
import { reportOver, reportStart, reportWin } from './gameEvents';
import './Minesweeper.css';

interface MinesweeperProps {
  windowId: string;
  nodeId?: string;
}

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

const GRID_SIZE = 9;
const MINE_COUNT = 10;

// Initialize grid with mines and adjacent counts
const initializeGrid = (): Cell[][] => {
  // Create empty grid
  const grid: Cell[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() =>
      Array(GRID_SIZE)
        .fill(null)
        .map(() => ({
          mine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0,
        }))
    );

  // Place mines randomly
  let minesPlaced = 0;
  while (minesPlaced < MINE_COUNT) {
    const row = Math.floor(Math.random() * GRID_SIZE);
    const col = Math.floor(Math.random() * GRID_SIZE);

    if (!grid[row][col].mine) {
      grid[row][col].mine = true;
      minesPlaced++;
    }
  }

  // Calculate adjacent mine counts
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col].mine) continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (
            nr >= 0 &&
            nr < GRID_SIZE &&
            nc >= 0 &&
            nc < GRID_SIZE &&
            grid[nr][nc].mine
          ) {
            count++;
          }
        }
      }
      grid[row][col].adjacentMines = count;
    }
  }

  return grid;
};

export default function Minesweeper({ windowId }: MinesweeperProps) {
  const [cells, setCells] = useState<Cell[][]>(initializeGrid());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [flagCount, setFlagCount] = useState(0);

  // achievements + the pixel twin's reactions
  useEffect(() => {
    reportStart('minesweeper');
  }, []);
  useEffect(() => {
    if (won) reportWin('minesweeper');
  }, [won]);
  useEffect(() => {
    if (gameOver) reportOver('minesweeper');
  }, [gameOver]);

  const resetGame = () => {
    setCells(initializeGrid());
    setGameOver(false);
    setWon(false);
    setFlagCount(0);
  };

  // Reveal cell using BFS (iterative, not recursive - avoid stack overflow)
  const revealCell = (row: number, col: number) => {
    if (gameOver || won) return;

    const newCells = cells.map(r => r.map(c => ({ ...c })));
    const cell = newCells[row][col];

    // Can't reveal flagged or already revealed cells
    if (cell.flagged || cell.revealed) return;

    // Hit a mine - game over
    if (cell.mine) {
      // Reveal all mines
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (newCells[r][c].mine) {
            newCells[r][c].revealed = true;
          }
        }
      }
      setCells(newCells);
      setGameOver(true);
      return;
    }

    // BFS to reveal connected empty cells
    const queue: [number, number][] = [[row, col]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const currentCell = newCells[r][c];

      // Skip if mine, flagged, or already revealed
      if (currentCell.mine || currentCell.flagged || currentCell.revealed) continue;

      // Reveal this cell
      currentCell.revealed = true;

      // If it's a zero, add all neighbors to queue
      if (currentCell.adjacentMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              queue.push([nr, nc]);
            }
          }
        }
      }
    }

    setCells(newCells);

    // Check for win (all non-mine cells revealed)
    let allNonMinesRevealed = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!newCells[r][c].mine && !newCells[r][c].revealed) {
          allNonMinesRevealed = false;
          break;
        }
      }
      if (!allNonMinesRevealed) break;
    }

    if (allNonMinesRevealed) {
      setWon(true);
    }
  };

  // Toggle flag
  const toggleFlag = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault(); // Prevent context menu

    if (gameOver || won) return;

    const newCells = cells.map(r => r.map(c => ({ ...c })));
    const cell = newCells[row][col];

    // Can't flag revealed cells
    if (cell.revealed) return;

    // Toggle flag
    if (cell.flagged) {
      cell.flagged = false;
      setFlagCount(prev => prev - 1);
    } else {
      // Limit to MINE_COUNT flags
      if (flagCount >= MINE_COUNT) return;
      cell.flagged = true;
      setFlagCount(prev => prev + 1);
    }

    setCells(newCells);
  };

  // Get cell content
  const getCellContent = (cell: Cell): string => {
    if (cell.flagged) return '🚩';
    if (!cell.revealed) return '';
    if (cell.mine) return '💣';
    if (cell.adjacentMines === 0) return '';
    return cell.adjacentMines.toString();
  };

  // Get cell class for number colors
  const getCellClassName = (cell: Cell): string => {
    const baseClass = 'minesweeper-game__cell';
    if (!cell.revealed) return baseClass;
    if (cell.mine) return `${baseClass} ${baseClass}--mine`;
    if (cell.adjacentMines > 0) {
      return `${baseClass} ${baseClass}--revealed ${baseClass}--number-${cell.adjacentMines}`;
    }
    return `${baseClass} ${baseClass}--revealed`;
  };

  return (
    <div className="minesweeper-game">
      {/* Header */}
      <div className="minesweeper-game__header">
        <div className="minesweeper-game__flag-count">
          🚩 {MINE_COUNT - flagCount}
        </div>
        <button
          onClick={resetGame}
          className="minesweeper-game__reset-btn"
          title="Reset game"
        >
          {gameOver ? '💀' : won ? '😎' : '🙂'}
        </button>
        <div className="minesweeper-game__info">
          💣 {MINE_COUNT}
        </div>
      </div>

      {/* Game Grid */}
      <div className="minesweeper-game__container">
        <div className="minesweeper-game__grid">
          {cells.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClassName(cell)}
                onClick={() => revealCell(rowIndex, colIndex)}
                onContextMenu={(e) => toggleFlag(e, rowIndex, colIndex)}
              >
                {getCellContent(cell)}
              </div>
            ))
          )}
        </div>

        {/* Win Overlay */}
        {won && (
          <div className="minesweeper-game__overlay">
            <h2 className="minesweeper-game__overlay-title">You Win!</h2>
            <p className="minesweeper-game__overlay-text">
              All mines found!
            </p>
            <button onClick={resetGame} className="minesweeper-game__overlay-btn">
              Play Again
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="minesweeper-game__overlay">
            <h2 className="minesweeper-game__overlay-title">Game Over!</h2>
            <p className="minesweeper-game__overlay-text">You hit a mine!</p>
            <button onClick={resetGame} className="minesweeper-game__overlay-btn">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="minesweeper-game__footer">
        <p className="minesweeper-game__instructions">
          Left-click to reveal • Right-click to flag
        </p>
      </div>
    </div>
  );
}
