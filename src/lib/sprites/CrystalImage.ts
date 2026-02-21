import Phaser from 'phaser';

export class CrystalImage {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private crystal: Phaser.GameObjects.Graphics;
  private emblem: Phaser.GameObjects.Graphics;
  private innerGlow: Phaser.GameObjects.Graphics;
  private previewImage: Phaser.GameObjects.Image | null = null;
  private shards: Phaser.GameObjects.Graphics[] = [];
  private image: Phaser.GameObjects.Image | null = null;
  private imageGlow: Phaser.GameObjects.Graphics | null = null;
  private closeButton: Phaser.GameObjects.Container | null = null;
  private imageKey: string;
  private isShattered: boolean = false;
  private isAnimating: boolean = false;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private emblemTween: Phaser.Tweens.Tween | null = null;
  private floatTween: Phaser.Tweens.Tween | null = null;
  private imageTweens: Phaser.Tweens.Tween[] = [];
  private imageWidth: number;
  private imageHeight: number;
  private explicitWidth?: number;
  private explicitHeight?: number;
  private crystalOffsetX: number = 0;
  private crystalOffsetY: number = 0;

  // Crystal dimensions
  private readonly POD_WIDTH = 70;
  private readonly POD_HEIGHT = 90;
  private readonly CORNER_RADIUS = 6;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    imageKey: string,
    imageWidth?: number,
    imageHeight?: number,
    crystalX?: number,
    crystalY?: number
  ) {
    this.scene = scene;
    this.imageKey = imageKey;
    this.explicitWidth = imageWidth;
    this.explicitHeight = imageHeight;
    // Temporary values - actual size calculated when image loads
    this.imageWidth = 200;
    this.imageHeight = 150;

    // Store crystal offset for use in reform
    this.crystalOffsetX = crystalX !== undefined ? crystalX - x : 0;
    this.crystalOffsetY = crystalY !== undefined ? crystalY - y : 0;

    // Container is at image position (x, y)
    this.container = scene.add.container(x, y);
    this.container.setDepth(5); // Below ship (depth 10)

    // Create glow (not added to container yet - will be added when preview is ready)
    this.innerGlow = this.createInnerGlow();

    // Create crystal pod
    this.crystal = this.createCrystal();
    this.crystal.setPosition(this.crystalOffsetX, this.crystalOffsetY);
    this.container.add(this.crystal);

    // Create floating heptagon emblem
    this.emblem = this.createEmblem();
    this.emblem.setPosition(this.crystalOffsetX, this.crystalOffsetY - 55);
    this.container.add(this.emblem);

    // Load and show preview image
    this.loadPreviewImage();

    scene.physics.world.enable(this.container);
    const body = this.container.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.POD_WIDTH + 10, this.POD_HEIGHT + 20);
    body.setOffset(
      -(this.POD_WIDTH + 10) / 2 + this.crystalOffsetX,
      -(this.POD_HEIGHT + 20) / 2 + this.crystalOffsetY - 10
    );
    body.setImmovable(true);

    // Don't start glow animation until innerGlow is added (when preview loads)
    this.startEmblemAnimation();
    this.startFloatAnimation();
  }

  private createInnerGlow(): Phaser.GameObjects.Graphics {
    // Create empty graphics - will draw content when preview image is ready
    const g = this.scene.add.graphics();
    g.setVisible(false);
    return g;
  }

  private drawInnerGlow(): void {
    // Add to container if not already added
    if (!this.innerGlow.parentContainer) {
      this.container.addAt(this.innerGlow, 0);
      // Start the glow animation now that it's in the container
      this.startGlowAnimation();
    }
    // Position at crystal offset
    this.innerGlow.setPosition(this.crystalOffsetX, this.crystalOffsetY);
    this.innerGlow.clear();
    // Subtle pulsing core glow - very faint
    this.innerGlow.fillStyle(0x00ffff, 0.08);
    this.innerGlow.fillCircle(0, 0, 35);
    this.innerGlow.fillStyle(0x326ce5, 0.05);
    this.innerGlow.fillCircle(0, 0, 45);
  }

  private createCrystal(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const w = this.POD_WIDTH;
    const h = this.POD_HEIGHT;
    const r = this.CORNER_RADIUS;

    // Kubernetes colors
    const k8sBlue = 0x326ce5;
    const k8sLight = 0x4a8ff7;
    const cyan = 0x00ffff;

    // Draw rounded rectangle path helper
    const drawRoundedRect = (
      graphics: Phaser.GameObjects.Graphics,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      graphics.beginPath();
      graphics.moveTo(x + r, y);
      graphics.lineTo(x + w - r, y);
      graphics.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
      graphics.lineTo(x + w, y + h - r);
      graphics.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
      graphics.lineTo(x + r, y + h);
      graphics.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
      graphics.lineTo(x, y + r);
      graphics.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
      graphics.closePath();
    };

    const x = -w / 2;
    const y = -h / 2;

    // Main crystal body - translucent blue
    g.fillStyle(k8sBlue, 0.4);
    drawRoundedRect(g, x, y, w, h, r);
    g.fillPath();

    // Inner highlight - lighter blue
    g.fillStyle(k8sLight, 0.25);
    drawRoundedRect(g, x + 4, y + 4, w - 8, h - 8, r - 2);
    g.fillPath();

    // Cyan rim lighting - edges
    g.lineStyle(2, cyan, 0.8);
    drawRoundedRect(g, x, y, w, h, r);
    g.strokePath();

    // Inner rim
    g.lineStyle(1, cyan, 0.4);
    drawRoundedRect(g, x + 4, y + 4, w - 8, h - 8, r - 2);
    g.strokePath();

    // Helm wheel etching (subtle lines like K8s logo)
    g.lineStyle(1, 0xffffff, 0.15);
    const centerX = 0;
    const centerY = 0;
    const spokeCount = 7;
    const innerR = 8;
    const outerR = 22;

    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * 2 * Math.PI) / spokeCount - Math.PI / 2;
      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;
      g.lineBetween(x1, y1, x2, y2);
    }

    // Vertical highlight (glass reflection)
    g.fillStyle(0xffffff, 0.1);
    drawRoundedRect(g, x + 8, y + 10, 8, h - 20, 4);
    g.fillPath();

    return g;
  }

  private createEmblem(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const radius = 14;
    const sides = 7;

    // Kubernetes blue heptagon
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    // Main heptagon
    g.fillStyle(0x326ce5, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();

    // Inner lighter heptagon
    g.fillStyle(0x4a8ff7, 1);
    const innerPoints = points.map((p) => ({
      x: p.x * 0.7,
      y: p.y * 0.7,
    }));
    g.beginPath();
    g.moveTo(innerPoints[0].x, innerPoints[0].y);
    for (let i = 1; i < innerPoints.length; i++) {
      g.lineTo(innerPoints[i].x, innerPoints[i].y);
    }
    g.closePath();
    g.fillPath();

    // White border
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.strokePath();

    // Helm spokes
    g.lineStyle(1.5, 0xffffff, 0.9);
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const innerR = 4;
      const outerR = radius - 3;
      const x1 = Math.cos(angle) * innerR;
      const y1 = Math.sin(angle) * innerR;
      const x2 = Math.cos(angle) * outerR;
      const y2 = Math.sin(angle) * outerR;
      g.lineBetween(x1, y1, x2, y2);
    }

    // Energy connection lines to pod (visual only, drawn in separate method if needed)
    // But for now, just the floating emblem is fine

    return g;
  }

  private loadPreviewImage(): void {
    // Try to load and show a faint preview of the image inside the crystal
    if (this.scene.textures.exists(this.imageKey)) {
      this.showPreview();
    } else {
      // Try to load dynamically
      this.scene.load.image(this.imageKey, this.imageKey);
      this.scene.load.once('complete', () => {
        if (this.scene.textures.exists(this.imageKey)) {
          this.showPreview();
        }
      });
      this.scene.load.start();
    }
  }

  private showPreview(): void {
    if (this.isShattered || !this.crystal.active) return;

    // Get texture size
    const texture = this.scene.textures.get(this.imageKey);
    const frame = texture.getSourceImage();
    const aspectRatio = frame.width / frame.height;

    // Fit inside pod with padding
    const maxW = this.POD_WIDTH - 16;
    const maxH = this.POD_HEIGHT - 16;
    let w = maxW;
    let h = w / aspectRatio;
    if (h > maxH) {
      h = maxH;
      w = h * aspectRatio;
    }

    this.previewImage = this.scene.add.image(0, 0, this.imageKey);
    this.previewImage.setDisplaySize(w, h);
    this.previewImage.setAlpha(0.25); // Faint visibility
    this.previewImage.setPosition(this.crystalOffsetX, this.crystalOffsetY);

    // Add to container below crystal graphics but visible through transparency
    this.container.addAt(this.previewImage, 1);

    // Draw and show the inner glow now that preview image is visible
    this.drawInnerGlow();
    this.innerGlow.setVisible(true);
  }

  private startGlowAnimation(): void {
    // Pulse the inner glow
    this.glowTween = this.scene.tweens.add({
      targets: this.innerGlow,
      alpha: 0.6,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startEmblemAnimation(): void {
    // Slow rotation of emblem
    this.scene.tweens.add({
      targets: this.emblem,
      rotation: Math.PI * 2,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    });

    // Bobbing up and down
    this.emblemTween = this.scene.tweens.add({
      targets: this.emblem,
      y: this.crystalOffsetY - 50,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startFloatAnimation(): void {
    // Entire container gentle float
    this.floatTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  onCollision(): void {
    if (this.isAnimating) return;

    if (this.isShattered) {
      this.reform();
    } else {
      this.shatter();
    }
  }

  private shatter(): void {
    this.isShattered = true;
    this.isAnimating = true;

    // Stop animations and reset
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    if (this.emblemTween) this.emblemTween.stop();
    if (this.floatTween) this.floatTween.stop();

    this.playShatterSound();

    // Hide preview image
    if (this.previewImage) {
      this.previewImage.setVisible(false);
    }

    // Explosive shatter effect
    this.createExplosiveShards();

    // Hide crystal components
    this.crystal.setVisible(false);
    this.emblem.setVisible(false);
    this.innerGlow.setVisible(false);

    // Reveal image after explosion starts
    this.scene.time.delayedCall(150, () => {
      this.revealImage();
    });
  }

  private createExplosiveShards(): void {
    const shardCount = 16;
    const colors = [0x326ce5, 0x4a8ff7, 0x00ffff, 0x88ccff, 0xffffff];

    // Create shards from crystal material
    for (let i = 0; i < shardCount; i++) {
      const shard = this.scene.add.graphics();
      const color = colors[i % colors.length];

      // Random shard shape
      const size = Phaser.Math.Between(10, 20);
      const points: { x: number; y: number }[] = [];
      const sides = Phaser.Math.Between(3, 5);

      for (let j = 0; j < sides; j++) {
        const angle = (j * 2 * Math.PI) / sides + Phaser.Math.FloatBetween(-0.3, 0.3);
        const r = size * Phaser.Math.FloatBetween(0.5, 1);
        points.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
        });
      }

      // Draw shard
      shard.fillStyle(color, Phaser.Math.FloatBetween(0.6, 1));
      shard.beginPath();
      shard.moveTo(points[0].x, points[0].y);
      for (let j = 1; j < points.length; j++) {
        shard.lineTo(points[j].x, points[j].y);
      }
      shard.closePath();
      shard.fillPath();

      // Add highlight edge
      shard.lineStyle(1, 0xffffff, 0.5);
      shard.strokePath();

      // Start at crystal position with slight random offset
      shard.setPosition(
        this.crystalOffsetX + Phaser.Math.Between(-20, 20),
        this.crystalOffsetY + Phaser.Math.Between(-25, 25)
      );

      this.container.add(shard);
      this.shards.push(shard);

      // Explosive outward animation
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(80, 180);
      const targetX = this.crystalOffsetX + Math.cos(angle) * distance;
      const targetY = this.crystalOffsetY + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: shard,
        x: targetX,
        y: targetY,
        alpha: 0,
        rotation: Phaser.Math.FloatBetween(-4, 4),
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    }

    // Add energy burst ring
    const burst = this.scene.add.graphics();
    burst.lineStyle(3, 0x00ffff, 0.8);
    burst.strokeCircle(0, 0, 30);
    burst.setPosition(this.crystalOffsetX, this.crystalOffsetY);
    this.container.add(burst);

    this.scene.tweens.add({
      targets: burst,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });

    // Add particle sparks
    for (let i = 0; i < 12; i++) {
      const spark = this.scene.add.graphics();
      spark.fillStyle(0x00ffff, 1);
      spark.fillCircle(0, 0, 2);
      spark.setPosition(this.crystalOffsetX, this.crystalOffsetY);
      this.container.add(spark);

      const angle = (i / 12) * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 100);

      this.scene.tweens.add({
        targets: spark,
        x: this.crystalOffsetX + Math.cos(angle) * dist,
        y: this.crystalOffsetY + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private revealImage(): void {
    if (!this.scene.textures.exists(this.imageKey)) {
      // Try to load the image dynamically
      this.scene.load.image(this.imageKey, this.imageKey);
      this.scene.load.once('complete', () => {
        if (this.scene.textures.exists(this.imageKey)) {
          this.displayImage();
        } else {
          this.createPlaceholder();
        }
      });
      this.scene.load.start();
      return;
    }

    this.displayImage();
  }

  private calculateDimensions(): void {
    // Get texture dimensions to calculate aspect ratio
    let origWidth = 200;
    let origHeight = 150;

    if (this.scene.textures.exists(this.imageKey)) {
      const texture = this.scene.textures.get(this.imageKey);
      const frame = texture.getSourceImage();
      origWidth = frame.width;
      origHeight = frame.height;
    }

    const aspectRatio = origWidth / origHeight;

    // Calculate dimensions maintaining aspect ratio
    if (this.explicitWidth !== undefined && this.explicitHeight === undefined) {
      this.imageWidth = this.explicitWidth;
      this.imageHeight = this.explicitWidth / aspectRatio;
    } else if (this.explicitHeight !== undefined && this.explicitWidth === undefined) {
      this.imageHeight = this.explicitHeight;
      this.imageWidth = this.explicitHeight * aspectRatio;
    } else if (this.explicitWidth !== undefined && this.explicitHeight !== undefined) {
      this.imageWidth = this.explicitWidth;
      this.imageHeight = this.explicitHeight;
    } else {
      this.imageWidth = origWidth;
      this.imageHeight = origHeight;
    }
  }

  private displayImage(): void {
    this.calculateDimensions();

    this.image = this.scene.add.image(0, 0, this.imageKey);
    this.image.setAlpha(0);
    this.container.add(this.image);

    // Add glow effect behind image
    this.imageGlow = this.scene.add.graphics();
    this.imageGlow.fillStyle(0x326ce5, 0.15);
    this.imageGlow.fillRoundedRect(
      -this.imageWidth / 2 - 10,
      -this.imageHeight / 2 - 10,
      this.imageWidth + 20,
      this.imageHeight + 20,
      10
    );
    this.imageGlow.setAlpha(0);
    this.container.addAt(this.imageGlow, 0);

    // Update physics body to match image size
    const body = this.container.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(this.imageWidth + 20, this.imageHeight + 20);
      body.setOffset(-this.imageWidth / 2 - 10, -this.imageHeight / 2 - 10);
    }

    // Materialize animation - start at 30% of target size using setDisplaySize only
    const startScale = 0.3;
    this.image.setDisplaySize(this.imageWidth * startScale, this.imageHeight * startScale);

    const materializeTween = this.scene.tweens.add({
      targets: this.image,
      alpha: 1,
      displayWidth: this.imageWidth,
      displayHeight: this.imageHeight,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isAnimating = false;
      },
    });
    this.imageTweens.push(materializeTween);

    // Add subtle floating animation
    const floatTween = this.scene.tweens.add({
      targets: this.image,
      y: -5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.imageTweens.push(floatTween);

    const glowTween = this.scene.tweens.add({
      targets: this.imageGlow,
      alpha: 1,
      duration: 500,
    });
    this.imageTweens.push(glowTween);

    // Create close button
    this.createCloseButton();
  }

  private createCloseButton(): void {
    const btnSize = 24;
    const btnX = this.imageWidth / 2 + 5;
    const btnY = -this.imageHeight / 2 - 5;

    this.closeButton = this.scene.add.container(btnX, btnY);
    this.container.add(this.closeButton);
    this.container.bringToTop(this.closeButton);

    // Button background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xff4444, 1);
    bg.fillCircle(0, 0, btnSize / 2);
    bg.lineStyle(2, 0xffffff, 0.8);
    bg.strokeCircle(0, 0, btnSize / 2);

    // X symbol
    const xSize = 6;
    bg.lineStyle(3, 0xffffff, 1);
    bg.lineBetween(-xSize, -xSize, xSize, xSize);
    bg.lineBetween(-xSize, xSize, xSize, -xSize);

    this.closeButton.add(bg);

    // Animate button appearing
    this.closeButton.setAlpha(0);
    this.closeButton.setScale(0);
    this.scene.tweens.add({
      targets: this.closeButton,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      delay: 400,
      ease: 'Back.easeOut',
    });

    // Pulse animation
    const pulseTween = this.scene.tweens.add({
      targets: this.closeButton,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.imageTweens.push(pulseTween);
  }

  private createPlaceholder(): void {
    this.calculateDimensions();

    const g = this.scene.add.graphics();

    // Placeholder box
    g.fillStyle(0x1a1a3a, 1);
    g.fillRoundedRect(
      -this.imageWidth / 2,
      -this.imageHeight / 2,
      this.imageWidth,
      this.imageHeight,
      8
    );

    g.lineStyle(2, 0x326ce5, 0.5);
    g.strokeRoundedRect(
      -this.imageWidth / 2,
      -this.imageHeight / 2,
      this.imageWidth,
      this.imageHeight,
      8
    );

    // Image icon
    g.fillStyle(0x326ce5, 0.3);
    g.fillCircle(0, -10, 20);
    g.fillTriangle(-30, 30, 0, 0, 30, 30);

    g.setAlpha(0);
    g.setScale(0.3);
    this.container.add(g);

    this.imageGlow = g;

    // Update physics body size
    const body = this.container.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.imageWidth + 20, this.imageHeight + 20);
    body.setOffset(-this.imageWidth / 2 - 10, -this.imageHeight / 2 - 10);

    this.scene.tweens.add({
      targets: g,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isAnimating = false;
      },
    });

    this.createCloseButton();
  }

  private reform(): void {
    this.isAnimating = true;

    // Stop all image tweens
    this.imageTweens.forEach((tween) => tween.stop());
    this.imageTweens = [];

    this.playReformSound();

    // Shrink image and glow
    if (this.image) {
      this.scene.tweens.add({
        targets: this.image,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 400,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.image?.destroy();
          this.image = null;
        },
      });
    }

    // Shrink and remove close button
    if (this.closeButton) {
      this.scene.tweens.add({
        targets: this.closeButton,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 200,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.closeButton?.destroy();
          this.closeButton = null;
        },
      });
    }

    if (this.imageGlow) {
      this.scene.tweens.add({
        targets: this.imageGlow,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.imageGlow?.destroy();
          this.imageGlow = null;
        },
      });
    }

    // Reform crystal with energy effect
    this.scene.time.delayedCall(300, () => {
      this.reformCrystal();
    });
  }

  private reformCrystal(): void {
    // Reset physics body to crystal size
    const body = this.container.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.POD_WIDTH + 10, this.POD_HEIGHT + 20);
    body.setOffset(
      -(this.POD_WIDTH + 10) / 2 + this.crystalOffsetX,
      -(this.POD_HEIGHT + 20) / 2 + this.crystalOffsetY - 10
    );

    // Show preview image again
    if (this.previewImage) {
      this.previewImage.setVisible(true);
      this.previewImage.setAlpha(0);
      this.scene.tweens.add({
        targets: this.previewImage,
        alpha: 0.25,
        duration: 300,
      });
    }

    // Energy convergence effect
    const convergeCount = 12;
    for (let i = 0; i < convergeCount; i++) {
      const energy = this.scene.add.graphics();
      energy.fillStyle(0x00ffff, 0.8);
      energy.fillCircle(0, 0, 3);

      const angle = (i / convergeCount) * Math.PI * 2;
      const startDist = 100;
      energy.setPosition(
        this.crystalOffsetX + Math.cos(angle) * startDist,
        this.crystalOffsetY + Math.sin(angle) * startDist
      );

      this.container.add(energy);

      this.scene.tweens.add({
        targets: energy,
        x: this.crystalOffsetX,
        y: this.crystalOffsetY,
        alpha: 0,
        duration: 400,
        delay: i * 30,
        ease: 'Quad.easeIn',
        onComplete: () => energy.destroy(),
      });
    }

    // Show crystal components
    this.scene.time.delayedCall(300, () => {
      this.crystal.setVisible(true);
      this.crystal.setAlpha(0);
      this.crystal.setScale(0.5);

      this.emblem.setVisible(true);
      this.emblem.setAlpha(0);
      this.emblem.setScale(0.5);

      this.drawInnerGlow();
      this.innerGlow.setVisible(true);
      this.innerGlow.setAlpha(0);

      // Animate crystal materializing
      this.scene.tweens.add({
        targets: [this.crystal, this.emblem],
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: 'Back.easeOut',
      });

      this.scene.tweens.add({
        targets: this.innerGlow,
        alpha: 1,
        duration: 300,
        onComplete: () => {
          this.isShattered = false;
          this.isAnimating = false;
          this.startGlowAnimation();
          this.startEmblemAnimation();
          this.startFloatAnimation();
        },
      });
    });
  }

  private playShatterSound(): void {
    const audioContext =
      new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Explosive sound - multiple layered tones
    for (let i = 0; i < 4; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = i % 2 === 0 ? 'square' : 'sawtooth';
      const startFreq = 600 + i * 200;
      oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2 + i * 0.05);

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + i * 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

      oscillator.start(audioContext.currentTime + i * 0.02);
      oscillator.stop(audioContext.currentTime + 0.3);
    }

    // Noise burst for impact
    const bufferSize = audioContext.sampleRate * 0.1;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.1, audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    noise.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start();
  }

  private playReformSound(): void {
    const audioContext =
      new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Rising energy sound
    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      const startFreq = 200 + i * 100;
      oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime + i * 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime + i * 0.05);
      oscillator.stop(audioContext.currentTime + 0.4);
    }
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getCloseButton(): Phaser.GameObjects.Container | null {
    return this.closeButton;
  }

  triggerReform(): void {
    if (this.isShattered && !this.isAnimating) {
      this.reform();
    }
  }

  isActivated(): boolean {
    return this.isShattered;
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.imageWidth, height: this.imageHeight };
  }
}
