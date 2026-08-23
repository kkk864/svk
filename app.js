// === 3D Interactive Background with Three.js ===
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 3D Particles/Torus Geometry
const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
const material = new THREE.MeshStandardMaterial({
  color: 0xff5e3a,
  wireframe: true,
  emissive: 0x110500
});
const torusKnot = new THREE.Mesh(geometry, material);
torusKnot.position.set(15, 0, -15);
scene.add(torusKnot);

// Lighting
const pointLight = new THREE.PointLight(0xff2a6d, 2);
pointLight.position.set(20, 20, 20);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

camera.position.z = 20;

// Mouse Interaction
let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
  mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  torusKnot.rotation.x += 0.003;
  torusKnot.rotation.y += 0.005;

  torusKnot.rotation.x += mouseY * 0.05;
  torusKnot.rotation.y += mouseX * 0.05;

  renderer.render(scene, camera);
}
animate();

// Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Modal & Form Logic ===
const modal = document.getElementById('modal-overlay');
const openModalBtn = document.getElementById('open-modal-btn');
const applyForm = document.getElementById('apply-form');

function openApplyModal() {
  modal.classList.add('active');
}

function closeApplyModal() {
  modal.classList.remove('active');
}

openModalBtn.addEventListener('click', openApplyModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeApplyModal();
});

// Form Submission Handling
applyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = {
    firstName: document.getElementById('first-name').value,
    lastName: document.getElementById('last-name').value,
    email: document.getElementById('email').value,
    submittedAt: new Date().toISOString()
  };

  alert(`Заявка принята!\n\nИмя: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}`);
  applyForm.reset();
  closeApplyModal();
});

// Yandex Auth Placeholder
document.getElementById('yandex-auth-btn').addEventListener('click', () => {
  alert('Здесь будет вызов Яндекс ID OAuth авторизации (настраивается с Client ID в Amvera)');
});
