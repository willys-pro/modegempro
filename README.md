# Advanced Deriv Trading Bot - Volatility 100 Specialist

An upgraded, frontend-driven trading application designed specifically to interface with the Deriv WebSocket API. This application targets the **Volatility 100 Index**, allowing users to trade **Higher/Lower** contract types with dynamic **Barrier Offsets** while using a unified technical indicator strategy (MA, RSI, MACD, AO) optimized for 5-tick execution.

## Upgraded Features
- **Live Interactive Charts:** Built-in dynamic Chart.js engine visualization showing the live asset price alongside the 9-period Moving Average (MA).
- **Live Account Balance:** Displays real-time asset balances synced directly with your chosen API token.
- **Contract Monitoring:** Actively tracks open contracts, parsing and alerting when a contract finishes in a **WIN** or **LOSS** outcome.
- **Dynamic Barrier Offsets:** Interactivity matching Deriv's system. Adjusting offsets dynamically recalculates potential profit margins before executing.
- **5-Tick Indicator Engine:** Built-in calculation of Moving Average, RSI, MACD, and Awesome Oscillator.

## Getting Started

### Setup Instructions
1. Extract all files (`manifest.json`, `index.html`, `app.js`) together into a single directory.
2. Open `index.html` directly in any modern web browser or serve it via a local development server (e.g., Live Server in VS Code).
3. Input your **App ID** and **API Token** into the configuration panel.
4. Click **Connect Engine** to begin streaming market data.
