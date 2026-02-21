# Slide Ship Markdown Format

Slide Ship uses an extended Markdown format for defining presentations.

## Basic Structure

Slides are separated by three dashes `---`:

```markdown
# First Slide Title

Content here

---

# Second Slide Title

More content
```

## Slide Elements

### Headings

Use `#` for headings. Three levels supported:

```markdown
# Level 1 Heading (Large, Cyan)
## Level 2 Heading (Medium, White)
### Level 3 Heading (Small, White)
```

#### Multi-Line Headings

Add explicit line breaks to headings using two trailing spaces or a backslash:

```markdown
# First Line  
Second Line

## Part One \
Part Two
```

**Syntax options:**
- Two spaces at end of line (`  `) + newline
- Backslash at end of line (`\`) + newline

### Bold Text

Use `**text**` for **bold** text in headings, bullets, and paragraphs:

```markdown
# **Important** Notice

This is a **bold** statement.

- **First** point
- **Second** point
```

### Italic Text

Use `*text*` for *italic* text in headings, bullets, and paragraphs:

```markdown
# *Emphasized* Title

This is *italic* text.

- *First* point
- *Second* point
```

You can combine **bold** and *italic*:

```markdown
This is **bold** and this is *italic*.
This is ***bold and italic***.
```

### Bullet Points

Use `-` or `*` for bullet points:

```markdown
- First point
- Second point
  - Indented point (2 spaces)
- Third point
```

### Paragraphs

Plain text becomes paragraphs:

```markdown
This is a paragraph of text that will be displayed
on the slide with automatic layout.
```

### Code Blocks

Use triple backticks for code:

```markdown
```typescript
const game = new Phaser.Game(config);
```
```

## Crystal Images

Crystal images are interactive elements that reveal images when shattered.

### Basic Syntax

```markdown
![crystal](/images/filename.png)
```

### With Position

```markdown
![crystal](/images/logo.png){x=200 y=300}
```

### With Size

```markdown
![crystal](/images/logo.png){w=150 h=150}
```

### Full Options

```markdown
![crystal](/images/logo.png){x=200 y=300 w=150 h=150}
```

### Attributes

| Attribute | Description | Default |
|-----------|-------------|---------|
| `x` | Horizontal position (pixels from left) | Auto-distributed |
| `y` | Vertical position (pixels from top) | Auto-distributed |
| `w` / `width` | Image width in pixels | 200 |
| `h` / `height` | Image height in pixels | 150 |

### Multiple Images

A slide can have multiple crystals:

```markdown
# Gallery Slide

![crystal](/images/photo1.png){x=200 y=200}
![crystal](/images/photo2.png){x=500 y=200}
![crystal](/images/photo3.png){x=800 y=200}
```

## Complete Example

```markdown
# Welcome to Slide Ship

## Gamified Presentations

- Fly your starship through slides
- Shoot or bump crystals to reveal images
- Navigate with arrow keys

![crystal](/images/ship.png){x=900 y=400}

---

# Features

## Interactive Elements
- Text highlights on collision
- Crystal images reveal on impact
- Smooth slide transitions

![crystal](/images/gamepad.png){x=1000 y=300 w=120 h=120}
![crystal](/images/rocket.png){x=1000 y=500 w=120 h=120}

---

# Code Example

Here's how to create a scene:

```typescript
class MyScene extends Phaser.Scene {
  create() {
    this.add.text(100, 100, 'Hello!');
  }
}
```

![crystal](/images/code.png){x=900 y=400 w=300 h=200}
```

## Game Controls

| Key | Action |
|-----|--------|
| Arrow Keys | Fly starship |
| Space | Shoot laser |
| Fly to right edge | Next slide |
| Fly to left edge | Previous slide |

## Crystal Interaction

- **Crystal state**: Glowing, pulsing crystal
- **Activate**: Shoot or bump into crystal
- **Shatter effect**: Crystal breaks into shards, reveals image
- **Reform**: Shoot/bump the X button to return to crystal state

## File Structure

Place images in the `public/images/` directory:

```
public/
  images/
    logo.png
    photo1.png
    photo2.png
```

Reference them with `/images/filename.png`.

## Tips

1. **Positioning**: If you don't specify x/y, crystals are auto-positioned around the slide
2. **Overlap**: Avoid placing crystals at the same position as text
3. **Slide edges**: Keep content within 100px of edges for clean transitions
4. **Image sizes**: Use `w` and `h` to control crystal/image size
5. **Multiple crystals**: Distribute them around the slide for better gameplay
