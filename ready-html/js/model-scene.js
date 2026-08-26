import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { EMBEDDED_MODELS, EMBEDDED_IMAGES } from "./embedded.js"

const BG = 0x3e2b6b

const LAYOUT = {
    laptop: {
        size: 2.78,
        position: [0, 0, -0.08],
        rotationY: -24,
    },
    photoshop: {
        size: 0.58,
        position: [-1.58, 0, 1.18],
        rotationY: 12,
    },
    cursor: {
        size: 0.78,
        position: [1.05, 0, 0.88],
        rotationY: -44,
    },
    figma: {
        size: 0.7,
        position: [-1.32, 1.28, 0.02],
        rotationX: 90,
        rotationY: 18,
        rotationZ: 0,
        float: true,
    },
}

const MODELS = {
    laptop: ["models/ноутбук/scene.gltf", "models/laptop.gltf"],
    photoshop: ["models/ps/scene.gltf"],
    cursor: ["models/мышь/scene.gltf"],
    figma: ["models/figm/scene.gltf"],
}

const SCROLL_ICON = {
    photoshop: {
        size: 0.56,
        distance: 2.22,
        ndcX: -0.16,
        startY: -1.08,
        endY: 1.14,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        yawStart: -1.15,
        yawEnd: 1.25,
        tiltStart: 0.42,
        tiltEnd: -0.38,
        rollStart: 0.22,
        rollEnd: -0.28,
        fadeIn: [0, 0.08],
        fadeOut: [0.62, 0.92],
    },
    figma: {
        size: 0.58,
        distance: 2.22,
        ndcX: 0.16,
        startY: -1.08,
        endY: 1.14,
        rotationX: LAYOUT.figma.rotationX,
        rotationY: LAYOUT.figma.rotationY,
        rotationZ: LAYOUT.figma.rotationZ,
        yawStart: 1.2,
        yawEnd: -1.22,
        tiltStart: -0.36,
        tiltEnd: 0.4,
        rollStart: -0.2,
        rollEnd: 0.26,
        fadeIn: [0, 0.08],
        fadeOut: [0.8, 1],
    },
}

const STORY = {
    sceneEnd: 0.3,
    leaveStart: 0.27,
    leaveEnd: 0.47,
    psStart: 0.4,
    psEnd: 0.7,
    fgStart: 0.71,
    fgEnd: 1,
}

const CINE_END = 5.2
const CINE_SKIP_SCROLL = 0.02
const KEY_NAME_RE = /key|keyboard|button|cap|клавиш|кнопк/i
const KEY_SKIP_RE = /keyhole|screen|lcd|camera|logo|speaker|rubber|hinge|bottom|frame|foot|shadow/i

const SCREEN_HOVER = "img/screen-hover.jpg"

const slot = document.querySelector(".model-slot")
const sectionEl = document.querySelector(".model-section")
const veilEl = document.getElementById("intro-veil")

if (!slot || !sectionEl) {
    console.warn("Не найден блок 3D-сцены")
}

function viewSize() {
    const w = Math.max(1, slot?.clientWidth || window.innerWidth)
    const h = Math.max(1, slot?.clientHeight || window.innerHeight)
    return { w, h, aspect: w / h }
}

function pickDpr() {
    const dpr = window.devicePixelRatio || 1
    const area = (slot?.clientWidth || window.innerWidth) * (slot?.clientHeight || window.innerHeight)
    if (area > 1_700_000) return Math.min(dpr, 1)
    return Math.min(dpr, 1.15)
}

function canUseWebGL() {
    try {
        const canvas = document.createElement("canvas")
        return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
    } catch (error) {
        return false
    }
}

const startView = viewSize()
const startDpr = pickDpr()

const scene = new THREE.Scene()
scene.background = null

const camera = new THREE.PerspectiveCamera(40, startView.aspect, 0.1, 100)
camera.position.set(2.15, 1.55, 3.35)
camera.layers.enable(1)
const camTarget = new THREE.Vector3(0.05, 0.38, 0.2)

let renderer = null
try {
    if (!slot || !sectionEl || !canUseWebGL()) {
        throw new Error("WebGL недоступен")
    }
    renderer = new THREE.WebGLRenderer({
        antialias: startDpr <= 1,
        alpha: false,
        powerPreference: "default",
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
    })
    renderer.setSize(startView.w, startView.h, false)
    renderer.setPixelRatio(startDpr)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.22
    renderer.shadowMap.enabled = false
    renderer.domElement.className = "model-canvas"
    renderer.setClearColor(BG, 1)
    slot.appendChild(renderer.domElement)
    bindKeyboardPointer(renderer.domElement)
} catch (error) {
    console.warn("3D-сцена недоступна в этом браузере", error)
    renderer = null
    if (veilEl) veilEl.style.opacity = "0"
}

const LIGHT = {
    hemi: 1.05,
    key: 2.05,
    fill: 0.95,
    rim: 0.9,
    ambient: 0.62,
    front: 1.05,
}

const ambient = new THREE.AmbientLight(0xfff3e8, LIGHT.ambient)
scene.add(ambient)

const hemi = new THREE.HemisphereLight(0xc5d0ea, 0x4a3a68, LIGHT.hemi)
scene.add(hemi)

const keyLight = new THREE.DirectionalLight(0xfff4e8, LIGHT.key)
keyLight.position.set(-3.4, 6.2, 4.2)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0xd7e6ff, LIGHT.fill)
fillLight.position.set(4.6, 2.2, 1.4)
scene.add(fillLight)

const rimLight = new THREE.DirectionalLight(0xc4d0ff, LIGHT.rim)
rimLight.position.set(-2.2, 2.4, -4.2)
scene.add(rimLight)

const frontLight = new THREE.DirectionalLight(0xfff8f2, LIGHT.front)
frontLight.position.set(1.6, 2.2, 5.4)
scene.add(frontLight)

const figmaKey = new THREE.DirectionalLight(0xffefe6, 0.78)
figmaKey.position.set(-2.4, 3.2, 3.6)
figmaKey.layers.set(1)
scene.add(figmaKey)

const figmaFill = new THREE.DirectionalLight(0xc8d4ee, 0.3)
figmaFill.position.set(2.8, 1.2, 2.2)
figmaFill.layers.set(1)
scene.add(figmaFill)

const figmaHemi = new THREE.HemisphereLight(0xb8c2dc, 0x3e2b6b, 0.4)
figmaHemi.layers.set(1)
scene.add(figmaHemi)

const loader = new GLTFLoader()
const world = new THREE.Group()
scene.add(world)

let lcdPanel = null
let screenFX = null
let placed = {}
const scrollIcons = {
    photoshop: null,
    figma: null,
}
const cine = {
    active: false,
    done: false,
    t: 0,
    startCam: new THREE.Vector3(),
    endCam: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    wideCam: new THREE.Vector3(),
    wideTarget: new THREE.Vector3(),
    cursorHome: new THREE.Vector3(),
    cursorHomeQ: new THREE.Quaternion(),
    cursorHomeScale: new THREE.Vector3(1, 1, 1),
    cursorTipLocal: new THREE.Vector3(),
    cursorClick: new THREE.Vector3(),
}

let sceneReady = false
let cinematicRequested = false
let scrollBound = false
let needsRender = true

const KEYBOARD = {
    keys: [],
    meshes: [],
    host: null,
    mode: "none",
    screenMeshes: [],
    hitMeshes: [],
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    inside: false,
    moving: false,
    hasFocus: false,
    radius: 0.22,
    maxLift: 0.0022,
    normal: new THREE.Vector3(0, 0, 1),
    u: new THREE.Vector3(1, 0, 0),
    v: new THREE.Vector3(0, 1, 0),
    uvMinU: 0,
    uvMaxU: 0,
    uvMinV: 0,
    uvMaxV: 0,
    lastHitLocal: new THREE.Vector3(),
    smoothHit: new THREE.Vector3(),
    deckCenter: new THREE.Vector3(),
    lastRow: 0,
    lastCol: 0,
    hitState: "idle",
    hold: 0,
    smoothed: false,
    posAttr: null,
    _hitWorld: new THREE.Vector3(),
    _hitLocal: new THREE.Vector3(),
    _delta: new THREE.Vector3(),
    _tmp: new THREE.Vector3(),
    _inv: new THREE.Matrix4(),
    _plane: new THREE.Plane(),
}

const scrollStory = {
    enabled: false,
    raw: 0,
    smooth: 0,
    dt: 1 / 60,
    iconCatching: false,
    home: null,
    to: null,
    exit: null,
    linkFade: null,
    leaveT: -1,
    stageFade: -1,
    midCam: new THREE.Vector3(),
    midTarget: new THREE.Vector3(),
    closeCam: new THREE.Vector3(),
    closeTarget: new THREE.Vector3(),
    face: null,
    dockK: 0,
}

const storyUi = {
    ready: false,
    root: null,
    items: { photoshop: null, figma: null },
    media: { photoshop: null, figma: null },
    lastKey: "",
}

const _sceneSlide = new THREE.Vector3()
const _peelAxis = new THREE.Vector3()
const _screenPos = new THREE.Vector3()
const _screenN = new THREE.Vector3()
const _screenUp = new THREE.Vector3()
const _screenRight = new THREE.Vector3()
const _screenZ = new THREE.Vector3()
const _worldQ = new THREE.Quaternion()
const _parentQ = new THREE.Quaternion()
const _localQ = new THREE.Quaternion()
const _basis = new THREE.Matrix4()
const _tipShift = new THREE.Vector3()
const _box = new THREE.Box3()
const _boxCenter = new THREE.Vector3()
const _boxSize = new THREE.Vector3()

const storyLinks = []

function loadModel(url) {
    const embedded = EMBEDDED_MODELS[url]
    if (embedded) {
        return new Promise((resolve, reject) => {
            loader.parse(
                typeof embedded === "string" ? embedded : JSON.stringify(embedded),
                "",
                resolve,
                reject
            )
        })
    }

    return new Promise((resolve, reject) => {
        loader.load(encodeURI(url), resolve, undefined, reject)
    })
}

async function loadFirstAvailable(urls) {
    let lastError = null

    for (const url of urls) {
        try {
            return await loadModel(url)
        } catch (error) {
            lastError = error
            console.warn(`Не удалось загрузить ${url}`, error)
        }
    }

    throw lastError ?? new Error("Модель не найдена")
}

function loadHtmlImage(url) {
    const src = EMBEDDED_IMAGES[url] || url
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`Не удалось загрузить ${url}`))
        image.src = src
    })
}

function findScreenMesh(root) {
    let screen = null
    root.traverse((child) => {
        if (!child.isMesh) return
        const id = `${child.name} ${child.material?.name || ""}`.toLowerCase()
        if (id.includes("screen")) screen = child
    })
    return screen
}

function fitImage(ctx, image, width, height) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "medium"
    ctx.drawImage(image, 0, 0, width, height)
}

function bakeLayer(image, width, height) {
    const layer = document.createElement("canvas")
    layer.width = width
    layer.height = height
    fitImage(layer.getContext("2d"), image, width, height)
    return layer
}

function createLcdPanel(screenMesh, texture) {
    const geometry = screenMesh.geometry
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const thin = [size.x, size.y, size.z].indexOf(Math.min(size.x, size.y, size.z))
    const u = thin === 0 ? 1 : 0
    const v = thin === 2 ? 1 : 2
    const panelW = size.getComponent(u) * 0.86
    const panelH = size.getComponent(v) * 0.84

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        side: THREE.FrontSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
    })

    const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), material)
    panel.name = "LcdPanel"
    panel.renderOrder = 3

    const nPos = new THREE.Vector3().setComponent(thin, 1)
    const nNeg = nPos.clone().negate()

    screenMesh.updateWorldMatrix(true, false)
    const worldQuat = new THREE.Quaternion()
    const worldPos = new THREE.Vector3()
    screenMesh.getWorldQuaternion(worldQuat)
    screenMesh.getWorldPosition(worldPos)

    const toCamera = camera.position.clone().sub(worldPos).normalize()
    const worldPosN = nPos.clone().applyQuaternion(worldQuat)
    const worldNegN = nNeg.clone().applyQuaternion(worldQuat)
    const localN = worldPosN.dot(toCamera) >= worldNegN.dot(toCamera) ? nPos : nNeg

    panel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localN)
    const lift = Math.max(size.getComponent(thin) * 0.08, 0.00025)
    panel.position.copy(center).addScaledVector(localN, lift)

    screenMesh.add(panel)
    screenMesh.material = new THREE.MeshBasicMaterial({
        color: 0x050608,
        side: THREE.DoubleSide,
    })
    return panel
}

