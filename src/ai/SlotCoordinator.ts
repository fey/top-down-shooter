import Phaser from "phaser";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";

const SLOT_COUNT = 8;

export class SlotCoordinator {
  private readonly takenSlots = new Map<Enemy, number>();

  assignSlot(enemy: Enemy, player: Player): void {
    const takenIndices = new Set(this.takenSlots.values());
    const enemyAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);

    let bestSlot = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (takenIndices.has(i)) continue;
      const slotAngle = i * ((Math.PI * 2) / SLOT_COUNT);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - slotAngle));
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSlot = i;
      }
    }

    this.takenSlots.set(enemy, bestSlot);
    enemy.flankAngle = bestSlot * ((Math.PI * 2) / SLOT_COUNT);
  }

  releaseSlot(enemy: Enemy): void {
    this.takenSlots.delete(enemy);
  }
}
