import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Position = { x: number; y: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 180,
  medium: 110,
  hard: 65,
};

const SCORE_MAP: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

function getInitialState(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function getOpposite(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
  };
  return opposites[dir];
}

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(getInitialState());
  const [food, setFood] = useState<Position>(() => getRandomPosition(getInitialState()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>(() => {
    try {
      const saved = localStorage.getItem('snake-highscores');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { easy: 0, medium: 0, hard: 0 };
  });

  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const snakeRef = useRef<Position[]>(getInitialState());
  const foodRef = useRef<Position>(getRandomPosition(getInitialState()));
  const scoreRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>('idle');

  // Keep refs in sync
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Save high scores
  useEffect(() => {
    try {
      localStorage.setItem('snake-highscores', JSON.stringify(highScores));
    } catch { /* ignore */ }
  }, [highScores]);

  const resetGame = useCallback(() => {
    const initial = getInitialState();
    setSnake(initial);
    snakeRef.current = initial;
    const newFood = getRandomPosition(initial);
    setFood(newFood);
    foodRef.current = newFood;
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = null;
    setScore(0);
    scoreRef.current = 0;
    setGameState('idle');
    gameStateRef.current = 'idle';
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  const startGame = useCallback(() => {
    if (gameState === 'gameover' || gameState === 'idle') {
      resetGame();
      setTimeout(() => {
        setGameState('playing');
        gameStateRef.current = 'playing';
      }, 10);
    } else if (gameState === 'paused') {
      setGameState('playing');
      gameStateRef.current = 'playing';
    }
  }, [gameState, resetGame]);

  const pauseGame = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
      gameStateRef.current = 'paused';
    }
  }, [gameState]);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
      gameStateRef.current = 'paused';
    } else if (gameState === 'paused') {
      setGameState('playing');
      gameStateRef.current = 'playing';
    }
  }, [gameState]);

  const changeDirection = useCallback((newDir: Direction) => {
    if (newDir !== getOpposite(directionRef.current)) {
      nextDirectionRef.current = newDir;
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const speed = SPEED_MAP[difficulty];

    const tick = (timestamp: number) => {
      if (gameStateRef.current !== 'playing') {
        gameLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      if (timestamp - lastTickRef.current >= speed) {
        lastTickRef.current = timestamp;

        // Apply queued direction
        if (nextDirectionRef.current) {
          directionRef.current = nextDirectionRef.current;
          setDirection(nextDirectionRef.current);
          nextDirectionRef.current = null;
        }

        const currentDir = directionRef.current;
        const currentSnake = snakeRef.current;
        const currentFood = foodRef.current;
        const head = currentSnake[0];
        let newHead: Position;

        switch (currentDir) {
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

        // Check wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameState('gameover');
          gameStateRef.current = 'gameover';
          return;
        }

        // Check self collision (exclude tail since it will move)
        const bodyToCheck = currentSnake.slice(0, -1);
        if (bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          setGameState('gameover');
          gameStateRef.current = 'gameover';
          return;
        }

        // Check food collision
        const ateFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
        const newSnake = [newHead, ...currentSnake];

        if (!ateFood) {
          newSnake.pop();
        } else {
          // Update score
          const newScore = scoreRef.current + SCORE_MAP[difficulty];
          setScore(newScore);
          scoreRef.current = newScore;
          setHighScores(prevHigh => ({
            ...prevHigh,
            [difficulty]: Math.max(prevHigh[difficulty], newScore),
          }));
          // Generate new food
          const newFood = getRandomPosition(newSnake);
          setFood(newFood);
          foodRef.current = newFood;
        }

        setSnake(newSnake);
        snakeRef.current = newSnake;
      }

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, difficulty]);

  return {
    snake,
    food,
    direction,
    gameState,
    score,
    difficulty,
    highScores,
    gridSize: GRID_SIZE,
    startGame,
    pauseGame,
    togglePause,
    resetGame,
    changeDirection,
    setDifficulty,
  };
}
