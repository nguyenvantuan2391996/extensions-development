# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About chess-game-extension
- The extension is developed by Tuan Nguyen.

Play a full game of chess straight from your toolbar — no tab-hogging site required. Click the icon, pick a mode, and go:

- ♟️ **Full rule set** — legal move generation for every piece, castling (kingside/queenside, respecting the "not through check" rule), en passant, pawn promotion (auto-queen), and check detection that filters out any move leaving your own king exposed
- 🏁 **Checkmate & stalemate detection** — the game ends with a clear overlay announcing the winner or a draw
- 🧑‍🤝‍🧑 **Two modes** — 2 players taking turns on the same device, or 🤖 vs. an AI (you play White, the AI plays Black)
- 🧠 **Minimax + Alpha-Beta AI** — searches 3 plies ahead with Negamax and alpha-beta pruning, ordering candidate moves by captured-piece value for better pruning
- 💾 **Auto-saved progress** — close the tab mid-game and pick up right where you left off from the popup's "Chơi tiếp" button (synced via `chrome.storage.local`)
- 📊 **Win/loss/draw stats** — tracked across your games against the AI and shown right in the popup
- 🖱️ **Click-to-move interface** — click a piece to see legal destinations highlighted (captures shown differently from quiet moves), then click a target square to move
- 🎯 **Move & check highlighting** — the last move's squares are tinted, and a king in check is tinted red
- 🔄 **Restart anytime** — a restart button (in the HUD or the end-of-game overlay) resets the board instantly

The game opens in its own tab for a full-size board — the popup is just the menu (mode picker, resume, stats).

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## File overview

| File                    | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `manifest.json`          | Extension manifest (Manifest V3)                                         |
| `src/popup.html`         | Toolbar popup: mode picker, resume-game card, win/loss/draw stats        |
| `src/game.html`          | Gameplay tab: HUD, canvas board, end-of-game overlay                     |
| `css/popup.css`          | Popup theme and layout                                                   |
| `css/game.css`           | Gameplay theme, HUD, and canvas layout                                   |
| `js/chess-engine.js`     | Board setup, move generation/legality, check detection, apply/undo move  |
| `js/chess-ai.js`         | Board evaluation, move ordering, Negamax with alpha-beta pruning         |
| `js/popup.js`            | Mode selection, resume detection, stats display                         |
| `js/game.js`             | Canvas rendering, click-to-move UI, turn flow, AI trigger, autosave      |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `chess-game-extension` folder
