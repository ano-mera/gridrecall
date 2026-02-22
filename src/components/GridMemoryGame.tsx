"use client";
import React, { useState, useEffect, useCallback } from "react";
import { saveSettings, validateSettings } from "../utils/gameSettings";

interface GameState {
  gridSize: number;
  showTime: number;
  answerTime: number;
  numActiveCells: number;
  targetConsecutive: number;
  consecutiveCorrect: number;
  targetAchieved: boolean;
}

interface GridMemoryGameProps {
  onShowSplash: () => void;
  gameState: GameState;
  onGameStateUpdate: (newState: Partial<GameState>) => void;
  showStartButton: boolean;
  onGameStart: () => void;
  onReset: () => void;
  onStatsUpdate: (isCorrect: boolean) => void;
  onShowStats: () => void;
}

export default function GridMemoryGame({
  onShowSplash,
  gameState,
  onGameStateUpdate,
  showStartButton,
  onGameStart,
  onReset,
  onStatsUpdate,
  onShowStats,
}: GridMemoryGameProps) {
  // 設定可能な値（親から渡された状態を使用）
  const { gridSize, showTime, answerTime, numActiveCells, targetConsecutive, consecutiveCorrect, targetAchieved } = gameState;

  // 設定用の一時的な値
  const [tempGridSize, setTempGridSize] = useState(gridSize);
  const [tempShowTime, setTempShowTime] = useState(showTime);
  const [tempAnswerTime, setTempAnswerTime] = useState(answerTime);
  const [tempNumActiveCells, setTempNumActiveCells] = useState(numActiveCells);
  const [tempTargetConsecutive, setTempTargetConsecutive] = useState(targetConsecutive);
  const [showSettings, setShowSettings] = useState(false);

  // ゲーム状態
  const [solution, setSolution] = useState<boolean[]>([]);
  const [previousSolution, setPreviousSolution] = useState<boolean[]>([]);
  const [userGrid, setUserGrid] = useState<boolean[]>([]);
  const [showAnswer, setShowAnswer] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // タッチイベント用の状態
  const [touchStartCellIndex, setTouchStartCellIndex] = useState<number | null>(null);

  // グリッド生成
  const generateGrid = useCallback(() => {
    const grid = Array(gridSize * gridSize).fill(false);
    const positions = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
      positions.push(i);
    }

    for (let i = 0; i < numActiveCells; i++) {
      const randomIndex = Math.floor(Math.random() * positions.length);
      const position = positions.splice(randomIndex, 1)[0];
      grid[position] = true;
    }

    return grid;
  }, [gridSize, numActiveCells]);

  // 初回のみ初期化（Startボタンが非表示の場合のみ）
  useEffect(() => {
    if (!isInitialized && !showStartButton) {
      const newSolution = generateGrid();
      setSolution(newSolution);
      setUserGrid(Array(gridSize * gridSize).fill(false));
      setShowAnswer(true);
      setIsFinished(false);
      setTimerExpired(false);
      setIsRetryMode(false);
      setIsInitialized(true);

      const showTimer = setTimeout(() => {
        setShowAnswer(false);
      }, showTime);

      // 解答時間が0（無期限）の場合はタイマーを設定しない
      let answerTimer: NodeJS.Timeout | null = null;
      if (answerTime > 0) {
        answerTimer = setTimeout(() => {
          setTimerExpired(true);
        }, showTime + answerTime);
      }

      return () => {
        clearTimeout(showTimer);
        if (answerTimer) {
          clearTimeout(answerTimer);
        }
      };
    }
  }, [isInitialized, showStartButton, gridSize, numActiveCells, showTime, answerTime, generateGrid]);

  // グリッドサイズ変更時にnumActiveCellsを自動調整
  useEffect(() => {
    const maxCells = gridSize * gridSize;
    if (numActiveCells > maxCells) {
      onGameStateUpdate({ numActiveCells: maxCells });
    }
  }, [gridSize, numActiveCells, onGameStateUpdate]);

  const toggleCell = (index: number) => {
    if (showAnswer || isFinished || timerExpired || showStartButton) return;
    const newGrid = [...userGrid];
    newGrid[index] = !newGrid[index];
    setUserGrid(newGrid);
  };

  // タッチスタート時のセルインデックスを記録
  const handleTouchStart = (index: number) => {
    setTouchStartCellIndex(index);
  };

  // タッチエンド時は開始セルのみを操作
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // デフォルトの動作を防ぐ

    if (touchStartCellIndex !== null) {
      toggleCell(touchStartCellIndex);
    }

    setTouchStartCellIndex(null);
  };

  // マウスとタッチの統合ハンドラー
  const handleCellInteraction = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    // タッチイベントの場合は何もしない（handleTouchEndで処理）
    if (e.type === "touchend") return;

    // マウスイベントの場合のみここで処理
    if (e.type === "click") {
      e.preventDefault();
      toggleCell(index);
    }
  };

  const checkAnswer = () => {
    setIsFinished(true);

    // 現在の問題を前回の問題として保存（Retryで使用するため）
    if (!isRetryMode) {
      setPreviousSolution([...solution]);
    }

    // 正解判定
    const isCorrect = solution.every((cell, index) => cell === userGrid[index]);

    // Retryモードでない場合のみ統計情報と連続正解数を更新
    if (!isRetryMode) {
      // 統計情報を更新
      onStatsUpdate(isCorrect);

      if (isCorrect) {
        const newConsecutive = consecutiveCorrect + 1;

        // 目標達成チェック
        if (newConsecutive >= targetConsecutive && !targetAchieved) {
          onGameStateUpdate({
            consecutiveCorrect: 0,
            targetAchieved: true,
          });
        } else {
          onGameStateUpdate({
            consecutiveCorrect: newConsecutive,
            targetAchieved: false,
          });
        }
      } else {
        // 不正解の場合、連続正解数をゼロにリセット
        onGameStateUpdate({
          consecutiveCorrect: 0,
          targetAchieved: false,
        });
      }
    }
  };

  const resetGame = () => {
    const newSolution = generateGrid();
    setSolution(newSolution);
    setUserGrid(Array(gridSize * gridSize).fill(false));
    setShowAnswer(true);
    setIsFinished(false);
    setTimerExpired(false);
    setIsRetryMode(false);

    const showTimer = setTimeout(() => {
      setShowAnswer(false);
    }, showTime);

    // 解答時間が0（無期限）の場合はタイマーを設定しない
    let answerTimer: NodeJS.Timeout | null = null;
    if (answerTime > 0) {
      answerTimer = setTimeout(() => {
        setTimerExpired(true);
      }, showTime + answerTime);
    }

    return () => {
      clearTimeout(showTimer);
      if (answerTimer) {
        clearTimeout(answerTimer);
      }
    };
  };

  const startGame = () => {
    onGameStart();
    setIsInitialized(true);
    resetGame();
  };

  const retryGame = () => {
    // 前回の問題を復元
    setSolution([...previousSolution]);
    setUserGrid(Array(gridSize * gridSize).fill(false));
    setShowAnswer(true);
    setIsFinished(false);
    setTimerExpired(false);
    setIsRetryMode(true);

    const showTimer = setTimeout(() => {
      setShowAnswer(false);
    }, showTime);

    // 解答時間が0（無期限）の場合はタイマーを設定しない
    let answerTimer: NodeJS.Timeout | null = null;
    if (answerTime > 0) {
      answerTimer = setTimeout(() => {
        setTimerExpired(true);
      }, showTime + answerTime);
    }

    return () => {
      clearTimeout(showTimer);
      if (answerTimer) {
        clearTimeout(answerTimer);
      }
    };
  };

  // 設定を開くときに現在の値を一時的な値にコピー
  const openSettings = () => {
    setTempGridSize(gridSize);
    setTempShowTime(showTime);
    setTempAnswerTime(answerTime);
    setTempNumActiveCells(numActiveCells);
    setTempTargetConsecutive(targetConsecutive);
    setShowSettings(true);
  };

  // 設定を確定する
  const applySettings = async () => {
    // 値の検証と修正
    const validatedSettings = validateSettings({
      gridSize: tempGridSize,
      showTime: tempShowTime,
      answerTime: tempAnswerTime,
      numActiveCells: tempNumActiveCells,
      targetConsecutive: tempTargetConsecutive,
    });

    // 設定が変更された場合は新しいゲームを開始
    const isSettingsChanged =
      validatedSettings.gridSize !== gridSize ||
      validatedSettings.showTime !== showTime ||
      validatedSettings.answerTime !== answerTime ||
      validatedSettings.numActiveCells !== numActiveCells ||
      validatedSettings.targetConsecutive !== targetConsecutive;

    // 設定を保存
    try {
      await saveSettings(validatedSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }

    onGameStateUpdate({
      gridSize: validatedSettings.gridSize,
      showTime: validatedSettings.showTime,
      answerTime: validatedSettings.answerTime,
      numActiveCells: validatedSettings.numActiveCells,
      targetConsecutive: validatedSettings.targetConsecutive,
    });

    if (isSettingsChanged) {
      // 設定変更時は起動時のように完全に初期化
      setIsInitialized(false);
      setSolution([]);
      setUserGrid([]);
      setShowAnswer(true);
      setIsFinished(false);
      setTimerExpired(false);
      setIsRetryMode(false);
      setPreviousSolution([]);

      // 連続正解数と目標達成状態もリセット
      onGameStateUpdate({
        consecutiveCorrect: 0,
        targetAchieved: false,
      });

      // 親コンポーネントに初期状態に戻すことを通知
      onReset();
    }

    setShowSettings(false);
  };

  // 設定をキャンセルする
  const cancelSettings = () => {
    setShowSettings(false);
  };

  // 初期化前でStartボタン表示時は空のグリッドを表示
  if (solution.length === 0 && !showStartButton) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 w-full justify-center my-2">
        <button onClick={onShowSplash} className="text-2xl font-bold text-black hover:text-gray-600 transition-colors" title="Show splash screen">
          <span className="font-bold">Grid</span>
          <span className="font-normal">Recall</span>
        </button>
        <div className="flex gap-2">
          <button onClick={onShowStats} className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors" title="Show stats">
            📊
          </button>
          <button onClick={openSettings} className="bg-gray-500 text-white p-2 rounded-full hover:bg-gray-600 transition-colors" title="Settings">
            ⚙️
          </button>
        </div>
      </div>

      {/* 設定ポップアップ */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelSettings();
            }
          }}
        >
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Settings</h2>
              <button onClick={cancelSettings} className="text-gray-500 hover:text-gray-700 text-xl">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-black">
                Grid Size:
                <input
                  type="text"
                  inputMode="numeric"
                  min="2"
                  max="8"
                  value={tempGridSize === 0 ? "" : tempGridSize}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                    setTempGridSize(value);
                  }}
                  className="border px-2 py-1 rounded w-16 ml-2"
                />
              </label>
              <label className="text-black">
                Show Time (ms):
                <input
                  type="text"
                  inputMode="numeric"
                  min="100"
                  max="10000"
                  value={tempShowTime === 0 ? "" : tempShowTime}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                    setTempShowTime(value);
                  }}
                  className="border px-2 py-1 rounded w-20 ml-2"
                />
              </label>
              <label className="text-black">
                Answer Time (ms):
                <input
                  type="text"
                  inputMode="numeric"
                  min="0"
                  max="30000"
                  placeholder=""
                  value={tempAnswerTime === 0 ? "" : tempAnswerTime}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                    setTempAnswerTime(value);
                  }}
                  className="border px-2 py-1 rounded w-20 ml-2"
                />
              </label>
              <label className="text-black">
                Active Cells:
                <input
                  type="text"
                  inputMode="numeric"
                  min="1"
                  max={tempGridSize * tempGridSize}
                  value={tempNumActiveCells === 0 ? "" : tempNumActiveCells}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                    setTempNumActiveCells(value);
                  }}
                  className="border px-2 py-1 rounded w-16 ml-2"
                />
              </label>
              <label className="text-black">
                Target Consecutive:
                <input
                  type="text"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  value={tempTargetConsecutive === 0 ? "" : tempTargetConsecutive}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                    setTempTargetConsecutive(value);
                  }}
                  className="border px-2 py-1 rounded w-16 ml-2"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={cancelSettings} className="bg-gray-500 text-white px-4 py-2 rounded">
                Cancel
              </button>
              <button onClick={applySettings} className="bg-blue-500 text-white px-4 py-2 rounded">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 連続正解数と目標達成通知 */}
      {targetAchieved ? (
        <div className="text-xl font-bold text-green-600 bg-green-100 px-4 py-2 rounded-lg border-2 border-green-500 my-4">
          🎉 {targetConsecutive} Consecutive Correct! 🎉
        </div>
      ) : (
        <div className="text-lg font-semibold text-blue-600 my-4">
          Consecutive: {consecutiveCorrect} / Target: {targetConsecutive}
        </div>
      )}

      <div
        className="grid mx-2 select-text"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gap: "0px",
          width: "min(calc(100vw - 1rem), 600px)",
          height: "min(calc(100vw - 1rem), 600px)",
          maxWidth: "min(calc(100vw - 1rem), 600px)",
          maxHeight: "min(calc(100vw - 1rem), 600px)",
          aspectRatio: "1",
        }}
      >
        {Array(gridSize * gridSize)
          .fill(false)
          .map((cell, index) => {
            // Startボタン表示時はsolutionが空なので、仮の配列を使用
            const actualCell = solution.length > 0 ? solution[index] : false;
            let backgroundColor = "white";
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;

            if (showAnswer && actualCell) {
              backgroundColor = "black";
            } else if (isFinished || timerExpired) {
              if (actualCell && userGrid[index]) {
                backgroundColor = "lightgreen";
              } else if (actualCell && !userGrid[index]) {
                backgroundColor = "lightblue";
              } else if (!actualCell && userGrid[index]) {
                backgroundColor = "salmon";
              }
            } else if (userGrid[index]) {
              backgroundColor = "black";
            }

            return (
              <div
                key={index}
                onClick={(e) => handleCellInteraction(index, e)}
                onTouchStart={() => handleTouchStart(index)}
                onTouchEnd={handleTouchEnd}
                className="cursor-pointer"
                style={{
                  backgroundColor,
                  borderRight: "1px solid black",
                  borderBottom: "1px solid black",
                  borderLeft: col === 0 ? "1px solid black" : "none",
                  borderTop: row === 0 ? "1px solid black" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                  touchAction: "manipulation", // タッチ操作を最適化
                  WebkitTapHighlightColor: "transparent", // iOS Safariのタップハイライトを無効化
                }}
              />
            );
          })}
      </div>

      <div className="mt-4 flex gap-2">
        {showStartButton ? (
          <button onClick={startGame} className="bg-blue-500 text-white px-8 py-3 text-lg rounded hover:bg-blue-600">
            Start
          </button>
        ) : (
          <>
            {!isFinished && !timerExpired && (
              <button onClick={checkAnswer} className="bg-blue-500 text-white px-8 py-3 text-lg rounded hover:bg-blue-600">
                Check
              </button>
            )}
            {(isFinished || timerExpired) && (
              <>
                {/* 不正解の場合のみRetryボタンを表示 */}
                {solution.some((cell, index) => cell !== userGrid[index]) && (
                  <button onClick={retryGame} className="bg-orange-500 text-white px-8 py-3 text-lg rounded hover:bg-orange-600">
                    Retry
                  </button>
                )}
                {/* 正解の場合のみNextボタンを表示 */}
                {solution.every((cell, index) => cell === userGrid[index]) && (
                  <button onClick={resetGame} className="bg-green-500 text-white px-8 py-3 text-lg rounded hover:bg-green-600">
                    Next
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
