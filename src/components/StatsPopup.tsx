import React from "react";
import { GameStats, calculateAccuracy, GameSettings } from "../utils/gameStats";

interface StatsPopupProps {
  stats: GameStats;
  currentSettings: GameSettings;
  isOpen: boolean;
  onClose: () => void;
}

export default function StatsPopup({ stats, currentSettings, isOpen, onClose }: StatsPopupProps) {
  if (!isOpen) return null;

  const accuracy = calculateAccuracy(stats);

  // デバッグ用：統計データの状態を確認
  console.log("StatsPopup - stats:", stats);
  console.log("StatsPopup - bestAccuracy:", stats.bestAccuracy);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー部分 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold">📊 Stats</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl p-1" aria-label="Close">
            ✕
          </button>
        </div>

        {/* スクロール可能なコンテンツ部分 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 現在の設定 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">⚙️ Current Settings</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Grid Size: {currentSettings.gridSize}×{currentSettings.gridSize}
              </div>
              <div>Show Time: {currentSettings.showTime}ms</div>
              <div>Answer Time: {currentSettings.answerTime === 0 ? "Unlimited" : `${currentSettings.answerTime}ms`}</div>
              <div>Active Cells: {currentSettings.numActiveCells}</div>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-1 text-sm">📈 Last 100 Accuracy</h3>
              <div className="text-xl font-bold text-blue-600">{accuracy}%</div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-1 text-sm">🏆 Best 100-Question Accuracy</h3>
              <div className="text-xl font-bold text-yellow-600">
                {stats.recentAnswers.length >= 100 ? (
                  `${stats.bestAccuracy !== undefined && stats.bestAccuracy !== null ? stats.bestAccuracy : 0}%`
                ) : (
                  <span className="text-sm text-yellow-600">(Available after 100 answers)</span>
                )}
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-1 text-sm">🏆 Best Streak</h3>
              <div className="text-xl font-bold text-green-600">{stats.maxConsecutiveCorrect}</div>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-1 text-sm">🎯 Current Streak</h3>
              <div className="text-xl font-bold text-purple-600">{stats.currentConsecutiveCorrect}</div>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-1 text-sm">🎮 Total Challenges</h3>
              <div className="text-xl font-bold text-orange-600">{stats.totalChallenges}</div>
            </div>
          </div>
        </div>

        {/* フッター部分 */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
