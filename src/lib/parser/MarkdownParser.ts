export interface SlideElement {
  type: 'heading' | 'bullet' | 'numbered' | 'paragraph' | 'code' | 'table';
  content: string;
  level?: number;
  number?: number;
  // For tables: parsed rows (header row + data rows)
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

// Convert markdown bold (**text**) to Phaser rich text ({b}text{/b})
function convertBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '{b}$1{/b}');
}

// Convert markdown italic (*text* or _text_) to Phaser rich text ({i}text{/i})
function convertItalic(text: string): string {
  // Process bold first to avoid conflicts, then italic
  const withBold = convertBold(text);
  // Convert *text* to italic (but not **text** which is already {b}text{/b})
  return withBold.replace(/\*{1}([^*]+)\*{1}/g, '{i}$1{/i}');
}

export interface SlideImage {
  key: string;
  filename: string;
  x?: number;           // Image display position
  y?: number;
  crystalX?: number;    // Crystal icon position (defaults to x/y if not set)
  crystalY?: number;
  width?: number;       // Image display size
  height?: number;
}

export interface StaticImage {
  type: 'static';
  filename: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Slide {
  elements: SlideElement[];
  images: SlideImage[];
  staticImages: StaticImage[];
}

export class MarkdownParser {
  parse(markdown: string): Slide[] {
    const slideTexts = markdown.split(/^---$/m).map((s) => s.trim());
    return slideTexts.filter((s) => s.length > 0).map((text) => this.parseSlide(text));
  }

  private parseSlide(text: string): Slide {
    const lines = text.split('\n');
    const elements: SlideElement[] = [];
    const images: SlideImage[] = [];
    const staticImages: StaticImage[] = [];

    let inCodeBlock = false;
    let codeContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push({
            type: 'code',
            content: codeContent.join('\n'),
          });
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Skip empty lines
      if (line.trim() === '') continue;

      // Crystal images: ![crystal](image.png){x=100 y=200}
      // Trim line to handle trailing whitespace
      const crystalImageMatch = line.trim().match(/^!\[crystal\]\(([^)]+)\)(?:\{([^}]+)\})?$/);
      if (crystalImageMatch) {
        const filename = crystalImageMatch[1].trim();
        const attrs = crystalImageMatch[2] || '';
        const image: SlideImage = { key: filename, filename };

        // Parse attributes like x=100 y=200 (allow whitespace around = or :)
        const xMatch = attrs.match(/x\s*[=:]\s*(\d+)/);
        const yMatch = attrs.match(/y\s*[=:]\s*(\d+)/);
        const crystalXMatch = attrs.match(/cx\s*[=:]\s*(\d+)/);
        const crystalYMatch = attrs.match(/cy\s*[=:]\s*(\d+)/);
        const widthMatch = attrs.match(/w(?:idth)?\s*[=:]\s*(\d+)/);
        const heightMatch = attrs.match(/h(?:eight)?\s*[=:]\s*(\d+)/);

        if (xMatch) image.x = parseInt(xMatch[1], 10);
        if (yMatch) image.y = parseInt(yMatch[1], 10);
        if (crystalXMatch) image.crystalX = parseInt(crystalXMatch[1], 10);
        if (crystalYMatch) image.crystalY = parseInt(crystalYMatch[1], 10);
        if (widthMatch) image.width = parseInt(widthMatch[1], 10);
        if (heightMatch) image.height = parseInt(heightMatch[1], 10);

        images.push(image);
        continue;
      }

