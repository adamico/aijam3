import { engineInit, drawText, drawTile, tile, vec2 } from 'littlejsengine';

const TITLE = "Spell Keeper";
const SUBTITLE = "made with LittleJS";
const LITTLEJS_LOGO_POS = vec2(0, -13);
const LITTLEJS_LOGO_SIZE = vec2(8);
let LITTLEJS_LOGO_TILE_INDEX;
const TITLE_POS = vec2(0, 6);
const SUBTITLE_POS = vec2(0, -9);

function gameInit() {
    // called once after the engine starts up
    // setup the game
    LITTLEJS_LOGO_TILE_INDEX = tile(3, 128);
}

function gameUpdate() {
    // called every frame at 60 frames per second
    // handle input and update the game state
}

function gameUpdatePost() {
    // called after physics and objects are updated
    // setup camera and prepare for render
}

function gameRender() {
    // called before objects are rendered
    // draw any background effects that appear behind objects
}

function gameRenderPost() {
    // called after objects are rendered
    // draw effects or hud that appear above all objects
    drawText(TITLE, TITLE_POS, 2);
    drawText(SUBTITLE, SUBTITLE_POS, 1);
    drawTile(LITTLEJS_LOGO_POS, LITTLEJS_LOGO_SIZE, LITTLEJS_LOGO_TILE_INDEX);
}

// tiles.png lives in public/, served from the site root in dev and build
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);

// LittleJS owns global engine state (canvas, WebGL, input, RAF loop), so
// partial HMR would leave ghost listeners and a duplicate render loop.
// Force a full page reload on every save instead.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());
