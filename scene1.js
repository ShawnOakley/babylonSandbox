export class BasicScene {
  public camera: BABYLON.ArcRotateCamera;
  public light: BABYLON.PointLight;
  public box: BABYLON.Mesh;

  private _engine: BABYLON.Engine;
  private _scene: BABYLON.Scene;

  constructor(canvas: HTMLCanvasElement) {
    // Create Engine
    this._engine = new BABYLON.Engine(canvas);
    this._scene = new BABYLON.Scene(this._engine);

    this.camera = new BABYLON.ArcRotateCamera("camera", 0 , 0, 30, BABYLON.Vector3.Zero(), this._scene);
    this.camera.attachControl(canvas, true);

    this.light = new BABYLON.PointLight("light", new BABYLON.Vector3(20, 20, 20), this._scene);
    this.light.diffuse = new BABYLON.Color3(0,1,0);
    this.light.specular = new BABYLON.Color3(1,0,1);
    this.light.intensity = 1.0;

    this.box  = BABYLON.Mesh.CreateBox("cube", 5, this._scene);
  }
}
