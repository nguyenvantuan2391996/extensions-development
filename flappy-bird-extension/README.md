# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About flappy-bird-extension
- The extension is developed by Tuan Nguyen.

A pocket-sized recreation of the classic *Flappy Bird*, playable straight from your toolbar — built with the Phaser 3 game framework, bundled locally so it works fully offline:

- 🐤 **Tap/Space to flap** — click, tap, or press <kbd>Space</kbd> to give the bird an upward boost; the same input starts the run and restarts it after a game over
- 🟩 **Procedural pipe pairs** — pipes spawn on a timer with a randomized gap position and scroll left at a constant speed, forcing continuous reaction
- 🪽 **Physics-driven bird** — gravity and flap velocity via Phaser's Arcade physics; the bird tilts with its vertical velocity and idly floats before the run starts
- 🔢 **Scoring** — the score increments each time the bird passes a pipe pair, shown live in the HUD
- 🏆 **Best score tracking** — the highest score is saved locally (separately per mode) and shown on both the popup and the in-game HUD
- 💥 **Collision-based game over** — hitting the ground or a pipe ends the run, tints the bird, and shows the final score with a restart prompt
- 🤖 **AI Q-learning mode** — pick "AI Q-learning" on the popup to watch a self-learning agent play instead: it picks flap/no-flap from a small state (distance/height/velocity buckets to the next pipe), rewarded for passing pipes and getting closer to the gap center, penalized for dying. Training (Q-table, episode count, epsilon) persists in `localStorage` and survives every in-run restart, so the agent keeps improving across sessions. Episode/epsilon are shown live in the HUD, plus speed controls (Chậm/Vừa/Nhanh/Turbo) to fast-forward training and a "Xoá học & học lại" button to wipe progress and start fresh.

The game opens in its own tab for a full-size canvas — the popup is just the launcher (mode picker, best score, play button).

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## File overview

| File                    | Purpose                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `manifest.json`          | Extension manifest (Manifest V3)                                                  |
| `src/popup.html`         | Toolbar popup: mode picker (Normal / AI), best-score display, play button        |
| `src/game.html`          | Gameplay tab; hosts the Phaser canvas, AI HUD chips, and AI speed/reset controls  |
| `css/popup.css`          | Popup theme and layout                                                            |
| `css/game.css`           | In-game layout (canvas container, close link, AI HUD/controls)                    |
| `js/vendor/phaser.min.js`| Phaser 3 game framework, bundled locally (extension pages can't load remote code)  |
| `js/q-learning-agent.js` | Tabular Q-learning agent: state bucketing, epsilon-greedy action choice, learning  |
| `js/popup.js`            | Mode selection, reads the per-mode best score from `localStorage`                 |
| `js/game.js`             | Phaser scene: textures, physics, pipe spawning, scoring, AI training loop, restart |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `flappy-bird-extension` folder

## Notes

This is a straight port of the original game, including the Q-learning AI
mode, just packaged as an extension (popup as launcher, game in its own tab
instead of a `home.html` + `flappy-bird.html` pair). All visuals (bird,
pipes, ground) are generated at runtime as Phaser textures, so there are no
image assets beyond the extension icon.
