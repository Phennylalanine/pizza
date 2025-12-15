const toppingContainer = document.getElementById("topping-container");
const pizzaArea = document.getElementById("pizza-area");
const ingredientsPanel = document.getElementById("ingredients-panel");

const btnBigger = document.getElementById("btn-bigger");
const btnSmaller = document.getElementById("btn-smaller");
const btnRotate = document.getElementById("btn-rotate");

let draggedIngredient = null;
let activeTopping = null;

/* ============================
   WHITE → TRANSPARENT FILTER
============================ */
function makeWhiteTransparent(src, tolerance = 30, feather = 20, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      w *= scale;
      h *= scale;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      try {
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];

          const dist = Math.sqrt(
            (255 - r) ** 2 +
            (255 - g) ** 2 +
            (255 - b) ** 2
          );

          if (dist < tolerance) {
            d[i + 3] = 0;
          } else if (dist < tolerance + feather) {
            d[i + 3] *= (dist - tolerance) / feather;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = reject;
    img.src = src;
  });
}

/* ============================
   INGREDIENT DRAG
============================ */
document.querySelectorAll("#ingredients-panel img").forEach(img => {
  img.addEventListener("dragstart", e => {
    draggedIngredient = e.target;
  });
});

/* ============================
   DROP ON PIZZA
============================ */
pizzaArea.addEventListener("dragover", e => e.preventDefault());

pizzaArea.addEventListener("drop", async (e) => {
  if (!draggedIngredient) return;

  const newTopping = document.createElement("img");
  newTopping.className = "placed-topping";

  const rect = pizzaArea.getBoundingClientRect();
  newTopping.style.position = "absolute";
  newTopping.style.left = (e.clientX - rect.left) + "px";
  newTopping.style.top = (e.clientY - rect.top) + "px";
  newTopping.style.transform = "translate(-50%, -50%) scale(1) rotate(0deg)";

  newTopping.dataset.scale = "1";
  newTopping.dataset.rotation = "0";

  /* 🔥 AUTO REMOVE WHITE BACKGROUND */
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

/* ============================
   SELECT / DESELECT
============================ */
function selectTopping(e) {
  e.stopPropagation();
  document.querySelectorAll(".placed-topping").forEach(t => t.classList.remove("active"));
  activeTopping = e.currentTarget;
  activeTopping.classList.add("active");
}

pizzaArea.addEventListener("mousedown", clearSelection);
pizzaArea.addEventListener("touchstart", clearSelection);

function clearSelection() {
  document.querySelectorAll(".placed-topping").forEach(t => t.classList.remove("active"));
  activeTopping = null;
}

/* ============================
   BUTTON CONTROLS
============================ */
btnBigger.onclick = () => resizeTopping(1.1);
btnSmaller.onclick = () => resizeTopping(0.9);
btnRotate.onclick = () => rotateTopping();

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
  elem.style.transform =
    `translate(-50%, -50%) scale(${elem.dataset.scale}) rotate(${elem.dataset.rotation}deg)`;
}

/* ============================
   MOUSE DRAG
============================ */
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
  deleteIfInPanel();
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", stopDrag);
}

/* ============================
   TOUCH DRAG
============================ */
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
  deleteIfInPanel();
  document.removeEventListener("touchmove", touchDrag);
  document.removeEventListener("touchend", stopTouchDrag);
}

/* ============================
   DELETE IF DRAGGED BACK
============================ */
function deleteIfInPanel() {
  if (!activeTopping) return;
  const b = activeTopping.getBoundingClientRect();
  const c = ingredientsPanel.getBoundingClientRect();
  const cx = b.left + b.width / 2;
  const cy = b.top + b.height / 2;

  if (cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom) {
    activeTopping.remove();
    activeTopping = null;
  }
}
