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

// IndexedDBのデータ構造
interface IndexedDBStatsItem {
  settingsKey: string;
  stats: GameStats;
  timestamp: number;
  updatedAt: string;
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
  const calculateAccuracy = (answers: boolean[]): number => {
    if (answers.length === 0) return 0;
    const correctCount = answers.filter((answer) => answer).length;
    return Math.round((correctCount / answers.length) * 100);
  };

  const currentAccuracy = calculateAccuracy(newRecentAnswers);
  const newBestAccuracy = Math.max(stats.bestAccuracy, currentAccuracy);

  return {
    totalChallenges: stats.totalChallenges + 1,
    recentAnswers: newRecentAnswers,
    maxConsecutiveCorrect: newMaxConsecutiveCorrect,
    currentConsecutiveCorrect: newCurrentConsecutiveCorrect,
    bestAccuracy: newBestAccuracy,
  };
};

export class PWAStatsDatabase {
  private db: IDBDatabase | null = null;
  private readonly dbName = "GameStatsDB";
  private readonly storeName = "stats";
  private readonly version = 1;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // オブジェクトストアが存在しない場合は作成
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "settingsKey" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async saveStats(settingsKey: string, stats: GameStats): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const data = {
        settingsKey,
        stats,
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to save stats:", request.error);
        reject(request.error);
      };
    });
  }

  async getStats(settingsKey: string): Promise<GameStats | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(settingsKey);

      request.onsuccess = () => {
        const result = request.result?.stats || null;

        // 古いデータ形式を新しい形式に移行
        if (result && !result.hasOwnProperty("bestAccuracy")) {
          result.bestAccuracy = 0;
        }

        resolve(result);
      };

      request.onerror = () => {
        console.error("Failed to get stats:", request.error);
        reject(request.error);
      };
    });
  }

  async getAllStats(): Promise<GameStatsMap> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const statsMap: GameStatsMap = {};
        request.result.forEach((item: IndexedDBStatsItem) => {
          // 古いデータ形式を新しい形式に移行
          if (!item.stats.hasOwnProperty("bestAccuracy")) {
            item.stats.bestAccuracy = 0;
          }
          statsMap[item.settingsKey] = item.stats;
        });
        resolve(statsMap);
      };

      request.onerror = () => {
        console.error("Failed to get all stats:", request.error);
        reject(request.error);
      };
    });
  }

  async deleteStats(settingsKey: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(settingsKey);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to delete stats:", request.error);
        reject(request.error);
      };
    });
  }

  async clearAllStats(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to clear all stats:", request.error);
        reject(request.error);
      };
    });
  }

  async getDatabaseSize(): Promise<number> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("Failed to get database size:", request.error);
        reject(request.error);
      };
    });
  }
}

// PWA環境の検出
export const isPWA = (): boolean => {
  if (typeof window === "undefined") return false;

  // PWAとしてインストールされているかチェック
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const isMinimalUI = window.matchMedia("(display-mode: minimal-ui)").matches;

  // ナビゲーターの機能でPWAを検出
  const hasServiceWorker = "serviceWorker" in navigator;
  const hasIndexedDB = "indexedDB" in window;

  return (isStandalone || isFullscreen || isMinimalUI) && hasServiceWorker && hasIndexedDB;
};

// PWA用の統計管理
export class PWAStatsManager {
  private db: PWAStatsDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (isPWA()) {
      this.db = new PWAStatsDatabase();
      await this.db.init();
    }

    this.initialized = true;
  }

  async saveStats(settings: GameSettings, isCorrect: boolean): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error("PWA environment not detected");
    }

    const settingsKey = generateSettingsKey(settings);
    const currentStats = (await this.db.getStats(settingsKey)) || initializeStats();
    const updatedStats = updateStats(currentStats, isCorrect);

    await this.db.saveStats(settingsKey, updatedStats);
  }

  async getStats(settings: GameSettings): Promise<GameStats> {
    await this.init();

    if (!this.db) {
      throw new Error("PWA environment not detected");
    }

    const settingsKey = generateSettingsKey(settings);
    const stats = await this.db.getStats(settingsKey);
    return stats || initializeStats();
  }

  async getAllStats(): Promise<GameStatsMap> {
    await this.init();

    if (!this.db) {
      throw new Error("PWA environment not detected");
    }

    return await this.db.getAllStats();
  }

  async exportStats(): Promise<string> {
    await this.init();

    if (!this.db) {
      throw new Error("PWA environment not detected");
    }

    const statsMap = await this.db.getAllStats();
    return JSON.stringify(statsMap, null, 2);
  }

  async importStats(jsonData: string): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error("PWA environment not detected");
    }

    const statsMap: GameStatsMap = JSON.parse(jsonData);

    for (const [settingsKey, stats] of Object.entries(statsMap)) {
      await this.db.saveStats(settingsKey, stats);
    }
  }
}
