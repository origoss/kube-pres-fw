import Phaser from 'phaser';

interface TextStyle {
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  fontStyle?: string;
  align?: 'left' | 'center';
}

// Parse content with {b}...{/b} and {i}...{/i} tags into segments
interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

function parseRichText(content: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Find the next tag
    const boldStart = remaining.indexOf('{b}');
    const italicStart = remaining.indexOf('{i}');

    // Find which tag comes first (if any)
    let nextTagIndex = -1;
    let tagType: 'bold' | 'italic' | null = null;

    if (boldStart !== -1 && italicStart !== -1) {
      if (boldStart < italicStart) {
        nextTagIndex = boldStart;
        tagType = 'bold';
      } else {
        nextTagIndex = italicStart;
        tagType = 'italic';
      }
    } else if (boldStart !== -1) {
      nextTagIndex = boldStart;
      tagType = 'bold';
    } else if (italicStart !== -1) {
      nextTagIndex = italicStart;
      tagType = 'italic';
    }

    if (nextTagIndex === -1) {
      // No more tags
      if (remaining.length > 0) {
        segments.push({ text: remaining, bold: false, italic: false });
      }
      break;
    }

    // Add normal text before the tag
    if (nextTagIndex > 0) {
      segments.push({ text: remaining.slice(0, nextTagIndex), bold: false, italic: false });
    }

    // Find end tag
    const endTag = tagType === 'bold' ? '{/b}' : '{/i}';
    const tagEnd = remaining.indexOf(endTag, nextTagIndex);

    if (tagEnd === -1) {
      // No closing tag, treat rest as normal
      segments.push({ text: remaining.slice(nextTagIndex), bold: false, italic: false });
      break;
    }

    // Add styled text
    const styledText = remaining.slice(nextTagIndex + 3, tagEnd);
    if (styledText.length > 0) {
      // Check if this text has nested tags
      const hasNestedBold = styledText.includes('{b}');
      const hasNestedItalic = styledText.includes('{i}');

      if (hasNestedBold || hasNestedItalic) {
        // Recursively parse nested content
        const nestedSegments = parseRichText(styledText);
        // Apply current style to all nested segments
        nestedSegments.forEach(seg => {
          segments.push({
            text: seg.text,
            bold: tagType === 'bold' || seg.bold,
            italic: tagType === 'italic' || seg.italic
          });
        });
      } else {
        segments.push({
          text: styledText,
          bold: tagType === 'bold',
          italic: tagType === 'italic'
        });
      }
    }

    remaining = remaining.slice(tagEnd + 4);
  }

  return segments;
}

// Parse rich text and split into lines while preserving formatting
function parseRichTextMultiline(content: string): TextSegment[][] {
  const segments = parseRichText(content);
  const lines: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];

  for (const segment of segments) {
    const text = segment.text;
    let start = 0;

    while (start < text.length) {
      const newlineIndex = text.indexOf('\n', start);

      if (newlineIndex === -1) {
        // No more newlines, add rest to current line
        currentLine.push({
          text: text.slice(start),
          bold: segment.bold,
          italic: segment.italic
        });
        break;
      } else {
        // Found newline, add text up to newline, then start new line
        currentLine.push({
          text: text.slice(start, newlineIndex),
          bold: segment.bold,
          italic: segment.italic
        });
        lines.push(currentLine);
        currentLine = [];
        start = newlineIndex + 1;
      }
    }
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Handle empty content case
  if (lines.length === 0 && content.length > 0) {
    lines.push([]);
  }

  return lines;
}

