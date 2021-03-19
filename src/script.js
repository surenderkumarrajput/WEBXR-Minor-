import './style.css'
import * as THREE from "three/build/three.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as dat from "dat.gui";
import { VRButton } from "./VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { Object3D } from 'three';
import ThreeMeshUI from './three-mesh-ui-master/src/three-mesh-ui.js';

//Array of objects which ray can hit.
let objectarray = [];

//Array of loaded audio buffers
let loadedAudioBuffers = [];

//Audio References
let audioRefLinks =
  [
    'Audios/audio/505/hh.ogg',
    'Audios/audio/505/hho.ogg',
    'Audios/audio/505/kick.ogg',
    'Audios/audio/505/snare.ogg',
    'Audios/audio/jazz/clave.wav'
  ];

//Color Array
let colors = ['0xffff00', '0x00ffff', '0xffffff', '0xff0000', '0x40ff00'];

//SkyBox
const loader = new THREE.CubeTextureLoader();
const skyBox = loader.load([
  "/SkyBox/Right.png",  //px
  "/SkyBox/Left.png",   //nx
  "/SkyBox/Up.png",     //py
  "/SkyBox/Down.png",   //ny
  "/SkyBox/Front.png",  //pz
  "/SkyBox/Back.png",   //nz
]);

//Array of Playable Objects
let playableObjects = [];

//Scene Setup
const camHolder = new Object3D();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });

scene.add(camHolder);
camHolder.add(camera);

scene.background = skyBox;

renderer.setSize(window.innerWidth, window.innerHeight);

//Add to HTML Page.
document.body.appendChild(renderer.domElement);

//Creating VR Button.
let VrButton;
document.body.appendChild(VrButton = VRButton.createButton(renderer));
renderer.xr.enabled = true;

//Event Triggered on VR Entered
VrButton.addEventListener('VREntered', () => {
  //Setting Camera Position
  camHolder.position.z = 5;
});

VrButton.addEventListener('VREnd', () => {
  //Setting Camera Position
  camHolder.position.z = 5;
});

//Setting Camera Position
camHolder.position.z = 5;

//Resize Event
window.addEventListener("resize", function () {
  var aspectRatio = window.innerWidth / window.innerHeight;
  camera.aspect = aspectRatio;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
});

//Orbital Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

//Fog
let color = new THREE.Color("#88DAE4");
let near = 0.1;
let far = 1500;
const fog = new THREE.Fog(color, near, far);
scene.fog = fog;

//Lightning
var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
var pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(25, 50, 25);
scene.add(pointLight);

//Grid
const grid = new THREE.Object3D();

let spacing = 1.3;
let iCount = 4;
let jCount = 4;

const cube = new THREE.BoxGeometry();

for (let i = 0; i < iCount; i++) {
  for (let j = jCount - 1; j >= 0; j--) {
    const cube_mat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const cube_mesh = new THREE.Mesh(cube, cube_mat);
    cube_mesh.position.x = (i - iCount / 2) * spacing;
    cube_mesh.position.y = (j - jCount / 2) * spacing;
    grid.add(cube_mesh);
    objectarray.push(cube_mesh);
    cube_mesh.userData = { 'index': 0, 'ArrayIndex': objectarray.indexOf(cube_mesh) };
  }
}
scene.add(grid);

//Cube for traversing helper
const cube_mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const cube_mesh = new THREE.Mesh(cube, cube_mat);
cube_mesh.scale.set(0.5, 0.5, 0.5);
scene.add(cube_mesh);

//Raycast Function
let raycaster = new THREE.Raycaster();

//Variable for storing position of click or tap
let mouse = new THREE.Vector2();
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  let intersect = Raycast();
  if (intersect) {
    console.log(intersect.object.userData);
    intersect.object.material.color.setHex(colors[intersect.object.userData.index]);
    intersect.object.userData.index = (intersect.object.userData.index + 1) % (colors.length);

    //Don not add object in playable array if already present
    if (!playableObjects.includes(intersect.object)) {
      playableObjects.push(intersect.object);
    }
  }
})

//Audio
let audioListener = new THREE.AudioListener();
let audio = new THREE.Audio(audioListener);
let audioLoader = new THREE.AudioLoader();
camera.add(audioListener);

