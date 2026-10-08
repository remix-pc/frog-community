import Phaser from 'phaser';
import { COLORS, type Player, type Point } from '../shared/protocol';
import { isWalkable, TREES, WORLD } from '../shared/world';
import { dataSvg, frogSvg, groundSvg, treeSvg } from './art';

type Avatar = { root: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; target: Player; phase: number };
export class PlazaScene extends Phaser.Scene {
  private avatars = new Map<string, Avatar>();
  private pending: Player[] = [];
  private ready = false;
  private selfId = '';
  private enabled = false;
  private focusRing?: Phaser.GameObjects.Ellipse;
  private destination?: Phaser.GameObjects.Arc;
  private bubbles = new Map<string, { object: Phaser.GameObjects.Container; expires: number }>();
  onMove: (point: Point) => void = () => {};
  onInvalid: () => void = () => {};
  constructor() { super('plaza'); }
  preload() {
    this.load.svg('ground', dataSvg(groundSvg()));
    this.load.svg('tree', dataSvg(treeSvg()));
    COLORS.forEach(c => this.load.svg(c.hex, dataSvg(frogSvg(c.hex))));
  }
  create() {
    this.add.image(0, 0, 'ground').setOrigin(0);
    TREES.forEach(t => this.add.image(t.x, t.y + 17 * t.scale, 'tree').setOrigin(0.5, 1).setScale(t.scale).setDepth(t.y));
    // Subtle glints drift across the pond; everything remains readable at rest.
    for (let i = 0; i < 7; i++) {
      const ripple = this.add.ellipse(800 + (i * 43) % 260, 240 + (i * 53) % 160, 28 + i * 3, 7).setStrokeStyle(2, 0xe9f3d3, 0.4);
      this.tweens.add({ targets: ripple, x: ripple.x + 15, alpha: 0.1, scaleX: 1.4, duration: 2200 + i * 320, yoyo: true, repeat: -1, delay: i * 430 });
    }
    this.focusRing = this.add.ellipse(0, 0, 64, 27).setStrokeStyle(2.5, 0xfff6d7).setVisible(false);
    this.destination = this.add.circle(0, 0, 10).setStrokeStyle(2, 0x54744b).setVisible(false);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled || pointer.rightButtonDown()) return;
      const point = { x: pointer.worldX, y: pointer.worldY };
      if (!isWalkable(point)) { this.onInvalid(); return; }
      this.onMove(point);
      this.destination!.setPosition(point.x, point.y).setVisible(true).setAlpha(1).setScale(0.5);
      this.tweens.killTweensOf(this.destination!);
      this.tweens.add({ targets: this.destination, scale: 1.7, alpha: 0, duration: 700 });
    });
    this.ready = true;
    this.setPlayers(this.pending);
    this.game.canvas.dataset.ready = 'true';
  }
  setSelf(id: string) { this.selfId = id; }
  setEnabled(enabled: boolean) { this.enabled = enabled; }
  setPlayers(players: Player[]) {
    this.pending = players;
    if (!this.ready) return;
    const ids = new Set(players.map(p => p.id));
    for (const [id, avatar] of this.avatars) if (!ids.has(id)) { avatar.root.destroy(); this.avatars.delete(id); this.removeBubble(id); }
    for (const player of players) {
      const existing = this.avatars.get(player.id);
      if (existing) { existing.target = player; continue; }
      const shadow = this.add.ellipse(0, 1, 48, 16, 0x3b6546, 0.2);
      const sprite = this.add.image(0, -29, player.color).setDisplaySize(73, 67);
      const label = this.add.text(0, 18, player.nickname + (player.id === this.selfId ? ' · você' : ''), {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#294a36', backgroundColor: '#fff9e5', padding: { x: 8, y: 4 }
      }).setOrigin(0.5, 0);
      const root = this.add.container(player.x, player.y, [shadow, sprite, label]);
      this.avatars.set(player.id, { root, sprite, label, target: player, phase: this.avatars.size * 2.1 });
    }
    if (!ids.has(this.selfId)) this.focusRing?.setVisible(false);
  }
  showBubble(id: string, text: string) {
    if (!this.ready || !this.avatars.has(id)) return;
    this.removeBubble(id);
    const label = this.add.text(0, 0, text.replace(/\s+/g, ' '), { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '17px', color: '#294a36', wordWrap: { width: 225, useAdvancedWrap: true }, align: 'center', lineSpacing: 3 }).setOrigin(0.5, 1);
    const w = Math.max(label.width + 24, 45), h = label.height + 21;
    const panel = this.add.graphics().fillStyle(0xfffef5, 1).lineStyle(2, 0x729768, 0.75);
    panel.fillRoundedRect(-w / 2, -h + 8, w, h, 12).strokeRoundedRect(-w / 2, -h + 8, w, h, 12);
    panel.fillTriangle(-6, 8, 6, 8, 0, 16);
    const object = this.add.container(0, 0, [panel, label]).setDepth(3000);
    this.bubbles.set(id, { object, expires: this.time.now + 6000 });
  }
  removeBubble(id: string) { this.bubbles.get(id)?.object.destroy(); this.bubbles.delete(id); }
  clearBubbles() { for (const id of this.bubbles.keys()) this.removeBubble(id); }
  update(time: number, delta: number) {
    for (const [id, avatar] of this.avatars) {
      const { root, sprite, target } = avatar;
      const blend = 1 - Math.exp(-delta / 70);
      root.x += (target.x - root.x) * blend; root.y += (target.y - root.y) * blend;
      root.setDepth(root.y);
      const hopping = target.moving ? Math.abs(Math.sin(time / 105 + avatar.phase)) * 8 : Math.sin(time / 420 + avatar.phase) * 1.2;
      sprite.y = -29 - hopping;
      sprite.setFlipX(target.facing < 0);
      sprite.setAngle(target.moving ? Math.sin(time / 105 + avatar.phase) * 3 : 0);
      if (id === this.selfId) this.focusRing?.setVisible(true).setPosition(root.x, root.y + 1).setDepth(root.y - 0.5);
      const bubble = this.bubbles.get(id);
      if (bubble) {
        if (time > bubble.expires) this.removeBubble(id);
        else {
          const label = bubble.object.list[1] as Phaser.GameObjects.Text;
          bubble.object.setPosition(Phaser.Math.Clamp(root.x, 140, WORLD.width - 140), Math.max(root.y - 83, label.height + 24));
        }
      }
    }
  }
}
export function createPlaza(parent: HTMLElement) {
  const scene = new PlazaScene();
  const game = new Phaser.Game({ type: Phaser.AUTO, parent, width: WORLD.width, height: WORLD.height, backgroundColor: '#adc98a', scene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true }, audio: { noAudio: true } });
  const observer = new ResizeObserver(() => game.scale.refresh()); observer.observe(parent);
  return { scene, game };
}
