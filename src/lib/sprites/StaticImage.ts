import Phaser from 'phaser';

export class StaticImage {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private image: Phaser.GameObjects.Image | null = null;
  private imageKey: string;
  private explicitWidth?: number;
  private explicitHeight?: number;
  private floatTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    imageKey: string,
    imageWidth?: number,
    imageHeight?: number
  ) {
    this.scene = scene;
    this.imageKey = imageKey;
    this.explicitWidth = imageWidth;
    this.explicitHeight = imageHeight;

    // Container is at image position
    this.container = scene.add.container(x, y);
    this.container.setDepth(6); // In front of text, below ship (depth 10)

    // Load and display the image
    this.loadImage();

    // Start floating animation
    this.startFloatAnimation();
  }

  private loadImage(): void {
    // Check if image is already cached
    if (this.scene.textures.exists(this.imageKey)) {
      this.createImage();
    } else {
      // Load the image dynamically - strip leading '/' for relative path
      const imageUrl = this.imageKey.startsWith('/') ? this.imageKey.slice(1) : this.imageKey;
      this.scene.load.image(this.imageKey, imageUrl);

      this.scene.load.on(`filecomplete-image-${this.imageKey}`, () => {
        this.createImage();
      });

      // Start loading if not already started
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    }
  }

  private createImage(): void {
    this.image = this.scene.add.image(0, 0, this.imageKey);

    // Apply explicit dimensions if provided, otherwise use original size
    if (this.explicitWidth && this.explicitHeight) {
      this.image.setDisplaySize(this.explicitWidth, this.explicitHeight);
    } else if (this.explicitWidth) {
      // Maintain aspect ratio with given width
      const aspectRatio = this.image.height / this.image.width;
      this.image.setDisplaySize(this.explicitWidth, this.explicitWidth * aspectRatio);
    } else if (this.explicitHeight) {
      // Maintain aspect ratio with given height
      const aspectRatio = this.image.width / this.image.height;
      this.image.setDisplaySize(this.explicitHeight * aspectRatio, this.explicitHeight);
    }

    this.container.add(this.image);
  }

  private startFloatAnimation(): void {
    // Gentle bobbing motion like crystal images
    this.floatTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getDimensions(): { width: number; height: number } {
    if (this.image) {
      return {
        width: this.image.displayWidth,
        height: this.image.displayHeight,
      };
    }
    return { width: 0, height: 0 };
  }

  destroy(): void {
    if (this.floatTween) {
      this.floatTween.stop();
    }
    this.container.destroy();
  }
}
