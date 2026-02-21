# Welcome to Slide Ship

## Your Gamified Presentation Framework

**Fly through your slides** like a starship pilot!

### Mouse Controls (Primary)
- **Move mouse** - Ship follows your cursor
- **Left click** - Shoot lasers

### Keyboard Controls
> Only work when mouse is **outside** the canvas

- **ARROW KEYS** or **WASD** - Fly around
- **SPACE** - Shoot lasers
- **N** / **P** - Next / Previous slide

- Fly off-screen edges to change slides

---

# How to Create Slides

## Write Markdown

Slides are separated by three dashes `---` on their own line.

```markdown
# First Slide

Some content here

---

# Second Slide

More content here
```

---

# Text Formatting

## Use Standard Markdown

- **Bold text** with `**double asterisks**`
- *Italic text* with `*single asterisks*`
- Regular paragraphs for body text
- Bullet points with `-` or `*`

1. Numbered lists work too
2. Just use numbers with periods
3. They auto-increment

---

# Adding Images

## Interactive Crystals

Use crystal images that shatter when you bump into them:

```markdown
![crystal](/images/your-image.png){x=200 y=300 w=150 h=150}
```

**Attributes:**
- `x`, `y` - Position on screen
- `w`, `h` - Width and height

Images go in the `public/images/` folder.

---

# Getting Started

## Create Your Own Presentation

1. Click **"Use this template"** on GitHub
2. Clone your new repository
3. Edit `public/slides.md`
4. Add images to `public/images/`
5. Run `npm run dev` to preview
6. Deploy to GitHub Pages

**Happy presenting!**

---

# Theme Customization

## Make It Yours

Edit `src/theme.config.ts` to customize:

```typescript
background: {
  type: 'stars',  // or 'grid' or 'solid'
  color: '#0a0a1a'
},
starship: {
  color: '#326ce5',
  glowColor: '#00aaff'
},
laser: {
  color: '#00ffff'
}
```
