import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { VRButton } from "./VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import gsap from "gsap";
import ThreeMeshUI from './three-mesh-ui-master/src/three-mesh-ui.js';

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

//Camera Holder
const camHolder = new THREE.Object3D();
camHolder.add(camera);
scene.add(camHolder);
camHolder.position.set(-1, -0.5, 0);
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

// Torch light
const TorchLight = new THREE.SpotLight(0xffffff, 0.5);
TorchLight.position.set(0, 0, 1);
TorchLight.target = (camera);
TorchLight.castShadow = true;
camera.add(TorchLight);

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
cubeMesh.position.set(-1, 0, 0);
cubeMesh.receiveShadow = true;
scene.add(cubeMesh);
objectarray.push(cubeMesh);
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
let teleporting = false;

let interactableProperties = {
  cube: (intersectRef) => {
    Traverse(intersectRef.object).forEach(element => {
      element.visible = false;
    })
  },
  Mesh_0: (intersectRef) => {
    //Smooth Teleporting to intersect Position
    gsap.to(camHolder.position, 2, {
      x: intersectRef.point.x,
      y: camHolder.position.y,
      z: intersectRef.point.z,
      onComplete: () => {
        teleporting = false;
      },
    })
  }
}

//Right Controller Select Button
function RightonSelectStart(event) {
  const intersect = getIntersection(event.target);
  SelectFunction(intersect);
}


//Left Controller Select Button
function LeftonSelectStart(event) {
  const intersect = getIntersection(event.target);
  SelectFunction(intersect);
}

//Function containing common calling logic for both controllers.
function SelectFunction(intersect) {
  if (intersect && !teleporting && intersect.object.name in interactableProperties) {
    teleporting = true;
    interactableProperties[intersect.object.name](intersect);
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
        child.receiveShadow = true;
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

//Object Holding event functions of objects for game events
let Properties = {
  cube: function (intersectRef) {
    if (!positionalAudio.isPlaying) {
      positionalAudio.play();
      Traverse(intersectRef.object).forEach(element => {
        element.visible = true;
      });
    }
  }
}

//UI
function CreateInteractUIPanel(Parent) {
  const container = new ThreeMeshUI.Block({
    height: 1.5,
    width: 1,
    backgroundOpacity: 0,
    fontFamily: 'Font/AkayaTelivigala-Regular-msdf.json',
    fontTexture: 'Font/AkayaTelivigala-Regular.png'
  });
  container.position.set(0, 0.3, 0.7)
  container.rotation.x = -0.55;
  Parent.add(container);

  const imageBlock = new ThreeMeshUI.Block({
    height: 0.4,
    width: 0.5,
    alignContent: 'center', // could be 'center' or 'left'
    justifyContent: 'center', // could be 'center' or 'start'
    padding: 0.03
  });
  const text = new ThreeMeshUI.Text({
    content: 'Press Select to Interact',
    fontColor: new THREE.Color(0xffffff),
    fontSize: 0.1
  });
  container.add(imageBlock);
  imageBlock.add(text);
}

CreateInteractUIPanel(cubeMesh);

//Setting UI to be not visible
Traverse(cubeMesh).forEach(element => {
  element.visible = false;
});

//Update Function.
function Update() {
  ThreeMeshUI.update();
  if (inVR) {
    let hit = gameEventObjIntersection();
    if (hit) {
      if (hit.object.userData.done == false && hit.object.name in Properties) {
        Properties[hit.object.name](hit);
        hit.object.userData.done = true;
      }
    }
  }
  // render the scene with our camera
  renderer.render(scene, camera);
}


//Custom function created for traversing child of an object.
function Traverse(object) {
  let childArr = [];
  object.traverse((child) => {
    if (child.isBlock) {
      childArr.push(child);
    }
  })
  return childArr;
}

//Loop Function.
const animate = function () {
  // runs 60 times each seconds
  renderer.setAnimationLoop(Update);
};

// start game loop
animate();