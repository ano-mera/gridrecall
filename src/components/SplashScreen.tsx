"use client";

import { useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);

  const handleEnter = () => {
    setIsFading(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-black z-50 transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="text-center text-white text-4xl font-bold">
        <span className="font-bold">Grid</span>
        <span className="font-normal">Recall</span>
        <div className="text-sm font-normal mt-2">Grid-based memory training</div>
      </div>
      <button
        onClick={handleEnter}
        className="mt-8 bg-white text-black px-8 py-3 text-lg rounded hover:bg-gray-200 transition-colors"
      >
        Enter
      </button>
    </div>
  );
}