async function attachLaptopScreen(root) {
    const screen = findScreenMesh(root)
    if (!screen) {
        console.warn("Меш экрана не найден")
        return null
    }

    const hoverImage = await loadHtmlImage(SCREEN_HOVER)

    const width = 640
    const height = 400
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })
    const photo = bakeLayer(hoverImage, width, height)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = true
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    function paint(fade) {
        ctx.fillStyle = "#050608"
        ctx.fillRect(0, 0, width, height)
        if (fade > 0.001) {
            ctx.save()
            ctx.globalAlpha = fade
            ctx.drawImage(photo, 0, 0)
            ctx.restore()
        }
        texture.needsUpdate = true
    }

    paint(0)
    const panel = createLcdPanel(screen, texture)
    screenFX = {
        fade: 0,
        paint,
    }
    return panel
}

function enableShadows(root) {
    root.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false
            child.receiveShadow = false
            child.frustumCulled = true
            child.matrixAutoUpdate = true
        }
    })
}

function cheapenMaterials(root) {
    const metalLift = new THREE.Color(0xd5dbe6)
    root.traverse((child) => {
        if (!child.isMesh || !child.material) return
        const list = Array.isArray(child.material) ? child.material : [child.material]
        const next = list.map((mat) => {
            if (!mat || mat.isMeshBasicMaterial || mat.isMeshPhongMaterial) return mat
            const phong = new THREE.MeshPhongMaterial()
            phong.name = mat.name
            if (mat.color) phong.color.copy(mat.color)
            phong.map = mat.map || null
            phong.emissiveMap = mat.emissiveMap || null
            if (mat.emissive) phong.emissive.copy(mat.emissive)
            phong.emissiveIntensity = mat.emissiveIntensity ?? 1
            phong.transparent = !!mat.transparent
            phong.opacity = mat.opacity
            phong.side = mat.side
            phong.depthWrite = mat.depthWrite
            phong.depthTest = mat.depthTest
            phong.vertexColors = !!mat.vertexColors
            phong.alphaMap = mat.alphaMap || null
            phong.alphaTest = mat.alphaTest || 0
            phong.toneMapped = true
            phong.polygonOffset = mat.polygonOffset
            phong.polygonOffsetFactor = mat.polygonOffsetFactor
            phong.polygonOffsetUnits = mat.polygonOffsetUnits

            const metal = mat.metalness ?? 0
            const rough = mat.roughness ?? 0.5
            const lum = 0.2126 * phong.color.r + 0.7152 * phong.color.g + 0.0722 * phong.color.b
            phong.shininess = THREE.MathUtils.lerp(14, 72, (1 - rough) * (0.35 + metal))
            phong.specular.setRGB(0.22 + metal * 0.42, 0.24 + metal * 0.4, 0.28 + metal * 0.38)
            if (metal > 0.22 && lum < 0.45) {
                phong.color.lerp(metalLift, 0.78)
                phong.emissive.setHex(0x2a3344)
                phong.emissiveIntensity = 0.28
            } else if (lum < 0.1) {
                phong.color.offsetHSL(0, 0, 0.08)
            }
            return phong
        })
        child.material = Array.isArray(child.material) ? next : next[0]
    })
}

function saturateFigmaMaterials(root) {
    root.traverse((child) => {
        if (!child.isMesh || !child.material) return
        const list = Array.isArray(child.material) ? child.material : [child.material]
        for (const mat of list) {
            if (!mat?.color) continue
            mat.color.offsetHSL(0, 0.34, 0.03)
            mat.shininess = Math.min(mat.shininess ?? 24, 16)
            if (mat.specular) mat.specular.setRGB(0.1, 0.1, 0.11)
            if (mat.emissive) {
                mat.emissive.copy(mat.color).multiplyScalar(0.16)
                mat.emissiveIntensity = 0.42
            }
        }
    })
}

function prepareModel(object, layout) {
    if (layout.spin) {
        object.rotation.z += THREE.MathUtils.degToRad(layout.spin)
        object.updateMatrixWorld(true)
    }

    const box = new THREE.Box3().setFromObject(object)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    object.position.sub(center)

    const inner = new THREE.Group()
    inner.add(object)

    const maxDim = Math.max(size.x, size.y, size.z, 0.001)
    inner.scale.setScalar(layout.size / maxDim)

    const wrapper = new THREE.Group()
    wrapper.add(inner)
    wrapper.updateMatrixWorld(true)

    if (!layout.float) {
        const grounded = new THREE.Box3().setFromObject(wrapper)
        inner.position.y -= grounded.min.y
    }

    return wrapper
}

let blobTex = null
function blobTexture() {
    if (blobTex) return blobTex
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext("2d")
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31)
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)")
    gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.28)")
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    blobTex = new THREE.CanvasTexture(canvas)
    blobTex.generateMipmaps = false
    blobTex.minFilter = THREE.LinearFilter
    return blobTex
}

function makeBlobShadow(width, depth, opacity = 0.42) {
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, depth),
        new THREE.MeshBasicMaterial({
            map: blobTexture(),
            transparent: true,
            opacity,
            depthWrite: false,
            toneMapped: false,
        })
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.004
    mesh.frustumCulled = true
    return mesh
}

function addLink(from, to, liftFrom = 0.42, liftTo = 0.18) {
    const start = new THREE.Vector3()
    const end = new THREE.Vector3()
    const mid = new THREE.Vector3()
    from.getWorldPosition(start)
    to.getWorldPosition(end)
    start.y += liftFrom
    end.y += liftTo
    mid.lerpVectors(start, end, 0.5)
    mid.y += 0.28

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const points = curve.getPoints(10)
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
        color: 0x7ea8ff,
        transparent: true,
        opacity: 0.62,
        toneMapped: false,
    })
    const line = new THREE.Line(geometry, material)
    scene.add(line)

    const nodeMat = new THREE.MeshBasicMaterial({
        color: 0x9ec0ff,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
    })
    const nodeGeom = new THREE.SphereGeometry(0.018, 8, 8)
    const nodes = [start, mid, end].map((point) => {
        const node = new THREE.Mesh(nodeGeom, nodeMat)
        node.position.copy(point)
        scene.add(node)
        return node
    })

    storyLinks.push({
        from,
        to,
        liftFrom,
        liftTo,
        start,
        mid,
        end,
        curve,
        line,
        nodes,
        point: new THREE.Vector3(),
    })
}

function refreshLinks() {
    for (const link of storyLinks) {
        link.from.getWorldPosition(link.start)
        link.to.getWorldPosition(link.end)
        link.start.y += link.liftFrom
        link.end.y += link.liftTo
        link.mid.lerpVectors(link.start, link.end, 0.5)
        link.mid.y += 0.28
        link.curve.v0.copy(link.start)
        link.curve.v1.copy(link.mid)
        link.curve.v2.copy(link.end)

        const attr = link.line.geometry.attributes.position
        const count = attr.count
        for (let i = 0; i < count; i++) {
            link.curve.getPoint(i / (count - 1), link.point)
            attr.setXYZ(i, link.point.x, link.point.y, link.point.z)
        }
        attr.needsUpdate = true
        link.nodes[0].position.copy(link.start)
        link.nodes[1].position.copy(link.mid)
        link.nodes[2].position.copy(link.end)
    }
}

function place(wrapper, layout, name) {
    wrapper.name = name
    wrapper.rotation.x = THREE.MathUtils.degToRad(layout.rotationX || 0)
    wrapper.rotation.y = THREE.MathUtils.degToRad(layout.rotationY || 0)
    wrapper.rotation.z = THREE.MathUtils.degToRad(layout.rotationZ || 0)
    wrapper.position.set(...layout.position)
    world.add(wrapper)
}

function makeFigmaScrollMaterial(source) {
    const color = (source.color || new THREE.Color(0x888888)).clone()
    color.offsetHSL(0, 0.36, 0.02)
    color.multiplyScalar(0.98)
    const mat = new THREE.MeshLambertMaterial({
        name: source.name,
        color,
        map: source.map || null,
        transparent: !!source.transparent,
        opacity: source.opacity,
        side: source.side,
        depthWrite: source.depthWrite,
        depthTest: source.depthTest !== false,
        vertexColors: !!source.vertexColors,
        toneMapped: true,
    })
    mat.userData.baseOpacity = source.userData.baseOpacity ?? source.opacity
    mat.userData.baseTransparent = source.userData.baseTransparent ?? !!source.transparent
    mat.userData.baseDepthWrite = source.userData.baseDepthWrite ?? source.depthWrite
    return mat
}

function cloneMeshMaterial(material) {
    const cloned = material.clone()
    cloned.userData.baseOpacity = cloned.opacity
    cloned.userData.baseTransparent = cloned.transparent
    cloned.userData.baseDepthWrite = cloned.depthWrite
    return cloned
}

function mountScrollIcon(sourceScene, key) {
    const layout = SCROLL_ICON[key]
    const fadeMats = []
    sourceScene.traverse((child) => {
        if (!child.isMesh) return
        child.castShadow = false
        child.receiveShadow = false
        child.frustumCulled = false
        if (key === "figma") child.layers.set(1)

        const sourceMats = Array.isArray(child.material) ? child.material : [child.material]
        let cloned = sourceMats.filter(Boolean).map(cloneMeshMaterial)
        if (!cloned.length) return
        if (key === "figma") cloned = cloned.map(makeFigmaScrollMaterial)
        child.material = Array.isArray(child.material) ? cloned : cloned[0]

        const id = `${child.name} ${child.parent?.name || ""} ${cloned[0]?.name || ""}`
        const isPsLetter = key === "photoshop" && /(^|_| )ps(_|$)|svgmat/i.test(id)

        if (isPsLetter) {
            child.renderOrder = 10
            child.scale.multiplyScalar(1.03)
            for (const mat of cloned) {
                mat.polygonOffset = true
                mat.polygonOffsetFactor = -8
                mat.polygonOffsetUnits = -8
                mat.depthTest = true
                mat.depthWrite = false
                mat.transparent = false
                mat.toneMapped = false
                mat.userData.baseDepthWrite = false
                mat.userData.keepOnTop = true
            }
        }

        fadeMats.push(...cloned)
    })
    const inner = prepareModel(sourceScene, {
        size: layout.size,
        float: true,
    })
    inner.rotation.x = THREE.MathUtils.degToRad(layout.rotationX || 0)
    inner.rotation.y = THREE.MathUtils.degToRad(layout.rotationY || 0)
    inner.rotation.z = THREE.MathUtils.degToRad(layout.rotationZ || 0)

    const spinner = new THREE.Group()
    spinner.add(inner)

    const outer = new THREE.Group()
    outer.name = `scroll-${key}`
    outer.add(spinner)
    outer.userData.spinner = spinner
    outer.userData.fadeMats = fadeMats
    outer.userData.lastT = -1
    outer.userData.lastFade = -1
    outer.userData.smoothed = false
    outer.userData.sx = layout.ndcX || 0
    outer.userData.sy = layout.startY
    outer.userData.stilt = layout.tiltStart
    outer.userData.syaw = layout.yawStart
    outer.userData.sroll = layout.rollStart
    outer.visible = false
    outer.position.set(0, -40, 0)
    scene.add(outer)
    return outer
}

const _iconOrigin = new THREE.Vector3()
const _iconDir = new THREE.Vector3()
const _iconNdc = new THREE.Vector3()

function placeScrollIcon(object, ndcX, ndcY, distance) {
    _iconOrigin.setFromMatrixPosition(camera.matrixWorld)
    _iconNdc.set(ndcX, ndcY, 0.5)
    _iconNdc.unproject(camera)
    _iconDir.copy(_iconNdc).sub(_iconOrigin).normalize()
    object.position.copy(_iconOrigin).addScaledVector(_iconDir, distance)
    object.quaternion.copy(camera.quaternion)
}

