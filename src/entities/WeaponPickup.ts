import Phaser from "phaser";
import { pickupTextureKey, WEAPONS, type WeaponId } from "../config";

/**
 * Лежащее на полу оружие. Статическое тело: пикап не двигается и не сталкивается со
 * стенами — сцена вешает на него только `overlap` с игроком, который вызывает
 * `Player.equip` и уничтожает пикап. Оружие в пикапе задаётся картой (свойство
 * "weapon" объекта Tiled), поэтому здесь хранится только его id.
 */
export class WeaponPickup extends Phaser.Physics.Arcade.Sprite {
  readonly weaponId: WeaponId;

  constructor(scene: Phaser.Scene, x: number, y: number, weaponId: WeaponId) {
    super(scene, x, y, pickupTextureKey(WEAPONS[weaponId]));
    this.weaponId = weaponId;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true → статическое тело
  }
}
