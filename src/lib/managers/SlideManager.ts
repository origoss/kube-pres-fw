import Phaser from 'phaser';
import { MarkdownParser, Slide, SlideImage } from '../parser/MarkdownParser';
import { AutoLayout } from '../layout/AutoLayout';
import { TextObstacle } from '../sprites/TextObstacle';
import { CrystalImage } from '../sprites/CrystalImage';
import { StaticImage } from '../sprites/StaticImage';
import { Table } from '../sprites/Table';

export interface SlideObjects {
  textObstacles: TextObstacle[];
  crystals: CrystalImage[];
  staticImages: StaticImage[];
  tables: Table[];
}

export class SlideManager {
  private scene: Phaser.Scene;
  private parser: MarkdownParser;
  private layout: AutoLayout;
  private slides: Slide[] = [];
  private currentSlideIndex: number = 0;
  private textObstacles: TextObstacle[] = [];
  private crystals: CrystalImage[] = [];
  private staticImages: StaticImage[] = [];
  private tables: Table[] = [];
  private roomWidth: number = 1280;
  private isTransitioning: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.parser = new MarkdownParser();
    this.layout = new AutoLayout({ width: this.roomWidth });
  }

  loadMarkdown(markdown: string): void {
    this.slides = this.parser.parse(markdown);
  }

  getSlides(): Slide[] {
    return this.slides;
  }

  getCurrentSlideIndex(): number {
    return this.currentSlideIndex;
  }

  getTotalSlides(): number {
    return this.slides.length;
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }

  createCurrentSlide(): SlideObjects {
    this.clearCurrentSlide();

    if (this.slides.length === 0) return { textObstacles: [], crystals: [], staticImages: [], tables: [] };

    const slide = this.slides[this.currentSlideIndex];
    const layoutElements = this.layout.layout(slide);

    // Process layout elements, pairing with slide elements for tables
    let elementIndex = 0;
    for (const layoutEl of layoutElements) {
      const slideEl = slide.elements[elementIndex];
      
      if (slideEl.type === 'table' && slideEl.tableData) {
        // Create table with data from slide element
        const table = new Table(this.scene, layoutEl.x, layoutEl.y, slideEl.tableData);
        this.tables.push(table);
      } else {
        const obstacle = new TextObstacle(
          this.scene,
          layoutEl.x,
          layoutEl.y,
          layoutEl.content,
          {
            fontSize: layoutEl.fontSize,
            fontFamily: layoutEl.fontFamily,
            color: layoutEl.color,
            fontStyle: layoutEl.fontStyle,
            align: layoutEl.align,
          }
        );
        this.textObstacles.push(obstacle);
      }
      elementIndex++;
    }

    // Create crystals for this slide's images
    this.createSlideCrystals(slide.images);

    // Create static images for this slide
    this.createSlideStaticImages(slide.staticImages);

    return { textObstacles: this.textObstacles, crystals: this.crystals, staticImages: this.staticImages, tables: this.tables };
  }

  private createSlideCrystals(images: SlideImage[]): void {
    // Default positions for images without explicit coordinates
    const defaultPositions = [
      { x: 200, y: 200 },
      { x: 1080, y: 200 },
      { x: 200, y: 520 },
      { x: 1080, y: 520 },
      { x: 640, y: 360 },
    ];

    images.forEach((image, index) => {
      // Use explicit position from markdown or default position
      const x = image.x ?? defaultPositions[index % defaultPositions.length].x;
      const y = image.y ?? defaultPositions[index % defaultPositions.length].y;

      const crystal = new CrystalImage(
        this.scene,
        x,
        y,
        image.filename,
        image.width,      // Pass undefined if not set, so CrystalImage can calculate proportionally
        image.height,     // Pass undefined if not set, so CrystalImage can calculate proportionally
        image.crystalX,   // Crystal icon X position (defaults to image position)
        image.crystalY    // Crystal icon Y position (defaults to image position)
      );
      this.crystals.push(crystal);
    });
  }

  private createSlideStaticImages(staticImages: { type: 'static'; filename: string; x?: number; y?: number; width?: number; height?: number }[]): void {
    // Default positions for static images without explicit coordinates
    const defaultPositions = [
      { x: 640, y: 360 },
      { x: 200, y: 360 },
      { x: 1080, y: 360 },
    ];

    staticImages.forEach((image, index) => {
      // Use explicit position from markdown or default position
      const x = image.x ?? defaultPositions[index % defaultPositions.length].x;
      const y = image.y ?? defaultPositions[index % defaultPositions.length].y;

      const staticImg = new StaticImage(
        this.scene,
        x,
        y,
        image.filename,
        image.width,
        image.height
      );
      this.staticImages.push(staticImg);
    });
  }

  private clearCurrentSlide(): void {
    for (const obstacle of this.textObstacles) {
      obstacle.destroy();
    }
    this.textObstacles = [];

    for (const crystal of this.crystals) {
      // Also destroy close button if it exists
      const closeBtn = crystal.getCloseButton();
      if (closeBtn) {
        closeBtn.destroy();
      }
      crystal.getContainer().destroy();
    }
    this.crystals = [];

    for (const staticImg of this.staticImages) {
      staticImg.destroy();
    }
    this.staticImages = [];

    for (const table of this.tables) {
      table.destroy();
    }
    this.tables = [];
  }

  canGoNext(): boolean {
    return this.currentSlideIndex < this.slides.length - 1;
  }

  canGoPrev(): boolean {
    return this.currentSlideIndex > 0;
  }

  transitionToNext(
    camera: Phaser.Cameras.Scene2D.Camera,
    starship: { getSprite: () => Phaser.GameObjects.Container },
    onComplete: (objects: SlideObjects) => void
  ): void {
    if (!this.canGoNext() || this.isTransitioning) return;
    this.transition(1, camera, starship, onComplete);
  }

  transitionToPrev(
    camera: Phaser.Cameras.Scene2D.Camera,
    starship: { getSprite: () => Phaser.GameObjects.Container },
    onComplete: (objects: SlideObjects) => void
  ): void {
    if (!this.canGoPrev() || this.isTransitioning) return;
    this.transition(-1, camera, starship, onComplete);
  }

  transitionToNextWithKeyboard(
    camera: Phaser.Cameras.Scene2D.Camera,
    starship: { getSprite: () => Phaser.GameObjects.Container },
    onComplete: (objects: SlideObjects) => void
  ): void {
    if (!this.canGoNext() || this.isTransitioning) return;
    this.transitionWithKeyboard(1, camera, starship, onComplete);
  }

  transitionToPrevWithKeyboard(
    camera: Phaser.Cameras.Scene2D.Camera,
    starship: { getSprite: () => Phaser.GameObjects.Container },
    onComplete: (objects: SlideObjects) => void
  ): void {
    if (!this.canGoPrev() || this.isTransitioning) return;
    this.transitionWithKeyboard(-1, camera, starship, onComplete);
  }

  private transition(
    direction: 1 | -1,
    camera: Phaser.Cameras.Scene2D.Camera,
    starship: { getSprite: () => Phaser.GameObjects.Container },
    onComplete: (objects: SlideObjects) => void
  ): void {
    this.isTransitioning = true;

    const ship = starship.getSprite();
    
    // Ship should end up on the opposite side after transition
    const shipEndX = direction > 0 ? 150 : this.roomWidth - 150;

    this.scene.tweens.add({
      targets: camera,
      scrollX: this.roomWidth * direction,
      duration: 500,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.currentSlideIndex += direction;
        
        camera.scrollX = 0;
        ship.setX(ship.x - this.roomWidth * direction);
        
        this.clearCurrentSlide();
        const newObjects = this.createCurrentSlide();
        
        this.scene.tweens.add({
          targets: ship,
          x: shipEndX,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            this.isTransitioning = false;
            onComplete(newObjects);
          },
        });
      },
    });
  }

  private transitionWithKeyboard(
    direction: 1 | -1,
    camera: Phaser.Cameras.Scene2D.Camera,
    starship: { getSprite: () => Phaser.GameObjects.Container },
    onComplete: (objects: SlideObjects) => void
  ): void {
    this.isTransitioning = true;

    const ship = starship.getSprite();
    const shipStartX = ship.x;

    // Faster transition for keyboard navigation
    const CAMERA_DURATION = 300;
    const SHIP_FLY_DURATION = 200;

    this.scene.tweens.add({
      targets: camera,
      scrollX: this.roomWidth * direction,
      duration: CAMERA_DURATION,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.currentSlideIndex += direction;

        camera.scrollX = 0;

        // Keep ship at same relative position
        ship.setX(shipStartX);

        this.clearCurrentSlide();
        const newObjects = this.createCurrentSlide();

        // Ship stays in place - no tween needed
        this.isTransitioning = false;
        onComplete(newObjects);
      },
    });
  }

  getTextObstacles(): TextObstacle[] {
    return this.textObstacles;
  }

  getCrystals(): CrystalImage[] {
    return this.crystals;
  }

  reloadCurrentSlide(): SlideObjects {
    this.clearCurrentSlide();
    return this.createCurrentSlide();
  }
}
