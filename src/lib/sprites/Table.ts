import Phaser from 'phaser';
import { measureTable, TABLE_STYLE, TableData, TableMeasurement } from './tableMeasurement';

export class Table {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private tableData: TableData;
  private cellObjects: Phaser.GameObjects.Text[] = [];
  private backgroundGraphics: Phaser.GameObjects.Graphics;
  private measurement: TableMeasurement;

  // Styling
  private readonly HEADER_BG_COLOR = 0x1a4a7a;  // Dark blue
  private readonly ROW_BG_COLOR = 0x0a1a2a;      // Darker blue
  private readonly BORDER_COLOR = 0x326ce5;      // Kubernetes blue
  private readonly TEXT_COLOR = '#aaccff';
  private readonly HEADER_TEXT_COLOR = '#ffffff';

  constructor(scene: Phaser.Scene, x: number, y: number, tableData: TableData) {
    this.scene = scene;
    this.tableData = tableData;

    this.container = scene.add.container(x, y);
    this.container.setDepth(6); // In front of text, below ship

    this.backgroundGraphics = scene.add.graphics();
    this.container.add(this.backgroundGraphics);

    this.measurement = measureTable(this.scene, this.tableData);

    this.renderTable();
  }

  private renderTable(): void {
    const { headers, rows } = this.tableData;
    const { colWidths, totalWidth, headerHeight, rowHeights, totalHeight } = this.measurement;
    const { PADDING_X, PADDING_Y, FONT_SIZE, FONT_FAMILY } = TABLE_STYLE;

    this.backgroundGraphics.clear();

    // Draw header background
    this.backgroundGraphics.fillStyle(this.HEADER_BG_COLOR, 0.9);
    this.backgroundGraphics.fillRect(0, 0, totalWidth, headerHeight);

    // Draw row backgrounds
    let currentY = headerHeight;
    for (let i = 0; i < rows.length; i++) {
      this.backgroundGraphics.fillStyle(this.ROW_BG_COLOR, 0.8);
      this.backgroundGraphics.fillRect(0, currentY, totalWidth, rowHeights[i]);
      currentY += rowHeights[i];
    }

    // Draw borders
    this.backgroundGraphics.lineStyle(2, this.BORDER_COLOR, 0.8);
    this.backgroundGraphics.strokeRect(0, 0, totalWidth, totalHeight);

    let currentX = 0;
    for (let i = 1; i < headers.length; i++) {
      currentX += colWidths[i - 1];
      this.backgroundGraphics.lineBetween(currentX, 0, currentX, totalHeight);
    }

    currentY = headerHeight;
    this.backgroundGraphics.lineBetween(0, currentY, totalWidth, currentY);
    for (let i = 0; i < rows.length - 1; i++) {
      currentY += rowHeights[i];
      this.backgroundGraphics.lineBetween(0, currentY, totalWidth, currentY);
    }

    currentX = 0;
    headers.forEach((header, colIndex) => {
      const text = this.scene.add.text(currentX + PADDING_X, PADDING_Y, header, {
        fontSize: FONT_SIZE,
        fontFamily: FONT_FAMILY,
        color: this.HEADER_TEXT_COLOR,
        fontStyle: 'bold',
        wordWrap: { width: colWidths[colIndex] - (PADDING_X * 2) },
      });
      text.setOrigin(0, 0);
      this.container.add(text);
      this.cellObjects.push(text);
      currentX += colWidths[colIndex];
    });

    currentY = headerHeight;
    rows.forEach((row, rowIndex) => {
      currentX = 0;
      const cellY = currentY + PADDING_Y;
      row.forEach((cell, colIndex) => {
        const text = this.scene.add.text(currentX + PADDING_X, cellY, cell, {
          fontSize: FONT_SIZE,
          fontFamily: FONT_FAMILY,
          color: this.TEXT_COLOR,
          wordWrap: { width: colWidths[colIndex] - (PADDING_X * 2) },
        });
        text.setOrigin(0, 0);
        this.container.add(text);
        this.cellObjects.push(text);
        currentX += colWidths[colIndex];
      });
      currentY += rowHeights[rowIndex];
    });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getDimensions(): { width: number; height: number } {
    return {
      width: this.measurement.totalWidth,
      height: this.measurement.totalHeight,
    };
  }

  destroy(): void {
    this.cellObjects.forEach(obj => obj.destroy());
    this.backgroundGraphics.destroy();
    this.container.destroy();
  }
}
