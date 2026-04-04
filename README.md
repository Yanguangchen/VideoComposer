# Video Composer

Next.js dashboard for multi-brand **Before / After** marketing videos: pick a client, upload two photos, preview a themed Remotion template, and export an MP4.

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS**
- **Remotion** — `@remotion/player` (preview), `@remotion/bundler` + `@remotion/renderer` (server render via `/api/render`)
- **react-dropzone** — drag-and-drop uploads with `URL.createObjectURL` previews

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Export (MP4)

Server-side rendering uses Remotion’s headless renderer. **FFmpeg** must be available on the machine running the Next.js server (local dev and any host you deploy to). See [Remotion prerequisites](https://www.remotion.dev/docs/miscellaneous/ffmpeg).

Brands are configured in `src/config/brands.ts`. Each brand has a **dedicated logo folder** under `public/assets/logos/<brand-id>/` (e.g. `public/assets/logos/le-motor/logo.png`). Drop files there once; the dashboard lists them and remembers your selection per brand in the browser. Optional backgrounds and music: `public/backgrounds/`, `public/music/`.

## License

MIT
