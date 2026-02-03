# Birdie & Ripsaw's Diner

A family meal planning web app with AI-powered vegan recipe generation.

## Features

- **5-Day Calendar**: Plan meals for the upcoming week with drag-and-drop
- **AI Recipe Generation**: Generate vegan, dairy-free recipes using OpenAI
- **Grocery List**: Consolidated shopping list grouped by store section
- **Cross-Device Sync**: State persists via Netlify Blobs
- **Print-Friendly**: Clean print layouts for recipes and grocery lists

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Netlify Functions
- **Storage**: Netlify Blobs
- **Auth**: JWT with HttpOnly cookies
- **Styling**: Custom CSS with mid-century diner theme
- **Drag & Drop**: @dnd-kit

## Dietary Constraints

All generated recipes are:
- **Vegan** (for Shane)
- **Dairy-free** (for Lauren)
- **Under 40 minutes** total time

Equipment available:
- Joule oven
- Vitamix blender
- Stovetop

## Development

```bash
# Install dependencies
npm install

# Run locally (requires Netlify CLI)
npm run netlify

# Or run frontend only
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `OPENAI_API_KEY` - Your OpenAI API key
- `APP_USERNAME` - Login username
- `APP_PASSWORD_HASH` - bcrypt hash of password
- `SESSION_SECRET` - 32+ character secret for JWT signing
- `STATE_BLOB_KEY` - Key for state storage (default: state.json)

## Deployment

```bash
# Initialize Netlify
netlify init

# Set environment variables
netlify env:set OPENAI_API_KEY "your-key"
netlify env:set APP_USERNAME "danaher"
netlify env:set APP_PASSWORD_HASH "your-bcrypt-hash"
netlify env:set SESSION_SECRET "your-32-char-secret"

# Deploy
netlify deploy --prod
```

## License

Private - Family use only
