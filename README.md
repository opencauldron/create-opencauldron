# create-opencauldron

Scaffold an [OpenCauldron](https://github.com/opencauldron/opencauldron) instance.

## Usage

```bash
npx create-opencauldron@latest
```

Or with a project name:

```bash
npx create-opencauldron@latest my-studio
```

This will:

1. Clone the OpenCauldron repo (clean, no git history)
2. Generate `.env.local` with a random `NEXTAUTH_SECRET`
3. Install dependencies (auto-detects bun/pnpm/yarn/npm)
4. Initialize a fresh git repo

## What's next

After scaffolding, edit `.env.local` with your Google OAuth credentials and at least one AI model API key, then start the dev server.

## License

MIT
