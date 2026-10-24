# Celeste Classic for NS2

An unofficial **Celeste Classic** adaptation for **HBLauncher**, 
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
