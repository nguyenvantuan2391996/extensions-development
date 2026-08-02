# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About basketball-extension
- The extension is developed by Tuan Nguyen.

A pocket-sized arcade basketball game, playable straight from your toolbar, rendered on an HTML5 canvas:

- 🎯 **Drag to aim and shoot** — press and drag away from the ball to set a direction and power (further pull = more power, up to a cap), then release to shoot
- ⏱️ **40-second rounds** — score as many baskets as you can before the timer runs out
- 🏀 **Physics-driven shots** — gravity, rim-post collisions with bounce, and a backboard that the ball can bank off of
- 🎉 **Bonus swish** — a basket scored with zero rim contact ("swish") earns an extra point on top of the base 2 points, called out with a floating "+N SWISH!" popup
- 🏆 **Best score tracking** — the highest score across all rounds is saved locally and shown on both the popup and the in-game HUD
- 🔁 **Auto-reset** — the ball resets to the shooting spot shortly after every made basket or miss, so you can keep firing until time's up

The game opens in its own tab for a full-size canvas — the popup is just the launcher (best score, play button).

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## File overview

| File                    | Purpose                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `manifest.json`          | Extension manifest (Manifest V3)                                                  |
| `src/popup.html`         | Toolbar popup: best-score display, play button                                   |
| `src/game.html`          | Gameplay tab; hosts the canvas, HUD, and win/game-over overlay                    |
| `css/popup.css`          | Popup theme and layout                                                            |
| `css/game.css`           | In-game layout (canvas container, close link, HUD, overlay)                       |
| `js/constants.js`        | Physics tuning, hoop/backboard geometry, scoring, best-score storage key          |
| `js/popup.js`            | Reads the best score from `localStorage`, launches the game tab                   |
| `js/game.js`             | Canvas rendering, drag-to-shoot input, physics/collision loop, scoring, HUD       |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `basketball-extension` folder

## Notes

This is a straight port of the original game, just packaged as an extension
(popup as launcher, game in its own tab instead of a `home.html` + `basketball.html`
pair). All visuals (court, hoop, ball) are drawn at runtime on a `<canvas>`, so
there are no image assets beyond the extension icon.
