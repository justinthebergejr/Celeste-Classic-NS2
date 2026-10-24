# Celeste Classic for NS2

An unofficial **Celeste Classic** GPU adaptation for **HBLauncher on Nintendo
Switch 2**, running through SmileBASIC. Suggested GitHub repository name:
**`Celeste-Classic-NS2`**. Launcher package ID: `celeste-classic-ns2`.

This is not an NRO, a standalone installed Switch title, a BASIC listing or a
PICO-8 emulator. Gameplay and rendering have been translated to GPU shaders.
Your PC hosts the app files and keeps HBLauncher's bridge connected; the console
runs the game. It is the first Celeste Classic, **not Celeste Classic 2**.

> **Known issue: the game cannot return to HBLauncher. Quit SmileBASIC to leave
> the game.** A pull request fixing reliable launcher return would be welcome.

**Version 0.3.3: playable shader adaptation, not a finished or accuracy-certified port.**
Based on the original `celeste.lua`, with the Celeste 1.0 cartridge's
sprites, maps and flags. It does not run Lua, emulate PICO-8 or use Celeste 2's
code. See `THIRD_PARTY_NOTICES.md` before redistributing upstream/derived assets.

## Try it

Copy the complete project folder into an existing HBLauncher installation so
the manifest is at:

```text
HBLauncher/
  apps/
    Celeste-Classic-NS2/
      app.json
      assets/
      shaders/
      ...
```

If it is already there, no copy is needed. Return to the launcher, choose
**Refresh**, open **Celeste Classic for NS2**, and press **A/B/X** on the title screen.
Compiled SPIR-V and packed assets are included in this local working package;
no build is needed to play it locally. A public source-only distribution would
need to obtain the required assets and build first (see publishing notes below).

Requires HBLauncher's supported SmileBASIC/console configuration and its usual
PC/Pico bridge setup; follow the HBLauncher setup guide first. Keep the host PC
running. Do not nest another project folder between this folder and `app.json`.

| Control | Action |
| --- | --- |
| D-pad / left stick | Move and aim dash in eight directions |
| A / B | Jump / wall jump |
| X / Y | Dash |
| Plus | Open pause menu; back/close while in a menu |
| Minus | Show instructions for quitting SmileBASIC; does not quit automatically |
| L | Retry current room (counts a death) |
| D-pad Up/Down / stick while in menu | Select an option |
| A while in menu | Confirm selection |
| B while in menu | Back / resume |

The pause menu contains **Resume, Retry Room, Controls, Settings, Credits,
Restart Run**, and **Quit SmileBASIC to leave the game** (wrapped onto two lines).
Restart requires confirmation with **Cancel selected by default**. The leave
entry shows manual instructions; it does not attempt the broken launcher return
or close SmileBASIC automatically. Options which do not apply on the title/results
screen are disabled.

By default, gameplay shows only the centered 128x128 game image with a brief altitude label
on room entry. Controls, author credits, version, deaths, strawberries and elapsed
time are in the pause menu/results instead of permanent sidebars. All interface
text uses the game's bitmap font and palette with the same integer scaling.

### Display settings

Open **Plus → Settings**. Use Up/Down to select a row and **A or Left/Right**
to change its value:

- **Outside Stats:** optional right-hand panel with altitude, berries, deaths
  and time. It does not resize the game or restore the old controls/credit clutter.
- **Screen Filter:** Off, Scanlines (with subtle vignette), LCD Grid, or Monochrome.
  Filters affect only the game image, not menu text or the outside stats.
- **Reset Display:** restore the clean, unfiltered default.

Changes preview immediately and survive room retries and whole-run restarts.
Preferences are transient and reset when closing/relaunching the app.

### Known issue: quit SmileBASIC to leave the game

**Returning to HBLauncher is not working on the tested console setup.** Both the
menu exit and direct Minus shortcut failed, including implementations using the
same `hbExit()` helper as Block Drop/Tetris. Offline shader/runtime tests passed,
but those tests did not establish working console return. The root cause remains
unresolved; no working in-game quit is claimed in this release.

To leave the game:

1. Press the controller's **HOME** button.
2. Select **SmileBASIC** on the system HOME menu.
3. Press **X**, then confirm **Close** to quit SmileBASIC.

Unsaved game progress is lost. Stop the PC host when ending the session. Start a
fresh SmileBASIC/console session before relaunching after a failed native session;
do not repeat the bootstrap's `REMOVE` in the same application process.

### Pull request wanted: reliable return to HBLauncher

**Please submit a pull request with a solution for safely returning this game to
HBLauncher without closing SmileBASIC.** Useful starting points are the SDK's
`hbExit()` helper (ABI exit flag at byte 1016), `homebrew-launcher/app-runtime.cjs`
and `homebrew-launcher/launcher-loop.cjs` in the external HBLauncher checkout.
The retained `tests/direct-exit.comp` and `tests/return-to-menu.cjs` describe the
earlier offline comparison/handoff checks; they are diagnostic references, not
proof that console exit works.

A proposed fix should include console reproduction steps, the tested HBLauncher,
SmileBASIC and console versions, and confirmation that gameplay, pause and return
to the launcher all work. Do not remove this warning until the fix is verified
on-console. Share reviewed terminal errors or `HBLauncher return [...]` messages,
not entire `runs/` folders, connection tokens or memory dumps.

