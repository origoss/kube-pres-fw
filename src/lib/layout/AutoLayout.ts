import { Slide, SlideElement } from '../parser/MarkdownParser';
import { theme } from '../../theme.config';

export interface LayoutElement {
  x: number;
  y: number;
  content: string;
  fontSize: string;
  color: string;
  fontFamily: string;
  fontStyle?: string;
  align?: 'left' | 'center';
  type?: string; // For special handling like 'table'
}

export interface LayoutConfig {
  width: number;
  height: number;
  padding: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  width: 1280,
  height: 720,
  padding: 80,
};

export class AutoLayout {
  private config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  layout(slide: Slide): LayoutElement[] {
    const elements: LayoutElement[] = [];
    let currentY = this.config.padding;

    for (const element of slide.elements) {
      const layoutElement = this.layoutElement(element, currentY);
      elements.push(layoutElement);
      currentY += this.getElementHeight(element) + this.getElementSpacing(element);
    }

    // Center vertically if content is short
    const totalHeight = currentY - this.getElementSpacing(slide.elements[slide.elements.length - 1]);
    if (totalHeight < this.config.height - this.config.padding * 2) {
      const offset = (this.config.height - totalHeight) / 2 - this.config.padding;
      elements.forEach((el) => (el.y += offset));
    }

    return elements;
  }

  private layoutElement(element: SlideElement, y: number): LayoutElement {
    const leftX = this.config.padding;

    switch (element.type) {
      case 'heading':
        return {
          x: leftX,
          y,
          content: element.content,
          fontSize: this.getHeadingSize(element.level || 1),
          color: element.level === 1 ? theme.text.headingColor : theme.text.accentColor,
          fontFamily: element.level === 1 || element.level === 2 || element.level === 3 ? 'Orbitron' : 'monospace',
          fontStyle: element.level === 2 || element.level === 3 ? 'bold' : 'normal',
        };

      case 'bullet':
        const bulletIndent = (element.level || 0) * 30;
        return {
          x: leftX + bulletIndent,
          y,
          content: '• ' + element.content,
          fontSize: '24px',
          color: theme.text.bodyColor,
          fontFamily: 'Revalia',
          align: 'left' as const,
        };

      case 'numbered':
        const numberIndent = (element.level || 0) * 30;
        const number = element.number || 1;
        return {
          x: leftX + numberIndent,
          y,
          content: number + '. ' + element.content,
          fontSize: '24px',
          color: theme.text.bodyColor,
          fontFamily: 'Revalia',
          align: 'left' as const,
        };

      case 'code':
        return {
          x: leftX,
          y,
          content: element.content,
          fontSize: '20px',
          color: '#88ff88',
          fontFamily: 'monospace',
          align: 'left' as const,
        };

      case 'table':
        // Tables are full-width, positioned at left padding
        return {
          x: leftX,
          y,
          content: '', // Tables handle their own rendering
          fontSize: '20px',
          color: theme.text.bodyColor,
          fontFamily: 'Revalia',
          type: 'table' as const, // Special marker
        };

      case 'paragraph':
      default:
        return {
          x: leftX,
          y,
          content: element.content,
          fontSize: '24px',
          color: theme.text.bodyColor,
          fontFamily: 'Revalia',
          align: 'left' as const,
        };
    }
  }

  private getHeadingSize(level: number): string {
    switch (level) {
      case 1:
        return '56px';
      case 2:
        return '40px';
      case 3:
        return '32px';
      default:
        return '28px';
    }
  }

  private getElementHeight(element: SlideElement): number {
    switch (element.type) {
      case 'heading': {
        const lineCount = element.content.split('\n').length;
        const lineHeight = element.level === 1 ? 70 : element.level === 2 ? 50 : 40;
        return lineHeight * lineCount;
      }
      case 'bullet': {
        const bulletLineCount = element.content.split('\n').length;
        return 35 * bulletLineCount;
      }
      case 'numbered': {
        const numLineCount = element.content.split('\n').length;
        return 35 * numLineCount;
      }
      case 'table': {
        // Calculate height based on number of rows
        const rowCount = element.tableData?.rows.length || 0;
        const headerHeight = 40;
        const rowHeight = 40;
        return headerHeight + (rowCount * rowHeight);
      }
      case 'code':
        const lines = element.content.split('\n').length;
        return lines * 24 + 20;
      default:
        return 35;
    }
  }

  private getElementSpacing(element: SlideElement): number {
    switch (element.type) {
      case 'heading':
        return element.level === 1 ? 40 : 25;
      case 'bullet':
      case 'numbered':
        return 15;
      case 'code':
        return 30;
      case 'table':
        return 20;
      default:
        return 20;
    }
  }
}
