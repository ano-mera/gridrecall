# GridRecall

A grid-based memory training game built as a Progressive Web App (PWA). Memorize the pattern, then recall it from memory.

## Demo

[https://gridrecall.vercel.app](https://gridrecall.vercel.app)

## Features

- **Grid Memory Game** - Memorize highlighted cells in a grid, then reproduce the pattern
- **Adjustable Difficulty** - Configure grid size, active cells, show time, and answer time
- **Streak Tracking** - Track consecutive correct answers with customizable targets
- **Statistics** - View accuracy, best streak, and total challenges per setting
- **PWA Support** - Install on mobile and use offline like a native app
- **Responsive Design** - Optimized for both mobile and desktop

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Storage**: IndexedDB (PWA) / localStorage (Web)
- **Deployment**: [Vercel](https://vercel.com/)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    layout.tsx          - Root layout with PWA configuration
    page.tsx            - Main page with game state management
  components/
    GridMemoryGame.tsx  - Core game component
    SplashScreen.tsx    - Splash screen
    StatsPopup.tsx      - Statistics popup
  utils/
    unifiedStatsManager.ts  - Unified stats (IndexedDB + localStorage)
    gameStats.ts            - Game statistics types and logic
    gameSettings.ts         - Settings management
    pwaStats.ts             - PWA-specific IndexedDB storage
```

## License

[MIT](LICENSE)
