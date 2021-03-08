import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { VRButton } from "./VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import gsap from "gsap";

const loader = new THREE.CubeTextureLoader();
const skyBox = loader.load([
  "/SkyBox/Right.png",  //px
  "/SkyBox/Left.png",   //nx
  "/SkyBox/Up.png",     //py
  "/SkyBox/Down.png",   //ny
  "/SkyBox/Front.png",  //pz
  "/SkyBox/Back.png",   //nz
]);

const scene = new THREE.Scene();
let objectarray = [];

let tempMatrix = new THREE.Matrix4();
let intersects //Variable for storing intersected Objects.
const LoadingPercent = document.getElementById("LoadingPercent");
const objectLoader = new GLTFLoader(); //Loader Initialising

// debug ui
const gui = new dat.GUI();

//Camera
const camera = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

//Renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });

camera.position.z = 5;

renderer.shadowMap.enabled = true;

//SkyBox Setup
scene.background = skyBox;

renderer.setSize(window.innerWidth, window.innerHeight);

//Enabling XR.
renderer.xr.enabled = true;

//Loading VR Button after Model Loaded
let AfterModelLoaded = new Event('Loaded', { bubbles: true });

//Event Triggered after Models are loaded.
addEventListener('Loaded', () => {
  let VrButton;
  document.body.appendChild(VrButton = VRButton.createButton(renderer));
  LoadingPercent.hidden = true;

  //Event Triggered on VR Entered
  VrButton.addEventListener('VREntered', () => {
    renderer.xr.getCamera().getWorldPosition().set(1, 1, 1);
  });
})

// add to html page body
document.body.appendChild(renderer.domElement);

// handle resize of browser
window.addEventListener("resize", function () {
  let aspectRatio = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = aspectRatio;
  camera.updateProjectionMatrix();
});


// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// scene lights
const light = new THREE.DirectionalLight(0xffffff, 0.4);
light.position.set(-1, 15, 4);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.01)
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.distance = 2;
pointLight.position.set(1, 2, 1);
camera.add(pointLight);
scene.add(camera);

const helper = new THREE.DirectionalLightHelper(light, 3, '0xffff00');
scene.add(helper);

// cube
const cube = new THREE.BoxBufferGeometry();
const cubeMat = new THREE.MeshStandardMaterial({
  color: 0xffff00,
  wireframe: false,
});

//Adding Controllers mesh in the scene.
const controllerModelFactory = new XRControllerModelFactory();
const controller1 = renderer.xr.getController(0);
controller1.add(controllerModelFactory.createControllerModel(controller1));
const controller2 = renderer.xr.getController(1);
controller2.add(controllerModelFactory.createControllerModel(controller2));
scene.add(controller1, controller2);

controller1.addEventListener("selectstart", RightonSelectStart);
controller2.addEventListener("selectstart", LeftonSelectStart);

//Raycast
let raycaster = new THREE.Raycaster();

//Right Controller Select Button
function RightonSelectStart(event) {
  const intersect = getIntersection(event.target);
  if (intersect) {
    console.log(intersect);
  }
}


//Left Controller Select Button
function LeftonSelectStart(event) {
  const intersect = getIntersection(event.target);
  if (intersect) {
    console.log(intersect);
  }
}

//Line Mesh
const geometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1),
]);

const line = new THREE.Line(
  geometry,
  new THREE.LineBasicMaterial({ color: new THREE.Color(255, 0, 0) })
);
line.name = "line";
line.scale.z = 5;


//Adding Line to  Controller
controller1.add(line.clone());
controller2.add(line.clone());

//Function Setting Ray position,Direction and Lines.
function getIntersection(controller) {
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.applyMatrix4(tempMatrix);

  const line = controller.getObjectByName("line");
  const intersect = Raycast();

  if (intersect) {
    line.scale.z = intersect.distance;
  }
  else {
    line.scale.z = 5;
  }
  return intersect;
}

//Raycast Function
function Raycast() {
  let objectIntersected = raycaster.intersectObjects(objectarray);
  if (objectIntersected[0]) {
    return objectIntersected[0];
  }
  else {
    reticle.visible = false;
  }
}

//Loop Function.
const animate = function () {
  // runs 60 times each seconds
  renderer.setAnimationLoop(Update);
};

//Fog
let fogColor = new THREE.Color(0x964B00);
scene.fog = new THREE.Fog(fogColor, 0.0005, 20);

//Update Function.
function Update() {
  // render the scene with our camera
  renderer.render(scene, camera);
}

//Function for Loading Models
function Load(URL, hasLoading) {
  objectLoader.load(URL, (Model) => {
    let temp = Model.scene;
    scene.add(temp);
    temp.traverse(function (child) {
      if (child.isMesh) {
        objectarray.push(child);
      }
    })
    window.dispatchEvent(AfterModelLoaded);
  }, (Loading) => {
    if (hasLoading) {
      LoadingPercent.textContent = parseInt((Loading.loaded / Loading.total) * 100) + '%';
    }
  }, (Error) => {
    console.log(Error);
  });
}
Load('Models/scene.glb', true);

// start game loop
animate();
