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

let raycastMatrix = new THREE.Matrix4();
let GameEventObjMatrix = new THREE.Matrix4();
const LoadingPercent = document.getElementById("LoadingPercent");
const objectLoader = new GLTFLoader(); //Loader Initialising
let inVR = false;

let GameEventObjects = [];

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
    console.log('Entered VR');
    inVR = true;
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
let cubeMesh = new THREE.Mesh(cube, cubeMat);
cubeMesh.name = 'cube';
cubeMesh.userData = { done: false };
cubeMesh.scale.set(1, 1, 1);
scene.add(cubeMesh);
GameEventObjects.push(cubeMesh);

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
  raycastMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.applyMatrix4(raycastMatrix);

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

//Fog
let fogColor = new THREE.Color(0x964B00);
scene.fog = new THREE.Fog(fogColor, 0.0005, 20);

//Function for Loading Models
function Load(URL, hasLoading, name) {
  objectLoader.load(URL, (Model) => {
    let ModelMesh = Model.scene;
    ModelMesh.name = name;
    scene.add(ModelMesh);
    ModelMesh.traverse(function (child) {
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

//Loading Main Model.
Load('Models/scene.glb', true, 'BaseModel');

//Audio
let audioLoader = new THREE.AudioLoader();
let audioListener = new THREE.AudioListener();
let audio = new THREE.Audio(audioListener);
let positionalAudio = new THREE.PositionalAudio(audioListener);

//Adding Listener to camera
camera.add(audioListener);

//Normal Audio Loader Function
function NormalAudioLoader(path, volume) {
  audioLoader.load(path, (buffer) => {
    audio.setBuffer(buffer);
    audio.setVolume(volume);
  }, undefined, undefined);
}

//Positional Audio Loader Function
function positionalAudioLoader(path, volume, RefDistance, PosX, PosY, PosZ) {
  audioLoader.load(path, (buffer) => {
    positionalAudio.setBuffer(buffer);
    positionalAudio.setVolume(volume);
    positionalAudio.setRefDistance(RefDistance);
    positionalAudio.setLoop(true);
    positionalAudio.position.set(PosX, PosY, PosZ);
    scene.add(positionalAudio);
  }, undefined, undefined);
}

//Loading Audio
positionalAudioLoader("Audios/BG.wav", 0.1, 10, 2, 2, 2);

//Game Physics Implemetation
let gameEventRaycast = new THREE.Raycaster();

function gameEventObjIntersection() {
  GameEventObjMatrix.extractRotation(camera.matrixWorld);
  gameEventRaycast.ray.origin.setFromMatrixPosition(camera.matrixWorld);
  gameEventRaycast.ray.direction.applyMatrix4(GameEventObjMatrix);
  gameEventRaycast.far = 1;
  let intersect = GameEventRaycast();
  if (intersect) {
    return intersect;
  }
}

function GameEventRaycast() {
  let intersectedObjects = gameEventRaycast.intersectObjects(GameEventObjects);
  if (intersectedObjects[0]) {
    return intersectedObjects[0];
  }
}

//Loop Function.
const animate = function () {
  // runs 60 times each seconds
  renderer.setAnimationLoop(Update);
};

//Object Holding event functions of objects for game events
let Properties = {
  cube: function () {
    if (!positionalAudio.isPlaying) {
      positionalAudio.play();
    }
  }
}

//Update Function.
function Update() {
  if (inVR) {
    let hit = gameEventObjIntersection();
    if (hit) {
      if (hit.object.userData.done == false) {
        Properties[hit.object.name]();
        hit.object.userData.done = true;
      }
    }
  }
  // render the scene with our camera
  renderer.render(scene, camera);
}

// start game loop
animate();