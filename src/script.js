import './style.css'
import * as THREE from "three/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { Object3D } from 'three';
import ThreeMeshUI from './three-mesh-ui-master/src/three-mesh-ui.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import VRControl from "./three-mesh-ui-master/examples/utils/VRControl.js";

//Array of objects which ray can hit.
let objectarray = [];

let manager = new THREE.LoadingManager();

//Empty matrix for stroing matrix of controller.
let raycastMatrix = new THREE.Matrix4();

//Model loader
const modelLoader = new GLTFLoader(manager);

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

//Array of Playable Objects
let playableObjects = [];

//Scene Setup
const camHolder = new Object3D();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

scene.add(camHolder);
camHolder.add(camera);

renderer.setSize(window.innerWidth, window.innerHeight);

//Add to HTML Page.
document.body.appendChild(renderer.domElement);

const preloader = document.querySelector('.preloader');



//Creating VR Button.
let VrButton;
let vrControl;

//#region Loading Manager
manager.onProgress = function (item, loaded, total) {
};
manager.onLoad = onLoadComplete;
//#endregion

let isSelected = false;
let isAlreadyPressed = false;
function onLoadComplete() {
  document.body.appendChild(VrButton = VRButton.createButton(renderer));
  renderer.xr.enabled = true;

  vrControl = VRControl(renderer, camera, scene);
  camHolder.add(vrControl.controllerGrips[0], vrControl.controllers[0]);

  //Event Triggered on VR Entered
  VrButton.addEventListener('VREntered', () => {
    //Setting Camera Position
    camHolder.position.z = 5;
    camHolder.position.y = -1.5;
  });

  VrButton.addEventListener('VREnd', () => {
    //Setting Camera Position
    camera.rotation.set(0, 0, 0);

  });
  vrControl.controllers[0].addEventListener("selectstart", () => {
    isSelected = true;
  });
  vrControl.controllers[0].addEventListener("selectend", (event) => {
    isSelected = false;
    isAlreadyPressed = false;
  });
  const fadeEffect = setInterval(() => {
    if (!preloader.style.opacity) {
      preloader.style.opacity = 1;
    }
    if (preloader.style.opacity > 0) {
      preloader.style.opacity -= 0.03;
    } else {
      clearInterval(fadeEffect);
      preloader.style.zindex = 0;
    }
  }, 100);
}

//Setting Camera Position
camHolder.position.y = 0.2;
camHolder.position.z = 5;

//Resize Event
window.addEventListener("resize", function () {
  var aspectRatio = window.innerWidth / window.innerHeight;
  camera.aspect = aspectRatio;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
});

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

//Inverted Sphere
let ModelColor;
modelLoader.load('Models/SM_InvertedSphereNew.glb', (Model) => {
  let model = Model.scene;
  textureLoader.load('Models/447239-637491040523739681-16x9.jpg', (texture) => {
    let material = new THREE.MeshBasicMaterial({ map: texture })
    ModelColor = material;
    model.children[0].material = material;
    scene.add(model);
  })
})

//Grid
const grid = new THREE.Object3D();

let spacing = 1.3;
let iCount = 4;
let jCount = 4;
const cube = new THREE.BoxGeometry();

//Texture Loader
const textureLoader = new THREE.TextureLoader(manager);

textureLoader.load('Texture/CubeTexture.jpg', (texture) => {
  for (let i = 0; i < iCount; i++) {
    for (let j = jCount - 1; j >= 0; j--) {
      const cube_mat = new THREE.MeshStandardMaterial({ color: 0x000000, map: texture });
      const cube_mesh = new THREE.Mesh(cube, cube_mat);
      cube_mesh.position.x = (i - iCount / 2) * spacing;
      cube_mesh.position.y = (j - jCount / 2) * spacing;
      grid.add(cube_mesh);
      objectarray.push(cube_mesh);
      cube_mesh.userData = { 'index': 0, 'Playable': true, 'ArrayIndex': objectarray.indexOf(cube_mesh) };
    }
  }
  grid.position.x = 0.5;
  scene.add(grid);

})

//Cube for traversing helper
const cube_mat = new THREE.MeshStandardMaterial({
  color: 0xff0000
});
const cube_mesh = new THREE.Mesh(cube, cube_mat);
cube_mesh.scale.set(0.5, 0.5, 0.5);
cube_mesh.visible = false;
scene.add(cube_mesh);