function setIconFade(icon, fade) {
    if (Math.abs(icon.userData.lastFade - fade) < 0.008) return
    icon.userData.lastFade = fade
    const mats = icon.userData.fadeMats
    if (!mats) return
    for (const mat of mats) {
        const base = mat.userData.baseOpacity ?? 1
        mat.opacity = base * fade
        if (mat.userData.keepOnTop) {
            mat.transparent = fade < 0.98
            mat.depthWrite = false
            continue
        }
        if (fade >= 0.98) {
            mat.transparent = !!mat.userData.baseTransparent
            mat.depthWrite = mat.userData.baseDepthWrite !== false
        } else {
            mat.transparent = true
            mat.depthWrite = false
        }
    }
}

function iconFadeFromProgress(cfg, u) {
    const fadeIn = smootherstep(range(u, cfg.fadeIn[0], cfg.fadeIn[1]))
    const fadeOut = 1 - smootherstep(range(u, cfg.fadeOut[0], cfg.fadeOut[1]))
    return fadeIn * fadeOut
}

function driveCenterIcon(icon, cfg, t) {
    if (!icon) return
    const u = clamp01(t)
    if (u <= 0 || u >= 1) {
        if (icon.visible) icon.visible = false
        icon.userData.lastT = u
        icon.userData.smoothed = false
        setIconFade(icon, 0)
        return
    }

    const narrow = camera.aspect < 1.15
    const fade = iconFadeFromProgress(cfg, u)
    const travel = u
    const startY = narrow ? cfg.startY * 0.82 : cfg.startY
    const endY = narrow ? cfg.endY * 0.82 : cfg.endY
    const targetX = narrow ? 0 : (cfg.ndcX || 0)
    const targetY = THREE.MathUtils.lerp(startY, endY, travel)
    const targetTilt = THREE.MathUtils.lerp(cfg.tiltStart, cfg.tiltEnd, travel)
    const targetYaw = THREE.MathUtils.lerp(cfg.yawStart, cfg.yawEnd, travel)
    const targetRoll = THREE.MathUtils.lerp(cfg.rollStart, cfg.rollEnd, travel)
    const dt = scrollStory.dt || 1 / 60
    const appearing = !icon.userData.smoothed || icon.userData.lastT <= 0 || icon.userData.lastT >= 1

    if (appearing) {
        icon.userData.sx = targetX
        icon.userData.sy = targetY
        icon.userData.stilt = targetTilt
        icon.userData.syaw = targetYaw
        icon.userData.sroll = targetRoll
        icon.userData.smoothed = true
    } else {
        const tau = 0.052
        icon.userData.sx = dampToward(icon.userData.sx, targetX, dt, tau)
        icon.userData.sy = dampToward(icon.userData.sy, targetY, dt, tau)
        icon.userData.stilt = dampToward(icon.userData.stilt, targetTilt, dt, tau)
        icon.userData.syaw = dampToward(icon.userData.syaw, targetYaw, dt, tau)
        icon.userData.sroll = dampToward(icon.userData.sroll, targetRoll, dt, tau)
        if (
            Math.abs(icon.userData.sy - targetY) > 0.0009
            || Math.abs(icon.userData.syaw - targetYaw) > 0.0012
        ) {
            scrollStory.iconCatching = true
        }
    }

    icon.userData.lastT = u
    icon.visible = fade > 0.02
    const sizeMul = narrow ? 0.72 : 0.96
    icon.scale.setScalar((0.94 + 0.06 * fade) * sizeMul)
    placeScrollIcon(
        icon,
        icon.userData.sx,
        icon.userData.sy,
        narrow ? cfg.distance * 1.06 : cfg.distance
    )
    setIconFade(icon, fade)

    const spinner = icon.userData.spinner
    if (!spinner) return
    spinner.rotation.set(icon.userData.stilt, icon.userData.syaw, icon.userData.sroll)
}

function applyScrollIcons(psT, fgT) {
    if (!scrollIcons.photoshop && !scrollIcons.figma) return
    driveCenterIcon(scrollIcons.photoshop, SCROLL_ICON.photoshop, psT)
    driveCenterIcon(scrollIcons.figma, SCROLL_ICON.figma, fgT)
}

function bindStoryUi() {
    const root = document.getElementById("model-story")
    if (!root) return
    storyUi.root = root
    storyUi.items = {
        photoshop: root.querySelector('[data-story="photoshop"]'),
        figma: root.querySelector('[data-story="figma"]'),
    }
    storyUi.media = {
        photoshop: root.querySelector('[data-story-media="photoshop"]'),
        figma: root.querySelector('[data-story-media="figma"]'),
    }
    storyUi.ready = true
}

function paintStoryBlock(el, op, y) {
    if (!el) return
    const vis = op > 0.02
    el.style.opacity = vis ? op.toFixed(3) : "0"
    el.style.visibility = vis ? "visible" : "hidden"
    el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    el.setAttribute("aria-hidden", vis ? "false" : "true")
}

function storyMotionFromIcon(cfg, t) {
    const u = clamp01(t)
    if (u <= 0) return { op: 0, y: 56 }
    if (u >= 1) return { op: 0, y: -64 }
    const fadeIn = smootherstep(range(u, 0.3, 0.48))
    const fadeOut = 1 - smootherstep(range(u, Math.max(cfg.fadeOut[0], 0.74), cfg.fadeOut[1]))
    return {
        op: fadeIn * fadeOut,
        y: THREE.MathUtils.lerp(36, -76, u),
    }
}

function updateStoryOverlay(progress, psT, fgT) {
    if (!storyUi.ready) bindStoryUi()
    if (!storyUi.ready) return

    const show = smootherstep(range(progress, STORY.psStart + 0.06, STORY.psStart + 0.16))
        * (1 - smootherstep(range(progress, 0.985, 1)))
    const key = `${show.toFixed(3)}:${psT.toFixed(3)}:${fgT.toFixed(3)}`
    if (key === storyUi.lastKey) return
    storyUi.lastKey = key
    storyUi.root.style.opacity = String(show)

    const ps = storyMotionFromIcon(SCROLL_ICON.photoshop, psT)
    const fg = storyMotionFromIcon(SCROLL_ICON.figma, fgT)
    paintStoryBlock(storyUi.items.photoshop, ps.op * show, ps.y)
    paintStoryBlock(storyUi.items.figma, fg.op * show, fg.y)
    paintStoryBlock(storyUi.media.photoshop, ps.op * show, ps.y * 0.72)
    paintStoryBlock(storyUi.media.figma, fg.op * show, fg.y * 0.72)
}

function fadeStoryLinks(t) {
    const op = 1 - clamp01(t)
    if (scrollStory.linkFade === op) return
    scrollStory.linkFade = op
    const show = op > 0.02
    for (const link of storyLinks) {
        link.line.material.opacity = 0.62 * op
        link.line.visible = show
        for (const node of link.nodes) {
            node.material.opacity = 0.9 * op
            node.visible = show
        }
    }
}

function slideMainScene(t) {
    if (scrollStory.leaveT === t) return
    scrollStory.leaveT = t
    const k = clamp01(t)
    const peel = easeInOutCubic(k)
    const recede = smootherstep(range(k, 0.22, 1))

    _sceneSlide.set(0, 1, 0).transformDirection(camera.matrixWorld).normalize()
    _peelAxis.set(1, 0, 0).transformDirection(camera.matrixWorld).normalize()

    world.position.copy(_sceneSlide).multiplyScalar(peel * 4.35)
    world.quaternion.setFromAxisAngle(_peelAxis, peel * 0.38)
    world.scale.setScalar(THREE.MathUtils.lerp(1, 0.08, recede))
}

function frameWorld() {
    const focus = world.getObjectByName("laptop") || world
    const box = new THREE.Box3().setFromObject(focus)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 1)

    const narrow = camera.aspect < 1.15
    const side = narrow ? 0.12 : 0.46
    const back = narrow ? 1.62 : 1.05
    const lift = narrow ? 0.56 : 0.4

    camTarget.set(center.x, center.y * 0.58, center.z + 0.06)
    camera.position.set(
        center.x + maxDim * side,
        center.y + maxDim * lift,
        center.z + maxDim * back
    )
    camera.near = maxDim / 80
    camera.far = maxDim * 30
    camera.updateProjectionMatrix()
    camera.lookAt(camTarget)
}

function clamp01(value) {
    return Math.min(1, Math.max(0, value))
}

