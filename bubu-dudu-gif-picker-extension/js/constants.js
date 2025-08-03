GIF_SIZE = "gif_size"
GIF_POSITION = "gif_position"
GIF_DURATION = "gif_duration"
LIST_GIFS = "list_gifs"

GIF_SELECTED = "gif_selected"

LIST_GIFS_DEFAULT = [
    "https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif",
    "https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif",
    "https://media.giphy.com/media/xT9IgIc0lryrxvqVGM/giphy.gif",
    "https://media.giphy.com/media/3oz8xKaR836UJOYeOc/giphy.gif",
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    "https://media.giphy.com/media/xT9IgDEI1iZyb2wqo8/giphy.gif",
    "https://iili.io/FSWmTTg.gif"
]

const BACKGROUND_SCREEN = "background"
const POPUP_SCREEN = "popup"

const HANDLE_MAIN_WEBSITE_LOADED = "main-website-loaded"
const HANDLE_SET_GIF_SIZE = "handle-set-gif-size";
const HANDLE_SET_GIF_POSITION = "handle-set-gif-position"
const HANDLE_SET_GIF_DURATION = "handle-set-gif-duration"

const CSS_MOVE = `body {
              margin: 0;
            }

            .character {
              position: absolute;
              bottom: 0;
              width: 180px;
              height: auto;
              animation-duration: 30s;
              animation-iteration-count: infinite;
              animation-timing-function: linear;
              pointer-events: none;
            }

            @keyframes moveLeftToRight {
              0% { left: -200px; transform: scaleX(1); }
              50% { left: 45vw; transform: scaleX(1); }
              100% { left: 110vw; transform: scaleX(1); }
            }

            @keyframes moveRightToLeft {
              0% { right: -200px; transform: scaleX(1); }
              50% { right: 45vw; transform: scaleX(1); }
              100% { right: 110vw; transform: scaleX(1); }
            }`