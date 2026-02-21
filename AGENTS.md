# AGENTS.md - Slide Ship

Guidelines for AI agents working in this codebase.

## Project Overview

**Slide Ship** is a gamified presentation framework built with Phaser 3, TypeScript, and Vite. Users navigate slides by piloting a starship through a space-themed presentation environment.

**Key Features:**
- Fly a heptagonal starship (Kubernetes-inspired design) through slides
- Shoot lasers at text elements to highlight them
- Bump into interactive "crystal" images to reveal them
- Markdown-driven presentation content
- Hot-reload in development mode

## Essential Commands

```bash
# Development
npm run dev          # Start Vite dev server on http://localhost:3000
npm run build        # TypeScript compile + Vite build to dist/
npm run preview      # Preview production build locally

# Nix environment (if using)
slide-ship-dev       # Auto-install deps and start dev server
```

## Project Structure

```
src/
  main.ts                    # Entry point - Phaser game configuration
  scenes/
    RoomScene.ts             # Main game scene - background, ship, slide management
  parser/
    MarkdownParser.ts        # Parses markdown into Slide/SlideElement objects
  layout/
    AutoLayout.ts            # Calculates positions for slide elements
  managers/
    SlideManager.ts          # Handles slide transitions, navigation, object lifecycle
  sprites/
    Starship.ts              # Player ship - physics, movement, shooting
    TextObstacle.ts          # Text elements with collision/highlight effects
    CrystalImage.ts          # Interactive crystals that reveal images when shattered

public/
  slides.md                  # Default presentation content (loaded at runtime)
  images/                    # Images referenced in slides

examples/                    # Example presentation files
  basic.md
  gallery.md
  tutorial.md

docs/
  MARKDOWN_FORMAT.md         # Documentation for the markdown format
```

## Code Patterns & Conventions

### TypeScript Style
- **Strict mode enabled** - all strict TypeScript options on
- Use definite assignment assertion (`!`) for fields initialized outside constructor
- Private fields prefixed with `private`
- Readonly constants use `readonly` or `private readonly` with UPPER_SNAKE_CASE

### Phaser Patterns

**Scene Structure:**
```typescript
export class RoomScene extends Phaser.Scene {
  private starship!: Starship;  // Definite assignment
  
  constructor() {
    super({ key: 'RoomScene' });
  }
  
  create(): void { /* init game objects */ }
  update(): void { /* game loop */ }
}
```

**Sprite/GameObject Classes:**
- Wrap Phaser game objects in custom classes (see `src/sprites/`)
- Store references to scene, container, and physics body
- Use containers for complex multi-part sprites
- Enable physics via `scene.physics.world.enable(this.sprite)`

**Physics:**
- Uses Arcade Physics
- Collision detection via `this.physics.add.overlap()`
- Set body properties after enabling physics
- Use `setImmovable(true)` for static elements

**Input Handling:**
- Dual approach: Event-based + polling fallback
- Keyboard: Event-based for responsiveness: `keyboard.on('keydown-LEFT', ...)`
- Mouse: Ship rotates to face pointer, speed proportional to distance
- Store input state in object, update via events
- Pointer tracking with `pointermove`, `pointerout`, `pointerover` events

**Animations:**
- Use `this.scene.tweens.add()` for all animations
- Store tween references to stop them when needed
- Clean up tweens on object destruction

### Class Organization

Order within classes:
1. Private fields with `!` assertion
2. Constants (THRUST, MAX_SPEED, etc.)
3. Constructor
4. Public methods
5. Private helper methods

### Depth/Z-Index Management

Layer order (lower = behind):
- Background stars/grid: default (0)
- Crystals/images: depth 5
- Starship ghost glow: depth 1099
- HUD: depth 1000
- Starship: depth 1100 (above HUD)

Use `setDepth(n)` to control layering.

## Markdown Format

Slides are defined in `public/slides.md` or embedded as fallback.

```markdown
# Level 1 Heading (cyan, large)
## Level 2 Heading (white, medium)
### Level 3 Heading (white, small)

- Bullet point
- **Bold** text with **asterisks**
- *Italic* text with *asterisks*
- Multi-line bullets with backslash continuation\
  This line continues the bullet above

1. Numbered items
2. With auto-increment
3. Also supports line\
   continuation for long items

```code blocks```

![crystal](/images/filename.png){x=200 y=300 w=150 h=150}
```

**Slide separators:** Three dashes `---` on their own line

**Crystal image attributes:**
- `x`, `y` - Position in pixels
- `w`, `h` or `width`, `height` - Size
- `cx`, `cy` - Crystal icon position (defaults to x/y)

See `docs/MARKDOWN_FORMAT.md` for complete documentation.

## HUD Elements

The Arcade HUD displays:
- **LIVES**: 3 ship icons (heptagons) - display only, never decreases
- **LEVEL**: Current slide number (e.g., "02 / 05")
- **HI**: High score (6 digits, e.g., "050000")
- **SCORE**: Current score (6 digits, yellow, blinks)
- **Crystal count**: Number of crystals shattered

Score awards:
- +50 for shooting/highlighting text
- +100 for shattering a crystal

## Hot Reload

In development mode (`import.meta.env.DEV`), the app polls `/slides.md` every 2 seconds for changes. When modified:
1. Re-parses markdown
2. Clears current slide objects
3. Recreates slide with new content
4. Preserves starship position/state

## Audio

Uses Web Audio API directly (no Phaser audio):
```typescript
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
// Create oscillator, gain node, etc.
```

Sound effects are synthesized, no audio files.

## Important Gotchas

### Input State Management
The starship uses an `inputState` object updated via keyboard events. Always update this via `setInputState()` rather than polling directly for responsive controls.

### Physics Body Cleanup
When destroying objects with physics bodies:
```typescript
// Disable body first to prevent errors during tween cleanup
(body as Phaser.Physics.Arcade.Body).enable = false;
laser.setActive(false);
laser.setVisible(false);
```

### Crystal Positioning
Crystal containers are positioned at the image location. The crystal graphic itself has an offset within the container (`crystalOffsetX/Y`). When reforming, reset physics body to crystal size with correct offset.

### Slide Transitions
- Right edge (x > 1250) → next slide
- Left edge (x < 30) → previous slide
- Transition pauses all input/updates
- Ship teleported to opposite side after transition

### Font Loading
Google Fonts loaded in `index.html`:
- Orbitron - Headings
- Revalia - Body text, bullets

### Image Paths
Images referenced in markdown are relative to `public/`:
```markdown
![crystal](/images/logo.png)  # References public/images/logo.png
```

## Adding New Features

**New Sprite Type:**
1. Create class in `src/sprites/`
2. Extend with container-based approach
3. Add collision handling in `RoomScene.ts`
4. Clean up in `SlideManager.clearCurrentSlide()`

**New Markdown Element:**
1. Add type to `SlideElement` interface in `MarkdownParser.ts`
2. Add parsing logic in `parseSlide()`
3. Add layout logic in `AutoLayout.ts`
4. Create sprite class to render it

**New Scene:**
1. Create scene class in `src/scenes/`
2. Add to game config in `main.ts`
3. Use `this.scene.start('SceneKey')` to switch

## Dependencies

- `phaser@^3.90.0` - Game framework
- `vite@^7.3.1` - Build tool
- `typescript@^5.9.3` - Language

## Configuration Files

- `vite.config.ts` - Dev server on port 3000, base path `./`
- `tsconfig.json` - ES2020, strict mode, ESNext modules
- `flake.nix` - Nix development environment
