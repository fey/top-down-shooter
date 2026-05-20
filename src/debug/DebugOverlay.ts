import Phaser from "phaser";
import { PLAYER_HP } from "../config";
import type { Player } from "../entities/Player";

export class DebugOverlay {
  private text: Phaser.GameObjects.Text;
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
  ) {
    this.player = player;
    this.enemies = enemies;
    this.text = scene.add
      .text(10, 10, "", {
        font: "13px monospace",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);
    scene.events.on("update", this.refresh, this);
    scene.events.once("shutdown", () => this.text.destroy(), this);
  }

  private refresh(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.text.setText([
      `HP:     ${this.player.hp} / ${PLAYER_HP}`,
      `Враги:  ${this.enemies.getLength()}`,
      `Pos:    ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
      `Vel:    ${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)}`,
      `FPS:    ${Math.round(this.player.scene.game.loop.actualFps)}`,
    ]);
  }
}
