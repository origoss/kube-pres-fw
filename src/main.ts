import Phaser from 'phaser';
import { RoomScene } from './lib/scenes/RoomScene';
import { theme } from './theme.config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: theme.background.color,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [RoomScene],
};

new Phaser.Game(config);
