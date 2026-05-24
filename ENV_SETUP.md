Environment setup (secure keys)

1. Copy `env.local.js.example` to `env.local.js` at project root:

```bash
cp env.local.js.example env.local.js
```

2. Or copy `.env.example` to `.env` if you prefer dotenv-style configuration:

```bash
cp .env.example .env
```

3. Fill the values in `env.local.js` or `.env` with your Firebase keys and GridFS API URL. Put the MongoDB URI only in the server environment. Do NOT commit these files.

4. Restart Expo and clear cache after creating the file:

```bash
expo start -c
```

5. If you are building with EAS, set the same keys in `eas.json` or in your build profile environment variables.

Alternative: For managed Expo builds, add these keys to `app.config.js` or `eas.json` and put them under `extra` so they are available as `Constants.manifest.extra` at runtime.

Notes
- The app will check in this order for each key: `process.env` -> `env.local.js` -> `Expo Constants extra` -> fallback empty string.
- Keep your real secrets out of git. Use CI secret stores for production builds.
- **Document uploads:** MongoDB **GridFS** via `server/gridfsApi.js`. Deploy the API to Render (see `GRIDFS_SETUP.md`), then set `EXPO_GRIDFS_API_URL` to the public **HTTPS** URL and rebuild the APK. Firebase Storage is **not** used.
