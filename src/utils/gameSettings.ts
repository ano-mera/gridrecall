export interface GameSettings {
  gridSize: number;
  showTime: number;
  answerTime: number;
  numActiveCells: number;
  targetConsecutive: number;
}

export interface GameSettingsData {
  settings: GameSettings;
  lastUpdated: string;
  version: string;
}

// デフォルト設定
export const DEFAULT_SETTINGS: GameSettings = {
  gridSize: 4,
  showTime: 500,
  answerTime: 0,
  numActiveCells: 5,
  targetConsecutive: 20,
};

// 設定の検証
export const validateSettings = (settings: Partial<GameSettings>): GameSettings => {
  return {
    gridSize: Math.max(2, Math.min(8, settings.gridSize || DEFAULT_SETTINGS.gridSize)),
    showTime: Math.max(100, Math.min(10000, settings.showTime || DEFAULT_SETTINGS.showTime)),
    answerTime: Math.max(0, Math.min(30000, settings.answerTime || DEFAULT_SETTINGS.answerTime)),
    numActiveCells: Math.max(1, Math.min(64, settings.numActiveCells || DEFAULT_SETTINGS.numActiveCells)),
    targetConsecutive: Math.max(1, Math.min(100, settings.targetConsecutive || DEFAULT_SETTINGS.targetConsecutive)),
  };
};

// ローカルストレージから設定を読み込み
export const loadSettingsFromStorage = (): GameSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem("gameSettings");
    if (stored) {
      const data: GameSettingsData = JSON.parse(stored);
      return validateSettings(data.settings);
    }
  } catch (error) {
    console.error("Failed to load game settings:", error);
  }

  return DEFAULT_SETTINGS;
};

// ローカルストレージに設定を保存
export const saveSettingsToStorage = (settings: GameSettings): void => {
  if (typeof window === "undefined") return;

  try {
    const data: GameSettingsData = {
      settings,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
    };
    localStorage.setItem("gameSettings", JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save game settings:", error);
  }
};

// PWA用の設定管理クラス
export class PWASettingsManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = "GameSettingsDB";
  private readonly storeName = "settings";
  private readonly version = 1;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("Failed to open settings IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("lastUpdated", "lastUpdated", { unique: false });
        }
      };
    });
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    if (!this.db) {
      throw new Error("Settings database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const data: GameSettingsData & { id: string } = {
        id: "current",
        settings,
        lastUpdated: new Date().toISOString(),
        version: "1.0.0",
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to save settings:", request.error);
        reject(request.error);
      };
    });
  }

  async loadSettings(): Promise<GameSettings> {
    if (!this.db) {
      throw new Error("Settings database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get("current");

      request.onsuccess = () => {
        if (request.result) {
          resolve(validateSettings(request.result.settings));
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };

      request.onerror = () => {
        console.error("Failed to load settings:", request.error);
        reject(request.error);
      };
    });
  }

  async exportSettings(): Promise<string> {
    if (!this.db) {
      throw new Error("Settings database not initialized");
    }

    const settings = await this.loadSettings();
    return JSON.stringify(settings, null, 2);
  }

  async importSettings(jsonData: string): Promise<void> {
    if (!this.db) {
      throw new Error("Settings database not initialized");
    }

    const settings: GameSettings = JSON.parse(jsonData);
    await this.saveSettings(validateSettings(settings));
  }
}

// 統合設定管理クラス
export class UnifiedSettingsManager {
  private pwaManager: PWASettingsManager | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // PWA環境かチェック
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasIndexedDB = "indexedDB" in window;

    if (isPWA && hasServiceWorker && hasIndexedDB) {
      this.pwaManager = new PWASettingsManager();
      await this.pwaManager.init();
    }

    this.initialized = true;
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    await this.init();

    if (this.pwaManager) {
      // PWA: IndexedDB
      await this.pwaManager.saveSettings(settings);
    } else {
      // Web: ローカルストレージ
      saveSettingsToStorage(settings);
    }
  }

  async loadSettings(): Promise<GameSettings> {
    await this.init();

    if (this.pwaManager) {
      // PWA: IndexedDB
      return await this.pwaManager.loadSettings();
    } else {
      // Web: ローカルストレージ
      return loadSettingsFromStorage();
    }
  }

  async exportSettings(): Promise<string> {
    await this.init();

    if (this.pwaManager) {
      // PWA: IndexedDB
      return await this.pwaManager.exportSettings();
    } else {
      // Web: ローカルストレージ
      const settings = loadSettingsFromStorage();
      return JSON.stringify(settings, null, 2);
    }
  }

  async importSettings(jsonData: string): Promise<void> {
    await this.init();

    if (this.pwaManager) {
      // PWA: IndexedDB
      await this.pwaManager.importSettings(jsonData);
    } else {
      // Web: ローカルストレージ
      const settings: GameSettings = JSON.parse(jsonData);
      saveSettingsToStorage(validateSettings(settings));
    }
  }

  // 環境情報を取得
  getEnvironmentInfo() {
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasIndexedDB = "indexedDB" in window;

    return {
      isPWA: isPWA && hasServiceWorker && hasIndexedDB,
      isWeb: !(isPWA && hasServiceWorker && hasIndexedDB),
      hasIndexedDB,
      hasLocalStorage: "localStorage" in window,
      storageType: isPWA && hasServiceWorker && hasIndexedDB ? "indexeddb" : "localStorage",
      initialized: this.initialized,
    };
  }
}

// シングルトンインスタンス
let unifiedSettingsManager: UnifiedSettingsManager | null = null;

export const getUnifiedSettingsManager = (): UnifiedSettingsManager => {
  if (!unifiedSettingsManager) {
    unifiedSettingsManager = new UnifiedSettingsManager();
  }
  return unifiedSettingsManager;
};

// 便利な関数
export const saveSettings = async (settings: GameSettings): Promise<void> => {
  const manager = getUnifiedSettingsManager();
  await manager.saveSettings(settings);
};

export const loadSettings = async (): Promise<GameSettings> => {
  const manager = getUnifiedSettingsManager();
  return await manager.loadSettings();
};

export const exportSettings = async (): Promise<string> => {
  const manager = getUnifiedSettingsManager();
  return await manager.exportSettings();
};

export const importSettings = async (jsonData: string): Promise<void> => {
  const manager = getUnifiedSettingsManager();
  await manager.importSettings(jsonData);
};
