# Slide Ship

A gamified presentation framework. Navigate your slides by piloting a starship through space!

**[Live Demo](https://origoss.github.io/kube-pres-fw/)**

<!-- Add a screenshot here: ![Slide Ship Demo](public/images/demo.png) -->

## Features

- 🚀 **Fly through presentations** - Navigate with arrow keys or WASD
- 💥 **Interactive elements** - Shoot lasers at text, shatter crystal images
- 📝 **Markdown-driven** - Write slides in simple Markdown
- 🎨 **Customizable theme** - Change colors to match your style
- 🔄 **Hot reload** - Instant preview while editing
- 🌐 **GitHub Pages ready** - Deploy with one click

## Quick Start

### Using GitHub Template (Recommended)

1. Click **"Use this template"** button above
2. Name your repository (e.g., `my-presentation`)
3. Clone your new repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/my-presentation.git
   cd my-presentation
   ```

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Using Nix (Optional)

If you have Nix with flakes enabled:

```bash
# Enter development shell
nix develop

# Or use the helper command (auto-installs deps and starts server)
nix run .#slide-ship-dev
```

**Available commands in Nix shell:**
- `slide-ship-dev` - Install dependencies (if needed) and start dev server on http://localhost:5173
- `npm run dev` - Start dev server
- `npm run build` - Build for production

### Creating Slides

Edit `public/slides.md`:

```markdown
# My Title

## Subtitle

- Bullet point one
- Bullet point two

---

# Second Slide

**Bold text** and *italic text*

![crystal](/images/photo.png){x=200 y=300}
```

Slides are separated by `---` on its own line.

### Adding Images

1. Put images in `public/images/`
2. Reference them in your slides:
   - `![crystal](/images/photo.png)` - Interactive crystal (shatters on contact)
   - `![image](/images/photo.png)` - Static image

**Position attributes:**
- `x=200` - Horizontal position
- `y=300` - Vertical position
- `w=150` - Width
- `h=150` - Height

### Customizing Theme

Edit `src/theme.config.ts`:

```typescript
export const theme = {
  background: {
    type: 'stars',      // 'stars' | 'grid' | 'solid'
    color: '#0a0a1a',
    starCount: 150,
  },
  text: {
    headingColor: '#00ffff',
    bodyColor: '#aaccff',
    accentColor: '#ffffff',
  },
  starship: {
    color: '#326ce5',
    glowColor: '#00aaff',
  },
  laser: {
    color: '#00ffff',
    glowColor: '#00ffff',
  },
};
```

## Deploy to GitHub Pages

1. Push your changes to GitHub
2. Go to **Settings** → **Pages**
3. Select **GitHub Actions** as source
4. The included workflow (`.github/workflows/deploy.yml`) will auto-deploy

Or manually:

```bash
npm run build
# Upload dist/ folder to your web host
```

## Controls

### Mouse (Primary)
| Action | Control |
|--------|---------|
| Fly | Move mouse - ship follows cursor |
| Shoot | Left click |
| Navigate slides | Fly off-screen edges |

### Keyboard (Secondary)
> **Note:** Keyboard controls only work when the **mouse cursor is outside** the game canvas.

| Key | Action |
|-----|--------|
| ↑ / W | Thrust forward |
| ↓ / S | Thrust backward |
| ← / A | Rotate left |
| → / D | Rotate right |
| SPACE | Shoot laser |
| N | Next slide |
| P | Previous slide |

## Project Structure

```
├── public/
│   ├── slides.md          # Your presentation content
│   └── images/            # Your images
├── src/
│   ├── lib/               # Framework code (don't modify)
│   ├── main.ts            # Entry point
│   └── theme.config.ts    # Theme customization
├── index.html
└── package.json
```

## Markdown Format

See [docs/MARKDOWN_FORMAT.md](docs/MARKDOWN_FORMAT.md) for complete syntax reference.

## License

MIT
