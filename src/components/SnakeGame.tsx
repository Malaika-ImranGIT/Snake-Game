import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Zap,
  Gamepad2,
} from 'lucide-react';
import { useSnakeGame, Difficulty, Direction } from '../hooks/useSnakeGame';
import { useSwipe } from '../hooks/useSwipe';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'from-green-400 to-emerald-500',
  medium: 'from-yellow-400 to-orange-500',
  hard: 'from-red-400 to-rose-600',
};

export default function SnakeGame() {
  const {
    snake,
    food,
    direction,
    gameState,
    score,
    difficulty,
    highScores,
    gridSize,
    startGame,
    togglePause,
    resetGame,
    changeDirection,
    setDifficulty,
  } = useSnakeGame();

  const gameBoardRef = useRef<HTMLDivElement>(null);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          if (gameState === 'idle' || gameState === 'gameover') {
            startGame();
          } else {
            togglePause();
          }
          break;
        case 'Enter':
          if (gameState === 'idle' || gameState === 'gameover') {
            startGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState, startGame, togglePause]);

  // Swipe controls
  const swipeHandlers = useMemo(
    () => ({
      onSwipeUp: () => changeDirection('UP'),
      onSwipeDown: () => changeDirection('DOWN'),
      onSwipeLeft: () => changeDirection('LEFT'),
      onSwipeRight: () => changeDirection('RIGHT'),
    }),
    [changeDirection]
  );

  useSwipe(gameBoardRef, swipeHandlers);

  // D-pad button handler
  const handleDPad = useCallback(
    (dir: Direction) => {
      if (gameState === 'idle' || gameState === 'gameover') {
        startGame();
      }
      changeDirection(dir);
    },
    [changeDirection, gameState, startGame]
  );

  // Render grid cells
  const renderGrid = () => {
    const cells = [];
    const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
    const headKey = `${snake[0].x},${snake[0].y}`;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const key = `${x},${y}`;
        const isSnake = snakeSet.has(key);
        const isHead = key === headKey;
        const isFood = food.x === x && food.y === y;
        const snakeIndex = snake.findIndex(s => s.x === x && s.y === y);

        let cellClass = 'transition-all duration-75 ';

        if (isHead) {
          cellClass += 'bg-emerald-400 rounded-md shadow-lg shadow-emerald-400/50 scale-110';
        } else if (isSnake) {
          const opacity = Math.max(0.4, 1 - (snakeIndex / snake.length) * 0.6);
          cellClass += `rounded-sm`;
          cells.push(
            <div
              key={key}
              className={cellClass}
              style={{
                backgroundColor: `rgba(52, 211, 153, ${opacity})`,
              }}
            />
          );
          continue;
        } else if (isFood) {
          cellClass += 'bg-red-400 rounded-full shadow-lg shadow-red-400/50 animate-pulse scale-90';
        } else {
          cellClass += 'bg-slate-800/30 rounded-sm';
        }

        cells.push(<div key={key} className={cellClass} />);
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Snake</h1>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">
              Best: {highScores[difficulty]}
            </span>
          </div>
        </div>

        {/* Score and Controls Bar */}
        <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Score</p>
              <p className="text-2xl font-bold text-white">{score}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Difficulty selector */}
            <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => {
                    if (gameState === 'idle' || gameState === 'gameover') {
                      setDifficulty(d);
                    }
                  }}
                  disabled={gameState === 'playing' || gameState === 'paused'}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    difficulty === d
                      ? `bg-gradient-to-r ${DIFFICULTY_COLORS[d]} text-white shadow-sm`
                      : 'text-slate-400 hover:text-white disabled:opacity-50'
                  }`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1">
              {(gameState === 'playing' || gameState === 'paused') && (
                <button
                  onClick={togglePause}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  title={gameState === 'paused' ? 'Resume' : 'Pause'}
                >
                  {gameState === 'paused' ? (
                    <Play className="w-4 h-4 text-white" />
                  ) : (
                    <Pause className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  resetGame();
                }}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative w-full max-w-lg aspect-square">
        <div
          ref={gameBoardRef}
          className="w-full h-full bg-slate-900/90 backdrop-blur-sm rounded-2xl border-2 border-slate-700/50 p-2 shadow-2xl shadow-black/30 overflow-hidden"
        >
          <div
            className="w-full h-full grid gap-[1px]"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            }}
          >
            {renderGrid()}
          </div>
        </div>

        {/* Overlay Messages */}
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">🐍</div>
                <h2 className="text-2xl font-bold text-white mb-2">Ready to Play?</h2>
                <p className="text-slate-300 text-sm mb-6">
                  Use arrow keys, WASD, or swipe to control
                </p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Start Game
                  </span>
                </button>
                <p className="text-slate-500 text-xs mt-3">or press Space / Enter</p>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <Pause className="w-12 h-12 text-white mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-white mb-2">Paused</h2>
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Resume
                  </span>
                </button>
                <p className="text-slate-500 text-xs mt-3">or press Space</p>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-center"
              >
                <div className="text-5xl mb-3">💀</div>
                <h2 className="text-2xl font-bold text-white mb-1">Game Over!</h2>
                <p className="text-3xl font-bold text-emerald-400 mb-1">{score}</p>
                <p className="text-slate-400 text-sm mb-1">points</p>
                {score > 0 && score >= highScores[difficulty] && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-yellow-400 text-sm font-medium mb-3"
                  >
                    🏆 New High Score!
                  </motion.p>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={startGame}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      Play Again
                    </span>
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-3">or press Space / Enter</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile D-Pad Controls */}
      <div className="mt-4 md:hidden">
        <div className="grid grid-cols-3 gap-2 w-40 mx-auto">
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDPad('UP'); }}
            className="p-3 bg-slate-700/80 active:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
            className="p-3 bg-slate-700/80 active:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
            className="p-3 bg-slate-700/80 active:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
            className="p-3 bg-slate-700/80 active:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 text-center">
        <p className="text-slate-500 text-xs hidden md:block">
          Arrow keys / WASD to move • Space to pause • Enter to start
        </p>
        <p className="text-slate-500 text-xs md:hidden">
          Swipe or use buttons to control
        </p>
      </div>
    </div>
  );
}
