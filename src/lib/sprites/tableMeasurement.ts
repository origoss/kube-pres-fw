import Phaser from 'phaser';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface TableMeasurement {
  colWidths: number[];
  totalWidth: number;
  headerHeight: number;
  rowHeights: number[];
  totalHeight: number;
}

const PADDING_X = 15;
const PADDING_Y = 10;
const MIN_CELL_HEIGHT = 40;
const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 500;
const SLIDE_WIDTH = 1280 - 160;
const FONT_SIZE = '20px';
const FONT_FAMILY = 'Revalia';

function measureTextWidth(scene: Phaser.Scene, text: string, isHeader: boolean): number {
  const tempText = scene.add.text(0, 0, text, {
    fontSize: FONT_SIZE,
    fontFamily: FONT_FAMILY,
    fontStyle: isHeader ? 'bold' : 'normal',
  });
  tempText.setVisible(false);

  const width = tempText.width;
  tempText.destroy();

  return width;
}

function measureTextHeight(scene: Phaser.Scene, text: string, wrapWidth: number, isHeader: boolean): number {
  const tempText = scene.add.text(0, 0, text, {
    fontSize: FONT_SIZE,
    fontFamily: FONT_FAMILY,
    fontStyle: isHeader ? 'bold' : 'normal',
    wordWrap: { width: wrapWidth },
  });
  tempText.setVisible(false);

  const height = tempText.height + (PADDING_Y * 2);
  tempText.destroy();

  return height;
}

function calculateColumnWidths(scene: Phaser.Scene, tableData: TableData): number[] {
  const { headers, rows } = tableData;
  const colWidths: number[] = [];

  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    let maxWidth = measureTextWidth(scene, headers[colIndex], true);

    rows.forEach((row) => {
      maxWidth = Math.max(maxWidth, measureTextWidth(scene, row[colIndex] || '', false));
    });

    let optimalWidth = maxWidth + (PADDING_X * 2);
    optimalWidth = Math.max(optimalWidth, MIN_COL_WIDTH);
    optimalWidth = Math.min(optimalWidth, MAX_COL_WIDTH);
    colWidths.push(optimalWidth);
  }

  const totalOptimalWidth = colWidths.reduce((sum, width) => sum + width, 0);
  if (totalOptimalWidth === 0) {
    return [];
  }

  if (totalOptimalWidth > SLIDE_WIDTH) {
    const scaleFactor = SLIDE_WIDTH / totalOptimalWidth;
    return colWidths.map((width) => Math.max(width * scaleFactor, MIN_COL_WIDTH));
  }

  if (totalOptimalWidth < SLIDE_WIDTH) {
    const scaleFactor = SLIDE_WIDTH / totalOptimalWidth;
    return colWidths.map((width) => width * scaleFactor);
  }

  return colWidths;
}

export function measureTable(scene: Phaser.Scene, tableData: TableData): TableMeasurement {
  const { headers, rows } = tableData;
  if (headers.length === 0) {
    return {
      colWidths: [],
      totalWidth: 0,
      headerHeight: 0,
      rowHeights: [],
      totalHeight: 0,
    };
  }

  const colWidths = calculateColumnWidths(scene, tableData);
  const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);

  const headerHeight = headers.reduce((maxHeight, header, colIndex) => {
    const wrapWidth = colWidths[colIndex] - (PADDING_X * 2);
    const height = measureTextHeight(scene, header, wrapWidth, true);
    return Math.max(maxHeight, Math.max(height, MIN_CELL_HEIGHT));
  }, MIN_CELL_HEIGHT);

  const rowHeights = rows.map((row) => {
    let maxRowHeight = MIN_CELL_HEIGHT;

    row.forEach((cell, colIndex) => {
      const wrapWidth = colWidths[colIndex] - (PADDING_X * 2);
      const height = measureTextHeight(scene, cell, wrapWidth, false);
      maxRowHeight = Math.max(maxRowHeight, height);
    });

    return maxRowHeight;
  });

  const totalHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0);

  return {
    colWidths,
    totalWidth,
    headerHeight,
    rowHeights,
    totalHeight,
  };
}

export const TABLE_STYLE = {
  PADDING_X,
  PADDING_Y,
  MIN_CELL_HEIGHT,
  FONT_SIZE,
  FONT_FAMILY,
};
