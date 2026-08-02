# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About 2048-extension
- The extension is developed by Tuan Nguyen.

A pocket-sized recreation of the classic *2048* puzzle, playable straight from your toolbar:

- 🔢 **Merge matching tiles** — slide the whole board with the arrow keys, WASD, or a swipe; matching tiles merge into their sum and the score climbs
- 🎲 **Random tile spawns** — a new `2` (90%) or `4` (10%) tile appears in an empty cell after every move that changes the board
- 🏆 **Best score tracking** — the highest score is saved locally and shown on both the popup and the in-game HUD
- 🏁 **Win / game-over overlays** — reaching the `2048` tile shows a "You win!" banner (with the option to keep playing past it), and a board with no more legal moves shows "Game Over" with the final score
- 📱 **Touch-friendly** — swipe on the board or use the on-screen D-pad on touch devices, in addition to keyboard controls
- ⟳ **One-tap restart** — the HUD's restart button or the overlay's button starts a fresh board at any time

The game opens in its own tab for a full-size board — the popup is just the launcher (best score, play button).

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## File overview

| File                    | Purpose                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `manifest.json`          | Extension manifest (Manifest V3)                                                  |
| `src/popup.html`         | Toolbar popup: best-score display, play button                                   |
| `src/game.html`          | Gameplay tab; hosts the board, HUD, touch D-pad, and win/game-over overlay       |
| `css/popup.css`          | Popup theme and layout                                                            |
| `css/game.css`           | In-game layout (board, tiles, HUD, D-pad, overlay)                                |
| `js/constants.js`        | Grid size, win value, tile colors, best-score storage key                         |
| `js/popup.js`            | Reads the best score from `localStorage`, launches the game tab                   |
| `js/game.js`             | Board state, move/merge logic, rendering, keyboard/touch/D-pad input              |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `2048-extension` folder

## Notes

This is a straight port of the original game, just packaged as an extension
(popup as launcher, game in its own tab instead of a `home.html` + `2048.html`
pair). All visuals (tiles, board) are plain CSS, so there are no image assets
beyond the extension icon.
