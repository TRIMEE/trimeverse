# Trimeverse

Trimeverse is a browser-based physics and astronomy learning site created by Trime. Its 32 interactive labs let students change a starting condition, watch how the model responds, and compare the result with a prediction.

**[Try the live site](https://trimeverse.trimemvp.chatgpt.site)**

- Explore how a star and a black hole move around their shared center of mass in the gravity sandbox.
- Compare fusion and fission, wave interference, and pendulums under different gravity settings.
- Work through experiments on mechanics, circuits, fields, optics, heat, and atomic physics.
- In each lab, open **Inside this model** for the relevant equations, assumptions, and limits. These are educational models with simplified conditions.

Start with the [gravity classroom activity](docs/gravity-classroom-activity.md): predict what happens to Earth's orbit if the central object changes but its mass stays the same.

## Run locally

From the repository root, start a local server with Python 3:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). On Windows you can use `py` in place of `python`. The site needs no build step or API keys. Serve `dist/` at the web root so the page links work.

## Project layout

- `dist/` — Site pages, styles, JavaScript modules, and media. In this project, `dist/` contains the editable site source.
- `scripts/generate-labs.mjs` — Regenerates the newer lab pages and simulation catalog from the catalog data.
- `tests/` — Checks for numerical behavior, simulation controls, and local links.

To run the checks from the repository root with Node.js 22 or later (no dependency install is needed):

```sh
npm test
```

See [Contributing](CONTRIBUTING.md) for how to report a simulation problem or propose a change. GitHub Actions is configured to run the tests on pushes and pull requests.

## License and media credits

Trimeverse's original source code and project documentation use the [MIT License](LICENSE). The Trimeverse name and logos and the third-party media are excluded from that license. See [media credits](dist/ASSET-CREDITS.md) for the black hole visualization and Webb telescope imagery and their providers' usage terms.
