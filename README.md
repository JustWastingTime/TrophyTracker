# Trophy Tracker

A cozy static site for tracking Umamusume career race trophies toward the **Completionist** title.

Upload your `trophy_data.json`, pick a character, and see which graded races you've won on the career calendar.

## Features

- Career calendar (Junior → Classic → Senior)
- Import wins from `trophy_data.json`
- Per-character progress with G1 / G2 / G3 breakdown
- Manual checkmarks as you play
- Filters: distance, terrain, grade
- Shareable links (progress saved in URL + localStorage)

## Local preview

```bash
npx serve .
```

Then open http://localhost:3000

## GitHub Pages

1. Create a new repo (e.g. `trophy-tracker`) and push this folder
2. **Settings → Pages → Deploy from branch**
3. Branch: `main`, folder: `/` (root)
4. Live at `https://<username>.github.io/trophy-tracker/`

No build step required — it's plain HTML/CSS/JS.

## Updating race data

Bundled data lives in `data/`. To refresh the trophy-id map from a raw game `races.json` export:

```bash
npm run build-data -- path/to/races.json
```

To fully rebuild races + characters from TazunaBot-style source files (optional):

```bash
npm run build-data -- path/to/races.json path/to/races-calendar.json path/to/characters.json
```

## Data files

| File | Purpose |
|------|---------|
| `data/races.json` | Career calendar races |
| `data/characters.json` | Playable character list |
| `data/trophy-map.json` | Maps `trophy_id` from game data → race id |

## License

MIT
