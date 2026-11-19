# System Restore

A browser game for the Harvest game jam (Hack Club x AMD). Theme: **Bounce Back!**

You are the recovery process inside a crashed computer. A virus hit the kernel and the desktop
split into corrupted sectors, each one a tiny game. Repair a sector and the screen heals: integrity
rises by 25%, more colour comes back and the music gets fuller. At 100% the desktop collapses into
the kernel, a maze-chase boss fight.

Beat it and a second story begins: the virus was only a copy, and the real one hides in the cloud.
The colours drain again and four new games open up, ending in a second boss and an epilogue.

The theme is literal twice: computers bounce back by rebooting, and so do you.

## Play

- Host the `dist/` build on itch.io (see below), or run it locally.
- No walls of text. Pictograms and key icons show what to do.
- **Levels for every age group.** Pick EASY (kids and new players, extra hearts, slower, more time),
  NORMAL or HARD (fewer hearts, faster, more to do) after the intro. Press Tab in the hub or on the
  K.O. screen to change it any time.
- **K.O. screen.** When your hearts run out you see a big K.O. Press Enter to retry with a small
  twist, or Esc to go back to the desktop.

## Controls

| Action | Keys |
| --- | --- |
| Move / select | Arrow keys or WASD |
| Jump / rapid fire / rotate / whack / confirm | Space or Enter |
| Close a sector | Esc |
| Change level | Tab (hub and K.O. screen) |
| Mute | M |

Mouse clicks work in the menus, the photo puzzle, bug whacking and flying. On touch screens,
on-screen buttons appear.

## Chapter 1: System Restore

| Folder | Genre | Goal |
| --- | --- | --- |
| memory | Platformer | Reach the flag. Pits bounce you back at the cost of a heart. |
| firewall | Shooter | Survive the swarm. Shots ricochet off the walls, and your weapon upgrades itself every 10 seconds. |
| databus | Pseudo-3D racer | Dodge the cones and finish before time runs out. |
| photos | Rotate puzzle | Turn tiles until the photo matches the preview. |
| kernel | Boss | A maze chase: eat every data bit, dodge the viruses, grab power cores to eat them back. |

## Chapter 2: Network Restore

| Folder | Genre | Goal |
| --- | --- | --- |
| cache | Breakout | Bounce the ball off your paddle and clear every brick. |
| network | Snake | Collect the data packets. Avoid viruses and your own tail. |
| bugfix | Whack-a-bug | Whack the bugs, spare the yellow files. |
| wifi | Flappy-style flyer | Fly through the gaps. Floor and ceiling are trampolines. |
| cloud | Boss | A bigger storm maze with an extra virus. |

Each retry after a K.O. changes something small, such as a new platformer layout, faster enemies
or more cones.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # outputs to dist/
npm run preview    # test the production build
```

## Publish to itch.io

1. `npm run build`
2. Zip the **contents** of `dist/` so that `index.html` is at the zip root.
3. Upload the zip as an HTML5 project and tick "This file will be played in the browser".

`vite.config.js` sets `base: './'`, so asset paths are relative and work from any sub-path.

## How it works

- The game draws into a 320x180 canvas. three.js turns that canvas into a texture and runs a
  post-processing shader, then CSS scales it up with `image-rendering: pixelated`.
- **Heal-the-palette:** one `integrity` uniform drives the shader. At 0 the picture is muted with
  few colour levels. Each repaired sector unlocks more colour and saturation. Glitch effects play
  at boot, in the story, on bounce-backs and repairs, and stay faint the rest of the time.
- All sound is synthesized with the Web Audio API. Music layers (bass, drums, arpeggio, lead,
  pads) are added as sectors are restored. Audio starts only after the first key press or click.
- Every sector implements the same interface (`init`, `update`, `render`, `dispose`), see
  `src/sectors/`. Tunables live in `src/config.js`.
- Only best times are stored, in `localStorage`, wrapped in try/catch.

```
src/
  main.js game.js state.js config.js
  render/   renderer.js postfx.js shaders/
  ui/       boot.js story.js storyArt.js difficulty.js overlays.js desktop.js window.js icons.js
  sectors/  platformer shooter racer puzzle breakout snake whack flappy pacman (.js)
  audio/    context.js sfx.js music.js
  utils/    input.js draw.js math.js particles.js
```

## Credits and licence

- Code: MIT, see `LICENSE`.
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), SIL Open Font
  License 1.1, self-hosted in `src/assets/fonts/` with its licence text.
- All art and sound are drawn or synthesized in code. No third-party assets.
