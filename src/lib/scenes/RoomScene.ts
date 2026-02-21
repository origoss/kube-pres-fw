import Phaser from 'phaser';
import { Starship } from '../sprites/Starship';
import { TextObstacle } from '../sprites/TextObstacle';
import { SlideManager } from '../managers/SlideManager';
import { CrystalImage } from '../sprites/CrystalImage';
import { StaticImage } from '../sprites/StaticImage';
import { Table } from '../sprites/Table';
import { ArcadeHUD } from '../sprites/ArcadeHUD';
import { theme } from '../../theme.config';

const SAMPLE_PRESENTATION = `
# Welcome to Slide Ship

## Loading Error

Could not load slides.md.

This is a fallback presentation.

---

# Getting Started

1. Create a slides.md file in the public folder
2. Edit your slides in Markdown
3. Refresh the page

---

# Controls

- **Arrow keys** or **WASD** to fly
- **SPACE** to shoot lasers
- Fly off-screen edges to change slides
`;

export class RoomScene extends Phaser.Scene {
  private starship!: Starship;
  private textObstacles: TextObstacle[] = [];
  private crystals: CrystalImage[] = [];
  private staticImages: StaticImage[] = [];
  private tables: Table[] = [];
  private customCursor!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private slideManager!: SlideManager;
  private hud!: ArcadeHUD;
  private loadingText!: Phaser.GameObjects.Text;
  private currentMarkdown: string = SAMPLE_PRESENTATION;
  private lastModified: string | null = null;
  private isPointerOverCanvas: boolean = false;

  constructor() {
    super({ key: 'RoomScene' });
  }

  create(): void {
    this.createBackground();
    this.createStarship();
    this.setupInput();
    this.createCustomCursor();
    this.showLoadingText();
    this.loadSlides().then(() => {
      this.hideLoadingText();
      this.setupSlideManager();
      this.setupCollisions();
      this.createHUD();
      this.startHotReload();
    });
  }

