#controls {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  z-index: 1000;
}

#controls img {
  width: 64px;
  height: 64px;
  cursor: pointer;
}

.placed-topping.active {
  outline: 3px dashed #ff9800;
}