//Mapper for mapping audio with colors.
let mapper = {
  '0xffff00': () => {
    setAudio(loadedAudioBuffers[0], 1)
  },
  '0x00ffff': () => {
    setAudio(loadedAudioBuffers[1], 1)
  },
  '0xffffff': () => {
    setAudio(loadedAudioBuffers[2], 1)
  },
  '0xff0000': () => {
    setAudio(loadedAudioBuffers[3], 1)
  },
  '0x40ff00': () => {
    setAudio(loadedAudioBuffers[4], 1)
  }
}

//Normal Audio Loader Function
function NormalAudioLoader() {
  for (let index = 0; index < audioRefLinks.length; index++) {
    audioLoader.load(audioRefLinks[index], (buffer) => {
      loadedAudioBuffers.push(buffer);
    }, undefined, undefined);
  }
}

//Audio Set function
function setAudio(Buffer, Volume) {
  if (audio.buffer != null) {
    audio.buffer = null;
  }
  audio.setBuffer(Buffer);
  audio.setVolume(Volume);
  if (audio.isPlaying) {
    audio.stop();
    audio.play();
  }
  else {
    audio.play();
  }
}

//Raycast returning hit object
function Raycast() {
  raycaster.setFromCamera(mouse, camera);
  let objectIntersected = raycaster.intersectObjects(objectarray);
  if (objectIntersected[0]) {
    return objectIntersected[0];
  }
}

//Function for Traversing audios or play audios
let index = 0;
let stopbool = false;
const StopButton = document.getElementById('Stop');
const PauseButton = document.getElementById('Pause');
const PlayButton = document.getElementById('Play');

function PlayAudio() {
  if (!stopbool && playableObjects.length > 0) {
    alreadyPlaying = true;
    cube_mesh.visible = true;
    setTimeout(function () {
      if (playableObjects[index]) {
        if (colors[playableObjects[index].userData.index] in mapper) {
          //As colors index are returning from 1 ,code tweaking to adjust the mapping.
          if (playableObjects[index].userData.index > 0) {
            mapper[colors[playableObjects[index].userData.index - 1]]();
          }
          else {
            mapper[colors[colors.length - 1]]();
          }
          cube_mesh.position.set(playableObjects[index].position.x, playableObjects[index].position.y, playableObjects[index].position.z + 1);
        }
      }
      index = (index + 1) % playableObjects.length;
      if (index < playableObjects.length) {
        PlayAudio();
      }
    }, 200)
  }
}

let alreadyPlaying = false;//If already is playing or not.

StopButton.addEventListener('click', () => {
  stopbool = true;
  cube_mesh.visible = false;
  alreadyPlaying = false;
  playableObjects = [];
  index = 0;
  objectarray.forEach(element => {
    element.material.color.setHex(0x000000);
    element.userData.index = 0;
  });
})
PlayButton.addEventListener('click', () => {
  if (!alreadyPlaying) {
    stopbool = false;
    PlayAudio();
    console.log('Play');
  }
})
PauseButton.addEventListener('click', () => {
  stopbool = true;
  alreadyPlaying = false;
})

//Function Loading all the Audios
NormalAudioLoader();

//Function for sorting Playable object array according to index for random selection
function Sort() {
  for (let i = 0; i < playableObjects.length; i++) {
    if (i - 1 > 0) {
      if (playableObjects[i].userData['ArrayIndex'] < playableObjects[i - 1].userData['ArrayIndex']) {
        let temp = playableObjects[i];
        playableObjects[i] = playableObjects[i - 1];
        playableObjects[i - 1] = temp;
      }
    }
    else if (i + 1 < playableObjects.length) {
      if (playableObjects[i].userData['ArrayIndex'] > playableObjects[i + 1].userData['ArrayIndex']) {
        let temp = playableObjects[i];
        playableObjects[i] = playableObjects[i + 1];
        playableObjects[i + 1] = temp;
      }
    }
  }
}

//UI
function CreateInteractUIPanel() {
  const container = new ThreeMeshUI.Block({
    height: 2,
    width: 1.5,
    backgroundOpacity: 0,
    fontFamily: 'Font/AkayaTelivigala-Regular-msdf.json',
    fontTexture: 'Font/AkayaTelivigala-Regular.png'
  });
  container.position.set(-2.5, -0.2, 3)
  scene.add(container);

  const imageBlock = new ThreeMeshUI.Block({
    height: 2,
    width: 1.5,
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

CreateInteractUIPanel();

//Update Function
let animate = function () {
  renderer.setAnimationLoop(animate);
  ThreeMeshUI.update();
  renderer.render(scene, camera);
  if (playableObjects.length) {
    Sort();
  }
}

//Have to call Update function once.
animate();