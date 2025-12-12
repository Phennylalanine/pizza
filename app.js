const toppingContainer = document.getElementById("topping-container");
const pizzaArea = document.getElementById("pizza-area");
const ingredientsPanel = document.getElementById("ingredients-panel");

let draggedIngredient = null;

// When dragging from ingredient list (desktop drag)
// NOTE: if your ingredient images are hosted cross-origin, add crossorigin="anonymous" to the <img>
// and make sure the server sends Access-Control-Allow-Origin so canvas can read pixels.
document.querySelectorAll("#ingredients-panel img").forEach(img => {
    img.addEventListener("dragstart", (e) => {
        draggedIngredient = e.target;
    });
});

// Utility: process an image via canvas and make near-white pixels transparent.
// Returns a Promise that resolves to a dataURL of the processed image.
function makeWhiteTransparent(src, {tolerance = 30, feather = 20, maxSize = 1024} = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // required for canvas pixel access if images are cross-origin
        img.onload = () => {
            // scale down large images for performance
            let w = img.width, h = img.height;
            const scale = Math.min(1, maxSize / Math.max(w, h));
            const cw = Math.max(1, Math.round(w * scale));
            const ch = Math.max(1, Math.round(h * scale));

            const canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, cw, ch);

            try {
                const imageData = ctx.getImageData(0, 0, cw, ch);
                const d = imageData.data;

                // We'll treat "distance from pure white" in RGB space and use a small feather
                // so anti-aliased edges gradually become transparent (smoother result).
                const hard = tolerance;   // distance <= hard -> fully transparent
                const soft = feather;     // extra range where alpha ramps up to original

                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
                    // Euclidean distance from white (255,255,255)
                    const dr = 255 - r, dg = 255 - g, db = 255 - b;
                    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

                    if (dist <= hard) {
                        d[i + 3] = 0; // fully transparent
                    } else if (dist <= hard + soft) {
                        // linearly blend alpha between 0 and original to soften edges
                        const t = (dist - hard) / soft; // 0..1
                        d[i + 3] = Math.round(a * t);
                    }
                    // else keep original alpha
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL());
            } catch (err) {
                // canvas can throw if image is tainted by CORS — fall back to original src
                reject(err);
            }
        };
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

// Allow dropping on pizza area
pizzaArea.addEventListener("dragover", (e) => {
    e.preventDefault();
});

pizzaArea.addEventListener("drop", async (e) => {
    if (!draggedIngredient) return;

    // Create a clone to place on pizza
    const newTopping = document.createElement("img");
    newTopping.classList.add("placed-topping");

    // Position relative to pizza area (we'll position by center)
    const rect = pizzaArea.getBoundingClientRect();
    newTopping.style.position = "absolute";
    newTopping.style.left = (e.clientX - rect.left) + "px"; // center x
    newTopping.style.top = (e.clientY - rect.top) + "px";  // center y
    newTopping.style.transform = "translate(-50%, -50%) rotate(0deg) scale(1)";
    newTopping.style.transformOrigin = "50% 50%";
    newTopping.style.touchAction = "none"; // allow custom touch handling
    newTopping.dataset.scale = "1";
    newTopping.dataset.rotation = "0";

    // Try to convert white to transparent. If that fails (CORS / other) fall back to original src.
    try {
        const processed = await makeWhiteTransparent(draggedIngredient.src, {tolerance: 30, feather: 18, maxSize: 800});
        newTopping.src = processed;
    } catch (err) {
        // If canvas access fails (usually CORS), just use original
        console.warn("Could not process image to transparent (CORS or other):", err);
        newTopping.src = draggedIngredient.src;
    }

    // Add draggable behavior for mouse
    newTopping.addEventListener("mousedown", startDrag);

    // Add touch gesture handlers for single-touch move and two-finger pinch/rotate
    addTouchGestureHandlers(newTopping);

    toppingContainer.appendChild(newTopping);
    draggedIngredient = null;
});

let activeTopping = null;
let mouseDragOffsetX = 0;
let mouseDragOffsetY = 0;

function startDrag(e) {
    if (!e.target.classList.contains("placed-topping")) return;

    activeTopping = e.target;

    const pizzaRect = pizzaArea.getBoundingClientRect();
    const center = getElementCenterInPizza(activeTopping, pizzaRect);

    mouseDragOffsetX = e.clientX - (pizzaRect.left + center.x);
    mouseDragOffsetY = e.clientY - (pizzaRect.top + center.y);

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDrag);
}

function drag(e) {
    if (!activeTopping) return;

    const rect = pizzaArea.getBoundingClientRect();
    const newX = e.clientX - rect.left - mouseDragOffsetX;
    const newY = e.clientY - rect.top - mouseDragOffsetY;

    activeTopping.style.left = newX + "px";
    activeTopping.style.top = newY + "px";
}

function stopDrag() {
    if (activeTopping) {
        // If the center of the topping is inside the ingredients panel, remove it.
        if (isCenterInsideElement(activeTopping, ingredientsPanel)) {
            activeTopping.remove();
        }
    }

    activeTopping = null;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
}

