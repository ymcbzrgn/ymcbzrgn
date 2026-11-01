/**
 * 2048 Game
 * Slide and merge tiles to reach 2048
 * Arrow keys to move tiles in four directions
 */

import { useState, useEffect } from 'react';
import { reportOver, reportScore, reportStart, reportWin } from './gameEvents';
import './Game2048.css';

interface Game2048Props {
  windowId: string;
  nodeId?: string;
}

const GRID_SIZE = 4;

// Initialize empty grid
const createEmptyGrid = (): number[][] => {
  return Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
};

// Add random tile (90% = 2, 10% = 4)
const addRandomTile = (grid: number[][]): number[][] => {
  const emptyCells: [number, number][] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === 0) {
        emptyCells.push([row, col]);
      }
    }
  }

  if (emptyCells.length === 0) return grid;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;

  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = value;
  return newGrid;
};

// Slide and merge a single row to the left
const slideRow = (row: number[]): { row: number[]; merged: number } => {
  // Filter out zeros
  const nonZero = row.filter(n => n !== 0);
  const result: number[] = [];
  let merged = 0;
  let skip = false;

  // Merge adjacent same values
  for (let i = 0; i < nonZero.length; i++) {
    if (skip) {
      skip = false;
      continue;
    }

    if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
      const mergedValue = nonZero[i] * 2;
      result.push(mergedValue);
      merged += mergedValue;
      skip = true; // Skip next tile (already merged)
    } else {
      result.push(nonZero[i]);
    }
  }

  // Pad with zeros
  while (result.length < GRID_SIZE) {
    result.push(0);
  }

  return { row: result, merged };
};

// Transpose grid (for vertical moves)
const transpose = (grid: number[][]): number[][] => {
  return grid[0].map((_, colIndex) => grid.map(row => row[colIndex]));
};

// Reverse each row (for right/down moves)
const reverseGrid = (grid: number[][]): number[][] => {
  return grid.map(row => [...row].reverse());
};

// Check if two grids are equal
const gridsEqual = (grid1: number[][], grid2: number[][]): boolean => {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid1[row][col] !== grid2[row][col]) return false;
    }
  }
  return true;
};

// Check if any moves are possible
const canMove = (grid: number[][]): boolean => {
  // Check for empty cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === 0) return true;
    }
  }

  // Check for adjacent same values (horizontal)
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 1; col++) {
      if (grid[row][col] === grid[row][col + 1]) return true;
    }
  }

  // Check for adjacent same values (vertical)
  for (let row = 0; row < GRID_SIZE - 1; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === grid[row + 1][col]) return true;
    }
  }

  return false;
};

export default function Game2048({ windowId }: Game2048Props) {
  const [tiles, setTiles] = useState<number[][]>(() => {
    let grid = createEmptyGrid();
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    return grid;
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  // achievements + the pixel twin's reactions
  useEffect(() => {
    reportStart('2048');
  }, []);
  useEffect(() => {
    reportScore('2048', Math.max(...tiles.flat()));
  }, [tiles]);
  useEffect(() => {
    if (won) reportWin('2048', score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);
  useEffect(() => {
    if (gameOver) reportOver('2048', score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const resetGame = () => {
    let grid = createEmptyGrid();
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    setTiles(grid);
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  const move = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver) return;

    let newGrid = tiles.map(row => [...row]);
    let scoreGain = 0;

    // Transform grid based on direction
    if (direction === 'right') {
      newGrid = reverseGrid(newGrid);
    } else if (direction === 'up') {
      newGrid = transpose(newGrid);
    } else if (direction === 'down') {
      newGrid = transpose(reverseGrid(newGrid));
    }

    // Slide rows
    newGrid = newGrid.map(row => {
      const { row: slidRow, merged } = slideRow(row);
      scoreGain += merged;
      return slidRow;
    });

    // Reverse transform
    if (direction === 'right') {
      newGrid = reverseGrid(newGrid);
    } else if (direction === 'up') {
      newGrid = transpose(newGrid);
    } else if (direction === 'down') {
      newGrid = reverseGrid(transpose(newGrid));
    }

    // Check if grid changed
    if (gridsEqual(tiles, newGrid)) {
      return; // No movement, don't add new tile
    }

    // Add random tile
    newGrid = addRandomTile(newGrid);

    // Update state
    setTiles(newGrid);
    setScore(prev => prev + scoreGain);

    // Check for 2048 win
    if (!won) {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (newGrid[row][col] === 2048) {
            setWon(true);
          }
        }
      }
    }

    // Check for game over
    if (!canMove(newGrid)) {
      setGameOver(true);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver && !won) return;

      switch (e.key) {
        case 'ArrowLeft':
          move('left');
          e.preventDefault();
          break;
        case 'ArrowRight':
          move('right');
          e.preventDefault();
          break;
        case 'ArrowUp':
          move('up');
          e.preventDefault();
          break;
        case 'ArrowDown':
          move('down');
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tiles, gameOver, won]);

  return (
    <div className="game-2048">
      {/* Header */}
      <div className="game-2048__header">
        <div className="game-2048__title">
          <h2>2048</h2>
        </div>
        <div className="game-2048__score-container">
          <div className="game-2048__score">
            <span className="game-2048__score-label">Score</span>
            <strong className="game-2048__score-value">{score}</strong>
          </div>
          <button onClick={resetGame} className="game-2048__new-btn">
            New Game
          </button>
        </div>
      </div>

      {/* Game Grid */}
      <div className="game-2048__container">
        <div className="game-2048__grid">
          {tiles.map((row, rowIndex) =>
            row.map((value, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`game-2048__tile ${value ? `game-2048__tile--${value}` : ''}`}
              >
                {value || ''}
              </div>
            ))
          )}
        </div>

        {/* Win Overlay */}
        {won && !gameOver && (
          <div className="game-2048__overlay">
            <h2 className="game-2048__overlay-title">You Win!</h2>
            <p className="game-2048__overlay-score">Score: {score}</p>
            <div className="game-2048__overlay-actions">
              <button onClick={resetGame} className="game-2048__overlay-btn">
                New Game
              </button>
              <button
                onClick={() => setWon(false)}
                className="game-2048__overlay-btn game-2048__overlay-btn--continue"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="game-2048__overlay">
            <h2 className="game-2048__overlay-title">Game Over!</h2>
            <p className="game-2048__overlay-score">Score: {score}</p>
            <button onClick={resetGame} className="game-2048__overlay-btn">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="game-2048__footer">
        <p className="game-2048__instructions">
          Use arrow keys to move tiles • Combine same numbers to reach 2048
        </p>
      </div>
    </div>
  );
}