  private showLoadingText(): void {
    this.loadingText = this.add.text(640, 360, 'Loading...', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00aaff',
    });
    this.loadingText.setOrigin(0.5);
    this.loadingText.setScrollFactor(0);
    this.loadingText.setDepth(1000);
  }

  private hideLoadingText(): void {
    if (this.loadingText) {
      this.loadingText.destroy();
    }
  }

  private async loadSlides(): Promise<void> {
    try {
      const response = await fetch('/slides.md', { cache: 'no-cache' });
      if (response.ok) {
        this.currentMarkdown = await response.text();
        this.lastModified = response.headers.get('last-modified');
      } else {
        console.log('slides.md not found (status: ' + response.status + '), using sample presentation');
        this.currentMarkdown = SAMPLE_PRESENTATION;
      }
    } catch (error) {
      console.log('Failed to load slides.md, using sample presentation:', error);
      this.currentMarkdown = SAMPLE_PRESENTATION;
    }
  }

  private startHotReload(): void {
    // Poll for file changes every 2 seconds in dev mode
    if (import.meta.env.DEV) {
      this.time.addEvent({
        delay: 2000,
        callback: () => {
          this.checkForChanges().catch(() => {});
        },
        callbackScope: this,
        loop: true,
      });
    }
  }

  private async checkForChanges(): Promise<void> {
    try {
      const response = await fetch('/slides.md', { cache: 'no-cache', method: 'HEAD' });
      if (response.ok) {
        const newModified = response.headers.get('last-modified');
        if (newModified && newModified !== this.lastModified && !this.slideManager.isInTransition()) {
          console.log('slides.md changed, reloading...');
          await this.reloadSlides();
        }
      }
    } catch (error) {
      // Ignore errors during polling
    }
  }

  private async reloadSlides(): Promise<void> {
    await this.loadSlides();
    this.slideManager.loadMarkdown(this.currentMarkdown);
    const objects = this.slideManager.reloadCurrentSlide();
    this.refreshCollisions(objects.textObstacles, objects.crystals, objects.staticImages, objects.tables);
    this.updateHUDSlideInfo();
  }

  private addCrystalCollisions(crystal: CrystalImage): void {
    // Ship flies over crystal and shatters it (overlap, not collider)
    this.physics.add.overlap(
      this.starship.getSprite(),
      crystal.getContainer(),
      () => {
        if (!crystal.isActivated()) {
          crystal.onCollision();
          this.hud.addScore(100); // Points for shattering crystal
          this.hud.addCrystalShattered();
        }
      },
      undefined,
      this
    );

    // Laser can only shatter crystal, not reform
    this.physics.add.overlap(
      this.starship.getLasers(),
      crystal.getContainer(),
      (obj1, obj2) => {
        if (!crystal.isActivated()) {
          crystal.onCollision();
          this.hud.addScore(100); // Points for shooting crystal
          this.hud.addCrystalShattered();
        }
        const laser = (obj1 instanceof Phaser.GameObjects.Graphics) ? obj1 : obj2 as Phaser.GameObjects.Graphics;
        if (laser instanceof Phaser.GameObjects.Graphics) {
          laser.setActive(false);
          laser.setVisible(false);
          (laser.body as Phaser.Physics.Arcade.Body).enable = false;
        }
      },
      undefined,
      this
    );
  }

  private checkCloseButtonCollisions(): void {
    this.crystals.forEach((crystal) => {
      const closeBtn = crystal.getCloseButton();
      if (closeBtn && crystal.isActivated()) {
        // Get close button's world position
        const btnX = crystal.getContainer().x + closeBtn.x;
        const btnY = crystal.getContainer().y + closeBtn.y;

        // Check ship collision with close button (distance-based)
        const ship = this.starship.getSprite();
        const shipDist = Phaser.Math.Distance.Between(ship.x, ship.y, btnX, btnY);
        if (shipDist < 30) {
          crystal.triggerReform();
          return;
        }

        // Check laser collision with close button
        this.starship.getLasers().getChildren().forEach((laserObj) => {
          const laser = laserObj as Phaser.GameObjects.Graphics;
          if (laser.active) {
            const laserDist = Phaser.Math.Distance.Between(laser.x, laser.y, btnX, btnY);
            if (laserDist < 30) {
              crystal.triggerReform();
              laser.setActive(false);
              laser.setVisible(false);
              (laser.body as Phaser.Physics.Arcade.Body).enable = false;
            }
          }
        });
      }
    });
  }

  private isShipOverCrystalImage(): boolean {
    const ship = this.starship.getSprite();
    // Check if ship overlaps with any activated (shattered) crystal image
    for (const crystal of this.crystals) {
      if (crystal.isActivated()) {
        const container = crystal.getContainer();
        const dims = crystal.getDimensions();
        // Use actual image dimensions for accurate bounds check
        const dx = ship.x - container.x;
        const dy = ship.y - container.y;
        // Check if ship is within image bounds (with small buffer)
        if (Math.abs(dx) < dims.width / 2 + 20 && Math.abs(dy) < dims.height / 2 + 20) {
          return true;
        }
      }
    }
    return false;
  }

  private createBackground(): void {
    const starCount = theme.background.starCount ?? 100;
    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(0, 1280);
      const y = Phaser.Math.Between(0, 720);
      const size = Phaser.Math.Between(1, 3);
      
      const star = this.add.circle(x, y, size, 0xffffff);
      star.setAlpha(Phaser.Math.FloatBetween(0.05, 0.25));

      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.03, 0.15),
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1a1a3a, 0.3);
    
    for (let x = 0; x < 1280; x += 64) {
      gridGraphics.lineBetween(x, 0, x, 720);
    }
    for (let y = 0; y < 720; y += 64) {
      gridGraphics.lineBetween(0, y, 1280, y);
    }

    this.scheduleShootingStar();
  }

  private scheduleShootingStar(): void {
    const delay = Phaser.Math.Between(10000, 20000);
    this.time.delayedCall(delay, () => {
      this.createShootingStar();
      this.scheduleShootingStar();
    });
  }

  private createShootingStar(): void {
    const distance = Phaser.Math.Between(600, 1000);
    
    // Pick random edge to start from
    const edge = Phaser.Math.Between(0, 3);
    let startX: number, startY: number;
    
    switch (edge) {
      case 0: // Top edge
        startX = Phaser.Math.Between(-50, 1330);
        startY = Phaser.Math.Between(-100, -20);
        break;
      case 1: // Right edge
        startX = Phaser.Math.Between(1300, 1380);
        startY = Phaser.Math.Between(-50, 770);
        break;
      case 2: // Bottom edge
        startX = Phaser.Math.Between(-50, 1330);
        startY = Phaser.Math.Between(740, 820);
        break;
      default: // Left edge
        startX = Phaser.Math.Between(-100, -20);
        startY = Phaser.Math.Between(-50, 770);
        break;
    }
    
    // Calculate direction towards center-ish area with some randomness
    const centerX = 640 + Phaser.Math.Between(-200, 200);
    const centerY = 360 + Phaser.Math.Between(-150, 150);
    const baseAngle = Math.atan2(centerY - startY, centerX - startX);
    const finalAngle = baseAngle + Phaser.Math.FloatBetween(-0.5, 0.5);
    
    const endX = startX + Math.cos(finalAngle) * distance;
    const endY = startY + Math.sin(finalAngle) * distance;
    const duration = Phaser.Math.Between(800, 1500);

    const trailLength = 8;
    const trail: Phaser.GameObjects.Arc[] = [];

    for (let i = 0; i < trailLength; i++) {
      const particle = this.add.circle(startX, startY, 2 - i * 0.2, 0xffffff);
      particle.setAlpha(0.5 - i * 0.06);
      particle.setDepth(-1);
      trail.push(particle);
    }

    const head = trail[0];
    
    this.tweens.add({
      targets: head,
      x: endX,
      y: endY,
      duration: duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        for (let i = trail.length - 1; i > 0; i--) {
          trail[i].setPosition(trail[i - 1].x, trail[i - 1].y);
        }
      },
      onComplete: () => {
        trail.forEach((p) => p.destroy());
      },
    });

    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: duration,
      ease: 'Quad.easeIn',
    });
  }

  private createStarship(): void {
    this.starship = new Starship(this, 200, 360);
    this.starship.getSprite().setDepth(1100); // Ship above HUD (depth 1000)
  }

  private setupSlideManager(): void {
    this.slideManager = new SlideManager(this);
    this.slideManager.loadMarkdown(this.currentMarkdown);
    const objects = this.slideManager.createCurrentSlide();
    this.textObstacles = objects.textObstacles;
    this.crystals = objects.crystals;
    this.staticImages = objects.staticImages;
    this.tables = objects.tables;
  }

  private createHUD(): void {
    this.hud = new ArcadeHUD(this);
    this.updateHUDSlideInfo();
  }

  private updateHUDSlideInfo(): void {
    const current = this.slideManager.getCurrentSlideIndex() + 1;
    const total = this.slideManager.getTotalSlides();
    this.hud.setSlideInfo(current, total);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // WASD keys as alternative to arrow keys
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Phaser.Types.Input.Keyboard.CursorKeys;

    // Setup event-based input handling for reliability
    this.setupKeyEvents();

    // Debug toggle key (BACKTICK is the `~ key)
    const debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK);
    debugKey.on('down', () => {
      this.starship.toggleDebug();
    });

    // Slide navigation keys
    const nextKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    nextKey.on('down', () => {
      this.goToNextSlide();
    });

    const prevKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    prevKey.on('down', () => {
      this.goToPrevSlide();
    });

    // Mouse controls
    this.setupMouseInput();
  }

  private setupMouseInput(): void {
    // Track mouse movement to rotate ship
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.isPointerOverCanvas = true;
      this.starship.setMouseTarget(pointer.worldX, pointer.worldY);
    });

    // Left click to shoot
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.starship.shoot();
      }
    });

    // Mouse leaves canvas - stop the ship
    this.input.on('pointerout', () => {
      this.isPointerOverCanvas = false;
      this.starship.clearMouseTarget();
      this.starship.stop();
    });

    // Mouse re-enters canvas - resume mouse tracking
    this.input.on('pointerover', () => {
      this.isPointerOverCanvas = true;
      const pointer = this.input.activePointer;
      this.starship.setMouseTarget(pointer.worldX, pointer.worldY);
    });

    // Also track when game loses focus
    this.game.events.on('blur', () => {
      this.isPointerOverCanvas = false;
      this.starship.clearMouseTarget();
      this.starship.stop();
    });
  }

  private setupKeyEvents(): void {
    const keyboard = this.input.keyboard!;

    // Arrow key events
    keyboard.on('keydown-LEFT', () => this.starship.setInputState('left', true));
    keyboard.on('keyup-LEFT', () => this.starship.setInputState('left', false));
    keyboard.on('keydown-RIGHT', () => this.starship.setInputState('right', true));
    keyboard.on('keyup-RIGHT', () => this.starship.setInputState('right', false));
    keyboard.on('keydown-UP', () => this.starship.setInputState('up', true));
    keyboard.on('keyup-UP', () => this.starship.setInputState('up', false));
    keyboard.on('keydown-DOWN', () => this.starship.setInputState('down', true));
    keyboard.on('keyup-DOWN', () => this.starship.setInputState('down', false));

    // WASD events
    keyboard.on('keydown-A', () => this.starship.setInputState('left', true));
    keyboard.on('keyup-A', () => this.starship.setInputState('left', false));
    keyboard.on('keydown-D', () => this.starship.setInputState('right', true));
    keyboard.on('keyup-D', () => this.starship.setInputState('right', false));
    keyboard.on('keydown-W', () => this.starship.setInputState('up', true));
    keyboard.on('keyup-W', () => this.starship.setInputState('up', false));
    keyboard.on('keydown-S', () => this.starship.setInputState('down', true));
    keyboard.on('keyup-S', () => this.starship.setInputState('down', false));
  }

  private setupCollisions(): void {
    this.textObstacles.forEach((obstacle) => {
      this.addObstacleCollisions(obstacle);
    });
    this.crystals.forEach((crystal) => {
      this.addCrystalCollisions(crystal);
    });
  }

  private addObstacleCollisions(obstacle: TextObstacle): void {
    // Ship overlap with text - fly over, highlight, and buzz
    this.physics.add.overlap(
      this.starship.getSprite(),
      obstacle.getText(),
      () => {
        // Pause text effects while flying over a crystal image
        if (this.isShipOverCrystalImage()) return;
        obstacle.onCollision('ship');
      },
      undefined,
      this
    );

    // Laser overlap with text - destroy laser and highlight with collision sound
    this.physics.add.overlap(
      this.starship.getLasers(),
      obstacle.getText(),
      (obj1, obj2) => {
        obstacle.onCollision('laser');
        this.hud.addScore(50); // Points for shooting text
        const laser = (obj1 instanceof Phaser.GameObjects.Graphics) ? obj1 : obj2 as Phaser.GameObjects.Graphics;
        if (laser instanceof Phaser.GameObjects.Graphics) {
          laser.setActive(false);
          laser.setVisible(false);
          (laser.body as Phaser.Physics.Arcade.Body).enable = false;
        }
      },
      undefined,
      this
    );
  }

  private refreshCollisions(textObstacles: TextObstacle[], crystals: CrystalImage[], staticImages: StaticImage[], tables: Table[]): void {
    this.textObstacles = textObstacles;
    this.crystals = crystals;
    this.staticImages = staticImages;
    this.tables = tables;
    textObstacles.forEach((obstacle) => {
      this.addObstacleCollisions(obstacle);
    });
    crystals.forEach((crystal) => {
      this.addCrystalCollisions(crystal);
    });
  }

  private checkSlideTransition(): void {
    if (this.slideManager.isInTransition()) return;

    const ship = this.starship.getSprite();
    const shipBody = this.starship.getBody();

    // Go to next slide when hitting right edge
    if (ship.x > 1250 && this.slideManager.canGoNext()) {
      shipBody.setVelocity(0, 0);
      shipBody.setAcceleration(0, 0);
      this.hud.flashSlideNumber();
      this.slideManager.transitionToNext(
        this.cameras.main,
        this.starship,
        (objects) => {
          this.refreshCollisions(objects.textObstacles, objects.crystals, objects.staticImages, objects.tables);
          this.updateHUDSlideInfo();
        }
      );
    }

    // Go to previous slide when hitting left edge
    if (ship.x < 30 && this.slideManager.canGoPrev()) {
      shipBody.setVelocity(0, 0);
      shipBody.setAcceleration(0, 0);
      this.hud.flashSlideNumber();
      this.slideManager.transitionToPrev(
        this.cameras.main,
        this.starship,
        (objects) => {
          this.refreshCollisions(objects.textObstacles, objects.crystals, objects.staticImages, objects.tables);
          this.updateHUDSlideInfo();
        }
      );
    }
  }

  private goToNextSlide(): void {
    if (this.slideManager.isInTransition() || !this.slideManager.canGoNext()) return;

    this.hud.flashSlideNumber();
    this.slideManager.transitionToNextWithKeyboard(
      this.cameras.main,
      this.starship,
      (objects) => {
        this.refreshCollisions(objects.textObstacles, objects.crystals, objects.staticImages, objects.tables);
        this.updateHUDSlideInfo();
      }
    );
  }

  private goToPrevSlide(): void {
    if (this.slideManager.isInTransition() || !this.slideManager.canGoPrev()) return;

    this.hud.flashSlideNumber();
    this.slideManager.transitionToPrevWithKeyboard(
      this.cameras.main,
      this.starship,
      (objects) => {
        this.refreshCollisions(objects.textObstacles, objects.crystals, objects.staticImages, objects.tables);
        this.updateHUDSlideInfo();
      }
    );
  }

  update(): void {
    if (!this.slideManager) return;

    // Update custom cursor position
    if (this.customCursor) {
      this.customCursor.setPosition(0, 0);
    }

    if (!this.slideManager.isInTransition()) {
      // Check if pointer is within the game play area (same bounds as ship movement)
      // Ship can fly to world edges (0-1280, 0-720) and triggers slide change at edges
      const pointer = this.input.activePointer;
      const GAME_AREA_LEFT = 0;
      const GAME_AREA_RIGHT = 1280;
      const GAME_AREA_TOP = 0;
      const GAME_AREA_BOTTOM = 720;
      const inGameArea = pointer.x >= GAME_AREA_LEFT && pointer.x <= GAME_AREA_RIGHT &&
                         pointer.y >= GAME_AREA_TOP && pointer.y <= GAME_AREA_BOTTOM;
      const pointerActive = this.isPointerOverCanvas && inGameArea;

      if (!pointerActive && this.isPointerOverCanvas) {
        // Pointer left game area
        this.starship.clearMouseTarget();
        this.starship.stop();
      }

      this.starship.update(this.cursors, this.wasd, pointerActive);

      if (this.fireKey.isDown) {
        this.starship.shoot();
      }

      this.checkCloseButtonCollisions();
      this.updateShipTranslucency();
    }

    this.checkSlideTransition();
  }

  private updateShipTranslucency(): void {
    const ship = this.starship.getSprite();
    let isOverContent = false;

    // Check overlap with text obstacles
    for (const obstacle of this.textObstacles) {
      const textBody = obstacle.getBody();
      if (textBody && textBody.enable && this.physics.world.overlap(ship, textBody.gameObject)) {
        isOverContent = true;
        break;
      }
    }

    // Check overlap with crystals (both crystal state and revealed images)
    if (!isOverContent) {
      for (const crystal of this.crystals) {
        const container = crystal.getContainer();
        const body = container.body as Phaser.Physics.Arcade.Body;
        if (body && body.enable) {
          // Simple distance-based check for crystals
          const distance = Phaser.Math.Distance.Between(ship.x, ship.y, container.x, container.y);
          const threshold = crystal.isActivated()
            ? Math.max(crystal.getDimensions().width, crystal.getDimensions().height) / 2 + 30
            : 40;
          if (distance < threshold) {
            isOverContent = true;
            break;
          }
        }
      }
    }

    // Check overlap with static images
    if (!isOverContent) {
      for (const staticImg of this.staticImages) {
        const container = staticImg.getContainer();
        const distance = Phaser.Math.Distance.Between(ship.x, ship.y, container.x, container.y);
        const threshold = Math.max(staticImg.getDimensions().width, staticImg.getDimensions().height) / 2 + 30;
        if (distance < threshold) {
          isOverContent = true;
          break;
        }
      }
    }

    // Check overlap with tables
    if (!isOverContent) {
      for (const table of this.tables) {
        const container = table.getContainer();
        const dims = table.getDimensions();
        // Table origin is at top-left, check if ship is within table bounds
        const halfWidth = dims.width / 2;
        const halfHeight = dims.height / 2;
        const centerX = container.x + halfWidth;
        const centerY = container.y + halfHeight;
        if (Math.abs(ship.x - centerX) < halfWidth + 20 && Math.abs(ship.y - centerY) < halfHeight + 20) {
          isOverContent = true;
          break;
        }
      }
    }

    this.starship.setTranslucent(isOverContent);
  }

  private createCustomCursor(): void {
    // Hide system cursor
    this.game.canvas.style.cursor = 'none';

    // Create custom cursor graphics
    this.customCursor = this.add.graphics();
    this.customCursor.setDepth(2000); // Above everything

    // Pulsing color tween
    this.tweens.add({
      targets: { hue: 200 },
      hue: 240,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const hue = tween.getValue() as number;
        this.drawCustomCursor(hue);
      },
    });
  }

  private drawCustomCursor(hue: number): void {
    const pointer = this.input.activePointer;
    const x = pointer.x;
    const y = pointer.y;

    // Check if cursor is under the ship (within ship radius)
    const ship = this.starship.getSprite();
    const distance = Phaser.Math.Distance.Between(x, y, ship.x, ship.y);
    const shipRadius = 25; // Approximate ship radius

    this.customCursor.clear();

    // Don't draw cursor if it's under the ship
    if (distance < shipRadius) {
      return;
    }

    const color = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6).color;

    // Draw crosshair lines
    this.customCursor.lineStyle(2, color, 1);
    // Vertical line
    this.customCursor.lineBetween(x, y - 12, x, y - 4);
    this.customCursor.lineBetween(x, y + 4, x, y + 12);
    // Horizontal line
    this.customCursor.lineBetween(x - 12, y, x - 4, y);
    this.customCursor.lineBetween(x + 4, y, x + 12, y);

    // Center dot
    this.customCursor.fillStyle(color, 1);
    this.customCursor.fillCircle(x, y, 3);
  }
}
