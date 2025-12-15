const toppingContainer = document.getElementById("topping-container");
const pizzaArea = document.getElementById("pizza-area");
const ingredientsPanel = document.getElementById("ingredients-panel");

const btnBigger = document.getElementById("btn-bigger");
const btnSmaller = document.getElementById("btn-smaller");
const btnRotate = document.getElementById("btn-rotate");

let draggedIngredient = null;
let activeTopping = null;

// =======================
// INGREDIENT DRAG START
// =======================
document.querySelectorAll("#ingredients-panel img").forEach(img => {
  img.addEventListener("dragstart", (e) => {
    draggedIngredient = e.target;
  });
});

// =======================
// DROP ON PIZZA
// =======================
pizzaArea.addEventListener("dragover", e => e.preventDefault());

pizzaArea.addEventListener("drop", async (e) => {
  if (!draggedIngredient) return;

  const newTopping = document.createElement("img");
  newTopping.className = "placed-topping";

  const rect = pizzaArea.getBoundingClientRect();
  newTopping.style.left = (e.clientX - rect.left) + "px";
  newTopping.style.top = (e.clientY - rect.top) + "px";
  newTopping.style.position = "absolute";
  newTopping.style.transform = "translate(-50%, -50%) scale(1) rotate(0deg)";
  newTopping.dataset.scale = "1";
  newTopping.dataset.rotation = "0";

  newTopping.src = draggedIngredient.src;

  // select topping on click / tap
  newTopping.addEventListener("mousedown", selectTopping);
  newTopping.addEventListener("touchstart", selectTopping);

  // drag support
  newTopping.addEventListener("mousedown", startDrag);
  newTopping.addEventListener("touchstart", startTouchDrag, { passive: false });

  toppingContainer.appendChild(newTopping);
  draggedIngredient = null;
});

// =======================
// SELECT TOPPING
// =======================
function selectTopping(e) {
  e.stopPropagation();
  document.querySelectorAll(".placed-topping").forEach(t => t.classList.remove("active"));
  activeTopping = e.currentTarget;
  activeTopping.classList.add("active");
}

// deselect when tapping pizza base
pizzaArea.addEventListener("mousedown", () => clearSelection());
pizzaArea.addEventListener("touchstart", () => clearSelection());

function clearSelection() {
  document.querySelectorAll(".placed-topping").forEach(t => t.classList.remove("active"));
  activeTopping = null;
}

// =======================
// BUTTON CONTROLS
// =======================
btnBigger.addEventListener("click", () => resizeTopping(1.1));
btnSmaller.addEventListener("click", () => resizeTopping(0.9));
btnRotate.addEventListener("click", rotateTopping);

function resizeTopping(factor) {
  if (!activeTopping) return;
  let scale = parseFloat(activeTopping.dataset.scale);
  scale = Math.max(0.5, Math.min(3, scale * factor));
  activeTopping.dataset.scale = scale;
  updateTransform(activeTopping);
}

function rotateTopping() {
  if (!activeTopping) return;
  let rotation = parseFloat(activeTopping.dataset.rotation);
  rotation += 15;
  activeTopping.dataset.rotation = rotation;
  updateTransform(activeTopping);
}

function updateTransform(elem) {
  const scale = elem.dataset.scale;
  const rotation = elem.dataset.rotation;
  elem.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;
}

// =======================
// DRAG WITH MOUSE
// =======================
let offsetX = 0;
let offsetY = 0;

function startDrag(e) {
  selectTopping(e);

  const rect = pizzaArea.getBoundingClientRect();
  offsetX = e.clientX - (rect.left + parseFloat(activeTopping.style.left));
  offsetY = e.clientY - (rect.top + parseFloat(activeTopping.style.top));

  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
}

function drag(e) {
  if (!activeTopping) return;
  const rect = pizzaArea.getBoundingClientRect();
  activeTopping.style.left = (e.clientX - rect.left - offsetX) + "px";
  activeTopping.style.top = (e.clientY - rect.top - offsetY) + "px";
}

function stopDrag() {
  if (activeTopping && isCenterInside(activeTopping, ingredientsPanel)) {
    activeTopping.remove();
    activeTopping = null;
  }
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", stopDrag);
}

// =======================
// TOUCH DRAG
// =======================
function startTouchDrag(e) {
  e.preventDefault();
  selectTopping(e);

  const touch = e.touches[0];
  const rect = pizzaArea.getBoundingClientRect();
  offsetX = touch.clientX - (rect.left + parseFloat(activeTopping.style.left));
  offsetY = touch.clientY - (rect.top + parseFloat(activeTopping.style.top));

  document.addEventListener("touchmove", touchDrag, { passive: false });
  document.addEventListener("touchend", stopTouchDrag);
}

function touchDrag(e) {
  if (!activeTopping) return;
  const touch = e.touches[0];
  const rect = pizzaArea.getBoundingClientRect();
  activeTopping.style.left = (touch.clientX - rect.left - offsetX) + "px";
  activeTopping.style.top = (touch.clientY - rect.top - offsetY) + "px";
}

function stopTouchDrag() {
  if (activeTopping && isCenterInside(activeTopping, ingredientsPanel)) {
    activeTopping.remove();
    activeTopping = null;
  }
  document.removeEventListener("touchmove", touchDrag);
  document.removeEventListener("touchend", stopTouchDrag);
}

// =======================
// UTILITY
// =======================
function isCenterInside(elem, container) {
  const b = elem.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const cx = b.left + b.width / 2;
  const cy = b.top + b.height / 2;
  return cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom;
}
