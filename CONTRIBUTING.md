# Contributing to Trimeverse

Small improvements are welcome. A clear explanation, an accessibility fix, or a reproducible physics example can make a lab more useful to students.

1. Fork the repository and start a branch for one change.
2. Serve `dist/` locally using the command in the [README](README.md).
3. Open the affected lab and note the input values and expected result. For a physics change, explain the equation, units, expected tolerance, and the limits of the model.
4. Run `npm test`. When changing simulation behavior, add a test that would have caught the original problem. Check affected controls in a browser too; the Node tests include simulated UI checks and do not replace a browser check.
5. Open a pull request with steps a reviewer can repeat. For a new feature, start with an issue so we can agree on the scope.

The site keeps source files in `dist/`. When changing a generated lab page or the simulation catalog, look for its definition in the lab catalog and `scripts/generate-labs.mjs`; run `npm run generate:labs` and review the generated diff. Edit standalone pages directly. Please keep new media attribution and reuse terms with the asset credits.

Good first contributions include checking whether a lab can be completed with a keyboard, proposing a classroom exercise with a known outcome, or improving a lab explanation with a trustworthy reference.
