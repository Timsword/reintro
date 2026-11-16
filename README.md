# Reintro

A mobile-first, offline-capable food reintroduction diary (PWA). Log meals, test foods, stool (Bristol scale) and symptoms; export a Markdown summary for AI analysis.

- No build step, no backend: `index.html` + `manifest.json` + `sw.js`.
- Data lives in the browser (localStorage) with optional automatic backup to a private GitHub repo, plus manual JSON export/import.
