import Phaser from 'phaser';
import { theme } from '../../theme.config';

// Parse hex color from theme (e.g., "#326ce5" -> 0x326ce5)
function parseHexColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export class Starship {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Container;
  private body: Phaser.Physics.Arcade.Body;
  
  private readonly THRUST = 800;
  private readonly MAX_SPEED = 500;
  private readonly DRAG = 1200;
  private readonly TURN_SPEED = 0.25;
  private readonly LASER_SPEED = 800;
  private readonly LASER_COOLDOWN = 200;

  private engineGlow: Phaser.GameObjects.Graphics;
  private debugText: Phaser.GameObjects.Text | null = null;
  private engineTimer: number = 0;
  private targetRotation: number = 0;
  private lastFireTime: number = 0;
  private lasers: Phaser.Physics.Arcade.Group;

  // Translucent state when flying over content
  private isTranslucent: boolean = false;
  private ghostGlow: Phaser.GameObjects.Graphics;
  private opacityTween: Phaser.Tweens.Tween | null = null;

  // Input state - updated via events for reliability
  private inputState = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  // Mouse targeting state
  private mouseTarget: { x: number; y: number } | null = null;
  private useMouseRotation: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = this.createShipGraphics(x, y);
    this.engineGlow = this.createEngineGlow();
    this.ghostGlow = this.createGhostGlow();

    scene.physics.world.enable(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    
    this.body.setDrag(this.DRAG, this.DRAG);
    this.body.setMaxVelocity(this.MAX_SPEED, this.MAX_SPEED);
    this.body.setBounce(0.3, 0.3);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(40, 30);
    this.body.setOffset(-20, -15);

    this.lasers = scene.physics.add.group({
      defaultKey: 'laser',
      maxSize: 20,
    });

    // Create debug text (hidden by default, press ~ to toggle)
    this.debugText = scene.add.text(10, 10, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#00ff00',
      backgroundColor: '#00000080',
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);
    this.debugText.setVisible(false);
  }

  toggleDebug(): void {
    if (this.debugText) {
      this.debugText.setVisible(!this.debugText.visible);
    }
  }

  private createShipGraphics(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    const shipBody = this.scene.add.graphics();
    const radius = 22;
    const sides = 7;
    const shipColor = parseHexColor(theme.starship.color);
    const glowColor = parseHexColor(theme.starship.glowColor);
    
    // Outer glow
    shipBody.fillStyle(shipColor, 0.3);
    this.drawHeptagon(shipBody, 0, 0, radius + 4, sides, true);
    
    // Main heptagon body
    shipBody.fillStyle(shipColor, 1);
    this.drawHeptagon(shipBody, 0, 0, radius, sides, true);
    
    // Inner lighter heptagon (derived from glow color)
    shipBody.fillStyle(glowColor, 1);
    this.drawHeptagon(shipBody, 0, 0, radius - 4, sides, true);
    
    // White border
    shipBody.lineStyle(2, 0xffffff, 0.9);
    this.drawHeptagon(shipBody, 0, 0, radius, sides, false);
    
    // Center hub
    shipBody.fillStyle(0xffffff, 1);
    shipBody.fillCircle(0, 0, 6);
    shipBody.fillStyle(shipColor, 1);
    shipBody.fillCircle(0, 0, 4);
    
    // Helm spokes (7 spokes to vertices)
    shipBody.lineStyle(2, 0xffffff, 0.9);
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const innerRadius = 6;
      const outerRadius = radius - 5;
      const x1 = Math.cos(angle) * innerRadius;
      const y1 = Math.sin(angle) * innerRadius;
      const x2 = Math.cos(angle) * outerRadius;
      const y2 = Math.sin(angle) * outerRadius;
      shipBody.lineBetween(x1, y1, x2, y2);
      
      // Small circles at spoke ends
      shipBody.fillStyle(0xffffff, 1);
      shipBody.fillCircle(x2, y2, 2);
    }

    // Laser cannon at the front
    shipBody.fillStyle(0x1a4a9e, 1);
    shipBody.fillRect(radius - 2, -1.5, 10, 3);
    shipBody.fillStyle(0x00ffff, 1);
    shipBody.fillRect(radius, -0.5, 8, 1);
    
    container.add(shipBody);
    
    return container;
  }

  private drawHeptagon(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    fill: boolean
  ): void {
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    if (fill) {
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      graphics.closePath();
      graphics.fillPath();
    } else {
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      graphics.closePath();
      graphics.strokePath();
    }
  }

  private createEngineGlow(): Phaser.GameObjects.Graphics {
    const glow = this.scene.add.graphics();
    this.sprite.add(glow);
    glow.setPosition(0, 0);
    return glow;
  }

  private createGhostGlow(): Phaser.GameObjects.Graphics {
    const glow = this.scene.add.graphics();
    // Don't add to sprite container so alpha is independent
    glow.setDepth(1099); // Just below ship (depth 1100)
    glow.setVisible(false);
    return glow;
  }

  setTranslucent(translucent: boolean): void {
    if (this.isTranslucent === translucent) return;

    this.isTranslucent = translucent;

    // Stop any existing opacity tween
    if (this.opacityTween) {
      this.opacityTween.stop();
      this.opacityTween = null;
    }

    const targetAlpha = translucent ? 0.2 : 1;

    this.opacityTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: targetAlpha,
      duration: 500,
      ease: 'Sine.easeInOut',
    });

    // Show/hide ghost glow effect
    if (translucent) {
      this.updateGhostGlow();
    } else {
      // Stop all tweens on ghost glow when hiding
      this.scene.tweens.killTweensOf(this.ghostGlow);
      this.ghostGlow.setVisible(false);
    }
  }

  private updateGhostGlow(): void {
    this.ghostGlow.clear();

    if (!this.isTranslucent) return;

    const radius = 30;
    const glowColor = parseHexColor(theme.starship.glowColor);

    // Outer ethereal glow
    this.ghostGlow.fillStyle(glowColor, 0.2);
    this.ghostGlow.fillCircle(0, 0, radius + 10);

    // Middle glow
    this.ghostGlow.fillStyle(glowColor, 0.3);
    this.ghostGlow.fillCircle(0, 0, radius + 5);

    // Inner bright glow
    this.ghostGlow.fillStyle(glowColor, 0.4);
    this.ghostGlow.fillCircle(0, 0, radius);

    // Subtle pulse animation
    this.scene.tweens.add({
      targets: this.ghostGlow,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updateEngineGlow(isThrusting: boolean): void {
    this.engineGlow.clear();

    if (isThrusting) {
      this.engineTimer += 0.2;
      const flicker = Math.sin(this.engineTimer) * 0.3 + 0.7;
      const length = 20 + Math.sin(this.engineTimer * 2) * 8;
      const shipColor = parseHexColor(theme.starship.color);
      const glowColor = parseHexColor(theme.starship.glowColor);

      // Outer glow
      this.engineGlow.fillStyle(shipColor, flicker * 0.3);
      this.engineGlow.fillTriangle(-26, -12, -26, 12, -26 - length, 0);

      // Middle glow
      this.engineGlow.fillStyle(glowColor, flicker * 0.6);
      this.engineGlow.fillTriangle(-26, -8, -26, 8, -26 - length * 0.7, 0);

      // Inner glow (white)
      this.engineGlow.fillStyle(0xffffff, flicker);
      this.engineGlow.fillTriangle(-26, -4, -26, 4, -26 - length * 0.4, 0);
    }
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd?: Phaser.Types.Input.Keyboard.CursorKeys,
    isPointerOverCanvas?: boolean
  ): void {
    let isThrusting = false;

    // Stop mouse control if pointer leaves canvas
    if (this.useMouseRotation && !isPointerOverCanvas) {
      this.clearMouseTarget();
      this.stop();
    }

    // Mouse control takes priority when mouse is over canvas
    if (this.useMouseRotation && this.mouseTarget) {
      isThrusting = this.updateMouseMovement();
    } else {
      // Fall back to keyboard control
      // Read from inputState (set by keyboard events) + current polling as fallback
      const left = this.inputState.left || cursors.left.isDown || wasd?.left.isDown || false;
      const right = this.inputState.right || cursors.right.isDown || wasd?.right.isDown || false;
      const up = this.inputState.up || cursors.up.isDown || wasd?.up.isDown || false;
      const down = this.inputState.down || cursors.down.isDown || wasd?.down.isDown || false;

      if (left) {
        this.body.setAccelerationX(-this.THRUST);
        isThrusting = true;
      } else if (right) {
        this.body.setAccelerationX(this.THRUST);
        isThrusting = true;
      } else {
        this.body.setAccelerationX(0);
      }

      if (up) {
        this.body.setAccelerationY(-this.THRUST);
        isThrusting = true;
      } else if (down) {
        this.body.setAccelerationY(this.THRUST);
        isThrusting = true;
      } else {
        this.body.setAccelerationY(0);
      }
    }

    this.updateEngineGlow(isThrusting);
    this.updateRotation();
    this.updateGhostGlowPosition();
    this.updateDebug(cursors, wasd);
  }

  private updateMouseMovement(): boolean {
    if (!this.mouseTarget) return false;

    const dx = this.mouseTarget.x - this.sprite.x;
    const dy = this.mouseTarget.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Stop when close to target (dead zone)
    if (distance < 10) {
      this.body.setAcceleration(0, 0);
      return false;
    }

    // Calculate desired speed based on distance (proportional, capped at MAX_SPEED)
    // Use a multiplier so the ship feels responsive
    const speedMultiplier = 2.5;
    const targetSpeed = Math.min(distance * speedMultiplier, this.MAX_SPEED);

    // Calculate velocity vector towards target
    const angle = Math.atan2(dy, dx);
    const targetVelX = Math.cos(angle) * targetSpeed;
    const targetVelY = Math.sin(angle) * targetSpeed;

    // Apply force to move towards target velocity (smooth acceleration)
    const currentVelX = this.body.velocity.x;
    const currentVelY = this.body.velocity.y;

    const accelX = (targetVelX - currentVelX) * 5; // Responsiveness factor
    const accelY = (targetVelY - currentVelY) * 5;

    this.body.setAcceleration(accelX, accelY);

    return true;
  }

  private updateGhostGlowPosition(): void {
    if (this.isTranslucent) {
      this.ghostGlow.setPosition(this.sprite.x, this.sprite.y);
    }
  }

  setInputState(direction: 'left' | 'right' | 'up' | 'down', isDown: boolean): void {
    this.inputState[direction] = isDown;
  }

  setMouseTarget(x: number, y: number): void {
    this.mouseTarget = { x, y };
    this.useMouseRotation = true;
  }

  clearMouseTarget(): void {
    this.mouseTarget = null;
    this.useMouseRotation = false;
  }

  stop(): void {
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
  }

  private updateDebug(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd?: Phaser.Types.Input.Keyboard.CursorKeys
  ): void {
    if (!this.debugText || !this.debugText.visible) return;

    const arrow = [];
    const wasdKeys = [];
    if (cursors.left.isDown) arrow.push('L');
    if (cursors.right.isDown) arrow.push('R');
    if (cursors.up.isDown) arrow.push('U');
    if (cursors.down.isDown) arrow.push('D');

    if (wasd?.left.isDown) wasdKeys.push('A');
    if (wasd?.right.isDown) wasdKeys.push('D');
    if (wasd?.up.isDown) wasdKeys.push('W');
    if (wasd?.down.isDown) wasdKeys.push('S');

    // Show inputState (event-based)
    const state = [];
    if (this.inputState.left) state.push('L');
    if (this.inputState.right) state.push('R');
    if (this.inputState.up) state.push('U');
    if (this.inputState.down) state.push('D');

    this.debugText.setText([
      `Arrow: ${arrow.join(',') || '-'} | WASD: ${wasdKeys.join(',') || '-'}`,
      `State: ${state.join(',') || '-'}`,
      `Acc: ${this.body.acceleration.x.toFixed(0)},${this.body.acceleration.y.toFixed(0)}`,
      `Vel: ${this.body.velocity.x.toFixed(0)},${this.body.velocity.y.toFixed(0)}`,
      `Pos: ${this.sprite.x.toFixed(0)},${this.sprite.y.toFixed(0)}`,
    ]);
  }

  private updateRotation(): void {
    if (this.useMouseRotation && this.mouseTarget) {
      // Rotate to face mouse pointer
      const dx = this.mouseTarget.x - this.sprite.x;
      const dy = this.mouseTarget.y - this.sprite.y;
      this.targetRotation = Math.atan2(dy, dx);
    } else {
      // Default: rotate based on velocity
      const speed = this.body.velocity.length();
      if (speed > 20) {
        this.targetRotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      }
    }

    let currentRotation = this.sprite.rotation;
    let diff = this.targetRotation - currentRotation;

    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    this.sprite.rotation += diff * this.TURN_SPEED;
  }

  shoot(): void {
    const now = this.scene.time.now;
    if (now - this.lastFireTime < this.LASER_COOLDOWN) return;
    
    this.lastFireTime = now;
    
    const laser = this.createLaser();
    if (!laser) return;

    const angle = this.sprite.rotation;
    const offsetX = Math.cos(angle) * 30;
    const offsetY = Math.sin(angle) * 30;
    
    laser.setPosition(this.sprite.x + offsetX, this.sprite.y + offsetY);
    laser.setRotation(angle);
    laser.setActive(true);
    laser.setVisible(true);

    const laserBody = laser.body as Phaser.Physics.Arcade.Body;
    laserBody.enable = true;
    laserBody.setVelocity(
      Math.cos(angle) * this.LASER_SPEED,
      Math.sin(angle) * this.LASER_SPEED
    );

    this.playLaserSound();

    this.scene.time.delayedCall(1500, () => {
      if (laser.active) {
        laser.setActive(false);
        laser.setVisible(false);
        (laser.body as Phaser.Physics.Arcade.Body).enable = false;
      }
    });
  }

  private createLaser(): Phaser.GameObjects.Graphics | null {
    let laser = this.lasers.getFirstDead() as Phaser.GameObjects.Graphics;

    if (!laser) {
      laser = this.scene.add.graphics();
      const laserColor = parseHexColor(theme.laser.color);

      // Laser beam shape
      laser.fillStyle(laserColor, 1);
      laser.fillRect(-12, -2, 24, 4);
      laser.fillStyle(0xffffff, 1);
      laser.fillRect(-10, -1, 20, 2);

      // Glow effect
      laser.fillStyle(laserColor, 0.3);
      laser.fillRect(-14, -4, 28, 8);
      
      this.scene.physics.world.enable(laser);
      const body = laser.body as Phaser.Physics.Arcade.Body;
      body.setSize(24, 8);
      body.setOffset(-12, -4);
      
      this.lasers.add(laser);
    }
    
    return laser;
  }

  private playLaserSound(): void {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  getLasers(): Phaser.Physics.Arcade.Group {
    return this.lasers;
  }

  getSprite(): Phaser.GameObjects.Container {
    return this.sprite;
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body;
  }
}
