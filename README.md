# Solar Bay

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/bimasetmuse61/gta6-solar-bay-03/rank.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/bimasetmuse61/gta6-solar-bay-03/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solar Bay is an original open-world crime game that runs in a desktop web
browser, offline, from static files. Explore a sun-soaked coastal city built
on an 8x8 block grid — on foot or behind the wheel — while traffic flows,
pedestrians stroll the sidewalks, and the Solar Bay police respond to your
crimes with a five-star wanted system.

Play it by opening `game/index.html` in a browser, or serve the folder with
`node serve.ts` and visit http://localhost:8080.

## What is in the game

- A full city: 8x8 blocks of buildings, roads, sidewalks, palms and a beachfront
- Walk, run, punch, steal and drive cars with simple arcade driving physics
- Traffic AI that follows the road grid and pedestrians who walk the sidewalks
- Police pursuit: crimes raise your wanted stars (up to 5); break line of
  sight and lay low to let the heat decay, or get busted / wasted
- Five sequential story missions with dialogue and objectives, plus
  repeatable courier jobs that pay cash
- A day-night cycle that changes the light, street lamps and lit windows
- HUD with cash, health, wanted stars and a live canvas minimap
- Synthesised WebAudio sound: engine, horn, siren and pickup chimes — no
  audio files, everything is generated in code
- Progress, cash and mission state saved in `localStorage`

## Controls

- **WASD / Arrow keys** — move on foot, drive in a car
- **Shift** — run / boost
- **E** — enter or exit a nearby car
- **F** — punch
- **H** — horn (in a car)
- **Enter** — advance dialogue / accept a job at a marker
- **P / Esc** — pause
- **M** — mute

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output and writes the dossier with the vendored make.fun library
- `serve.ts` — a tiny local static server for `game/`
- `game/` — the playable game (vanilla JavaScript, no build step)
- `vendor/makefun-game.ts` — the make.fun game library, vendored unchanged
- `screenshots/` — screenshots of the running game

An entry for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01).
