import { GameStats, GameStatsMap, GameSettings, getStatsFromStorage, saveStatsToStorage, updateStatsForSettings, getStatsForSettings } from "./gameStats";

import { isPWA, PWAStatsManager } from "./pwaStats";

// 環境検出
export const detectEnvironment = () => {
  const pwa = isPWA();
  const hasIndexedDB = "indexedDB" in window;
  const hasLocalStorage = "localStorage" in window;

  return {
    isPWA: pwa,
    isWeb: !pwa,
    hasIndexedDB,
    hasLocalStorage,
    storageType: pwa ? "indexeddb" : "localStorage",
  };
};

// 統合統計管理システム
export class UnifiedStatsManager {
  private env = detectEnvironment();
  private pwaManager: PWAStatsManager | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.env.isPWA) {
      this.pwaManager = new PWAStatsManager();
      await this.pwaManager.init();
    }

    this.initialized = true;
  }

  // 統計情報を保存
  async saveStats(settings: GameSettings, isCorrect: boolean): Promise<void> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      await this.pwaManager.saveStats(settings, isCorrect);
    } else {
      // Web: ローカルストレージ
      const statsMap = getStatsFromStorage();
      const updatedStatsMap = updateStatsForSettings(statsMap, settings, isCorrect);
      saveStatsToStorage(updatedStatsMap);
    }
  }

  // 統計情報を取得
  async getStats(settings: GameSettings): Promise<GameStats> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      const pwaStats = await this.pwaManager.getStats(settings);

      // PWAの統計データを正規化（bestAccuracyプロパティの確認）
      if (pwaStats && !pwaStats.hasOwnProperty("bestAccuracy")) {
        pwaStats.bestAccuracy = 0;
      }

      return pwaStats;
    } else {
      // Web: ローカルストレージ
      return getStatsForSettings(getStatsFromStorage(), settings);
    }
  }

  // 全統計情報を取得
  async getAllStats(): Promise<GameStatsMap> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      return await this.pwaManager.getAllStats();
    } else {
      // Web: ローカルストレージ
      return getStatsFromStorage();
    }
  }

  // 統計情報をエクスポート
  async exportStats(): Promise<string> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      return await this.pwaManager.exportStats();
    } else {
      // Web: ローカルストレージ
      const statsMap = getStatsFromStorage();
      return JSON.stringify(statsMap, null, 2);
    }
  }

  // 統計情報をインポート
  async importStats(jsonData: string): Promise<void> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      await this.pwaManager.importStats(jsonData);
    } else {
      // Web: ローカルストレージ
      const statsMap: GameStatsMap = JSON.parse(jsonData);
      saveStatsToStorage(statsMap);
    }
  }

  // 環境間でデータを同期
  async syncDataBetweenEnvironments(): Promise<void> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWAからWebへの同期
      const pwaStats = await this.pwaManager.getAllStats();
      saveStatsToStorage(pwaStats);
    } else if (this.env.hasIndexedDB) {
      // WebからPWAへの同期（PWAが利用可能な場合）
      const webStats = getStatsFromStorage();
      if (Object.keys(webStats).length > 0) {
        try {
          const pwaManager = new PWAStatsManager();
          await pwaManager.init();
          await pwaManager.importStats(JSON.stringify(webStats));
        } catch (error) {
          console.log("PWA sync not available:", error);
        }
      }
    }
  }

  // 統計情報をクリア
  async clearAllStats(): Promise<void> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      const pwaManager = new PWAStatsManager();
      await pwaManager.init();
      // クリア機能を追加する必要があります
    } else {
      // Web: ローカルストレージ
      localStorage.removeItem("gameStatsMap");
    }
  }

  // 環境情報を取得
  getEnvironmentInfo() {
    return {
      ...this.env,
      initialized: this.initialized,
    };
  }

  // データベースサイズを取得
  async getDatabaseSize(): Promise<number> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      const statsMap = await this.pwaManager.getAllStats();
      return Object.keys(statsMap).length;
    } else {
      // Web: ローカルストレージ
      const statsMap = getStatsFromStorage();
      return Object.keys(statsMap).length;
    }
  }

  // 設定キーごとの統計情報を取得
  async getStatsByKey(settingsKey: string): Promise<GameStats | null> {
    await this.init();

    if (this.env.isPWA && this.pwaManager) {
      // PWA: IndexedDB
      const statsMap = await this.pwaManager.getAllStats();
      return statsMap[settingsKey] || null;
    } else {
      // Web: ローカルストレージ
      const statsMap = getStatsFromStorage();
      return statsMap[settingsKey] || null;
    }
  }

  // 統計情報のバックアップを作成
  async createBackup(): Promise<{ data: string; timestamp: string; environment: string }> {
    await this.init();

    const data = await this.exportStats();
    const timestamp = new Date().toISOString();
    const environment = this.env.isPWA ? "pwa" : "web";

    return {
      data,
      timestamp,
      environment,
    };
  }

  // バックアップから復元
  async restoreFromBackup(backup: { data: string; timestamp: string; environment: string }): Promise<void> {
    await this.init();

    await this.importStats(backup.data);

    // 復元完了のログ
    console.log(`Stats restored from ${backup.environment} backup (${backup.timestamp})`);
  }
}

// シングルトンインスタンス
let unifiedStatsManager: UnifiedStatsManager | null = null;

export const getUnifiedStatsManager = (): UnifiedStatsManager => {
  if (!unifiedStatsManager) {
    unifiedStatsManager = new UnifiedStatsManager();
  }
  return unifiedStatsManager;
};

// 便利な関数
export const saveStats = async (settings: GameSettings, isCorrect: boolean): Promise<void> => {
  const manager = getUnifiedStatsManager();
  await manager.saveStats(settings, isCorrect);
};

export const getStats = async (settings: GameSettings): Promise<GameStats> => {
  const manager = getUnifiedStatsManager();
  return await manager.getStats(settings);
};

export const getAllStats = async (): Promise<GameStatsMap> => {
  const manager = getUnifiedStatsManager();
  return await manager.getAllStats();
};

export const exportStats = async (): Promise<string> => {
  const manager = getUnifiedStatsManager();
  return await manager.exportStats();
};

export const importStats = async (jsonData: string): Promise<void> => {
  const manager = getUnifiedStatsManager();
  await manager.importStats(jsonData);
};
