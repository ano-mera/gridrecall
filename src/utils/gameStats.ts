export interface GameStats {
  totalChallenges: number;
  recentAnswers: boolean[]; // 直近100問の正誤記録
  maxConsecutiveCorrect: number;
  currentConsecutiveCorrect: number;
  bestAccuracy: number; // 100問の正答率の最高記録
}

export interface GameSettings {
  gridSize: number;
  showTime: number;
  answerTime: number;
  numActiveCells: number;
}

export interface GameStatsMap {
  [key: string]: GameStats;
}

export const MAX_RECENT_ANSWERS = 100;

export const initializeStats = (): GameStats => ({
  totalChallenges: 0,
  recentAnswers: [],
  maxConsecutiveCorrect: 0,
  currentConsecutiveCorrect: 0,
  bestAccuracy: 0,
});

// 設定の組み合わせからキーを生成
export const generateSettingsKey = (settings: GameSettings): string => {
  return `${settings.gridSize}-${settings.showTime}-${settings.answerTime}-${settings.numActiveCells}`;
};

export const updateStats = (stats: GameStats, isCorrect: boolean): GameStats => {
  const newRecentAnswers = [...stats.recentAnswers, isCorrect];

  // 直近100問のみ保持
  if (newRecentAnswers.length > MAX_RECENT_ANSWERS) {
    newRecentAnswers.shift();
  }

  const newCurrentConsecutiveCorrect = isCorrect ? stats.currentConsecutiveCorrect + 1 : 0;

  const newMaxConsecutiveCorrect = Math.max(stats.maxConsecutiveCorrect, newCurrentConsecutiveCorrect);

  // 100問の正答率を計算（空の配列の場合は0%）
  const currentAccuracy = calculateAccuracy({ ...stats, recentAnswers: newRecentAnswers });
  const newBestAccuracy = Math.max(stats.bestAccuracy, currentAccuracy);

  return {
    totalChallenges: stats.totalChallenges + 1,
    recentAnswers: newRecentAnswers,
    maxConsecutiveCorrect: newMaxConsecutiveCorrect,
    currentConsecutiveCorrect: newCurrentConsecutiveCorrect,
    bestAccuracy: newBestAccuracy,
  };
};

export const calculateAccuracy = (stats: GameStats): number => {
  if (stats.recentAnswers.length === 0) return 0;

  const correctCount = stats.recentAnswers.filter((answer) => answer).length;
  return Math.round((correctCount / stats.recentAnswers.length) * 100);
};

export const getStatsFromStorage = (): GameStatsMap => {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem("gameStatsMap");
    if (stored) {
      const statsMap = JSON.parse(stored);

      // 古いデータ形式を新しい形式に移行
      Object.keys(statsMap).forEach((key) => {
        if (!statsMap[key].hasOwnProperty("bestAccuracy")) {
          statsMap[key].bestAccuracy = 0;
        }
      });

      return statsMap;
    }
  } catch (error) {
    console.error("Failed to load game stats:", error);
  }

  return {};
};

export const saveStatsToStorage = (statsMap: GameStatsMap): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("gameStatsMap", JSON.stringify(statsMap));
  } catch (error) {
    console.error("Failed to save game stats:", error);
  }
};

// 特定の設定での統計情報を取得（存在しない場合は初期化）
export const getStatsForSettings = (statsMap: GameStatsMap, settings: GameSettings): GameStats => {
  const key = generateSettingsKey(settings);
  return statsMap[key] || initializeStats();
};

// 特定の設定での統計情報を更新
export const updateStatsForSettings = (statsMap: GameStatsMap, settings: GameSettings, isCorrect: boolean): GameStatsMap => {
  const key = generateSettingsKey(settings);
  const currentStats = statsMap[key] || initializeStats();
  const updatedStats = updateStats(currentStats, isCorrect);

  return {
    ...statsMap,
    [key]: updatedStats,
  };
};