**B is jump here, not exit.** Aim upward and dash to climb. Touching ground or
an available balloon refills dashes. Collecting strawberries also refills them.
Leaving a room through the top advances; falling below the screen or touching
spikes restarts the current room. Disconnecting the controller pauses play.

## Implemented

- All 32 original room maps (30 climbing rooms, summit and title), pixel sprites
  and collision flags; original 128x128 view scaled by 7 with nearest pixels.
- Movement remainder accumulation and the supplied Lua's inclusive collision
  loops; acceleration, ice, gravity, coyote time, jump buffering, wall sliding,
  wall jumps, directional dashes, dash freeze and ground refill.
- Strawberries, flying strawberries, balloons, springs, collapsing floors,
  moving platforms, dash-breakable walls, keys/chests, large chest/double-dash
  orb, summit flag and memorial text.
- Hair color/animation, basic snow/clouds, death particles, screen shake, timer,
  deaths, berry count, pixel-style pause/options pages, confirmed run restart,
  manual SmileBASIC leaving instructions,
  optional outside stats, three display filters, a room-entry
  altitude badge and summit results.
- Simulation once per two submitted launcher frames (nominal 30 Hz); jump/dash
  edges are buffered across skipped frames so short taps aren't lost.

## Known differences / limits

- **No working return to HBLauncher:** quit SmileBASIC through the system HOME
  menu to leave the game. A pull request fixing this is requested above.
- **Silent:** no original sound effects, music or PICO-8 audio synthesis yet.
- Not verified against PICO-8 frame-by-frame or by a full end-to-end playthrough.
  Uses GPU floats, not PICO-8 fixed-point numbers; object ordering also differs.
- Spawn animation, smoke, fruit score popups, original room-title cards, title transition,
  chest cinematic, wing animation, clouds/snow and some other effects are omitted
  or simplified. Graphics are recomposed during freeze rather than framebuffer
  snapshots. The memorial appears immediately rather than typing in.
- The supplied Lua's neutral/no-direction dash is preserved (initial horizontal
  speed 1, unlike aimed dash speed 5). Hold a direction for a full-strength dash.
- Session state is transient. No saves, persistent records or service access.
- Nominal 30 Hz is based on submitted frames, not measured wall time. Console
  behavior/performance still requires testing on the supported hardware.

## Build / desktop checks

From the HBLauncher repository root:

```sh
node apps/Celeste-Classic-NS2/build.cjs
bash scripts/build-checks.sh
node apps/Celeste-Classic-NS2/check.cjs
```

From a **standalone clone** of this repository, point to a separate HBLauncher
checkout (the SDK is not vendored here):

```sh
HBLAUNCHER_ROOT=/absolute/path/to/HBLauncher node build.cjs
HBLAUNCHER_ROOT=/absolute/path/to/HBLauncher node check.cjs
```

Build the desktop helper executables using `scripts/build-checks.sh` in that
HBLauncher checkout before running checks. `HBLAUNCHER_ROOT` is unnecessary when
the project is installed directly inside its `apps/` directory.

Needs the SDK toolchain (Node.js, Python/Pillow,
`glslangValidator`, `spirv-val`; Vulkan headers/driver for desktop checks).
`HB_CHECK_TOOLS` may point to a directory with the existing Vulkan test helpers.
The builder is offline: it extracts assets from the local upstream cartridge,
checks its recorded checksum, resets packed mutable entity storage and compiles
the shaders. Return to the menu before rebuilding, then Refresh and relaunch.

Source guide: `shaders/app.comp` is the translated simulation;
`shaders/app.frag` draws sprites/tile layers; `shaders/game.glsl` documents shared
state and collision helpers; `assets.py` extracts the cartridge and builds UI.
Data bytes 17408..23551 hold 96 transient 64-byte entities. The builder initializes
them to zero; the launcher resets all data on each launch.

The next useful work is console playtesting and comparison against the original
Lua, followed by fixing fidelity differences and adding sound.

## Credits and GitHub publishing

Original game: **Maddy Thorson and Noel Berry**. PICO-8 is a trademark of
Lexaloffle Games LLP. This fan-made project is not affiliated with or endorsed
by the original authors, Nintendo or Lexaloffle.

The project is named and structured for a standalone GitHub repository, but
**naming it does not clear upstream redistribution permissions**. Before making
a public repository or release:

- Read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and retain the upstream
  code license and source records.
- Resolve permission to distribute the cartridge, graphics/font and derived
  `assets/data.bin` / `assets/icon.png`. Their current public availability does
  not establish a permissive license. Do not upload this local folder unchanged
  unless those rights have been established.
- If publishing source-only without restricted assets, document a lawful way
  for users to supply those files. The current builder expects the cartridge
  and font under `upstream/`; it does not download them.
- Choose a license for contributions you have authority to license; do not
  apply an MIT label to all upstream artwork just because upstream code is MIT.
- Keep the experimental/silent status and console-testing limitations visible.
- After rights are resolved, package releases with `app.json` at the root of
  the `Celeste-Classic-NS2/` folder and include the compiled shaders and assets.

No repository has been created or published by these changes.
