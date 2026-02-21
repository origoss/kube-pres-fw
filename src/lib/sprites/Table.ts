import Phaser from 'phaser';

interface TableData {
  headers: string[];
  rows: string[][];
}

interface CellHeightInfo {
  headerHeights: number[];
  rowHeights: number[];
}

export class Table {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private tableData: TableData;
  private cellObjects: Phaser.GameObjects.Text[] = [];
  private backgroundGraphics: Phaser.GameObjects.Graphics;
  private calculatedHeights: CellHeightInfo;
  private colWidths: number[] = [];
  private totalWidth: number = 0;
  private totalHeight: number = 0;

  // Styling
  private readonly PADDING_X = 15;
  private readonly PADDING_Y = 10;
  private readonly MIN_CELL_HEIGHT = 40;
  private readonly MIN_COL_WIDTH = 60;
  private readonly MAX_COL_WIDTH = 500;
  private readonly SLIDE_WIDTH = 1280 - 160;
  private readonly HEADER_BG_COLOR = 0x1a4a7a;  // Dark blue
  private readonly ROW_BG_COLOR = 0x0a1a2a;      // Darker blue
  private readonly BORDER_COLOR = 0x326ce5;      // Kubernetes blue
  private readonly TEXT_COLOR = '#aaccff';
  private readonly HEADER_TEXT_COLOR = '#ffffff';
  private readonly FONT_SIZE = '20px';
  private readonly FONT_FAMILY = 'Revalia';

  constructor(scene: Phaser.Scene, x: number, y: number, tableData: TableData) {
    this.scene = scene;
    this.tableData = tableData;

    this.container = scene.add.container(x, y);
    this.container.setDepth(6); // In front of text, below ship

    this.backgroundGraphics = scene.add.graphics();
    this.container.add(this.backgroundGraphics);

    // Calculate optimal column widths first
    this.colWidths = this.calculateColumnWidths();
    this.totalWidth = this.colWidths.reduce((sum, w) => sum + w, 0);

    // Calculate heights based on the column widths
    this.calculatedHeights = this.calculateHeights();

    this.renderTable();
  }

  private calculateTextWidth(text: string, isHeader: boolean): number {
    // Create temporary text to measure unwrapped width
    const tempText = this.scene.add.text(0, 0, text, {
      fontSize: this.FONT_SIZE,
      fontFamily: this.FONT_FAMILY,
      fontStyle: isHeader ? 'bold' : 'normal',
    });
    tempText.setVisible(false);

    const width = tempText.width;
    tempText.destroy();

    return width;
  }

  private calculateColumnWidths(): number[] {
    const { headers, rows } = this.tableData;
    const numCols = headers.length;
    const colWidths: number[] = [];

    // Calculate optimal width for each column
    for (let colIndex = 0; colIndex < numCols; colIndex++) {
      let maxWidth = 0;

      // Check header width
      const headerWidth = this.calculateTextWidth(headers[colIndex], true);
      maxWidth = Math.max(maxWidth, headerWidth);

      // Check all cell widths in this column
      rows.forEach((row) => {
        const cellText = row[colIndex] || '';
        const cellWidth = this.calculateTextWidth(cellText, false);
        maxWidth = Math.max(maxWidth, cellWidth);
      });

      // Add padding and apply min/max constraints
      let optimalWidth = maxWidth + (this.PADDING_X * 2);
      optimalWidth = Math.max(optimalWidth, this.MIN_COL_WIDTH);
      optimalWidth = Math.min(optimalWidth, this.MAX_COL_WIDTH);

      colWidths.push(optimalWidth);
    }

    // Check total width and adjust to fill slide width
    const totalOptimalWidth = colWidths.reduce((sum, w) => sum + w, 0);

    if (totalOptimalWidth > this.SLIDE_WIDTH) {
      // Scale down proportionally to fit slide width
      const scaleFactor = this.SLIDE_WIDTH / totalOptimalWidth;
      return colWidths.map(w => Math.max(w * scaleFactor, this.MIN_COL_WIDTH));
    }

    if (totalOptimalWidth < this.SLIDE_WIDTH) {
      // Expand columns proportionally to fill slide width
      const scaleFactor = this.SLIDE_WIDTH / totalOptimalWidth;
      return colWidths.map(w => w * scaleFactor);
    }

    return colWidths;
  }

