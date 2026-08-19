# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About Beat Dance extension
- The extension is developed by Tuan Nguyen.

A 4-direction rhythm dance game, playable right from your toolbar - arrow prompts scroll across the screen and you hit the matching keys in time to the beat, scored on timing accuracy:

- 🎵 **Bring your own music** - the extension ships with **no bundled songs, no background image, and no third-party/streaming integration**. On the setup screen you pick one or more audio files straight from your own computer; nothing is uploaded anywhere, everything stays local to the browser tab.
- 🕹️ **Three dance modes** - 4K (arrows), 8K (arrows + diagonals), and Beat-up (continuous multi-lane beat tracking).
- 🔀 **Reverse mode** - toggle with <kbd>Del</kbd> to mirror key prompts mid-run for extra difficulty.
- ▶️ **Song preview** - preview any picked file before committing to a run.
- 🏆 **Scoring & combo** - Perfect / Great / Cool / Bad / Miss judgements drive the score and combo counter; level ramps up as you land rounds; a results screen shows a letter-grade rank and the full judgement breakdown.
- 💾 **Best score tracking** - the best score per dance type is remembered locally and shown both on the mode cards and the in-game HUD.
- ⏸️ **Pause/resume** - <kbd>Esc</kbd> pauses the run with an overlay to resume or go back to song/mode selection.
- 📱 **Touch controls** - an on-screen numpad mirrors the desktop shortcuts for phones/tablets.

Everything (arrow prompts, judgement badges, the extension icon) is drawn with plain CSS/Unicode glyphs - there are no bundled image or audio assets of any kind. The extension also uses its own name ("Beat Dance") and its own copy throughout, rather than the name/tagline of any commercial rhythm game, to stay clear of trademark/copyright issues on that front too.

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## File overview

| File                    | Purpose                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `manifest.json`          | Extension manifest (Manifest V3)                                                  |
| `src/popup.html`         | Toolbar popup: title, play button                                                 |
| `src/game.html`          | Setup view (pick local song + dance mode) and play view (HUD, lanes), same tab    |
| `css/popup.css`          | Popup theme and layout                                                            |
| `css/game.css`           | Setup + gameplay theme, HUD, and prompt/judgement animations                      |
| `js/constants.js`        | Game tuning constants, key maps, arrow glyph map                                  |
| `js/utils.js`            | Small helpers (show/hide, judgement badge, best-score storage, modal, score summary) |
| `js/game-setup.js`       | Local file picking, song preview, dance mode selection, handoff to gameplay       |
| `js/game-4k-8k.js`       | Shared game state (combo/score/pause) plus the 4K/8K gameplay loop and scoring    |
| `js/game-beat-up.js`     | Beat-up mode gameplay loop and scoring                                            |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `audition-extension` folder

## Notes

This is adapted from the original `games/audition` project in
`game-development`, with everything copyright/trademark-sensitive removed: no
`background.jpeg`, no hosted MP3s, no Jamendo (Creative Commons music)
search, no YouTube ambient-music player, and no reuse of the original game's
name or marketing tagline (renamed to "Beat Dance" throughout). The only way
to get music into a run is picking a local file - the setup and gameplay
screens also live on one page instead of two (`home.html` + `audition.html`),
since there's no longer a need to hand a picked file off across a full page
navigation.
