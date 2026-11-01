/**
 * Tetris Game
 * Classic block-stacking puzzle game
 * Rotate and arrange falling tetrominoes to clear lines
 */

import { useState, useEffect } from 'react';
import { reportOver, reportScore, reportStart } from './gameEvents';
import './Tetris.css';

interface TetrisProps {
  windowId: string;
  nodeId?: string;
}

interface Tetromino {
  shape: number[][];
  color: string;
}

const COLS = 10;
const ROWS = 20;
const INITIAL_SPEED = 500; // milliseconds

// Tetromino shapes (I, O, T, S, Z, J, L)
const TETROMINOS: { [key: string]: Tetromino } = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00BCD4', // Cyan
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#FFEB3B', // Yellow
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: '#9C27B0', // Purple
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: '#4CAF50', // Green
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: '#F44336', // Red
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: '#2196F3', // Blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: '#FF9800', // Orange
  },
};

// Create empty grid
const createEmptyGrid = (): string[][] => {
  return Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(''));
};

// Get random tetromino
const getRandomTetromino = (): { type: string; piece: Tetromino } => {
  const types = Object.keys(TETROMINOS);
  const type = types[Math.floor(Math.random() * types.length)];
  return { type, piece: TETROMINOS[type] };
};

// Rotate shape 90° clockwise
const rotate = (shape: number[][]): number[][] => {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array(cols)
    .fill(null)
    .map(() => Array(rows).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      rotated[j][rows - 1 - i] = shape[i][j];
    }
  }

  return rotated;
};