// --- Touch gesture handling (same as previous version) ---
function addTouchGestureHandlers(elem) {
    let ongoing = {
        mode: null,
        startTouches: null,
        startDist: 0,
        startAngle: 0,
        startScale: 1,
        startRotation: 0
    };

    const MIN_SCALE = 0.5;
    const MAX_SCALE = 3.0;
    const ROTATION_SNAP_DEGREES = 15;
    const SNAP_ON_END = true;

    elem.addEventListener("touchstart", (ev) => {
        ev.preventDefault();
        const touches = ev.touches;

        if (touches.length === 1) {
            ongoing.mode = "drag";
            const touch = touches[0];
            const pizzaRect = pizzaArea.getBoundingClientRect();
            const center = getElementCenterInPizza(elem, pizzaRect);
            ongoing.dragOffsetX = touch.clientX - (pizzaRect.left + center.x);
            ongoing.dragOffsetY = touch.clientY - (pizzaRect.top + center.y);
        } else if (touches.length === 2) {
            ongoing.mode = "gesture";
            ongoing.startTouches = [copyTouch(touches[0]), copyTouch(touches[1])];
            ongoing.startDist = getDistance(touches[0], touches[1]);
            ongoing.startAngle = getAngleDeg(touches[0], touches[1]);
            ongoing.startScale = parseFloat(elem.dataset.scale || "1");
            ongoing.startRotation = parseFloat(elem.dataset.rotation || "0");
        }
    }, {passive: false});

    elem.addEventListener("touchmove", (ev) => {
        ev.preventDefault();
        const touches = ev.touches;
        const pizzaRect = pizzaArea.getBoundingClientRect();

        if (ongoing.mode === "drag" && touches.length === 1) {
            const touch = touches[0];
            const newX = touch.clientX - pizzaRect.left - ongoing.dragOffsetX;
            const newY = touch.clientY - pizzaRect.top - ongoing.dragOffsetY;
            elem.style.left = newX + "px";
            elem.style.top = newY + "px";
        } else if (ongoing.mode === "gesture" && touches.length >= 2) {
            const dist = getDistance(touches[0], touches[1]);
            const angle = getAngleDeg(touches[0], touches[1]);
            if (ongoing.startDist === 0) return;
            let scale = ongoing.startScale * (dist / ongoing.startDist);
            scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

            let rotation = ongoing.startRotation + (angle - ongoing.startAngle);

            const mid = getMidpoint(touches[0], touches[1]);
            const newCenterX = mid.clientX - pizzaRect.left;
            const newCenterY = mid.clientY - pizzaRect.top;
            elem.style.left = newCenterX + "px";
            elem.style.top = newCenterY + "px";

            elem.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
            elem.dataset.scale = String(scale);
            elem.dataset.rotation = String(rotation);
        }
    }, {passive: false});

    elem.addEventListener("touchend", (ev) => {
        // if gesture ended, optionally snap rotation to nice angles for kids
        if (SNAP_ON_END && ongoing.mode === "gesture") {
            let rotation = parseFloat(elem.dataset.rotation || "0");
            rotation = Math.round(rotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES;
            elem.dataset.rotation = String(rotation);
            const scale = parseFloat(elem.dataset.scale || "1");
            elem.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
        }

        // If user finished a drag (no remaining touches), check whether to delete.
        if (ev.touches.length === 0) {
            if (ongoing.mode === "drag") {
                if (isCenterInsideElement(elem, ingredientsPanel)) {
                    elem.remove();
                }
            }
            ongoing.mode = null;
            ongoing.startTouches = null;
            ongoing.startDist = 0;
            ongoing.startAngle = 0;
        } else if (ev.touches.length === 1) {
            // if user lifts one finger and one remains, switch to drag mode
            ongoing.mode = "drag";
            const touch = ev.touches[0];
            const pizzaRect = pizzaArea.getBoundingClientRect();
            const center = getElementCenterInPizza(elem, pizzaRect);
            ongoing.dragOffsetX = touch.clientX - (pizzaRect.left + center.x);
            ongoing.dragOffsetY = touch.clientY - (pizzaRect.top + center.y);
        }
    }, {passive: false});
}

// --- Utility helpers ---
function copyTouch(t) {
    return { identifier: t.identifier, clientX: t.clientX, clientY: t.clientY };
}

function getDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
}

function getAngleDeg(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
}

function getMidpoint(t1, t2) {
    return {
        clientX: (t1.clientX + t2.clientX) / 2,
        clientY: (t1.clientY + t2.clientY) / 2
    };
}

// returns the element center relative to pizzaArea top-left {x,y}
function getElementCenterInPizza(elem, pizzaRect) {
    const b = elem.getBoundingClientRect();
    const centerX = (b.left - pizzaRect.left) + (b.width / 2);
    const centerY = (b.top - pizzaRect.top) + (b.height / 2);
    // If element was positioned by left/top as pixel centers, prefer those values:
    if (elem.style.left) {
        const parsedLeft = parseFloat(elem.style.left);
        const parsedTop = parseFloat(elem.style.top);
        if (!isNaN(parsedLeft) && !isNaN(parsedTop)) {
            return { x: parsedLeft, y: parsedTop };
        }
    }
    return { x: centerX, y: centerY };
}

// returns true if the element's visual center (page coordinates) is inside the containerElem
function isCenterInsideElement(elem, containerElem) {
    if (!elem || !containerElem) return false;
    const b = elem.getBoundingClientRect();
    const centerX = b.left + (b.width / 2);
    const centerY = b.top + (b.height / 2);
    const c = containerElem.getBoundingClientRect();
    return centerX >= c.left && centerX <= c.right && centerY >= c.top && centerY <= c.bottom;
}
