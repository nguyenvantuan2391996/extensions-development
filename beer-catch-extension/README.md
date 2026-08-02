# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About beer-catch-extension
- The extension is developed by Tuan Nguyen.

A pocket-sized arcade catcher game, playable straight from your toolbar, rendered on an HTML5 canvas:

- 🍺 **Move and catch** — slide the glass left/right (arrow keys, A/D, or the on-screen D-pad) to catch beer mugs falling from the top of the screen
- ✨ **Golden beer** — a rarer golden beer is worth 150 points instead of the usual 50, so it's worth the extra reach
- 💥 **Dodge broken glass** — grey shards with a red "X" fall alongside the beer; catching one costs a life, followed by a brief invulnerability window
- ❤️ **3 lives** — the round ends once all lives are lost
- 📈 **Rising difficulty** — every 500 points, spawn rate and fall speed ramp up a notch, up to 6 steps
- 🏆 **Best score tracking** — the highest score is saved locally and shown on both the popup and the in-game HUD

The game opens in its own tab for a full-size canvas — the popup is just the launcher (best score, play button).

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## File overview

| File                    | Purpose                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `manifest.json`          | Extension manifest (Manifest V3)                                                  |
| `src/popup.html`         | Toolbar popup: best-score display, play button                                   |
| `src/game.html`          | Gameplay tab; hosts the canvas, HUD, touch D-pad, and win/game-over overlay       |
| `css/popup.css`          | Popup theme and layout                                                            |
| `css/game.css`           | In-game layout (canvas container, close link, HUD, D-pad, overlay)                |
| `js/constants.js`        | Player/item sizing and speed, spawn timing, difficulty ramp, best-score key       |
| `js/popup.js`            | Reads the best score from `localStorage`, launches the game tab                   |
| `js/game.js`             | Canvas rendering, keyboard/touch input, spawn/collision loop, scoring, HUD        |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `beer-catch-extension` folder

## Notes

This is a straight port of the original game, just packaged as an extension
(popup as launcher, game in its own tab instead of a `home.html` + `beer-catch.html`
pair). All visuals (glass, beer, broken glass) are drawn at runtime on a
`<canvas>`, so there are no image assets beyond the extension icon.
