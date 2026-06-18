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

This repo is already on GitHub at [JustWastingTime/TrophyTracker](https://github.com/JustWastingTime/TrophyTracker).

1. Push your latest changes to `master`
2. On GitHub: **Settings → Pages**
3. **Build and deployment → Source:** Deploy from a branch
4. **Branch:** `master`, folder **`/ (root)`**, then **Save**
5. After a minute or two, the site is live at:

   **https://justwastingtime.github.io/TrophyTracker/**

No build step — plain HTML/CSS/JS. Bookmark that URL (or share it) so people can use the tracker.

If you use a different repo name or branch, the URL is `https://<username>.github.io/<repo-name>/`.

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
