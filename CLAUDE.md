# GridRecall

グリッドパターンの記憶力トレーニングゲーム（PWA対応）

## 技術スタック

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- ESLint 9 (next/core-web-vitals, next/typescript)

## プロジェクト構造

```
src/
  app/
    layout.tsx    - ルートレイアウト（PWA設定、viewport、メタデータ）
    page.tsx      - メインページ（ゲーム状態管理）
    globals.css   - グローバルスタイル
  components/
    GridMemoryGame.tsx  - ゲーム本体のコンポーネント
    SplashScreen.tsx    - スプラッシュ画面
    StatsPopup.tsx      - 統計情報ポップアップ
  utils/
    unifiedStatsManager.ts  - 統合統計管理（IndexedDB/localStorage）
    gameStats.ts            - ゲーム統計の型定義
    gameSettings.ts         - ゲーム設定の管理
    pwaStats.ts             - PWA統計管理
public/
  manifest.json  - PWAマニフェスト
  sw.js          - Service Worker
```

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run lint     # ESLint実行
```

## コーディング規約

- コンポーネントは `src/components/` に配置
- ユーティリティは `src/utils/` に配置
- 言語は日本語（`lang="ja"`）
- コミット前に `npm run lint` を実行し、エラーがないことを確認する
