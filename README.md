# create-opencauldron

Scaffold an [OpenCauldron](https://github.com/opencauldron/opencauldron) studio.

## Usage

```bash
npx create-opencauldron@latest
```

Or with a project name:

```bash
npx create-opencauldron@latest my-studio
```

The interactive wizard walks you through:

1. **Studio name** — sets the project directory and org branding
2. **Database** — Local Postgres (Docker) or Neon serverless
3. **Storage** — Local filesystem or Cloudflare R2
4. **AI providers** — pick from Gemini, Grok, Flux, Ideogram, Recraft, Runway, Kling, MiniMax, Luma, and Mistral

Then it clones the repo, generates `.env.local`, installs dependencies, and initializes a fresh git repo.

### Skip the wizard

```bash
npx create-opencauldron@latest my-studio --skip
```

This uses all defaults (local Postgres, local storage, no API keys) — useful for CI or quick starts.

## What's next

After scaffolding, add your API keys to `.env.local`, start Postgres if using Docker, push the schema, and run the dev server:

```bash
cd my-studio
docker compose up db -d   # if using local Postgres
npm run db:push
npm run dev
```

## License

MIT