      // Static images: ![alt](image.png){x=100 y=200} - NOT crystal images
      const staticImageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\{([^}]+)\})?$/);
      if (staticImageMatch && !line.includes('[crystal]')) {
        const filename = staticImageMatch[2].trim();
        const attrs = staticImageMatch[3] || '';
        const staticImg: StaticImage = { type: 'static', filename };

        // Parse attributes like x=100 y=200 w=100 h=100
        const xMatch = attrs.match(/x\s*[=:]\s*(\d+)/);
        const yMatch = attrs.match(/y\s*[=:]\s*(\d+)/);
        const widthMatch = attrs.match(/w(?:idth)?\s*[=:]\s*(\d+)/);
        const heightMatch = attrs.match(/h(?:eight)?\s*[=:]\s*(\d+)/);

        if (xMatch) staticImg.x = parseInt(xMatch[1], 10);
        if (yMatch) staticImg.y = parseInt(yMatch[1], 10);
        if (widthMatch) staticImg.width = parseInt(widthMatch[1], 10);
        if (heightMatch) staticImg.height = parseInt(heightMatch[1], 10);

        staticImages.push(staticImg);
        continue;
      }

      // Headings with support for explicit line breaks
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        let content = headingMatch[2];

        // Check for line continuation: lines ending with \ or two spaces
        while (i < lines.length - 1) {
          const endsWithBackslash = content.endsWith('\\');
          const endsWithTwoSpaces = content.endsWith('  ');

          if (endsWithBackslash || endsWithTwoSpaces) {
            // Remove the continuation marker
            if (endsWithBackslash) {
              content = content.slice(0, -1);
            } else {
              content = content.slice(0, -2);
            }
            // Look at next line
            const nextLine = lines[i + 1];
            // Stop if next line starts a new element
            if (nextLine.match(/^(#{1,3})\s+/) ||
                nextLine.match(/^\s*[-*]\s+/) ||
                nextLine.match(/^!\[crystal\]/) ||
                nextLine.match(/^!\[/) ||
                nextLine.startsWith('```') ||
                nextLine.trim() === '') {
              break;
            }
            i++;
            content += '\n' + nextLine.trim();
          } else {
            break;
          }
        }

        elements.push({
          type: 'heading',
          content: convertItalic(content),
          level: level,
        });
        continue;
      }

      // Bullets - support line continuation
      const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (bulletMatch) {
        const indent = Math.floor(bulletMatch[1].length / 2);
        let content = bulletMatch[2];

        // Check for line continuation: lines ending with \ or two spaces
        while (i < lines.length - 1) {
          const endsWithBackslash = content.endsWith('\\');
          const endsWithTwoSpaces = content.endsWith('  ');

          if (endsWithBackslash || endsWithTwoSpaces) {
            // Remove the continuation marker
            if (endsWithBackslash) {
              content = content.slice(0, -1);
            } else {
              content = content.slice(0, -2);
            }
            // Look at next line
            const nextLine = lines[i + 1];
            // Stop if next line starts a new element
            if (nextLine.match(/^(#{1,3})\s+/) ||
                nextLine.match(/^\s*[-*]\s+/) ||
                nextLine.match(/^\s*\d+\.\s+/) ||
                nextLine.match(/^!\[crystal\]/) ||
                nextLine.match(/^!\[/) ||
                nextLine.startsWith('```') ||
                nextLine.trim() === '') {
              break;
            }
            i++;
            content += '\n' + nextLine.trim();
          } else {
            break;
          }
        }

        elements.push({
          type: 'bullet',
          content: convertItalic(content),
          level: indent,
        });
        continue;
      }

      // Numbered lists (1., 2., etc.) - support multi-level and line continuation
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const indent = Math.floor(numberedMatch[1].length / 2);
        let content = numberedMatch[3];

        // Check for line continuation: lines ending with \ or two spaces
        while (i < lines.length - 1) {
          const endsWithBackslash = content.endsWith('\\');
          const endsWithTwoSpaces = content.endsWith('  ');

          if (endsWithBackslash || endsWithTwoSpaces) {
            // Remove the continuation marker
            if (endsWithBackslash) {
              content = content.slice(0, -1);
            } else {
              content = content.slice(0, -2);
            }
            // Look at next line
            const nextLine = lines[i + 1];
            // Stop if next line starts a new element
            if (nextLine.match(/^(#{1,3})\s+/) ||
                nextLine.match(/^\s*[-*]\s+/) ||
                nextLine.match(/^\s*\d+\.\s+/) ||
                nextLine.match(/^!\[crystal\]/) ||
                nextLine.match(/^!\[/) ||
                nextLine.startsWith('```') ||
                nextLine.trim() === '') {
              break;
            }
            i++;
            content += '\n' + nextLine.trim();
          } else {
            break;
          }
        }

        elements.push({
          type: 'numbered',
          content: convertItalic(content),
          level: indent,
          number: parseInt(numberedMatch[2], 10),
        });
        continue;
      }

      // Tables (GitHub-flavored markdown)
      // Detect table by line starting with |
      const tableMatch = line.match(/^\|(.+)\|$/);
      if (tableMatch) {
        const headers = tableMatch[1].split('|').map(h => h.trim()).filter(h => h);
        const rows: string[][] = [];
        i++; // Move to next line

        // Check for separator line (|---|---|) and skip it
        if (i < lines.length && lines[i].match(/^\|[-:|\s]+\|$/)) {
          i++;
        }

        // Parse data rows
        while (i < lines.length) {
          const rowLine = lines[i].trim();
          if (rowLine.match(/^\|(.+)\|$/)) {
            const cells = rowLine.slice(1, -1).split('|').map(c => c.trim());
            rows.push(cells);
            i++;
          } else {
            break;
          }
        }
        i--; // Back up one since main loop will increment

        elements.push({
          type: 'table',
          content: '', // Not used for tables
          tableData: {
            headers: headers.map(h => convertItalic(h)),
            rows: rows.map(r => r.map(c => convertItalic(c))),
          },
        });
        continue;
      }

      // Paragraphs (anything else) - support line continuation
      let content = line.trim();

      // Check for line continuation: lines ending with \ or two spaces, or unclosed ** / *
      while (i < lines.length - 1) {
        const endsWithBackslash = content.endsWith('\\');
        const endsWithTwoSpaces = content.endsWith('  ');

        // Count unclosed bold markers (pairs of **)
        const boldMatches = content.match(/\*\*/g);
        const hasUnclosedBold = boldMatches ? boldMatches.length % 2 !== 0 : false;

        // For italic: remove all ** first, then count remaining *
        const contentWithoutBold = content.replace(/\*\*/g, '');
        const italicMatches = contentWithoutBold.match(/\*/g);
        const hasUnclosedItalic = italicMatches ? italicMatches.length % 2 !== 0 : false;

        if (endsWithBackslash || endsWithTwoSpaces || hasUnclosedBold || hasUnclosedItalic) {
          // Remove explicit continuation marker
          if (endsWithBackslash) {
            content = content.slice(0, -1);
          } else if (endsWithTwoSpaces) {
            content = content.slice(0, -2);
          }
          // Look at next line
          const nextLine = lines[i + 1];
          // Stop if next line starts a new element
          if (nextLine.match(/^(#{1,3})\s+/) ||
              nextLine.match(/^\s*[-*]\s+/) ||
              nextLine.match(/^\s*\d+\.\s+/) ||
              nextLine.match(/^!\[crystal\]/) ||
              nextLine.match(/^!\[/) ||
              nextLine.startsWith('```') ||
              nextLine.trim() === '') {
            break;
          }
          i++;
          content += '\n' + nextLine.trim();
        } else {
          break;
        }
      }

      elements.push({
        type: 'paragraph',
        content: convertItalic(content),
      });
    }

    return { elements, images, staticImages };
  }
}
