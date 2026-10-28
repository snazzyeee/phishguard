# PhishGuard

A minimal browser demonstration of the menu-driven circular queue program in [PhishGuard_DS_Mini_Project.pdf](PhishGuard_DS_Mini_Project.pdf). The page mirrors the C program's operations; [source/phishguard.c](source/phishguard.c) contains the C source from pages 5–6.

## Run

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm start
```

Open <http://localhost:4173>. The queue starts empty and holds at most 10 emails. Receive an email, then assess, peek, display pending, assess all, or view the session summary. Exit stops the session; reload the page to start again.

Run `npm test` for the queue and scoring checks. The browser version uses JavaScript to mirror the C behavior.

## Deploy to Vercel

`npm run build` writes the static site to `dist/`. The existing `vercel.json` uses that build and output directory.