  private calculateHeights(): CellHeightInfo {
    const { headers, rows } = this.tableData;

    const headerHeights: number[] = [];
    const rowHeights: number[] = [];

    // Calculate header heights
    headers.forEach((header, colIndex) => {
      const wrapWidth = this.colWidths[colIndex] - (this.PADDING_X * 2);
      const height = this.calculateTextHeight(header, wrapWidth, true);
      headerHeights.push(Math.max(height, this.MIN_CELL_HEIGHT));
    });

    // Calculate row heights (max height of all cells in the row)
    rows.forEach((row) => {
      let maxRowHeight = this.MIN_CELL_HEIGHT;
      row.forEach((cell, colIndex) => {
        const wrapWidth = this.colWidths[colIndex] - (this.PADDING_X * 2);
        const height = this.calculateTextHeight(cell, wrapWidth, false);
        maxRowHeight = Math.max(maxRowHeight, height);
      });
      rowHeights.push(maxRowHeight);
    });

    // Calculate total height
    const headerTotalHeight = headerHeights.reduce((sum, h) => sum + h, 0) / headerHeights.length;
    const dataTotalHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    this.totalHeight = headerTotalHeight + dataTotalHeight;

    return { headerHeights, rowHeights };
  }

  private calculateTextHeight(text: string, wrapWidth: number, isHeader: boolean): number {
    // Create temporary text to measure height
    const tempText = this.scene.add.text(0, 0, text, {
      fontSize: this.FONT_SIZE,
      fontFamily: this.FONT_FAMILY,
      fontStyle: isHeader ? 'bold' : 'normal',
      wordWrap: { width: wrapWidth },
    });
    tempText.setVisible(false);

    const height = tempText.height + (this.PADDING_Y * 2);
    tempText.destroy();

    return height;
  }

  private renderTable(): void {
    const { headers, rows } = this.tableData;
    const numCols = headers.length;
    const numRows = rows.length;

    const { headerHeights, rowHeights } = this.calculatedHeights;
    const headerHeight = headerHeights[0] || this.MIN_CELL_HEIGHT;

    // Draw table background and borders
    this.backgroundGraphics.clear();

    // Draw header background
    this.backgroundGraphics.fillStyle(this.HEADER_BG_COLOR, 0.9);
    this.backgroundGraphics.fillRect(0, 0, this.totalWidth, headerHeight);

    // Draw row backgrounds (alternating)
    let currentY = headerHeight;
    for (let i = 0; i < numRows; i++) {
      this.backgroundGraphics.fillStyle(this.ROW_BG_COLOR, 0.8);
      this.backgroundGraphics.fillRect(0, currentY, this.totalWidth, rowHeights[i]);
      currentY += rowHeights[i];
    }

    // Draw borders
    this.backgroundGraphics.lineStyle(2, this.BORDER_COLOR, 0.8);
    // Outer border
    this.backgroundGraphics.strokeRect(0, 0, this.totalWidth, this.totalHeight);

    // Vertical lines
    let currentX = 0;
    for (let i = 1; i < numCols; i++) {
      currentX += this.colWidths[i - 1];
      this.backgroundGraphics.lineBetween(currentX, 0, currentX, this.totalHeight);
    }

    // Horizontal lines (between header and rows, and between rows)
    currentY = headerHeight;
    // Line between header and first row
    this.backgroundGraphics.lineBetween(0, currentY, this.totalWidth, currentY);
    // Lines between rows
    for (let i = 0; i < numRows - 1; i++) {
      currentY += rowHeights[i];
      this.backgroundGraphics.lineBetween(0, currentY, this.totalWidth, currentY);
    }

    // Create header text
    currentX = 0;
    headers.forEach((header, colIndex) => {
      const text = this.scene.add.text(
        currentX + this.PADDING_X,
        this.PADDING_Y,
        header,
        {
          fontSize: this.FONT_SIZE,
          fontFamily: this.FONT_FAMILY,
          color: this.HEADER_TEXT_COLOR,
          fontStyle: 'bold',
          wordWrap: { width: this.colWidths[colIndex] - (this.PADDING_X * 2) },
        }
      );
      text.setOrigin(0, 0);
      this.container.add(text);
      this.cellObjects.push(text);
      currentX += this.colWidths[colIndex];
    });

    // Create cell text
    currentY = headerHeight;
    rows.forEach((row, rowIndex) => {
      currentX = 0;
      const cellY = currentY + this.PADDING_Y;
      row.forEach((cell, colIndex) => {
        const text = this.scene.add.text(
          currentX + this.PADDING_X,
          cellY,
          cell,
          {
            fontSize: this.FONT_SIZE,
            fontFamily: this.FONT_FAMILY,
            color: this.TEXT_COLOR,
            wordWrap: { width: this.colWidths[colIndex] - (this.PADDING_X * 2) },
          }
        );
        text.setOrigin(0, 0);
        this.container.add(text);
        this.cellObjects.push(text);
        currentX += this.colWidths[colIndex];
      });
      currentY += rowHeights[rowIndex];
    });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.totalWidth, height: this.totalHeight };
  }

  destroy(): void {
    this.cellObjects.forEach(obj => obj.destroy());
    this.backgroundGraphics.destroy();
    this.container.destroy();
  }
}
