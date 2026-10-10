/** Where hand control leaves its instructions for the 3D scene: the viewer adds to it as gestures arrive, the scene takes what is waiting every frame. */
export class GestureBus {
  private current?: { x: number; y: number };
  private rotation: [number, number] = [0, 0];
  private zoomFactor = 1;
  private pendingTap?: { x: number; y: number };

  /** Where the pointing hand is over the view (0 to 1), or nothing when no hand is seen. */
  setPointer(p?: { x: number; y: number }) { this.current = p; }
  get pointer() { return this.current; }
  addRotate(dx: number, dy: number) { this.rotation = [this.rotation[0] + dx, this.rotation[1] + dy]; }
  addZoom(factor: number) { this.zoomFactor *= factor; }
  tap(x: number, y: number) { this.pendingTap = { x, y }; }
  /** The turning and zooming asked for since the last frame; asking clears it. */
  takeMotion(): { rotate: [number, number]; zoom: number } | undefined {
    if (!this.rotation[0] && !this.rotation[1] && this.zoomFactor === 1) return undefined;
    const motion = { rotate: this.rotation, zoom: this.zoomFactor }; this.rotation = [0, 0]; this.zoomFactor = 1; return motion;
  }
  takeTap() { const t = this.pendingTap; this.pendingTap = undefined; return t; }
}