function range(t, a, b) {
    return clamp01((t - a) / (b - a))
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function easeOutCubic(t) {
    return 1 - (1 - t) ** 3
}

function easeOutBack(t) {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

function smootherstep(t) {
    const x = clamp01(t)
    return x * x * x * (x * (x * 6 - 15) + 10)
}

function easeInOutQuint(t) {
    return t < 0.5 ? 16 * t ** 5 : 1 - ((-2 * t + 2) ** 5) / 2
}

function lerpVec(out, a, b, t) {
    out.lerpVectors(a, b, t)
    return out
}

function bindKeyboardPointer(canvas) {
    if (!canvas || canvas.dataset.keyHoverBound === "1") return
    canvas.dataset.keyHoverBound = "1"
    canvas.addEventListener(
        "pointermove",
        (event) => {
            const rect = canvas.getBoundingClientRect()
            const w = rect.width || 1
            const h = rect.height || 1
            KEYBOARD.pointer.x = ((event.clientX - rect.left) / w) * 2 - 1
            KEYBOARD.pointer.y = -((event.clientY - rect.top) / h) * 2 + 1
            KEYBOARD.inside = true
            needsRender = true
        },
        { passive: true }
    )
    canvas.addEventListener(
        "pointerleave",
        () => {
            KEYBOARD.inside = false
            needsRender = true
        },
        { passive: true }
    )
}

function isKeyCapIsland(size, cz, deckZ) {
    const maxXY = Math.max(size.x, size.y)
    const minXY = Math.min(size.x, size.y)
    const thick = Math.min(size.x, size.y, size.z)
    if (thick < 0.0007 || thick > 0.0045) return false
    if (maxXY < 0.007 || maxXY > 0.12) return false
    if (minXY < 0.006) return false
    if (maxXY > 0.055 && minXY > 0.028) return false
    if (deckZ != null && Math.abs(cz - deckZ) > 0.003) return false
    return true
}

function thicknessAxis(size) {
    if (size.z <= size.x && size.z <= size.y) return 2
    if (size.y <= size.x) return 1
    return 0
}

function uvOverlap(a, b, ua, va, scale) {
    const du = Math.abs(a.center.getComponent(ua) - b.center.getComponent(ua))
    const dv = Math.abs(a.center.getComponent(va) - b.center.getComponent(va))
    const au = a.size.getComponent(ua) * 0.5
    const av = a.size.getComponent(va) * 0.5
    const bu = b.size.getComponent(ua) * 0.5
    const bv = b.size.getComponent(va) * 0.5
    return du < (au + bu) * scale && dv < (av + bv) * scale
}

function isKeyRelatedIsland(size, center, axis, deckZ) {
    const ua = (axis + 1) % 3
    const va = (axis + 2) % 3
    const maxXY = Math.max(size.getComponent(ua), size.getComponent(va))
    const minXY = Math.min(size.getComponent(ua), size.getComponent(va))
    const thick = size.getComponent(axis)
    if (maxXY < 0.004 || maxXY > 0.14) return false
    if (minXY < 0.0025) return false
    if (thick > 0.012) return false
    if (Math.abs(center.getComponent(axis) - deckZ) > 0.014) return false
    return true
}

function pointInKeyFootprint(p, key, ua, va, inset) {
    const du = Math.abs(p.getComponent(ua) - key.center.getComponent(ua))
    const dv = Math.abs(p.getComponent(va) - key.center.getComponent(va))
    return du <= key.size.getComponent(ua) * 0.5 * inset && dv <= key.size.getComponent(va) * 0.5 * inset
}

function growGeometryVerts(geom, srcIndices) {
    const n = srcIndices.length
    if (!n) return geom.attributes.position.count
    const start = geom.attributes.position.count
    for (const name of Object.keys(geom.attributes)) {
        const attr = geom.attributes[name]
        const item = attr.itemSize
        const ArrayCtor = attr.array.constructor
        const next = new ArrayCtor((start + n) * item)
        next.set(attr.array)
        for (let i = 0; i < n; i++) {
            const src = srcIndices[i] * item
            const dst = (start + i) * item
            for (let k = 0; k < item; k++) next[dst + k] = attr.array[src + k]
        }
        const grown = new THREE.BufferAttribute(next, item, attr.normalized)
        if (name === "position") grown.setUsage(THREE.DynamicDrawUsage)
        geom.setAttribute(name, grown)
    }
    return start
}

function detachKeyWells(geom, keys, ua, va, axis) {
    const pos = geom.attributes.position
    const indexAttr = geom.index
    if (!pos || !indexAttr || !keys.length) return

    const idx = new Uint32Array(indexAttr.array)
    geom.userData.wellTris = 0
    const triCount = (idx.length / 3) | 0
    const owned = new Int32Array(pos.count)
    owned.fill(-1)
    for (let k = 0; k < keys.length; k++) {
        const verts = keys[k].verts
        for (let i = 0; i < verts.length; i++) owned[verts[i]] = k
    }

    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const mid = new THREE.Vector3()
    const copies = []
    const copyAt = new Map()
    const remapTri = []

    const dup = (key, src) => {
        const tag = `${key}:${src}`
        let slot = copyAt.get(tag)
        if (slot == null) {
            slot = copies.length
            copyAt.set(tag, slot)
            copies.push(src)
        }
        return slot
    }

    for (let t = 0; t < triCount; t++) {
        const ia = idx[t * 3]
        const ib = idx[t * 3 + 1]
        const ic = idx[t * 3 + 2]
        if (owned[ia] >= 0 && owned[ia] === owned[ib] && owned[ib] === owned[ic]) continue
        a.fromBufferAttribute(pos, ia)
        b.fromBufferAttribute(pos, ib)
        c.fromBufferAttribute(pos, ic)
        mid.addVectors(a, b).add(c).multiplyScalar(1 / 3)
        let owner = -1
        for (let k = 0; k < keys.length; k++) {
            const key = keys[k]
            if (!pointInKeyFootprint(mid, key, ua, va, 0.86)) continue
            if (Math.abs(mid.getComponent(axis) - key.center.getComponent(axis)) > 0.012) continue
            if (
                !pointInKeyFootprint(a, key, ua, va, 0.98) ||
                !pointInKeyFootprint(b, key, ua, va, 0.98) ||
                !pointInKeyFootprint(c, key, ua, va, 0.98)
            ) {
                continue
            }
            owner = k
            break
        }
        if (owner < 0) continue
        remapTri.push(t, owner, ia, ib, ic)
    }

    if (!remapTri.length) return

    for (let i = 0; i < remapTri.length; i += 5) {
        const owner = remapTri[i + 1]
        dup(owner, remapTri[i + 2])
        dup(owner, remapTri[i + 3])
        dup(owner, remapTri[i + 4])
    }

    const start = growGeometryVerts(geom, copies)
    for (const [tag, slot] of copyAt) {
        const k = Number(tag.slice(0, tag.indexOf(":")))
        keys[k].verts.push(start + slot)
    }
    for (let i = 0; i < remapTri.length; i += 5) {
        const t = remapTri[i]
        const owner = remapTri[i + 1]
        idx[t * 3] = start + copyAt.get(`${owner}:${remapTri[i + 2]}`)
        idx[t * 3 + 1] = start + copyAt.get(`${owner}:${remapTri[i + 3]}`)
        idx[t * 3 + 2] = start + copyAt.get(`${owner}:${remapTri[i + 4]}`)
    }
    geom.setIndex(new THREE.BufferAttribute(idx, 1))
    geom.userData.wellTris = remapTri.length / 5
}

function findKeyIslands(host) {
    const geom = host.geometry
    const srcPos = geom?.attributes?.position
    const indexAttr = geom?.index
    if (!srcPos || !indexAttr || srcPos.count < 500) return []

    const ArrayCtor = srcPos.array.constructor
    const data = new ArrayCtor(srcPos.array.length)
    data.set(srcPos.array)
    const pos0 = new THREE.BufferAttribute(data, srcPos.itemSize, srcPos.normalized)
    pos0.setUsage(THREE.DynamicDrawUsage)
    geom.setAttribute("position", pos0)

    const vCount = pos0.count
    const parent = new Int32Array(vCount)
    for (let i = 0; i < vCount; i++) parent[i] = i
    const find = (a) => {
        let x = a
        while (parent[x] !== x) x = parent[x]
        let y = a
        while (y !== x) {
            const next = parent[y]
            parent[y] = x
            y = next
        }
        return x
    }
    const uni = (a, b) => {
        a = find(a)
        b = find(b)
        if (a !== b) parent[b] = a
    }
    const triCount = (indexAttr.count / 3) | 0
    for (let t = 0; t < triCount; t++) {
        const a = indexAttr.getX(t * 3)
        uni(a, indexAttr.getX(t * 3 + 1))
        uni(a, indexAttr.getX(t * 3 + 2))
    }

    const islands = new Map()
    const tmp = new THREE.Vector3()
    for (let i = 0; i < vCount; i++) {
        const r = find(i)
        let rec = islands.get(r)
        if (!rec) {
            rec = { verts: [], box: new THREE.Box3() }
            islands.set(r, rec)
        }
        rec.verts.push(i)
        rec.box.expandByPoint(tmp.fromBufferAttribute(pos0, i))
    }

    const stats = []
    for (const rec of islands.values()) {
        stats.push({
            rec,
            size: rec.box.getSize(new THREE.Vector3()),
            center: rec.box.getCenter(new THREE.Vector3()),
        })
    }

    const seed = stats.filter(
        (s) => isKeyCapIsland(s.size, s.center.z, null) && Math.max(s.size.x, s.size.y) < 0.05
    )
    if (seed.length < 8) return []
    seed.sort((a, b) => a.center.z - b.center.z)
    const deckZ = seed[(seed.length * 0.5) | 0].center.z
    const keyStats = stats.filter((s) => isKeyCapIsland(s.size, s.center.z, deckZ))
    if (keyStats.length < 8) return []

    const axis = thicknessAxis(keyStats[0].size)
    const ua = (axis + 1) % 3
    const va = (axis + 2) % 3

    const taken = new Uint8Array(keyStats.length)
    const groups = []
    for (let i = 0; i < keyStats.length; i++) {
        if (taken[i]) continue
        const group = [keyStats[i]]
        taken[i] = 1
        for (let j = i + 1; j < keyStats.length; j++) {
            if (taken[j]) continue
            if (uvOverlap(keyStats[i], keyStats[j], ua, va, 0.34)) {
                group.push(keyStats[j])
                taken[j] = 1
            }
        }
        groups.push(group)
    }

    const inGroup = new Set(keyStats)
    for (const s of stats) {
        if (inGroup.has(s)) continue
        if (!isKeyRelatedIsland(s.size, s.center, axis, deckZ)) continue
        let best = -1
        let bestD = Infinity
        for (let g = 0; g < groups.length; g++) {
            const o = groups[g][0]
            const du = s.center.getComponent(ua) - o.center.getComponent(ua)
            const dv = s.center.getComponent(va) - o.center.getComponent(va)
            const d = du * du + dv * dv
            if (d < bestD) {
                bestD = d
                best = g
            }
        }
        if (best >= 0 && uvOverlap(s, groups[best][0], ua, va, 0.55)) {
            groups[best].push(s)
        }
    }

    const keys = []
    for (const group of groups) {
        const seen = new Set()
        const verts = []
        const box = new THREE.Box3()
        for (const s of group) {
            box.union(s.rec.box)
            for (const v of s.rec.verts) {
                if (!seen.has(v)) {
                    seen.add(v)
                    verts.push(v)
                }
            }
        }
        keys.push({
            verts,
            capVerts: verts.slice(),
            box,
            center: box.getCenter(new THREE.Vector3()),
            size: box.getSize(new THREE.Vector3()),
        })
    }

    detachKeyWells(geom, keys, ua, va, axis)

    const pos = geom.attributes.position
    const out = []
    for (const key of keys) {
        const verts = key.verts
        const orig = new Float32Array(verts.length * 3)
        for (let i = 0; i < verts.length; i++) {
            const vi = verts[i]
            orig[i * 3] = pos.getX(vi)
            orig[i * 3 + 1] = pos.getY(vi)
            orig[i * 3 + 2] = pos.getZ(vi)
        }
        out.push({
            object: host,
            verts,
            capVerts: key.capVerts,
            orig,
            localCenter: key.center.clone(),
            size: key.size.clone(),
        })
    }
    geom.computeBoundingBox()
    geom.computeBoundingSphere()
    blankKeyboardDecals(host, out)
    return out
}

function medianSorted(values) {
    if (!values.length) return 0
    const mid = values.length >> 1
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) * 0.5
}

function dampToward(current, target, dt, tau) {
    if (tau <= 1e-4) return target
    return current + (target - current) * (1 - Math.exp(-dt / tau))
}

function uvToCanvas(u, v, w, h, flipY) {
    return {
        x: u * w,
        y: flipY ? (1 - v) * h : v * h,
    }
}

function blankKeyboardDecals(host, keys) {
    const mat = host.material
    const map = mat?.map
    const uv = host.geometry?.attributes?.uv
    const img = map?.image
    if (!mat || !map || !uv || !img || !keys.length) return

    const w = img.naturalWidth || img.width || img.videoWidth || 0
    const h = img.naturalHeight || img.height || img.videoHeight || 0
    if (w < 8 || h < 8) return

    const canvas = document.createElement("canvas")
    canvas.width = w * 2
    canvas.height = h
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(img, 0, 0, w, h)
    ctx.drawImage(img, w, 0, w, h)

    const gltfFlip = map.flipY === false
    const toPx = (u, v) => uvToCanvas(u, v, w, h, !gltfFlip)

    const capMark = new Uint8Array(uv.count)
    const rects = []
    for (const key of keys) {
        const cap = key.capVerts || key.verts
        let minU = 1
        let maxU = 0
        let minV = 1
        let maxV = 0
        for (let i = 0; i < cap.length; i++) {
            const vi = cap[i]
            if (vi >= uv.count) continue
            capMark[vi] = 1
            const u = uv.getX(vi)
            const v = uv.getY(vi)
            if (u < minU) minU = u
            if (u > maxU) maxU = u
            if (v < minV) minV = v
            if (v > maxV) maxV = v
        }
        if (maxU > minU && maxV > minV) rects.push({ minU, maxU, minV, maxV })
    }
    if (!rects.length) return

    const inRect = (u, v) => {
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i]
            if (u >= r.minU && u <= r.maxU && v >= r.minV && v <= r.maxV) return true
        }
        return false
    }

    let sr = 0
    let sg = 0
    let sb = 0
    let sn = 0
    for (let i = 0; i < uv.count; i += 11) {
        const u = uv.getX(i)
        const v = uv.getY(i)
        if (inRect(u, v)) continue
        const p = toPx(u, v)
        const x = Math.max(0, Math.min(w - 1, p.x | 0))
        const y = Math.max(0, Math.min(h - 1, p.y | 0))
        const pix = ctx.getImageData(x, y, 1, 1).data
        const lum = pix[0] + pix[1] + pix[2]
        if (lum < 90 || lum > 720) continue
        sr += pix[0]
        sg += pix[1]
        sb += pix[2]
        sn += 1
        if (sn >= 48) break
    }
    if (!sn) {
        sr = 168
        sg = 172
        sb = 178
    } else {
        sr /= sn
        sg /= sn
        sb /= sn
    }
    sr *= 0.38
    sg *= 0.38
    sb *= 0.4
    ctx.fillStyle = `rgb(${sr | 0}, ${sg | 0}, ${sb | 0})`

    const padU = 2 / w
    const padV = 2 / h
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        const a = toPx(r.minU - padU, r.minV - padV)
        const b = toPx(r.maxU + padU, r.maxV + padV)
        const x = Math.min(a.x, b.x)
        const y = Math.min(a.y, b.y)
        ctx.fillRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y))
    }

    const uvData = new Float32Array(uv.array)
    for (let i = 0; i < uv.count; i++) {
        const u = uvData[i * 2]
        uvData[i * 2] = capMark[i] ? u * 0.5 + 0.5 : u * 0.5
    }
    host.geometry.setAttribute("uv", new THREE.BufferAttribute(uvData, 2))

    const baked = new THREE.CanvasTexture(canvas)
    baked.colorSpace = map.colorSpace || THREE.SRGBColorSpace
    baked.flipY = map.flipY
    baked.wrapS = THREE.ClampToEdgeWrapping
    baked.wrapT = map.wrapT
    baked.minFilter = map.minFilter
    baked.magFilter = map.magFilter
    baked.generateMipmaps = map.generateMipmaps
    baked.needsUpdate = true
    mat.map = baked

    const emap = mat.emissiveMap
    const eimg = emap?.image
    if (eimg) {
        const ew = eimg.naturalWidth || eimg.width || w
        const eh = eimg.naturalHeight || eimg.height || h
        const ecanvas = document.createElement("canvas")
        ecanvas.width = ew * 2
        ecanvas.height = eh
        const ectx = ecanvas.getContext("2d")
        if (ectx) {
            ectx.drawImage(eimg, 0, 0, ew, eh)
            ectx.drawImage(eimg, ew, 0, ew, eh)
            ectx.fillStyle = "#000"
            const eFlip = emap.flipY === false
            const ePx = (u, v) => uvToCanvas(u, v, ew, eh, !eFlip)
            for (let i = 0; i < rects.length; i++) {
                const r = rects[i]
                const a = ePx(r.minU - padU, r.minV - padV)
                const b = ePx(r.maxU + padU, r.maxV + padV)
                ectx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
            }
            const ebaked = new THREE.CanvasTexture(ecanvas)
            ebaked.colorSpace = emap.colorSpace || THREE.NoColorSpace
            ebaked.flipY = emap.flipY
            ebaked.wrapS = THREE.ClampToEdgeWrapping
            ebaked.wrapT = emap.wrapT
            ebaked.needsUpdate = true
            mat.emissiveMap = ebaked
        }
    }
    mat.needsUpdate = true
}