//Raycast Function
let raycaster = new THREE.Raycaster();

//Variable for storing position of click or tap
let intersect;
let mouse = new THREE.Vector2();
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  intersect = Raycast();
  if (intersect) {
    if (intersect.object.userData.isUI) {
      UIMapper[intersect.object.name]();
    }
    else {
      intersect.object.material.color.setHex(colors[intersect.object.userData.index]);
      intersect.object.userData.index = (intersect.object.userData.index + 1) % (colors.length);

      //Don not add object in playable array if already present
      if (!playableObjects.includes(intersect.object)) {
        playableObjects.push(intersect.object);
      }
    }
  }
})

//Audio
let audioListener = new THREE.AudioListener();
let audio = new THREE.Audio(audioListener);
let audioLoader = new THREE.AudioLoader(manager);
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

function gameEventObjIntersection(controller) {
  raycastMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.applyMatrix4(raycastMatrix);

  const intersect = Raycast();

  return intersect;
}

//Raycast returning hit object
function Raycast() {
  return objectarray.reduce((closestIntersection, obj) => {
    const intersection = raycaster.intersectObject(obj, true);

    if (!intersection[0]) return closestIntersection;

    if (
      !closestIntersection ||
      intersection[0].distance < closestIntersection.distance
    ) {
      intersection[0].object = obj;

      return intersection[0];
    } else {
      return closestIntersection;
    }
  }, null);
}

//Function for Traversing audios or play audios
let index = 0;
let stopbool = false;

function PlayAudio() {
  if (!stopbool && playableObjects.length > 0) {
    alreadyPlaying = true;
    setTimeout(function () {
      //Fix for index value which is getting NaN after stopping and playing audio
      if (!index) {
        index = 0;
      }
      if (playableObjects[index]) {
        if (colors[playableObjects[index].userData.index] in mapper) {
          //As colors index are returning from 1 ,code tweaking to adjust the mapping.
          if (playableObjects[index].userData.index > 0) {
            cube_mesh.visible = true;
            mapper[colors[playableObjects[index].userData.index - 1]]();
            let Color = colors[playableObjects[index].userData.index - 1];
            ModelColor.color.setHex(Color);
            ModelColor.needsUpdate = true;
          }
          else {
            cube_mesh.visible = true;
            mapper[colors[colors.length - 1]]();
            let Color = colors[colors.length - 1];
            ModelColor.color.setHex(Color);
            ModelColor.needsUpdate = true;
          }
          cube_mesh.position.set(playableObjects[index].position.x + 0.5, playableObjects[index].position.y, playableObjects[index].position.z + 1);
        }
      }
      index = (index + 1) % playableObjects.length;
      if (index < playableObjects.length) {
        PlayAudio();
      }
    }, 200)
  }
}

//UI Mapper
let alreadyPlaying = false;//If already is playing or not.
let UIMapper = {
  'PLAY': () => {
    if (!alreadyPlaying) {
      stopbool = false;
      PlayAudio();
    }
  },
  'PAUSE': () => {
    stopbool = true;
    alreadyPlaying = false;
  },
  'STOP': () => {
    stopbool = true;
    alreadyPlaying = false;
    cube_mesh.visible = false;
    index = 0;
    playableObjects = [];
    ModelColor.color.setHex(0xffffff);  //Setting Iverted Sphere Color back to normal on stop
    ModelColor.needsUpdate = true;
    objectarray.forEach(element => {
      if (element.userData.Playable) {
        element.material.color.setHex(0x000000);
        element.userData.index = 0;
      }
    });
  },
  'VISUALISE': () => {
    let active = visualiserMesh.visible;
    visualiserMesh.visible = !active;
  }
}

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
    alignContent: 'center', // could be 'center' or 'left'
    justifyContent: 'center', // could be 'center' or 'start'
    fontFamily: 'Font/AkayaTelivigala-Regular-msdf.json',
    fontTexture: 'Font/AkayaTelivigala-Regular.png'
  });
  container.position.set(-2.8, -0.3, 3)
  scene.add(container);

  const imageBlock = new ThreeMeshUI.Block({
    height: 2.5,
    width: 1.5,
    alignContent: 'center', // could be 'center' or 'left'
    justifyContent: 'center', // could be 'center' or 'start'
    padding: 0.03
  });
  container.add(imageBlock);
  textureLoader.load('Texture/Instructions.png', (texture) => {
    imageBlock.backgroundTexture = texture;
  })
}

