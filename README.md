# create-opencauldron

> **Deprecated as of v0.2.0.** The OpenCauldron setup wizard now lives inside the main repo, so it can never drift out of sync with `.env.example` or the provider catalog. Running `npx create-opencauldron` will print a redirect message and exit.

## What to use instead

```bash
git clone https://github.com/opencauldron/opencauldron.git my-studio
cd my-studio
pnpm install
pnpm setup
```

The same interactive wizard, but it lives next to the code it configures.

If you just want to **self-host** OpenCauldron as-is (no fork), use the [Docker quickstart](https://github.com/opencauldron/opencauldron#self-host-in-60-seconds) instead — you don't need this script at all.

## License

MIT
