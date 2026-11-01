/**
 * Snake Game
 * Classic snake game with grid-based movement
 * Arrow keys to control, eat food to grow, avoid walls and self
 */

import { useState, useEffect } from 'react';
import { reportOver, reportScore, reportStart } from './gameEvents';
import './Snake.css';

interface SnakeProps {
  windowId: string;
  nodeId?: string;
}

interface Position {
  x: number;
  y: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const TICK_RATE = 150; // milliseconds

export default function Snake({ windowId }: SnakeProps) {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  // achievements + the pixel twin's reactions
  useEffect(() => {
    reportStart('snake');
  }, []);
  useEffect(() => {
    if (score > 0) reportScore('snake', score);
  }, [score]);
  useEffect(() => {
    if (gameOver) reportOver('snake', score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  // Generate random food position (empty cell)
  const generateFood = (currentSnake: Position[]): Position => {
    const emptyCells: Position[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnake = currentSnake.some(seg => seg.x === x && seg.y === y);
        if (!isSnake) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) {
      // Game won (snake fills entire grid - unlikely but possible)
      return { x: 0, y: 0 };
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  };

  // Reset game
  const resetGame = () => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setScore(0);
    setGameOver(false);
    setPaused(false);
  };

  // Check collision with walls or self
  const checkCollision = (head: Position, body: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }

    // Self collision (check body segments except head)
    return body.slice(0, -1).some(seg => seg.x === head.x && seg.y === head.y);
  };

  // Game loop
  useEffect(() => {
    if (gameOver || paused) return;

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        // Update direction from queued next direction
        setDirection(nextDirection);

        // Calculate new head position
        const head = prevSnake[0];
        let newHead: Position;

        switch (nextDirection) {
          case 'UP':
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case 'DOWN':
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case 'LEFT':
            newHead = { x: head.x - 1, y: head.y };
            break;
          case 'RIGHT':
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        // Check collision
        if (checkCollision(newHead, prevSnake)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(prev => prev + 10);
          setFood(generateFood(newSnake));
          return newSnake; // Grow (don't remove tail)
        }

        // Normal movement (remove tail)
        newSnake.pop();
        return newSnake;
      });
    }, TICK_RATE);

    return () => clearInterval(interval);
  }, [gameOver, paused, nextDirection, food]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') {
            setNextDirection('UP');
            e.preventDefault();
          }
          break;
        case 'ArrowDown':
          if (direction !== 'UP') {
            setNextDirection('DOWN');
            e.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') {
            setNextDirection('LEFT');
            e.preventDefault();
          }
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') {
            setNextDirection('RIGHT');
            e.preventDefault();
          }
          break;
        case ' ':
          setPaused(prev => !prev);
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameOver]);

  return (
    <div className="snake-game">
      {/* Header */}
      <div className="snake-game__header">
        <div className="snake-game__score">
          <span className="snake-game__label">Score:</span>
          <span className="snake-game__value">{score}</span>
        </div>
        <button onClick={resetGame} className="snake-game__reset-btn">
          Reset
        </button>
      </div>

      {/* Game Grid */}
      <div className="snake-game__container">
        <div
          className="snake-game__grid"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          {/* Snake segments */}
          {snake.map((segment, index) => (
            <div
              key={`snake-${index}`}
              className={`snake-game__segment ${index === 0 ? 'snake-game__segment--head' : ''}`}
              style={{
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            />
          ))}

          {/* Food */}
          <div
            className="snake-game__food"
            style={{
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          />
        </div>

        {/* Paused Overlay */}
        {paused && !gameOver && (
          <div className="snake-game__overlay">
            <h2 className="snake-game__overlay-title">Paused</h2>
            <p className="snake-game__overlay-text">Press Space to resume</p>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="snake-game__overlay">
            <h2 className="snake-game__overlay-title">Game Over!</h2>
            <p className="snake-game__overlay-score">Score: {score}</p>
            <button onClick={resetGame} className="snake-game__overlay-btn">
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="snake-game__footer">
        <p className="snake-game__instructions">
          Use arrow keys to move • Space to pause
        </p>
      </div>
    </div>
  );
}
