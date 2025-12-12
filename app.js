// Ingredient selection, rotation by +30° and resizing by ±15% per click.
// Assumes ingredient elements are <img class="ingredient"> and are
// positioned (absolute) over the crust. Controls use images rotate.jpg, bigger.png, smaller.png.

// Config
const ROTATE_STEP_DEG = 30;
const SCALE_STEP = 1.15; // multiply/divide by this factor
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

let selectedIngredient = null;

// Helper: ensure each ingredient has transform state stored in dataset
function ensureState(el) {
  if (!el) return;
  if (!el.dataset.rotation) el.dataset.rotation = '0';
  if (!el.dataset.scale) el.dataset.scale = '1';
}

function applyTransforms(el) {
  if (!el) return;
  ensureState(el);
  const rotation = parseFloat(el.dataset.rotation) || 0;
  const scale = parseFloat(el.dataset.scale) || 1;
  // Order: rotate then scale. Using rotate(...) scale(...).
  el.style.transform = `rotate(${rotation}deg) scale(${scale})`;
}

// Select an ingredient (called on click)
function selectIngredient(el) {
  if (selectedIngredient) selectedIngredient.classList.remove('selected-ingredient');
  selectedIngredient = el;
  if (selectedIngredient) selectedIngredient.classList.add('selected-ingredient');
  ensureState(selectedIngredient);
}

// Rotate selected ingredient by step degrees
function rotateSelected(stepDeg = ROTATE_STEP_DEG) {
  if (!selectedIngredient) return;
  ensureState(selectedIngredient);
  let rotation = parseFloat(selectedIngredient.dataset.rotation) || 0;
  rotation = (rotation + stepDeg) % 360;
  // keep positive
  if (rotation < 0) rotation += 360;
  selectedIngredient.dataset.rotation = String(rotation);
  applyTransforms(selectedIngredient);
}

// Resize selected ingredient by multiplicative factor
function resizeSelected(factor) {
  if (!selectedIngredient) return;
  ensureState(selectedIngredient);
  let scale = parseFloat(selectedIngredient.dataset.scale) || 1;
  scale = scale * factor;
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  selectedIngredient.dataset.scale = String(scale);
  applyTransforms(selectedIngredient);
}

// Hook up controls
function setupControls() {
  const rotateBtn = document.getElementById('rotate-btn');
  const biggerBtn = document.getElementById('bigger-btn');
  const smallerBtn = document.getElementById('smaller-btn');

  rotateBtn?.addEventListener('click', () => rotateSelected(ROTATE_STEP_DEG));
  biggerBtn?.addEventListener('click', () => resizeSelected(SCALE_STEP));
  smallerBtn?.addEventListener('click', () => resizeSelected(1 / SCALE_STEP));
}

// Attach click handlers to existing ingredient elements
function wireIngredients() {
  const ingredients = document.querySelectorAll('.ingredient');
  ingredients.forEach((img) => {
    // Ensure we can store state and apply transforms even if none yet
    ensureState(img);
    applyTransforms(img);

    // When clicked, become the selected ingredient
    img.style.cursor = 'pointer';
    img.addEventListener('click', (ev) => {
      ev.stopPropagation(); // prevent clicks from bubbling to pizza area
      selectIngredient(img);
    });
  });

  // Clicking outside deselects
  document.addEventListener('click', (ev) => {
    // if clicked outside an ingredient, clear selection
    if (!ev.target.closest('.ingredient')) {
      if (selectedIngredient) {
        selectedIngredient.classList.remove('selected-ingredient');
        selectedIngredient = null;
      }
    }
  });
}

// If ingredients are added dynamically, expose a helper to register them.
function registerIngredient(element) {
  if (!element) return;
  element.classList.add('ingredient');
  ensureState(element);
  applyTransforms(element);
  element.style.cursor = 'pointer';
  element.addEventListener('click', (ev) => {
    ev.stopPropagation();
    selectIngredient(element);
  });
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setupControls();
  wireIngredients();
});

// Export registerIngredient for other scripts that create ingredients dynamically
window.PizzaControls = {
  registerIngredient,
  rotateSelected,
  resizeSelected,
  selectIngredient,
};
