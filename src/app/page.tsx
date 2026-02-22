"use client";

import { useState, useEffect } from "react";
import SplashScreen from "../components/SplashScreen";
import GridMemoryGame from "../components/GridMemoryGame";
import StatsPopup from "../components/StatsPopup";
import { getUnifiedStatsManager, saveStats, getStats } from "../utils/unifiedStatsManager";
import { GameStats, GameSettings } from "../utils/gameStats";
import { loadSettings, DEFAULT_SETTINGS } from "../utils/gameSettings";

// ゲームの状態を管理する型定義
interface GameState {
  gridSize: number;
  showTime: number;
  answerTime: number;
  numActiveCells: number;
  targetConsecutive: number;
  consecutiveCorrect: number;
  targetAchieved: boolean;
}

// 環境情報の型定義
interface EnvironmentInfo {
  isPWA: boolean;
  isWeb: boolean;
  hasIndexedDB: boolean;
  hasLocalStorage: boolean;
  storageType: string;
  initialized: boolean;
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [currentStats, setCurrentStats] = useState<GameStats | null>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);

  // ゲームの状態を親コンポーネントで管理
  const [gameState, setGameState] = useState<GameState>({
    gridSize: DEFAULT_SETTINGS.gridSize,
    showTime: DEFAULT_SETTINGS.showTime,
    answerTime: DEFAULT_SETTINGS.answerTime,
    numActiveCells: DEFAULT_SETTINGS.numActiveCells,
    targetConsecutive: DEFAULT_SETTINGS.targetConsecutive,
    consecutiveCorrect: 0,
    targetAchieved: false,
  });

  // 統合統計管理システムと設定の初期化
  useEffect(() => {
    const initManagers = async () => {
      // 統計管理システムの初期化
      const statsManager = getUnifiedStatsManager();
      await statsManager.init();

      // 環境情報を取得
      setEnvironmentInfo(statsManager.getEnvironmentInfo());

      // 設定を読み込み
      try {
        const savedSettings = await loadSettings();
        setGameState((prev) => ({
          ...prev,
          gridSize: savedSettings.gridSize,
          showTime: savedSettings.showTime,
          answerTime: savedSettings.answerTime,
          numActiveCells: savedSettings.numActiveCells,
          targetConsecutive: savedSettings.targetConsecutive,
        }));
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    initManagers();
  }, []);

  // 設定読み込み後の統計情報取得
  useEffect(() => {
    const loadInitialStats = async () => {
      const statsManager = getUnifiedStatsManager();
      const currentSettings: GameSettings = {
        gridSize: gameState.gridSize,
        showTime: gameState.showTime,
        answerTime: gameState.answerTime,
        numActiveCells: gameState.numActiveCells,
      };

      const stats = await statsManager.getStats(currentSettings);
      setCurrentStats(stats);
    };

    loadInitialStats();
  }, [gameState.gridSize, gameState.showTime, gameState.answerTime, gameState.numActiveCells]);

  // ゲーム状態が変更されたときに統計情報を更新
  useEffect(() => {
    const updateCurrentStats = async () => {
      const manager = getUnifiedStatsManager();
      const currentSettings: GameSettings = {
        gridSize: gameState.gridSize,
        showTime: gameState.showTime,
        answerTime: gameState.answerTime,
        numActiveCells: gameState.numActiveCells,
      };

      const stats = await manager.getStats(currentSettings);
      setCurrentStats(stats);
    };

    updateCurrentStats();
  }, [gameState.gridSize, gameState.showTime, gameState.answerTime, gameState.numActiveCells]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleShowSplash = () => {
    setShowSplash(true);
    setIsFirstTime(false);
  };

  // ゲーム状態の更新ハンドラー
  const handleGameStateUpdate = (newState: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...newState }));
  };

  const handleGameStart = () => {
    setIsFirstTime(false);
  };

  const handleReset = () => {
    setIsFirstTime(true);
  };

  // 統計情報の更新ハンドラー
  const handleStatsUpdate = async (isCorrect: boolean) => {
    const currentSettings: GameSettings = {
      gridSize: gameState.gridSize,
      showTime: gameState.showTime,
      answerTime: gameState.answerTime,
      numActiveCells: gameState.numActiveCells,
    };

    await saveStats(currentSettings, isCorrect);

    // 統計情報を再取得
    const updatedStats = await getStats(currentSettings);
    setCurrentStats(updatedStats);
  };

  // 統計情報の表示ハンドラー
  const handleShowStats = async () => {
    const manager = getUnifiedStatsManager();
    const currentSettings: GameSettings = {
      gridSize: gameState.gridSize,
      showTime: gameState.showTime,
      answerTime: gameState.answerTime,
      numActiveCells: gameState.numActiveCells,
    };

    const stats = await manager.getStats(currentSettings);
    setCurrentStats(stats);
    setShowStats(true);
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div className={showSplash ? "hidden" : ""}>
        <GridMemoryGame
          onShowSplash={handleShowSplash}
          gameState={gameState}
          onGameStateUpdate={handleGameStateUpdate}
          showStartButton={isFirstTime}
          onGameStart={handleGameStart}
          onReset={handleReset}
          onStatsUpdate={handleStatsUpdate}
          onShowStats={handleShowStats}
        />
        {currentStats && (
          <StatsPopup
            stats={currentStats}
            currentSettings={{
              gridSize: gameState.gridSize,
              showTime: gameState.showTime,
              answerTime: gameState.answerTime,
              numActiveCells: gameState.numActiveCells,
            }}
            isOpen={showStats}
            onClose={() => setShowStats(false)}
          />
        )}

        {/* 環境情報のデバッグ表示（開発時のみ） */}
        {process.env.NODE_ENV === "development" && environmentInfo && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs z-50">
            <div>Env: {environmentInfo.isPWA ? "PWA" : "Web"}</div>
            <div>Storage: {environmentInfo.storageType}</div>
            <div>IndexedDB: {environmentInfo.hasIndexedDB ? "✓" : "✗"}</div>
          </div>
        )}
      </div>
    </main>
  );
}
