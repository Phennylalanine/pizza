const toppingContainer = document.getElementById("topping-container");
const pizzaArea = document.getElementById("pizza-area");

let draggedIngredient = null;

// When dragging from ingredient list
document.querySelectorAll("#ingredients-panel img").forEach(img => {
    img.addEventListener("dragstart", (e) => {
        draggedIngredient = e.target;
    });
});

// Allow dropping on pizza area
pizzaArea.addEventListener("dragover", (e) => {
    e.preventDefault();
});

pizzaArea.addEventListener("drop", (e) => {
    if (!draggedIngredient) return;

    // Create a clone to place on pizza
    const newTopping = document.createElement("img");
    newTopping.src = draggedIngredient.src;
    newTopping.classList.add("placed-topping");

    // Position relative to pizza area
    const rect = pizzaArea.getBoundingClientRect();
    newTopping.style.left = (e.clientX - rect.left - 40) + "px";
    newTopping.style.top = (e.clientY - rect.top - 40) + "px";

    // Add draggable behavior
    newTopping.addEventListener("mousedown", startDrag);

    toppingContainer.appendChild(newTopping);
    draggedIngredient = null;
});

let activeTopping = null;
let offsetX = 0;
let offsetY = 0;

function startDrag(e) {
    activeTopping = e.target;
    offsetX = e.offsetX;
    offsetY = e.offsetY;

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
    activeTopping = null;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
}