export default function Tetris({ windowId }: TetrisProps) {
  const [grid, setGrid] = useState<string[][]>(createEmptyGrid());
  const [currentPiece, setCurrentPiece] = useState(getRandomTetromino());
  const [nextPiece, setNextPiece] = useState(getRandomTetromino());
  const [position, setPosition] = useState({ x: 4, y: 0 });
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  // achievements + the pixel twin's reactions
  useEffect(() => {
    reportStart('tetris');
  }, []);
  useEffect(() => {
    if (linesCleared > 0) reportScore('tetris', linesCleared);
  }, [linesCleared]);
  useEffect(() => {
    if (gameOver) reportOver('tetris', linesCleared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  // Check collision
  const checkCollision = (
    shape: number[][],
    pos: { x: number; y: number },
    currentGrid: string[][]
  ): boolean => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = pos.x + col;
          const newY = pos.y + row;

          // Wall/floor collision
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }

          // Piece collision
          if (newY >= 0 && currentGrid[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Lock piece to grid
  const lockPiece = () => {
    const newGrid = grid.map(row => [...row]);

    currentPiece.piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const x = position.x + colIndex;
          const y = position.y + rowIndex;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            newGrid[y][x] = currentPiece.piece.color;
          }
        }
      });
    });

    // Clear completed lines
    let linesCount = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (newGrid[row].every(cell => cell !== '')) {
        newGrid.splice(row, 1);
        newGrid.unshift(Array(COLS).fill(''));
        linesCount++;
        row++; // Check same row again
      }
    }

    // Update score (100, 300, 500, 800)
    const scoreValues = [0, 100, 300, 500, 800];
    setScore(prev => prev + scoreValues[linesCount] * level);
    setLinesCleared(prev => prev + linesCount);

    // Level up every 10 lines
    if (linesCleared + linesCount >= level * 10) {
      setLevel(prev => prev + 1);
    }

    setGrid(newGrid);

    // Spawn new piece
    setCurrentPiece(nextPiece);
    setNextPiece(getRandomTetromino());
    setPosition({ x: 4, y: 0 });

    // Check game over
    if (checkCollision(nextPiece.piece.shape, { x: 4, y: 0 }, newGrid)) {
      setGameOver(true);
    }
  };

  // Move piece
  const move = (dir: 'left' | 'right' | 'down') => {
    if (gameOver || paused) return;

    const newPos = { ...position };
    if (dir === 'left') newPos.x--;
    else if (dir === 'right') newPos.x++;
    else if (dir === 'down') newPos.y++;

    if (!checkCollision(currentPiece.piece.shape, newPos, grid)) {
      setPosition(newPos);
    } else if (dir === 'down') {
      lockPiece();
    }
  };

  // Rotate piece
  const rotatePiece = () => {
    if (gameOver || paused) return;

    const rotated = rotate(currentPiece.piece.shape);

    // Try rotation
    if (!checkCollision(rotated, position, grid)) {
      setCurrentPiece(prev => ({ ...prev, piece: { ...prev.piece, shape: rotated } }));
      return;
    }

    // Wall kicks: try offsets
    const offsets = [-1, 1, -2, 2];
    for (const offset of offsets) {
      const newPos = { x: position.x + offset, y: position.y };
      if (!checkCollision(rotated, newPos, grid)) {
        setCurrentPiece(prev => ({ ...prev, piece: { ...prev.piece, shape: rotated } }));
        setPosition(newPos);
        return;
      }
    }
  };

  // Hard drop
  const hardDrop = () => {
    if (gameOver || paused) return;

    const newPos = { ...position };
    while (!checkCollision(currentPiece.piece.shape, { x: newPos.x, y: newPos.y + 1 }, grid)) {
      newPos.y++;
    }
    setPosition(newPos);
    lockPiece();
  };

  // Reset game
  const resetGame = () => {
    setGrid(createEmptyGrid());
    setCurrentPiece(getRandomTetromino());
    setNextPiece(getRandomTetromino());
    setPosition({ x: 4, y: 0 });
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setGameOver(false);
    setPaused(false);
  };

  // Game loop
  useEffect(() => {
    if (gameOver || paused) return;

    const speed = Math.max(100, INITIAL_SPEED - (level - 1) * 50);
    const interval = setInterval(() => {
      move('down');
    }, speed);

    return () => clearInterval(interval);
  }, [position, grid, currentPiece, gameOver, paused, level]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          move('left');
          e.preventDefault();
          break;
        case 'ArrowRight':
          move('right');
          e.preventDefault();
          break;
        case 'ArrowDown':
          move('down');
          e.preventDefault();
          break;
        case 'ArrowUp':
          rotatePiece();
          e.preventDefault();
          break;
        case ' ':
          if (!gameOver) {
            if (paused) {
              setPaused(false);
            } else {
              hardDrop();
            }
          }
          e.preventDefault();
          break;
        case 'p':
        case 'P':
          setPaused(prev => !prev);
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, grid, currentPiece, gameOver, paused]);

  // Render grid with current piece
  const renderGrid = () => {
    const displayGrid = grid.map(row => [...row]);

    // Draw current piece
    currentPiece.piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const x = position.x + colIndex;
          const y = position.y + rowIndex;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            displayGrid[y][x] = currentPiece.piece.color;
          }
        }
      });
    });

    return displayGrid;
  };

  return (
    <div className="tetris-game">
      {/* Toolbar */}
      <div className="tetris-game__toolbar">
        <div className="tetris-game__stats">
          <div className="tetris-game__stat">
            <span className="tetris-game__stat-label">Score</span>
            <span className="tetris-game__stat-value">{score}</span>
          </div>
          <div className="tetris-game__stat">
            <span className="tetris-game__stat-label">Level</span>
            <span className="tetris-game__stat-value">{level}</span>
          </div>
          <div className="tetris-game__stat">
            <span className="tetris-game__stat-label">Lines</span>
            <span className="tetris-game__stat-value">{linesCleared}</span>
          </div>
        </div>
        <button onClick={resetGame} className="tetris-game__reset-btn">
          Reset
        </button>
      </div>

      {/* Main Game Area */}
      <div className="tetris-game__main">
        <div className="tetris-game__container">
          <div className="tetris-game__grid">
            {renderGrid().map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="tetris-game__cell"
                  style={{ background: cell || '#1a1a1a' }}
                />
              ))
            )}
          </div>

          {/* Paused Overlay */}
          {paused && !gameOver && (
            <div className="tetris-game__overlay">
              <h2 className="tetris-game__overlay-title">Paused</h2>
              <p className="tetris-game__overlay-text">Press P to resume</p>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="tetris-game__overlay">
              <h2 className="tetris-game__overlay-title">Game Over!</h2>
              <p className="tetris-game__overlay-score">Score: {score}</p>
              <p className="tetris-game__overlay-lines">Lines: {linesCleared}</p>
              <button onClick={resetGame} className="tetris-game__overlay-btn">
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="tetris-game__sidebar">
          <h4 className="tetris-game__sidebar-title">Next</h4>
          <div className="tetris-game__preview">
            {nextPiece.piece.shape.map((row, rowIndex) => (
              <div key={rowIndex} className="tetris-game__preview-row">
                {row.map((cell, colIndex) => (
                  <div
                    key={colIndex}
                    className="tetris-game__preview-cell"
                    style={{ background: cell ? nextPiece.piece.color : 'transparent' }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="tetris-game__controls">
            <h4 className="tetris-game__sidebar-title">Controls</h4>
            <ul className="tetris-game__controls-list">
              <li>← → Move</li>
              <li>↓ Soft Drop</li>
              <li>↑ Rotate</li>
              <li>Space Hard Drop</li>
              <li>P Pause</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
