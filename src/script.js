import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
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
const objectLoader = new GLTFLoader();

// debug ui
const gui = new dat.GUI();

const camera = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.shadowMap.enabled = true;
scene.background = skyBox;

renderer.setSize(window.innerWidth, window.innerHeight);
//Enabling XR.
renderer.xr.enabled = true;

//VR Button
document.body.appendChild(VRButton.createButton(renderer));

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
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-1, 2, 4);
scene.add(light);

// cube
const cube = new THREE.BoxBufferGeometry();
const cubeMat = new THREE.MeshStandardMaterial({
  color: 0xee1111,
  wireframe: false,
});
const cubeMesh = new THREE.Mesh(cube, cubeMat);
cubeMesh.position.set(0, 0, -10);
// scene.add(cubeMesh);

//Adding Controllers mesh in the scene.
const controllerModelFactory = new XRControllerModelFactory();
const controller1 = renderer.xr.getController(0);
controller1.add(controllerModelFactory.createControllerModel(controller1));
const controller2 = renderer.xr.getController(1);
controller2.add(controllerModelFactory.createControllerModel(controller2));
scene.add(controller1, controller2);

controller1.addEventListener("selectstart", RightonSelectStart);

//Raycast
let raycaster = new THREE.Raycaster();
let objectarray = [cubeMesh];

//Right Controller Select Button
function RightonSelectStart() {
  raycaster.set(controller1.getWorldPosition(), new THREE.Vector3(0, 0, -1));
  let objectHit = raycaster.intersectObjects(objectarray);
  if (objectHit[0]) {
    console.log(objectHit[0]);
  }
}
function Load() {
  objectLoader.load("Models/scene.gltf", (Model) => {
    console.log(Model);
    scene.add(Model);
  }, undefined, (Error) => {
    console.log(Error);
  });

}
Load();

const animate = function () {
  // runs 60 times each seconds
  renderer.setAnimationLoop(Update);
};

function Update() {
  // render the scene with our camera
  renderer.render(scene, camera);
}

// start game loop
animate();