function stripSyntheticKeys(root) {
    const extra = []
    root.traverse((child) => {
        if (child.userData?.realKey || (child.isMesh && /^KeyCap_\d+$/.test(child.name))) extra.push(child)
        if (child.isMesh && child.name === "KeyboardDeckHit") extra.push(child)
    })
    for (const child of extra) {
        child.removeFromParent()
        child.geometry?.dispose?.()
    }
}

function isNamedKeyMesh(child) {
    if (!child.isMesh) return false
    const id = `${child.name} ${child.parent?.name || ""} ${child.material?.name || ""}`
    if (!KEY_NAME_RE.test(id) || KEY_SKIP_RE.test(id) || /keyboardkeyhole/i.test(id)) return false
    const count = child.geometry?.attributes?.position?.count || 0
    return count > 8 && count <= 400
}

function collectNamedKeyMeshes(laptop) {
    const named = []
    laptop.traverse((child) => {
        if (isNamedKeyMesh(child)) named.push(child)
    })
    return named
}

function findKeyboardHost(laptop) {
    const screen = findScreenMesh(laptop)
    let best = null
    let bestCount = 0
    laptop.traverse((child) => {
        if (!child.isMesh) return
        if (child === screen || child.name === "LcdPanel" || child === lcdPanel) return
        const count = child.geometry?.attributes?.position?.count || 0
        if (count > bestCount) {
            best = child
            bestCount = count
        }
    })
    return best
}

function collectLaptopKeyMeshes(laptop) {
    laptop.updateWorldMatrix(true, true)
    const names = []
    laptop.traverse((child) => {
        if (!child.isMesh) return
        const tris = ((child.geometry?.index?.count || child.geometry?.attributes?.position?.count || 0) / 3) | 0
        names.push(`${child.name || "(unnamed)"} [${tris} tris]`)
    })
    console.info("[laptop meshes]", names)
    return collectNamedKeyMeshes(laptop)
}

function localCenterIn(host, mesh) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    const center = mesh.geometry.boundingBox.getCenter(KEYBOARD._tmp)
    mesh.localToWorld(center)
    host.worldToLocal(center)
    return center.clone()
}

function liftDirInParent(host, parent, hostLocalNormal) {
    KEYBOARD._tmp.copy(hostLocalNormal).transformDirection(host.matrixWorld).normalize()
    KEYBOARD._inv.copy(parent.matrixWorld).invert()
    return KEYBOARD._tmp.clone().transformDirection(KEYBOARD._inv).normalize()
}

function assignKeyGrid(keys, u, v) {
    const scored = keys.map((key) => ({
        key,
        x: key.localCenter.dot(u),
        y: key.localCenter.dot(v),
    }))
    scored.sort((a, b) => a.y - b.y || a.x - b.x)
    const gaps = []
    for (let i = 1; i < scored.length; i++) {
        const gap = scored[i].y - scored[i - 1].y
        if (gap > 1e-6) gaps.push(gap)
    }
    gaps.sort((a, b) => a - b)
    const rowStep = Math.max(medianSorted(gaps) * 0.55, 1e-5)
    let row = 0
    scored[0].key.row = 0
    for (let i = 1; i < scored.length; i++) {
        if (scored[i].y - scored[i - 1].y > rowStep) row += 1
        scored[i].key.row = row
    }
    const byRow = new Map()
    for (const item of scored) {
        let list = byRow.get(item.key.row)
        if (!list) {
            list = []
            byRow.set(item.key.row, list)
        }
        list.push(item)
    }
    for (const list of byRow.values()) {
        list.sort((a, b) => a.x - b.x)
        list.forEach((item, column) => {
            item.key.column = column
        })
    }
}

function applyKeyOffset(key, offset) {
    if (key.verts && KEYBOARD.posAttr) {
        const arr = KEYBOARD.posAttr.array
        const orig = key.orig
        const nx = KEYBOARD.normal.x
        const ny = KEYBOARD.normal.y
        const nz = KEYBOARD.normal.z
        const verts = key.verts
        for (let i = 0; i < verts.length; i++) {
            const v = verts[i] * 3
            const o = i * 3
            arr[v] = orig[o] + nx * offset
            arr[v + 1] = orig[o + 1] + ny * offset
            arr[v + 2] = orig[o + 2] + nz * offset
        }
        return
    }
    key.object.position.copy(key.originalPosition).addScaledVector(key.liftDir, offset)
}

function layoutKeys(keys, sizes) {
    assignKeyGrid(keys, KEYBOARD.u, KEYBOARD.v)
    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    const nearest = []
    for (let i = 0; i < keys.length; i++) {
        const cu = keys[i].localCenter.dot(KEYBOARD.u)
        const cv = keys[i].localCenter.dot(KEYBOARD.v)
        if (cu < minU) minU = cu
        if (cu > maxU) maxU = cu
        if (cv < minV) minV = cv
        if (cv > maxV) maxV = cv
        let best = Infinity
        for (let j = 0; j < keys.length; j++) {
            if (i === j) continue
            const du = keys[j].localCenter.dot(KEYBOARD.u) - cu
            const dv = keys[j].localCenter.dot(KEYBOARD.v) - cv
            const d = Math.hypot(du, dv)
            if (d > 1e-6 && d < best) best = d
        }
        if (best < Infinity) nearest.push(best)
    }
    nearest.sort((a, b) => a - b)
    const spacing = Math.max(medianSorted(nearest), 1e-4)
    KEYBOARD.uvMinU = minU
    KEYBOARD.uvMaxU = maxU
    KEYBOARD.uvMinV = minV
    KEYBOARD.uvMaxV = maxV
    KEYBOARD.radius = spacing * 2.95
    const thicks = sizes.map((size) => Math.min(size.x, size.y, size.z)).sort((a, b) => a - b)
    KEYBOARD.maxLift = Math.max(medianSorted(thicks) * 3.8, spacing * 1.05)
    KEYBOARD.deckCenter.set(0, 0, 0)
    for (let i = 0; i < keys.length; i++) KEYBOARD.deckCenter.add(keys[i].localCenter)
    KEYBOARD.deckCenter.multiplyScalar(1 / keys.length)
}

function setupKeyboardInteraction(model) {
    KEYBOARD.keys.length = 0
    KEYBOARD.meshes.length = 0
    KEYBOARD.host = null
    KEYBOARD.posAttr = null
    KEYBOARD.hitMeshes = []
    KEYBOARD.hasFocus = false
    KEYBOARD.moving = false
    KEYBOARD.mode = "none"

    if (!model) return false
    stripSyntheticKeys(model)
    model.updateWorldMatrix(true, true)

    const names = []
    model.traverse((child) => {
        if (!child.isMesh) return
        const tris = ((child.geometry?.index?.count || child.geometry?.attributes?.position?.count || 0) / 3) | 0
        names.push(`${child.name || "(unnamed)"} [${tris} tris]`)
    })
    console.info("[laptop meshes]", names)

    KEYBOARD.screenMeshes = [findScreenMesh(model), lcdPanel].filter(Boolean)

    const named = collectNamedKeyMeshes(model)
    let keys = []
    let sizes = []
    let host = null

    if (named.length >= 6) {
        KEYBOARD.mode = "objects"
        host = named[0].parent
        host.updateWorldMatrix(true, true)
        KEYBOARD.host = host
        KEYBOARD.hitMeshes = named
        sizes = named.map((mesh) => {
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
            return mesh.geometry.boundingBox.getSize(new THREE.Vector3())
        })
        const first = sizes[0]
        const axis = first.z <= first.x && first.z <= first.y ? 2 : first.y <= first.x ? 1 : 0
        KEYBOARD.normal.set(0, 0, 0).setComponent(axis, 1)
        const avg = new THREE.Vector3()
        for (const mesh of named) avg.add(localCenterIn(host, mesh))
        avg.multiplyScalar(1 / named.length)
        const hostCenter = host.geometry?.boundingBox
            ? host.geometry.boundingBox.getCenter(new THREE.Vector3())
            : new THREE.Vector3()
        if (KEYBOARD.normal.dot(KEYBOARD._delta.copy(avg).sub(hostCenter)) < 0) KEYBOARD.normal.negate()
        KEYBOARD._tmp.copy(KEYBOARD.normal).transformDirection(host.matrixWorld)
        if (KEYBOARD._tmp.y < 0) KEYBOARD.normal.negate()
        const ref = Math.abs(KEYBOARD.normal.y) < 0.86 ? KEYBOARD._tmp.set(0, 1, 0) : KEYBOARD._tmp.set(1, 0, 0)
        KEYBOARD.u.crossVectors(ref, KEYBOARD.normal).normalize()
        KEYBOARD.v.crossVectors(KEYBOARD.normal, KEYBOARD.u).normalize()
        for (const mesh of named) {
            const parent = mesh.parent || host
            keys.push({
                object: mesh,
                originalPosition: mesh.position.clone(),
                targetPosition: mesh.position.clone(),
                currentOffset: 0,
                targetOffset: 0,
                localCenter: localCenterIn(host, mesh),
                liftDir: liftDirInParent(host, parent, KEYBOARD.normal),
                row: 0,
                column: 0,
            })
        }
    } else {
        host = findKeyboardHost(model)
        if (!host) {
            console.warn("[keyboard] Не найден mesh корпуса ноутбука.")
            return false
        }
        host.updateWorldMatrix(true, true)
        const islands = findKeyIslands(host)
        if (islands.length < 6) {
            console.warn(
                "[keyboard] В GLB нет отдельных объектов клавиш. Не создаю копии. В Blender: Separate by Loose Parts по кейкапам и экспорт GLB."
            )
            return false
        }
        KEYBOARD.mode = "islands"
        KEYBOARD.host = host
        KEYBOARD.hitMeshes = [host]
        KEYBOARD.posAttr = host.geometry.attributes.position
        sizes = islands.map((island) => island.size)
        const first = sizes[0]
        const axis = first.z <= first.x && first.z <= first.y ? 2 : first.y <= first.x ? 1 : 0
        KEYBOARD.normal.set(0, 0, 0).setComponent(axis, 1)
        const avg = new THREE.Vector3()
        for (const island of islands) avg.add(island.localCenter)
        avg.multiplyScalar(1 / islands.length)
        if (!host.geometry.boundingBox) host.geometry.computeBoundingBox()
        const hostCenter = host.geometry.boundingBox.getCenter(new THREE.Vector3())
        if (KEYBOARD.normal.dot(KEYBOARD._delta.copy(avg).sub(hostCenter)) < 0) KEYBOARD.normal.negate()
        KEYBOARD._tmp.copy(KEYBOARD.normal).transformDirection(host.matrixWorld)
        if (KEYBOARD._tmp.y < 0) KEYBOARD.normal.negate()
        const ref = Math.abs(KEYBOARD.normal.y) < 0.86 ? KEYBOARD._tmp.set(0, 1, 0) : KEYBOARD._tmp.set(1, 0, 0)
        KEYBOARD.u.crossVectors(ref, KEYBOARD.normal).normalize()
        KEYBOARD.v.crossVectors(KEYBOARD.normal, KEYBOARD.u).normalize()
        for (const island of islands) {
            keys.push({
                object: host,
                originalPosition: island.localCenter.clone(),
                targetPosition: island.localCenter.clone(),
                currentOffset: 0,
                targetOffset: 0,
                localCenter: island.localCenter,
                liftDir: KEYBOARD.normal,
                verts: island.verts,
                orig: island.orig,
                row: 0,
                column: 0,
            })
        }
    }

    layoutKeys(keys, sizes)
    KEYBOARD.keys = keys
    KEYBOARD.meshes = KEYBOARD.hitMeshes

    console.log("Keyboard keys:", keys.length)
    console.log(keys)
    if (renderer?.domElement) {
        renderer.domElement.dataset.keyHover = `${KEYBOARD.mode}:${keys.length}`
        renderer.domElement.dataset.keyWells = String(host.geometry?.userData?.wellTris || 0)
    }
    return true
}