//Heading Text
function CreateHeading() {
  const container = new ThreeMeshUI.Block({
    height: 1.2,
    width: 2.2,
    // backgroundOpacity: 0,
    alignContent: 'center', // could be 'center' or 'left'
    justifyContent: 'center', // could be 'center' or 'start'
    fontFamily: 'Font/AkayaTelivigala-Regular-msdf.json',
    fontTexture: 'Font/AkayaTelivigala-Regular.png'
  });
  container.position.set(0, 1.56, 3)
  scene.add(container);

  textureLoader.load('Texture/Logo.png', (texture) => {
    container.backgroundTexture = texture;
  })
}

//Function for Buttons
function CreateButtons(Text, x, y, z, name) {
  const container = new ThreeMeshUI.Block({
    height: 0.3,
    width: 0.5,
    alignContent: 'center', // could be 'center' or 'left'
    justifyContent: 'center', // could be 'center' or 'start'
    backgroundOpacity: 0,
    fontFamily: 'Font/AkayaTelivigala-Regular-msdf.json',
    fontTexture: 'Font/AkayaTelivigala-Regular.png'
  });
  container.position.set(x, y, z);
  scene.add(container);

  const imageBlock = new ThreeMeshUI.Block({
    height: 0.3,
    width: 0.5,
    alignContent: 'center', // could be 'center' or 'left'
    justifyContent: 'center', // could be 'center' or 'start'
    padding: 0.03
  });
  const text = new ThreeMeshUI.Text({
    content: Text,
    fontColor: new THREE.Color(0xffffff),
    fontSize: 0.1
  });
  container.add(imageBlock);
  imageBlock.name = name;
  imageBlock.userData = { 'isUI': true };
  objectarray.push(imageBlock);
  imageBlock.add(text);
}

CreateHeading();
CreateInteractUIPanel();
CreateButtons('PLAY', 2, 0.4, 3, 'PLAY');
CreateButtons('PAUSE', 2, 0, 3, 'PAUSE');
CreateButtons('STOP', 2, -0.4, 3, 'STOP');
CreateButtons('VISUALISE', 2, -0.8, 3, 'VISUALISE');

//Update Function
let animate = function () {
  renderer.setAnimationLoop(animate);
  ThreeMeshUI.update();
  renderer.render(scene, camera);

  if (playableObjects.length) {
    Sort();
  }
  analyser.getFrequencyData();

  uniforms.tAudioData.value.needsUpdate = true;

  if (renderer.xr.isPresenting) {
    vrControl.setFromController(0, raycaster.ray);
    intersect = gameEventObjIntersection(vrControl.controllers[0]);
    // Position the little white dot at the end of the controller pointing ray
    if (intersect) {
      vrControl.setPointerAt(0, intersect.point);
      if (isSelected && !isAlreadyPressed) {
        isAlreadyPressed = true
        if (intersect.object.userData.isUI) {
          UIMapper[intersect.object.name]();
        }
        else {
          intersect.object.material.color.setHex(colors[intersect.object.userData.index]);
          intersect.object.userData.index = (intersect.object.userData.index + 1) % (colors.length);

          //Don not add object in playable array if already present
          if (!playableObjects.includes(intersect.object)) {
            playableObjects.push(intersect.object);
          }
        }
      }
    }
  }
}

//#region Audio Analyser
let analyser, uniforms;
const fftSize = 128;

analyser = new THREE.AudioAnalyser(audio, fftSize);

const format = (renderer.capabilities.isWebGL2) ? THREE.RedFormat : THREE.LuminanceFormat;

uniforms = {
  tAudioData: { value: new THREE.DataTexture(analyser.data, fftSize / 2, 1, format) },
};

const shaderMat = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: document.getElementById('vertexShader').textContent,
  fragmentShader: document.getElementById('fragmentShader').textContent,
});

const geo = new THREE.PlaneGeometry(0.6, 1);

const visualiserMesh = new THREE.Mesh(geo, shaderMat);
scene.add(visualiserMesh);
visualiserMesh.visible = false;
//#endregion

//Have to call Update function once.
animate();

