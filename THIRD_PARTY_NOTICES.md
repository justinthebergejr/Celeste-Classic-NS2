# Celeste Classic for NS2 — upstream sources and credits

Original Celeste Classic: Maddy Thorson (credited as Matt Thorson in the original
source) and Noel Berry. This is an unofficial experimental HBLauncher adaptation,
not Celeste Classic 2 and not the commercial Celeste game.

- `upstream/celeste.lua` is an unmodified copy of the user's supplied source.
- `upstream/celeste.p8.png` is the original public Celeste 1.0 cartridge from
  https://www.lexaloffle.com/bbs/?tid=2145 (cart #15133), used locally to extract
  graphics, tile maps and flags. Its listing says **No License**; public download
  availability is not a blanket redistribution license.
- `upstream/Classic.cs`, `upstream/font.png` and `upstream/LICENSE-code.txt` were
  obtained from https://github.com/NoelFB/Celeste at commit
  `1b0ce45c75e05649ae91b44a8bb6b196684e4352`. `Classic.cs` is reference material.
  The MIT notice is retained in `upstream/LICENSE-code.txt`.
- That repository's README explicitly says its MIT license applies to **code**,
  not the commercial game or assets. Do not interpret the code license as a
  license for the graphics, font, cartridge or derived packed assets/icon.
- Exact URLs and SHA-256 hashes are recorded in `upstream/sources.json`.

Keep credits and the code license with any permitted distribution. Before
publishing a package containing the upstream cartridge, artwork/font or derived
assets, resolve redistribution permissions with the respective rights holders.
No new blanket license is assigned to those materials by this port.

PICO-8 is a trademark of Lexaloffle Games LLP. No PICO-8 runtime, boot logo or
commercial Celeste installation is included or required.
