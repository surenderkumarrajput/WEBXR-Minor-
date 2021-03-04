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
let objectarray = [];

let tempMatrix = new THREE.Matrix4();
let intersects //Variable for storing intersected Objects.

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

//SkyBox Setup
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
light.position.set(-1, 15, 4);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight);

const helper = new THREE.DirectionalLightHelper(light, 3, '0xffff00');
scene.add(helper);

// cube
const cube = new THREE.BoxBufferGeometry();
const cubeMat = new THREE.MeshStandardMaterial({
  color: 0xffff00,
  wireframe: false,
});
const cubeMesh = new THREE.Mesh(cube, cubeMat);
cubeMesh.position.set(0, 0.5, 0);
scene.add(cubeMesh);
objectarray.push(cubeMesh);

//Plane
const planeGeometry = new THREE.PlaneGeometry(10, 10)
const PlaneMesh = new THREE.Mesh(planeGeometry);
scene.add(PlaneMesh);
PlaneMesh.material.side = THREE.DoubleSide;
PlaneMesh.rotation.x = (-Math.PI / 2);
objectarray.push(PlaneMesh);

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
    console.log(intersect.object.material.color.set(0xff0000));
  }
}

//Left Controller Select Button
function LeftonSelectStart(event) {
  const intersect = getIntersection(event.target);
  if (intersect) {
    console.log(intersect.object.material.color.set(0xffff00));
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
}

//Loop Function.
const animate = function () {
  // runs 60 times each seconds
  renderer.setAnimationLoop(Update);
};

//Fog
let fogColor = new THREE.Color(0xff0000);
scene.fog = new THREE.Fog(fogColor, 0.0005, 20);

//Update Function.
function Update() {
  // render the scene with our camera
  renderer.render(scene, camera);
}
const objectLoader = new GLTFLoader();

function Load(URL) {
  objectLoader.load(URL, (Model) => {
    let temp = Model.scene;
    scene.add(temp);
    objectarray.push(temp);
  }, undefined, (Error) => {
    console.log(Error);
  });
}

// start game loop
animate();
