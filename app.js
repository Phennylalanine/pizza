const toppingContainer = document.getElementById("topping-container");
const pizzaArea = document.getElementById("pizza-area");
const ingredientsPanel = document.getElementById("ingredients-panel");

const btnBigger = document.getElementById("btn-bigger");
const btnSmaller = document.getElementById("btn-smaller");
const btnRotate = document.getElementById("btn-rotate");

const sauceCanvas = document.getElementById("sauce-canvas");
const sauceCtx = sauceCanvas.getContext("2d");

let draggedIngredient = null;
let activeTopping = null;
let sauceMode = false;
let painting = false;

const SAUCE_BRUSH_SIZE = 24;

/* =========================
   SETUP SAUCE CANVAS
========================= */
const baseImg = document.getElementById("pizza-base");
const maskImg = new Image();
maskImg.src = "images/pizza-mask.png";

baseImg.onload = () => {
  sauceCanvas.width = baseImg.clientWidth;
  sauceCanvas.height = baseImg.clientHeight;
  sauceCanvas.style.position = "absolute";
  sauceCanvas.style.left = baseImg.offsetLeft + "px";
  sauceCanvas.style.top = baseImg.offsetTop + "px";
  sauceCanvas.style.pointerEvents = "none";
};

/* =========================
   WHITE → TRANSPARENT
========================= */
function makeWhiteTransparent(src, tolerance = 30) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < data.data.length; i += 4) {
        const r = data.data[i];
        const g = data.data[i + 1];
        const b = data.data[i + 2];
        if (Math.abs(255 - r) < tolerance &&
            Math.abs(255 - g) < tolerance &&
            Math.abs(255 - b) < tolerance) {
          data.data[i + 3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
      resolve(c.toDataURL());
    };
    img.onerror = reject;
    img.src = src;
  });
}

/* =========================
   INGREDIENT DRAG
========================= */
document.querySelectorAll("#ingredients-panel img").forEach(img => {
  img.addEventListener("dragstart", e => {
    draggedIngredient = e.target;
    sauceMode = img.dataset.type === "sauce";
    sauceCanvas.style.pointerEvents = sauceMode ? "auto" : "none";
  });
});

/* =========================
   DROP HANDLER
========================= */
pizzaArea.addEventListener("dragover", e => e.preventDefault());

pizzaArea.addEventListener("drop", async e => {
  if (!draggedIngredient) return;

  if (sauceMode) {
    draggedIngredient = null;
    return;
  }

  const newTopping = document.createElement("img");
  newTopping.className = "placed-topping";

  const rect = pizzaArea.getBoundingClientRect();
  newTopping.style.left = (e.clientX - rect.left) + "px";
  newTopping.style.top = (e.clientY - rect.top) + "px";
  newTopping.style.position = "absolute";
  newTopping.style.transform = "translate(-50%, -50%) scale(1) rotate(0deg)";
  newTopping.dataset.scale = "1";
  newTopping.dataset.rotation = "0";

  try {
    newTopping.src = await makeWhiteTransparent(draggedIngredient.src);
  } catch {
    newTopping.src = draggedIngredient.src;
  }

  newTopping.addEventListener("mousedown", selectTopping);
  newTopping.addEventListener("touchstart", selectTopping);
  newTopping.addEventListener("mousedown", startDrag);
  newTopping.addEventListener("touchstart", startTouchDrag, { passive: false });

  toppingContainer.appendChild(newTopping);
  draggedIngredient = null;
});

/* =========================
   SAUCE PAINTING
========================= */
sauceCanvas.addEventListener("pointerdown", e => {
  if (!sauceMode) return;
  painting = true;
  paintSauce(e);
});

sauceCanvas.addEventListener("pointermove", e => {
  if (painting) paintSauce(e);
});

window.addEventListener("pointerup", () => painting = false);

function paintSauce(e) {
  const rect = sauceCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  sauceCtx.globalCompositeOperation = "source-over";
  sauceCtx.fillStyle = "rgba(200,0,0,0.5)";
  sauceCtx.beginPath();
  sauceCtx.arc(x, y, SAUCE_BRUSH_SIZE, 0, Math.PI * 2);
  sauceCtx.fill();

  sauceCtx.globalCompositeOperation = "destination-in";
  sauceCtx.drawImage(maskImg, 0, 0, sauceCanvas.width, sauceCanvas.height);
  sauceCtx.globalCompositeOperation = "source-over";
}

/* =========================
   TOPPING SELECTION
========================= */
function selectTopping(e) {
  e.stopPropagation();
  document.querySelectorAll(".placed-topping").forEach(t => t.classList.remove("active"));
  activeTopping = e.currentTarget;
  activeTopping.classList.add("active");
}

pizzaArea.addEventListener("mousedown", () => activeTopping = null);

/* =========================
   BUTTON CONTROLS
========================= */
btnBigger.onclick = () => resize(1.1);
btnSmaller.onclick = () => resize(0.9);
btnRotate.onclick = () => rotate();

function resize(f) {
  if (!activeTopping) return;
  let s = parseFloat(activeTopping.dataset.scale);
  s = Math.max(0.5, Math.min(3, s * f));
  activeTopping.dataset.scale = s;
  updateTransform();
}

function rotate() {
  if (!activeTopping) return;
  activeTopping.dataset.rotation = parseFloat(activeTopping.dataset.rotation) + 15;
  updateTransform();
}

function updateTransform() {
  activeTopping.style.transform =
    `translate(-50%, -50%) scale(${activeTopping.dataset.scale}) rotate(${activeTopping.dataset.rotation}deg)`;
}

/* =========================
   DRAGGING
========================= */
let offsetX = 0, offsetY = 0;

function startDrag(e) {
  selectTopping(e);
  const r = pizzaArea.getBoundingClientRect();
  offsetX = e.clientX - (r.left + parseFloat(activeTopping.style.left));
  offsetY = e.clientY - (r.top + parseFloat(activeTopping.style.top));
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
}

function drag(e) {
  if (!activeTopping) return;
  const r = pizzaArea.getBoundingClientRect();
  activeTopping.style.left = (e.clientX - r.left - offsetX) + "px";
  activeTopping.style.top = (e.clientY - r.top - offsetY) + "px";
}

function stopDrag() {
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", stopDrag);
}

function startTouchDrag(e) {
  e.preventDefault();
  selectTopping(e);
  const t = e.touches[0];
  const r = pizzaArea.getBoundingClientRect();
  offsetX = t.clientX - (r.left + parseFloat(activeTopping.style.left));
  offsetY = t.clientY - (r.top + parseFloat(activeTopping.style.top));
  document.addEventListener("touchmove", touchDrag, { passive: false });
  document.addEventListener("touchend", () => {
    document.removeEventListener("touchmove", touchDrag);
  });
}

function touchDrag(e) {
  const t = e.touches[0];
  const r = pizzaArea.getBoundingClientRect();
  activeTopping.style.left = (t.clientX - r.left - offsetX) + "px";
  activeTopping.style.top = (t.clientY - r.top - offsetY) + "px";
}
