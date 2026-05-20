import Phaser from "phaser";

class EmptyScene extends Phaser.Scene {
  constructor() {
    super("EmptyScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a1a1a");
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#1a1a1a",
  scene: [EmptyScene],
});
