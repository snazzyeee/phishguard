# PhishGuard — Email Threat Assessment System

An interactive circular queue and threat scoring workbench based on `PhishGuard_DS_Mini_Project.pdf`.

## Run

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm start
```

Open <http://localhost:4173>. Run the queue and scoring checks with `npm test`.

## Deploy to Vercel

The app is a static site. `npm run build` writes the deployable files to `dist/`; the local Node server is only for development. `vercel.json` sets the framework to **Other**, runs the build command, and serves `dist/`.

For a dashboard deployment, put this folder in a Git repository and import that repository into Vercel. For a direct deployment, install the Vercel CLI, sign in, then run `vercel` from this directory (`vercel --prod` for production). No environment variables or runtime services are needed. If configuring the project manually, use **Other** as the framework, `npm run build` as the build command, and `dist` as the output directory.

## Explore

- The workbench starts with the two sample emails from page 8 already queued.
- **Receive email** accepts a sender, subject, and body. Presets fill the form for quick testing.
- **Assess next**, **Peek next**, **Display pending**, **Assess all**, and **Session summary** mirror the C menu operations.
- **Wrap-around demo** creates a queue with `front = 8`, `rear = 1`, and pending emails in slots `8, 9, 0, 1`. It rebuilds the session using queue operations.
- **Reset session** restores `front = 0`, `rear = -1`, `count = 0`, `nextId = 1`, and clears the session counts.
- The **Architecture** tab explains the queue and complexity; the **C source** tab shows the complete program extracted from pages 5–7.

The simulator follows the C program's substring keyword matching, insecure-link and sender penalties, score cap, and verdict thresholds. The input fields accept the requested 50, 100, and 200 characters; the original C arrays reserve one byte in each field for the null terminator.