function keyboardIsActive() {
    if (!world.visible) return false
    if (scrollStory.enabled && scrollStory.leaveT > 0.58) return false
    return KEYBOARD.keys.length > 0
}

function pointerOnKeyboard() {
    const host = KEYBOARD.host
    if (!host || !camera) return false
    host.updateWorldMatrix(true, false)
    KEYBOARD.raycaster.setFromCamera(KEYBOARD.pointer, camera)

    let screenDist = Infinity
    const screens = KEYBOARD.screenMeshes
    for (let i = 0; i < screens.length; i++) {
        const mesh = screens[i]
        if (!mesh?.parent) continue
        const hits = KEYBOARD.raycaster.intersectObject(mesh, false)
        if (hits.length && hits[0].distance < screenDist) screenDist = hits[0].distance
    }

    const worldN = KEYBOARD._tmp.copy(KEYBOARD.normal).transformDirection(host.matrixWorld).normalize()
    host.localToWorld(KEYBOARD._delta.copy(KEYBOARD.deckCenter))
    KEYBOARD._plane.setFromNormalAndCoplanarPoint(worldN, KEYBOARD._delta)
    const hit = KEYBOARD.raycaster.ray.intersectPlane(KEYBOARD._plane, KEYBOARD._hitWorld)
    if (!hit) {
        KEYBOARD.hitState = "miss"
        return false
    }
    KEYBOARD._delta.copy(KEYBOARD._hitWorld).sub(KEYBOARD.raycaster.ray.origin)
    if (KEYBOARD._delta.dot(KEYBOARD.raycaster.ray.direction) < 0) {
        KEYBOARD.hitState = "behind"
        return false
    }
    if (KEYBOARD._delta.length() >= screenDist) {
        KEYBOARD.hitState = "screen"
        return false
    }

    host.worldToLocal(KEYBOARD._hitLocal.copy(KEYBOARD._hitWorld))
    const u = KEYBOARD._hitLocal.dot(KEYBOARD.u)
    const v = KEYBOARD._hitLocal.dot(KEYBOARD.v)
    const pad = KEYBOARD.radius * 0.28
    if (
        u < KEYBOARD.uvMinU - pad ||
        u > KEYBOARD.uvMaxU + pad ||
        v < KEYBOARD.uvMinV - pad ||
        v > KEYBOARD.uvMaxV + pad
    ) {
        KEYBOARD.hitState = "outside"
        return false
    }
    KEYBOARD.lastHitLocal.copy(KEYBOARD._hitLocal)
    KEYBOARD.hitState = "ok"
    return true
}

function updateKeyboardInteraction(dt) {
    const keys = KEYBOARD.keys
    if (!keys.length) return false

    const canPlay = keyboardIsActive()
    const onKeys = canPlay && KEYBOARD.inside && pointerOnKeyboard()
    if (onKeys) {
        KEYBOARD.hold = 0.28
        if (!KEYBOARD.smoothed) {
            KEYBOARD.smoothHit.copy(KEYBOARD.lastHitLocal)
            KEYBOARD.smoothed = true
        } else {
            KEYBOARD.smoothHit.lerp(KEYBOARD.lastHitLocal, 1 - Math.exp(-dt / 0.14))
        }
    } else {
        KEYBOARD.hold = Math.max(0, KEYBOARD.hold - dt)
        if (!KEYBOARD.inside) KEYBOARD.hitState = "idle"
        else if (canPlay && KEYBOARD.hitState === "ok") KEYBOARD.hitState = "outside"
    }

    let fade = 0
    if (onKeys) fade = 1
    else if (KEYBOARD.hold > 0) {
        const t = KEYBOARD.hold / 0.28
        fade = t * t * (3 - 2 * t)
    }
    const focused = fade > 0.001 && KEYBOARD.smoothed
    KEYBOARD.hasFocus = onKeys

    const radius = KEYBOARD.radius
    const maxLift = KEYBOARD.maxLift
    let moving = false
    let maxOffset = 0
    const hit = KEYBOARD.smoothHit

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        KEYBOARD._delta.copy(key.localCenter).sub(hit)
        KEYBOARD._delta.addScaledVector(KEYBOARD.normal, -KEYBOARD._delta.dot(KEYBOARD.normal))
        const dist = KEYBOARD._delta.length()
        const fall = focused ? Math.max(0, 1 - dist / radius) : 0
        const influence = fall * fall * (3 - 2 * fall)
        const goal = influence * maxLift * fade
        if (key.targetPosition) {
            key.targetPosition.copy(key.originalPosition).addScaledVector(key.liftDir, goal)
        }
        const rising = goal > key.currentOffset
        key.targetOffset = goal
        key.currentOffset = dampToward(key.currentOffset, goal, dt, rising ? 0.15 : 0.22)
        applyKeyOffset(key, key.currentOffset)
        if (key.currentOffset > maxOffset) maxOffset = key.currentOffset

        if (
            key.currentOffset > 1e-6 ||
            key.targetOffset > 1e-6 ||
            Math.abs(key.currentOffset - key.targetOffset) > 1e-6
        ) {
            moving = true
        } else if (key.currentOffset !== 0) {
            key.currentOffset = 0
            key.targetOffset = 0
            applyKeyOffset(key, 0)
            moving = true
        }
    }

    if (!moving && KEYBOARD.hold <= 0) KEYBOARD.smoothed = false

    if (moving && KEYBOARD.posAttr) KEYBOARD.posAttr.needsUpdate = true
    KEYBOARD.moving = moving
    if (renderer?.domElement) {
        const el = renderer.domElement
        if (el.dataset.keyFocus !== (onKeys ? "1" : "0")) el.dataset.keyFocus = onKeys ? "1" : "0"
        if (el.dataset.keyHit !== KEYBOARD.hitState) el.dataset.keyHit = KEYBOARD.hitState
        const lift = maxOffset.toExponential(2)
        if (el.dataset.keyLift !== lift) el.dataset.keyLift = lift
    }
    return moving
}

function sectionProgress() {
    const max = Math.max(1, sectionEl.offsetHeight - window.innerHeight)
    const top = sectionEl.getBoundingClientRect().top
    return clamp01(-top / max)
}

function requestCinematic() {
    cinematicRequested = true
    if (sceneReady && !cine.active && !cine.done) {
        startCinematic()
    }
}

function paintPinSpacer(self) {
    const spacer = self?.pin?.parentElement
    if (spacer) spacer.style.backgroundColor = "#3E2B6B"
}

