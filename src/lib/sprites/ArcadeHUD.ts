import Phaser from 'phaser';

export class ArcadeHUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private topScoreText!: Phaser.GameObjects.Text;
  private slideText!: Phaser.GameObjects.Text;
  private crystalCountText!: Phaser.GameObjects.Text;
  private livesContainer: Phaser.GameObjects.Container;
  private lifeIcons: Phaser.GameObjects.Graphics[] = [];

  private score: number = 0;
  private crystalsShattered: number = 0;
  private currentSlide: number = 1;
  private totalSlides: number = 1;

  // Arcade colors
  private readonly COLOR_SCORE = '#ffff00'; // Yellow
  private readonly COLOR_CRYSTAL = '#00ffff'; // Cyan
  private readonly COLOR_LIVES = '#ff4444'; // Red
  private readonly COLOR_TEXT = '#ffffff'; // White
  private readonly COLOR_BAR = '#1a1a3a'; // Dark blue
  private readonly COLOR_BORDER = '#326ce5'; // Kubernetes blue

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.livesContainer = scene.add.container(0, 0);

    this.createHUD();
  }

  private createHUD(): void {
    const width = 1280;
    const height = 40;
    const y = 10;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0); // Fixed to camera

    // Main bar background (no border)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.9);
    bg.fillRect(0, y, width, height);
    this.container.add(bg);

    // Scanline effect (horizontal lines)
    const scanlines = this.scene.add.graphics();
    scanlines.lineStyle(1, 0x000000, 0.3);
    for (let i = 0; i < height; i += 4) {
      scanlines.lineBetween(0, y + i, width, y + i);
    }
    this.container.add(scanlines);

    // === LEFT SIDE: LIVES ===
    const livesX = 60;
    const livesY = y + height / 2;

    // "LIVES" label
    const livesLabel = this.scene.add.text(livesX - 20, livesY - 15, 'LIVES', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: this.COLOR_LIVES,
    });
    livesLabel.setOrigin(0.5, 0);
    this.container.add(livesLabel);

    // 3 ship icons (heptagons)
    for (let i = 0; i < 3; i++) {
      const icon = this.createLifeIcon();
      icon.setPosition(livesX + (i - 1) * 25, livesY + 5);
      this.lifeIcons.push(icon);
      this.container.add(icon);
    }

    // === CENTER: SLIDE INFO ===
    const centerX = width / 2;

    // "LEVEL" label
    const slideLabel = this.scene.add.text(centerX, y + 8, 'LEVEL', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    slideLabel.setOrigin(0.5, 0);
    this.container.add(slideLabel);

    // Slide counter (e.g., "02 / 05")
    this.slideText = this.scene.add.text(centerX, y + 22, '01 / 01', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: this.COLOR_TEXT,
      fontStyle: 'bold',
    });
    this.slideText.setOrigin(0.5, 0);
    this.container.add(this.slideText);

    // === RIGHT SIDE: SCORE ===
    const scoreX = width - 120;

    // "HI" score (high score placeholder)
    const topLabel = this.scene.add.text(scoreX - 60, y + 8, 'HI', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ff6600',
    });
    topLabel.setOrigin(0.5, 0);
    this.container.add(topLabel);

    this.topScoreText = this.scene.add.text(scoreX - 60, y + 22, '050000', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff6600',
    });
    this.topScoreText.setOrigin(0.5, 0);
    this.container.add(this.topScoreText);

    // Current score
    const scoreLabel = this.scene.add.text(scoreX, y + 8, 'SCORE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: this.COLOR_SCORE,
    });
    scoreLabel.setOrigin(0.5, 0);
    this.container.add(scoreLabel);

    this.scoreText = this.scene.add.text(scoreX, y + 22, '000000', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: this.COLOR_SCORE,
      fontStyle: 'bold',
    });
    this.scoreText.setOrigin(0.5, 0);
    this.container.add(this.scoreText);

    // === CRYSTAL COUNT ===
    const crystalX = width - 40;

    // Crystal icon (small)
    const crystalIcon = this.scene.add.graphics();
    crystalIcon.fillStyle(0x00ffff, 1);
    // Draw small diamond shape
    crystalIcon.beginPath();
    crystalIcon.moveTo(0, -6);
    crystalIcon.lineTo(5, 0);
    crystalIcon.lineTo(0, 6);
    crystalIcon.lineTo(-5, 0);
    crystalIcon.closePath();
    crystalIcon.fillPath();
    crystalIcon.setPosition(crystalX, y + 15);
    this.container.add(crystalIcon);

    this.crystalCountText = this.scene.add.text(crystalX, y + 28, '0', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: this.COLOR_CRYSTAL,
    });
    this.crystalCountText.setOrigin(0.5, 0);
    this.container.add(this.crystalCountText);

    // Blink animation for score
    this.scene.time.addEvent({
      delay: 500,
      callback: () => {
        this.scoreText.setAlpha(this.scoreText.alpha === 1 ? 0.9 : 1);
      },
      loop: true,
    });
  }

  private createLifeIcon(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const radius = 8;
    const sides = 7;

    // Draw mini heptagon ship
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    // Fill
    g.fillStyle(0x326ce5, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();

    // White outline
    g.lineStyle(1.5, 0xffffff, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.strokePath();

    return g;
  }

  addScore(points: number): void {
    this.score += points;
    this.updateScoreDisplay();

    // Pulse animation on score
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
    });
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(this.score.toString().padStart(6, '0'));
  }

  addCrystalShattered(): void {
    this.crystalsShattered++;
    this.crystalCountText.setText(this.crystalsShattered.toString());

    // Pulse animation
    this.scene.tweens.add({
      targets: this.crystalCountText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
    });
  }

  setSlideInfo(current: number, total: number): void {
    this.currentSlide = current;
    this.totalSlides = total;
    this.slideText.setText(
      `${current.toString().padStart(2, '0')} / ${total.toString().padStart(2, '0')}`
    );
    this.slideText.setAlpha(1);
  }

  // Visual effect when transitioning slides
  flashSlideNumber(): void {
    this.slideText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.slideText,
      alpha: 0,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.slideText.setAlpha(1);
      },
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
