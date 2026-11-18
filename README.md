# Stream Moves — Personal Investment Checklist Journal

**Stream Moves** is a personal research journal for swing trades, LEAPS, and long-term investments, branded for **Streams Into Wealth**.

## What's included

- Three highlighted investment workspaces: **SWINGS**, **LEAPS**, and **LONG TERM**.
- Your five-step investment research framework: Economic Cycle, Sector Rotation, Company Fundamentals, Technical Confirmation, Options Activity & Positioning.
- Checkable research prompts, **Bullish / Neutral / Bearish** assessments, custom data points, source links, and notes for every step.
- Trade/decision tracking, LEAPS contract fields, research statuses, an initial underlying-price risk/reward check, and simple percentage returns for closed positions (plus estimated dollar P/L when quantity is supplied). Calculations exclude fees and taxes.
- Automatic saving to the **current browser** after edits; timestamped research updates and point-in-time saved snapshots, with restore.
- Analysis history with search and filtering, plus JSON backup import/export.
- Responsive design; no login, API key, subscription, analytics, or third-party dependencies.

## Deploy on GitHub Pages

1. Create a GitHub repository named `Streammoves` (or any name you prefer).
2. Upload **`index.html`**, **`styles.css`**, and **`app.js`** to the repository root (not inside a nested folder).
3. In your repository open **Settings → Pages**, and choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder and save.
5. Open the Pages URL GitHub shows. For a project repository it will typically look like `https://YOUR-USERNAME.github.io/Streammoves/`.

Alternatively, test locally by opening `index.html` in a browser. Saving is most reliable from the deployed GitHub Pages address rather than `file://`.

## Privacy, storage, and backups — important

- This is a **single-user experience**, not an authenticated website. The *site code* hosted on GitHub Pages can be publicly accessible. **Your journal entries are not uploaded to GitHub** and are not stored on a server: they are saved using the browser's `localStorage`.
- Browser storage is **device- and browser-specific**, not synced. Data entered on your phone will not automatically appear on your computer, even when both open the same URL. Use **Export backup** and **Import** to transfer entries between devices.
- Browser private/incognito mode, clearing site data, storage restrictions, or device loss can erase entries. **Export backups regularly** and keep them private. The backup JSON contains your unencrypted research notes and should not be committed to your public GitHub repository.
- **Import replaces** existing entries in that browser and asks for confirmation. Export the current entries first before importing another backup.
- Saving a **snapshot** preserves a version of all your research fields. Changes to ordinary form fields also save automatically, but do **not** create a new historical snapshot on every keystroke. Use a snapshot at decision points and dated research updates for major new information.
- No market data is downloaded and no trades are placed. This is a personal recordkeeping tool, not a live brokerage, forecast, or investment recommendation.

## Files

- `index.html` — page structure
- `styles.css` — green-and-gold responsive design
- `app.js` — entry editor, persistence, history, snapshots, import/export
- `README.md` — usage and deployment instructions

You may edit the site files without changing your saved entries, as long as you keep using the same GitHub Pages URL and browser and do not clear its storage.