function bindSectionScroll() {
    if (scrollBound) return
    scrollBound = true

    const ScrollTrigger = window.ScrollTrigger
    if (ScrollTrigger) {
        sectionEl.classList.add("is-pinned")
        ScrollTrigger.create({
            trigger: sectionEl,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * 7)}`,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: (self) => paintPinSpacer(self),
            onEnter: () => requestCinematic(),
            onUpdate: (self) => {
                scrollStory.raw = clamp01(self.progress)
            },
        })
        ScrollTrigger.refresh()
        if (sectionEl.getBoundingClientRect().top <= 24) {
            requestCinematic()
        }
        return
    }

    const onScroll = () => {
        scrollStory.raw = sectionProgress()
        if (scrollStory.raw > 0.02 || sectionEl.getBoundingClientRect().top <= 8) {
            requestCinematic()
        }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("touchmove", onScroll, { passive: true })
    onScroll()
}

function startCinematic() {
    const laptop = placed.laptop
    const cursor = placed.cursor
    if (!laptop || !cursor) return
    if (cine.active || cine.done) return

    frameWorld()
    if (lcdPanel) facePanelTowardCamera(lcdPanel)

    cine.endCam.copy(camera.position)
    cine.endTarget.copy(camTarget)
    const startDist = cine.endCam.distanceTo(cine.endTarget) * 1.65
    cine.startTarget.set(cine.endTarget.x, cine.endTarget.y + 0.08, cine.endTarget.z)
    cine.startCam.set(
        cine.startTarget.x,
        cine.startTarget.y + 0.42,
        cine.startTarget.z + startDist
    )

    const sceneBox = new THREE.Box3().setFromObject(world)
    const sceneSize = sceneBox.getSize(new THREE.Vector3())
    const sceneCenter = sceneBox.getCenter(new THREE.Vector3())
    const sceneSpan = Math.max(sceneSize.x, sceneSize.y, sceneSize.z, 1)
    cine.wideTarget.set(sceneCenter.x, sceneCenter.y * 0.58, sceneCenter.z)
    cine.wideCam.set(
        cine.wideTarget.x,
        cine.wideTarget.y + sceneSpan * 0.38,
        cine.wideTarget.z + sceneSpan * 1.7
    )

    cine.cursorHome.copy(cursor.position)
    cine.cursorHomeQ.copy(cursor.quaternion)
    cine.cursorHomeScale.copy(cursor.scale)
    captureCursorTip(cursor)
    if (placed.photoshop) {
        placed.photoshop.updateWorldMatrix(true, false)
        placed.photoshop.getWorldPosition(cine.cursorClick)
        cine.cursorClick.y += 0.22
        cine.cursorClick.z += 0.16
        cine.cursorClick.x += 0.08
    } else {
        cine.cursorClick.copy(cine.cursorHome)
    }

    camera.position.copy(cine.startCam)
    camTarget.copy(cine.startTarget)
    renderer.toneMappingExposure = 0.28
    if (placed.figma) {
        placed.figma.scale.setScalar(0.01)
        placed.figma.visible = false
    }
    cine.t = 0
    cine.active = true
    cine.done = false
}

function finishCinematic() {
    if (cine.done) return
    cine.active = false
    cine.done = true
    cine.t = CINE_END

    const cursor = placed.cursor
    const photoshop = placed.photoshop
    const figma = placed.figma
    if (cursor) {
        cursor.position.copy(cine.cursorHome)
        cursor.quaternion.copy(cine.cursorHomeQ)
        cursor.rotation.setFromQuaternion(cine.cursorHomeQ)
        cursor.scale.copy(cine.cursorHomeScale)
    }
    if (photoshop) {
        photoshop.scale.setScalar(1)
        photoshop.position.y = 0
        photoshop.rotation.y = THREE.MathUtils.degToRad(LAYOUT.photoshop.rotationY)
        photoshop.rotation.z = 0
    }
    if (figma) {
        figma.scale.setScalar(1)
        figma.visible = true
    }
    camera.position.copy(cine.wideCam)
    camTarget.copy(cine.wideTarget)
    renderer.toneMappingExposure = 1.22
    if (veilEl) veilEl.style.opacity = "0"
    if (screenFX) {
        screenFX.fade = 1
        screenFX.paint(1)
    }
    camera.lookAt(camTarget)
    enableScrollStory()
}

function updateCinematic(dt) {
    if (!cine.active) return
    if (scrollStory.raw > CINE_SKIP_SCROLL) {
        finishCinematic()
        return
    }
    cine.t += dt
    const t = cine.t

    const veil = 1 - smootherstep(range(t, 0.1, 1.45))
    if (veilEl && Math.abs(veil - (cine.lastVeil ?? 2)) > 0.012) {
        cine.lastVeil = veil
        veilEl.style.opacity = String(veil)
    }

    renderer.toneMappingExposure = THREE.MathUtils.lerp(
        0.28,
        1.22,
        smootherstep(range(t, 0.15, 1.75))
    )

    const figma = placed.figma
    if (figma) {
        const appear = easeOutBack(range(t, 0.08, 0.68))
        figma.scale.setScalar(0.01 + 0.99 * appear)
        figma.visible = appear > 0.02
    }

    if (t < 3.36) {
        const camBlend = easeInOutCubic(range(t, 0.42, 1.85))
        lerpVec(camera.position, cine.startCam, cine.endCam, camBlend)
        lerpVec(camTarget, cine.startTarget, cine.endTarget, camBlend)
    } else {
        const pullBack = easeInOutCubic(range(t, 3.38, 5.05))
        lerpVec(camera.position, cine.endCam, cine.wideCam, pullBack)
        lerpVec(camTarget, cine.endTarget, cine.wideTarget, pullBack)
    }

    const cursor = placed.cursor
    if (cursor) {
        const travel = easeInOutCubic(range(t, 1.6, 2.35))
        lerpVec(cursor.position, cine.cursorHome, cine.cursorClick, travel)

        const click = range(t, 2.32, 2.52)
        if (click > 0 && click < 1) {
            const dip = Math.sin(click * Math.PI)
            cursor.position.y -= dip * 0.07
            cursor.position.z -= dip * 0.05
            cursor.scale.setScalar(1 - dip * 0.08)
        } else if (t >= 2.52 && t < 3.36) {
            const back = easeInOutCubic(range(t, 2.7, 3.35))
            lerpVec(cursor.position, cine.cursorClick, cine.cursorHome, back)
            cursor.scale.setScalar(1)
        } else if (t >= 3.36) {
            cursor.position.copy(cine.cursorHome)
            cursor.scale.setScalar(1)
        }
    }

    const photoshop = placed.photoshop
    if (photoshop) {
        const react = range(t, 2.45, 3.15)
        if (react > 0 && react < 1) {
            const bounce = Math.sin(react * Math.PI)
            const pop = easeOutBack(Math.min(1, react * 1.35))
            photoshop.scale.setScalar(1 + bounce * 0.16)
            photoshop.rotation.y = THREE.MathUtils.degToRad(LAYOUT.photoshop.rotationY) + bounce * 0.35
            photoshop.position.y = bounce * 0.12
            photoshop.rotation.z = Math.sin(pop * Math.PI) * 0.08
        } else if (t >= 3.15) {
            photoshop.scale.setScalar(1)
            photoshop.position.y = 0
            photoshop.rotation.y = THREE.MathUtils.degToRad(LAYOUT.photoshop.rotationY)
            photoshop.rotation.z = 0
        }
    }

    if (screenFX) {
        const fade = easeOutCubic(range(t, 2.4, 3.2))
        if (Math.abs(fade - screenFX.fade) > 0.008 || (fade === 1 && screenFX.fade !== 1)) {
            screenFX.fade = fade
            screenFX.paint(fade)
        }
    }

    if (t >= CINE_END) {
        finishCinematic()
        return
    }

    camera.lookAt(camTarget)
}

function snapshotActor(object) {
    if (!object) return null
    return {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
    }
}

function captureCursorTip(cursor) {
    if (!cursor) return
    cursor.updateWorldMatrix(true, true)
    _box.setFromObject(cursor)
    _box.getCenter(_boxCenter)
    _tipShift.set(_boxCenter.x, _box.max.y, _boxCenter.z)
    cursor.worldToLocal(_tipShift)
    cine.cursorTipLocal.copy(_tipShift)
}

function fadeCursorShadow(visible) {
    const cursor = placed.cursor
    if (!cursor) return
    const op = 0.42 * clamp01(visible)
    cursor.traverse((child) => {
        if (!child.isMesh) return
        if (child.name !== "blob-shadow" && child.material?.map !== blobTex) return
        child.material.opacity = op
        child.visible = op > 0.02
    })
}

function getCursorScreenPose() {
    const panel = lcdPanel || (placed.laptop && findScreenMesh(placed.laptop))
    const cursor = placed.cursor
    if (!panel || !cursor?.parent) return null

    panel.updateWorldMatrix(true, false)
    cursor.parent.updateWorldMatrix(true, false)

    const h = panel.geometry?.parameters?.height || 0.62

    _screenN.set(0, 0, 1).transformDirection(panel.matrixWorld).normalize()
    _screenUp.set(0, 1, 0).transformDirection(panel.matrixWorld).normalize()
    _screenPos.set(0, 0, 0)
    panel.localToWorld(_screenPos)

    _boxCenter.set(0, -h * 0.5, 0)
    _tipShift.set(0, h * 0.5, 0)
    panel.localToWorld(_boxCenter)
    panel.localToWorld(_tipShift)
    const worldH = Math.max(_boxCenter.distanceTo(_tipShift), 0.2)

    camera.getWorldPosition(_boxSize)
    if (_screenN.dot(_boxSize.sub(_screenPos)) < 0) _screenN.negate()
    if (_screenUp.lengthSq() < 1e-8) _screenUp.set(0, 1, 0)
    _screenRight.crossVectors(_screenUp, _screenN)
    if (_screenRight.lengthSq() < 1e-8) _screenRight.set(1, 0, 0)
    _screenRight.normalize()
    _screenUp.crossVectors(_screenN, _screenRight).normalize()
    _screenZ.crossVectors(_screenRight, _screenUp).normalize()
    _basis.makeBasis(_screenRight, _screenUp, _screenZ)
    _worldQ.setFromRotationMatrix(_basis)
    _localQ.setFromAxisAngle(_screenN, THREE.MathUtils.degToRad(-32))
    _worldQ.premultiply(_localQ)

    const s = THREE.MathUtils.clamp((worldH * 0.16) / LAYOUT.cursor.size, 0.1, 0.14)
    _screenPos.addScaledVector(_screenN, worldH * 0.01 + s * LAYOUT.cursor.size * 0.08)

    cursor.parent.getWorldQuaternion(_parentQ)
    _localQ.copy(_parentQ).invert().multiply(_worldQ)

    return {
        position: cursor.parent.worldToLocal(_screenPos.clone()),
        quaternion: _localQ.clone(),
        scale: new THREE.Vector3(s, s, s * 0.42),
    }
}

function applyCursorDock(dock) {
    const cursor = placed.cursor
    if (!cursor) return
    if (cine.cursorHomeScale.x <= 0) cine.cursorHomeScale.set(1, 1, 1)
    const k = clamp01(dock)
    if (k <= 0.0001) {
        cursor.position.copy(cine.cursorHome)
        cursor.quaternion.copy(cine.cursorHomeQ)
        cursor.rotation.setFromQuaternion(cine.cursorHomeQ)
        cursor.scale.copy(cine.cursorHomeScale)
        fadeCursorShadow(1)
        return
    }

    const pose = getCursorScreenPose()
    const e = k
    if (pose) {
        cursor.position.lerpVectors(cine.cursorHome, pose.position, e)
        cursor.quaternion.slerpQuaternions(cine.cursorHomeQ, pose.quaternion, e)
        cursor.scale.lerpVectors(cine.cursorHomeScale, pose.scale, e)
    } else if (placed.laptop) {
        placed.laptop.updateWorldMatrix(true, false)
        placed.laptop.getWorldPosition(_boxCenter)
        _boxCenter.y += 0.55
        cursor.parent.worldToLocal(_boxCenter)
        cursor.position.lerpVectors(cine.cursorHome, _boxCenter, e)
        const s = THREE.MathUtils.lerp(cine.cursorHomeScale.x, 0.1, e)
        cursor.scale.setScalar(s)
    }
    cursor.rotation.setFromQuaternion(cursor.quaternion)
    fadeCursorShadow(1 - e)
    cursor.traverse((child) => {
        if (!child.isMesh || child.name === "blob-shadow") return
        child.renderOrder = e > 0.45 ? 8 : 0
    })
}

function wrapAngle(value) {
    return Math.atan2(Math.sin(value), Math.cos(value))
}

function captureLaptopFacePose(homeLaptop) {
    const laptop = placed.laptop
    const panel = lcdPanel || (laptop && findScreenMesh(laptop))
    if (!laptop || !homeLaptop || !panel) return null

    laptop.position.copy(homeLaptop.position)
    laptop.quaternion.copy(homeLaptop.quaternion)
    if (homeLaptop.scale) laptop.scale.copy(homeLaptop.scale)
    laptop.updateMatrixWorld(true)

    panel.updateWorldMatrix(true, false)
    panel.getWorldPosition(_screenPos)
    _screenN.set(0, 0, 1).transformDirection(panel.matrixWorld).normalize()
    _boxSize.copy(scrollStory.closeCam).sub(_screenPos)
    _screenN.y = 0
    _boxSize.y = 0
    if (_screenN.lengthSq() < 1e-8 || _boxSize.lengthSq() < 1e-8) {
        laptop.position.copy(homeLaptop.position)
        laptop.quaternion.copy(homeLaptop.quaternion)
        return null
    }
    _screenN.normalize()
    _boxSize.normalize()
    if (_screenN.dot(_boxSize) < 0) _screenN.negate()

    const yaw = wrapAngle(Math.atan2(_boxSize.x, _boxSize.z) - Math.atan2(_screenN.x, _screenN.z))
    const amount = camera.aspect < 1.15 ? 0.82 : 0.9
    const rotation = homeLaptop.rotation.clone()
    rotation.y += yaw * amount
    const quaternion = new THREE.Quaternion().setFromEuler(rotation)

    _screenRight.set(0, 1, 0).cross(_boxSize)
    if (_screenRight.lengthSq() < 1e-8) _screenRight.set(1, 0, 0)
    else _screenRight.normalize()

    const position = homeLaptop.position.clone()
        .addScaledVector(_screenRight, camera.aspect < 1.15 ? 0.03 : 0.05)
        .add(new THREE.Vector3(0, 0.02, 0))

    laptop.position.copy(homeLaptop.position)
    laptop.quaternion.copy(homeLaptop.quaternion)
    if (homeLaptop.scale) laptop.scale.copy(homeLaptop.scale)

    return {
        position,
        rotation,
        quaternion,
        scale: homeLaptop.scale ? homeLaptop.scale.clone() : new THREE.Vector3(1, 1, 1),
    }
}

function remapEase(progress, start, end) {
    return easeInOutCubic(clamp01((progress - start) / Math.max(0.0001, end - start)))
}

function enableScrollStory() {
    const laptop = snapshotActor(placed.laptop)
    const cursor = snapshotActor(placed.cursor)
    const photoshop = snapshotActor(placed.photoshop)
    const figma = snapshotActor(placed.figma)

    scrollStory.home = {
        cam: cine.wideCam.clone(),
        target: cine.wideTarget.clone(),
        laptop,
        cursor,
        photoshop,
        figma,
    }

    const narrow = camera.aspect < 1.15
    const view = cine.wideCam.clone().sub(cine.wideTarget)
    view.normalize()
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), view)
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    right.normalize()
    const lift = new THREE.Vector3().crossVectors(view, right).normalize()

    scrollStory.midTarget.copy(cine.wideTarget)
    scrollStory.midCam.lerpVectors(cine.wideCam, cine.wideTarget, narrow ? 0.1 : 0.12)

    scrollStory.closeTarget.copy(cine.wideTarget).add(new THREE.Vector3(0.02, 0.04, 0.01))
    scrollStory.closeCam.lerpVectors(cine.wideCam, cine.wideTarget, narrow ? 0.24 : 0.3)
    scrollStory.closeCam.addScaledVector(right, narrow ? -0.04 : -0.08)
    scrollStory.closeCam.addScaledVector(lift, 0.03)

    scrollStory.to = {
        laptop: laptop && {
            position: laptop.position.clone(),
            rotation: laptop.rotation.clone(),
            quaternion: laptop.quaternion.clone(),
        },
    }
    scrollStory.face = captureLaptopFacePose(laptop)

    scrollStory.exit = {
        photoshop: photoshop && {
            position: photoshop.position.clone()
                .addScaledVector(right, narrow ? -3.6 : -5.4)
                .addScaledVector(lift, 0.55)
                .add(new THREE.Vector3(0, 0.35, 0)),
            rotation: new THREE.Euler(photoshop.rotation.x, photoshop.rotation.y - 0.45, photoshop.rotation.z),
        },
        figma: figma && {
            position: figma.position.clone()
                .addScaledVector(right, narrow ? -3.4 : -5.1)
                .addScaledVector(lift, 1.35)
                .add(new THREE.Vector3(0, 1.15, 0)),
            rotation: new THREE.Euler(figma.rotation.x, figma.rotation.y - 0.38, figma.rotation.z),
        },
    }

    world.position.set(0, 0, 0)
    world.scale.setScalar(1)
    world.quaternion.identity()
    world.visible = true
    renderer.domElement.style.opacity = "1"
    scrollStory.stageFade = 0
    scrollStory.linkFade = null
    scrollStory.leaveT = -1
    if (scrollIcons.photoshop) {
        scrollIcons.photoshop.visible = false
        scrollIcons.photoshop.userData.lastT = -1
        scrollIcons.photoshop.userData.smoothed = false
    }
    if (scrollIcons.figma) {
        scrollIcons.figma.visible = false
        scrollIcons.figma.userData.lastT = -1
        scrollIcons.figma.userData.smoothed = false
    }
    storyUi.lastKey = ""
    bindStoryUi()
    scrollStory.iconCatching = false
    scrollStory.dockK = 0

    scrollStory.enabled = true
    if (placed.cursor) {
        cine.cursorHome.copy(placed.cursor.position)
        cine.cursorHomeQ.copy(placed.cursor.quaternion)
        cine.cursorHomeScale.copy(placed.cursor.scale)
        captureCursorTip(placed.cursor)
    }
    applyScrollPose(scrollStory.smooth)
}

function lerpActor(object, home, pose, t) {
    if (!object || !home || !pose) return
    object.position.lerpVectors(home.position, pose.position, t)
    if (home.quaternion && pose.quaternion) {
        object.quaternion.slerpQuaternions(home.quaternion, pose.quaternion, t)
        object.rotation.setFromQuaternion(object.quaternion)
    } else {
        object.rotation.x = THREE.MathUtils.lerp(home.rotation.x, pose.rotation.x, t)
        object.rotation.y = THREE.MathUtils.lerp(home.rotation.y, pose.rotation.y, t)
        object.rotation.z = THREE.MathUtils.lerp(home.rotation.z, pose.rotation.z, t)
    }
}

function applyScrollPose(progress) {
    const home = scrollStory.home
    if (!home || !scrollStory.to) return

    const p = clamp01(progress)
    const sceneP = range(p, 0, STORY.sceneEnd)
    const leaveT = range(p, STORY.leaveStart, STORY.leaveEnd)

    const camT = remapEase(sceneP, 0, 0.48)
    camera.position.lerpVectors(home.cam, scrollStory.closeCam, camT)
    camTarget.lerpVectors(home.target, scrollStory.closeTarget, camT)
    camera.lookAt(camTarget)
    camera.updateMatrixWorld()

    if (sceneP < 1 || leaveT < 0.97) {
        lerpActor(
            placed.laptop,
            home.laptop,
            scrollStory.face || scrollStory.to.laptop,
            remapEase(sceneP, 0.4, 0.96)
        )
        const dockTarget = easeInOutCubic(range(sceneP, 0.02, 0.58))
        const nextDock = dampToward(scrollStory.dockK, dockTarget, scrollStory.dt || 1 / 60, 0.12)
        if (Math.abs(nextDock - dockTarget) > 0.0018) scrollStory.iconCatching = true
        scrollStory.dockK = nextDock
        applyCursorDock(scrollStory.dockK)

        const psExit = remapEase(sceneP, 0.05, 0.86)
        lerpActor(placed.photoshop, home.photoshop, scrollStory.exit?.photoshop, psExit)
        if (placed.photoshop) placed.photoshop.visible = psExit < 0.96

        const fgExit = remapEase(sceneP, 0.08, 0.9)
        lerpActor(placed.figma, home.figma, scrollStory.exit?.figma, fgExit)
        if (placed.figma) placed.figma.visible = fgExit < 0.96

        fadeStoryLinks(remapEase(sceneP, 0.08, 0.62))
    }

    slideMainScene(leaveT)
    const psT = range(p, STORY.psStart, STORY.psEnd)
    const fgT = range(p, STORY.fgStart, STORY.fgEnd)
    applyScrollIcons(psT, fgT)
    updateStoryOverlay(p, psT, fgT)

    world.visible = leaveT < 0.99
    const stageFade = smootherstep(range(p, 0.992, 1))
    if (Math.abs(stageFade - scrollStory.stageFade) > 0.004) {
        scrollStory.stageFade = stageFade
        renderer.domElement.style.opacity = String(1 - stageFade)
    }

    if (leaveT < 0.55) refreshLinks()
}

function updateScrollStory(dt) {
    if (!scrollStory.enabled) return false
    scrollStory.dt = dt
    const prev = scrollStory.smooth
    const follow = 1 - Math.exp(-dt * 11.2)
    scrollStory.smooth += (scrollStory.raw - scrollStory.smooth) * follow
    if (Math.abs(scrollStory.raw - scrollStory.smooth) < 0.00012) {
        scrollStory.smooth = scrollStory.raw
    }
    const moved = Math.abs(scrollStory.smooth - prev) >= 0.00005
    if (!moved && !scrollStory.iconCatching) return false
    scrollStory.iconCatching = false
    applyScrollPose(scrollStory.smooth)
    return true
}

async function buildScene() {
    placed = {}

    const jobs = [
        ["laptop", LAYOUT.laptop],
        ["photoshop", LAYOUT.photoshop],
        ["cursor", LAYOUT.cursor],
        ["figma", LAYOUT.figma],
    ]

    const loaded = await Promise.all(
        jobs.map(async ([key, layout]) => {
            try {
                const gltf = await loadFirstAvailable(MODELS[key])
                return { key, layout, gltf }
            } catch (error) {
                console.error(`Не удалось поставить ${key}`, error)
                return { key, layout, gltf: null }
            }
        })
    )

    for (const { key, layout, gltf } of loaded) {
        if (!gltf) continue
        try {
            enableShadows(gltf.scene)
            cheapenMaterials(gltf.scene)
            const iconClone =
                key === "photoshop" || key === "figma" ? gltf.scene.clone(true) : null
            if (key === "figma") saturateFigmaMaterials(gltf.scene)
            const wrapper = prepareModel(gltf.scene, layout)
            place(wrapper, layout, key)
            if (iconClone) {
                scrollIcons[key] = mountScrollIcon(iconClone, key)
            }
            if (key !== "figma") {
                const shadow = makeBlobShadow(layout.size * 1.15, layout.size * 0.85, layout.float ? 0.55 : 0.42)
                shadow.name = "blob-shadow"
                if (layout.float) {
                    shadow.position.y = -layout.position[1] + 0.004
                }
                wrapper.add(shadow)
            }
            placed[key] = wrapper

            if (key === "laptop") {
                try {
                    lcdPanel = await attachLaptopScreen(wrapper)
                } catch (error) {
                    console.warn("Не удалось наложить картинку на экран", error)
                }
                setupKeyboardInteraction(wrapper)
            }
        } catch (error) {
            console.error(`Не удалось поставить ${key}`, error)
        }
    }

    if (!placed.laptop && !placed.photoshop && !placed.cursor && !placed.figma) {
        throw new Error("Ни одна модель не загрузилась")
    }

    if (placed.laptop && placed.photoshop) {
        addLink(placed.laptop, placed.photoshop, 0.38, 0.28)
    }
    if (placed.laptop && placed.cursor) {
        addLink(placed.laptop, placed.cursor, 0.32, 0.22)
    }
    if (placed.laptop && placed.figma) {
        addLink(placed.laptop, placed.figma, 0.78, 0.02)
    }

    sceneReady = true
    needsRender = true
    bindStoryUi()
    if (cinematicRequested && !cine.active && !cine.done) {
        startCinematic()
    }
}

function facePanelTowardCamera(panel) {
    panel.updateWorldMatrix(true, false)
    const worldNormal = new THREE.Vector3(0, 0, 1).transformDirection(panel.matrixWorld)
    const worldPos = new THREE.Vector3()
    panel.getWorldPosition(worldPos)
    const toCamera = camera.position.clone().sub(worldPos)
    if (worldNormal.dot(toCamera) >= 0) return

    panel.rotateY(Math.PI)
    const localN = new THREE.Vector3(0, 0, 1).applyQuaternion(panel.quaternion)
    panel.position.addScaledVector(localN, 0.0004)
}

if (renderer && slot) {
    buildScene().catch((error) => {
        console.error(error)
    })
    bindSectionScroll()
}

let resizeTimer = 0
function resizeRenderer() {
    if (!renderer) return
    const view = viewSize()
    camera.aspect = view.aspect
    renderer.setPixelRatio(pickDpr())
    renderer.setSize(view.w, view.h, false)
    camera.updateProjectionMatrix()
    needsRender = true
}

window.addEventListener("resize", () => {
    resizeRenderer()
    storyUi.lastKey = ""
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
        if (!world.children.length || cine.active) {
            window.ScrollTrigger?.refresh?.()
            return
        }
        if (scrollStory.enabled) {
            window.ScrollTrigger?.refresh?.()
            applyScrollPose(scrollStory.smooth)
            needsRender = true
            return
        }
        frameWorld()
        if (lcdPanel) facePanelTowardCamera(lcdPanel)
        cine.endCam.copy(camera.position)
        cine.endTarget.copy(camTarget)
        window.ScrollTrigger?.refresh?.()
    }, 120)
})

if (slot && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resizeRenderer).observe(slot)
}

let lastFrame = performance.now()
let sectionOnScreen = true
const renderWatch = new IntersectionObserver(
    (entries) => {
        sectionOnScreen = entries.some((entry) => entry.isIntersecting)
        if (sectionOnScreen) needsRender = true
    },
    { root: null, rootMargin: "40% 0px", threshold: 0 }
)
if (sectionEl) renderWatch.observe(sectionEl)

function animate(now) {
    requestAnimationFrame(animate)
    if (!renderer) return
    const dt = Math.min(0.033, (now - lastFrame) / 1000)
    lastFrame = now
    if (document.hidden || (!sectionOnScreen && !cine.active)) return
    if (cine.active) {
        updateCinematic(dt)
        needsRender = true
    } else if (scrollStory.enabled) {
        if (updateScrollStory(dt)) needsRender = true
    }
    if (updateKeyboardInteraction(dt)) needsRender = true
    if (!needsRender) return
    if (!cine.active) camera.lookAt(camTarget)
    renderer.render(scene, camera)
    needsRender = cine.active || KEYBOARD.moving
}

if (renderer) requestAnimationFrame(animate)