export class TextObstacle {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private physicsBody: Phaser.GameObjects.Rectangle;
  private body: Phaser.Physics.Arcade.Body;
  private originalColor: string;
  private fontSize: string;
  private fontFamily: string;
  private fontStyle: string;
  private align: 'left' | 'center';
  private isFlashing: boolean = false;
  private flashTween?: Phaser.Tweens.Tween;
  private textObjects: Phaser.GameObjects.Text[] = [];
  private isHovered: boolean = false;
  private hoverTimeout?: number;
  private hoverScaleTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    content: string,
    style: TextStyle = {}
  ) {
    this.scene = scene;
    this.originalColor = style.color || '#ffffff';
    this.fontSize = style.fontSize || '24px';
    this.fontFamily = style.fontFamily || 'monospace';
    this.fontStyle = style.fontStyle || 'normal';
    this.align = style.align || 'center';

    const padding = 10;
    const lineHeight = parseInt(this.fontSize) * 1.2;

    // Parse rich text and split by lines while preserving formatting
    const allSegments = parseRichTextMultiline(content);
    let totalWidth = 0;

    for (const lineSegments of allSegments) {
      let lineWidth = 0;
      for (const seg of lineSegments) {
        const tempText = scene.add.text(0, 0, seg.text, {
          fontSize: this.fontSize,
          fontFamily: this.fontFamily,
        });
        lineWidth += tempText.width;
        tempText.destroy();
      }
      totalWidth = Math.max(totalWidth, lineWidth);
    }

    // Calculate positions based on alignment
    const isLeftAlign = this.align === 'left';
    const containerX = isLeftAlign ? x + totalWidth / 2 : x + totalWidth / 2;
    const containerY = y + ((allSegments.length - 1) * lineHeight) / 2;

    // Create invisible physics rectangle at text position
    this.physicsBody = scene.add.rectangle(
      containerX,
      containerY,
      totalWidth + padding,
      lineHeight * allSegments.length + padding,
      0x000000,
      0
    );
    scene.physics.world.enable(this.physicsBody);
    this.body = this.physicsBody.body as Phaser.Physics.Arcade.Body;
    this.body.setImmovable(true);

    // Create container for visual text
    this.container = scene.add.container(containerX, containerY);
    this.createTextSegments(allSegments, totalWidth);
  }

  private createTextSegments(allSegments: TextSegment[][], totalWidth: number): void {
    const lineHeight = parseInt(this.fontSize) * 1.2;
    const numLines = allSegments.length;

    // Position text segments in container
    // Vertically center all lines around y=0
    const startY = -((numLines - 1) * lineHeight) / 2;
    const isLeftAlign = this.align === 'left';

    // Calculate indent for list items (numbered or bullet)
    // If first line starts with "N. " or "• " pattern, subsequent lines should be indented
    let listIndent = 0;
    if (numLines > 1 && allSegments[0].length > 0) {
      const firstSegment = allSegments[0][0];
      if (firstSegment && !firstSegment.bold && !firstSegment.italic) {
        // Check for numbered list "N. "
        const numberMatch = firstSegment.text.match(/^(\d+\.\s+)/);
        // Check for bullet "• "
        const bulletMatch = firstSegment.text.match(/^(•\s+)/);
        const prefix = numberMatch?.[1] || bulletMatch?.[1];
        if (prefix) {
          const tempText = this.scene.add.text(0, 0, prefix, {
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
          });
          listIndent = tempText.width;
          tempText.destroy();
        }
      }
    }

    for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
      const segments = allSegments[lineIndex];
      const lineWidth = this.calculateLineWidth(segments);

      // For left alignment: align all lines to the left edge of the container
      // For center alignment: center each line individually
      // For subsequent lines of numbered items: add indent to align with text after number
      let currentX = isLeftAlign ? -totalWidth / 2 : -lineWidth / 2;
      const currentY = startY + lineIndex * lineHeight;

      // Add indent for subsequent lines of list items
      if (lineIndex > 0 && listIndent > 0) {
        currentX += listIndent;
      }

      for (const segment of segments) {
        // Determine font style: bold, italic, bold italic, or normal
        // Combine base fontStyle with segment styling
        const isBold = segment.bold || this.fontStyle.includes('bold');
        const isItalic = segment.italic || this.fontStyle.includes('italic');

        let fontStyle: string;
        if (isBold && isItalic) {
          fontStyle = 'bold italic';
        } else if (isBold) {
          fontStyle = 'bold';
        } else if (isItalic) {
          fontStyle = 'italic';
        } else {
          fontStyle = 'normal';
        }

        const textObj = this.scene.add.text(currentX, currentY, segment.text, {
          fontSize: this.fontSize,
          fontFamily: this.fontFamily,
          color: this.originalColor,
        });
        if (isBold) {
          (textObj as Phaser.GameObjects.Text).setFontStyle('bold');
        }
        if (isItalic) {
          (textObj as Phaser.GameObjects.Text).setFontStyle('italic');
        }
        textObj.setOrigin(0, 0.5);
        this.container.add(textObj);
        this.textObjects.push(textObj);

        currentX += textObj.width;
      }
    }

    this.container.setSize(totalWidth, lineHeight * numLines);
  }

  private calculateLineWidth(segments: TextSegment[]): number {
    let width = 0;
    for (const seg of segments) {
      const tempText = this.scene.add.text(0, 0, seg.text, {
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
      });
      width += tempText.width;
      tempText.destroy();
    }
    return width;
  }

  onCollision(source: 'ship' | 'laser' = 'laser'): void {
    if (source === 'ship') {
      // Start or renew hover effect while ship is over text
      this.startOrRenewHover();
    } else {
      // Laser collision - play full flash effect with sound
      if (this.isFlashing) return;
      this.isFlashing = true;
      this.playCollisionSound();
      this.playFlashEffect();
    }
  }

  private startOrRenewHover(): void {
    if (!this.isHovered) {
      this.startHover();
    }
    // Clear existing timeout and set new one
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
    }
    // End hover after 100ms if not renewed
    this.hoverTimeout = window.setTimeout(() => {
      this.endHover();
    }, 100);
  }

  private startHover(): void {
    if (this.isHovered) return;
    this.isHovered = true;

    // Stop any existing scale tween
    if (this.hoverScaleTween) {
      this.hoverScaleTween.stop();
    }

    // Smooth scale up to 105%
    this.hoverScaleTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Sine.easeOut',
    });

    // Change to brighter color
    const brighterColor = this.getBrighterColor(this.originalColor);
    this.textObjects.forEach((text) => {
      if (text.active) {
        text.setColor(brighterColor);
      }
    });
  }

  private endHover(): void {
    if (!this.isHovered) return;
    this.isHovered = false;

    // Stop any existing scale tween
    if (this.hoverScaleTween) {
      this.hoverScaleTween.stop();
    }

    // Smooth scale back to 100%
    this.hoverScaleTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Sine.easeOut',
    });

    // Restore original color
    this.textObjects.forEach((text) => {
      if (text.active) {
        text.setColor(this.originalColor);
      }
    });
  }

  private getBrighterColor(color: string): string {
    // Simple brightness increase for hex colors
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 60);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 60);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 60);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private playCollisionSound(): void {
    try {
      const audioContext = TextObstacle.getAudioContext();

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      const now = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  private static audioContext: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!TextObstacle.audioContext) {
      TextObstacle.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (TextObstacle.audioContext.state === 'suspended') {
      TextObstacle.audioContext.resume();
    }
    return TextObstacle.audioContext;
  }

  private playFlashEffect(): void {
    if (!this.container.active) return;

    if (this.flashTween) {
      this.flashTween.stop();
    }

    const flashColors = ['#ffffff', '#00ffff', '#ff00ff', '#ffff00'];
    let colorIndex = 0;

    const originalX = this.container.x;

    const colorFlash = this.scene.time.addEvent({
      delay: 50,
      repeat: 4,
      callback: () => {
        const color = flashColors[colorIndex % flashColors.length];
        this.textObjects.forEach((text) => {
          if (text.active) {
            text.setColor(color);
          }
        });
        // Small horizontal wiggle: 3 pixels left/right
        this.container.x = originalX + (colorIndex % 2 === 0 ? 3 : -3);
        colorIndex++;
      },
    });

    this.flashTween = this.scene.tweens.add({
      targets: this.container,
      x: originalX,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => {
        colorFlash.destroy();
        this.container.x = originalX;
        this.scene.time.delayedCall(10, () => {
          this.textObjects.forEach((text) => {
            if (text.active) {
              text.setColor(this.originalColor);
            }
          });
          this.isFlashing = false;
        });
      },
    });

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.5,
      yoyo: true,
      duration: 50,
      repeat: 3,
      onComplete: () => {
        if (this.container.active) {
          this.container.setAlpha(1);
        }
      },
    });
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body;
  }

  getText(): Phaser.GameObjects.Rectangle {
    return this.physicsBody;
  }

  destroy(): void {
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
    }
    this.physicsBody.destroy();
    this.container.destroy();
  }
}
