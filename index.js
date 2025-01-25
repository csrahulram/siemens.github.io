
("use strict");

// Utility functions grouped into a single object
const Utils = {
  // Parse pixel values to numeric values
  parsePx: (value) => parseFloat(value.replace(/px/, "")),

  // Generate a random number between two values, optionally with a fixed precision
  getRandomInRange: (min, max, precision = 0) => {
    const multiplier = Math.pow(10, precision);
    const randomValue = Math.random() * (max - min) + min;
    return Math.floor(randomValue * multiplier) / multiplier;
  },

  // Pick a random item from an array
  getRandomItem: (array) => array[Math.floor(Math.random() * array.length)],

  // Scaling factor based on screen width
  getScaleFactor: () => Math.log(window.innerWidth) / Math.log(1920),

  // Debounce function to limit event firing frequency
  debounce: (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  },
};

// Precomputed constants
const DEG_TO_RAD = Math.PI / 180;

// Centralized configuration for default values
const defaultConfettiConfig = {
  confettiesNumber: 100,
  confettiRadius: 4,
  confettiColors: [
    "#fcf403",
    "#62fc03",
    "#f4fc03",
    "#03e7fc",
    "#03fca5",
    "#a503fc",
    "#fc03ad",
    "#fc03c2",
  ],
  emojies: [],
  svgIcon: null, // Example SVG link
};

// Confetti class representing individual confetti pieces
class Confetti {
  constructor({ initialPosition, direction, radius, colors, emojis, svgIcon }) {
    const speedFactor =
      Utils.getRandomInRange(0.9, 1.7, 3) * Utils.getScaleFactor();
    this.speed = { x: speedFactor, y: speedFactor };
    this.finalSpeedX = Utils.getRandomInRange(0.2, 0.6, 3);
    this.rotationSpeed =
      emojis.length || svgIcon
        ? 0.01
        : Utils.getRandomInRange(0.03, 0.07, 3) * Utils.getScaleFactor();
    this.dragCoefficient = Utils.getRandomInRange(0.0005, 0.0009, 6);
    this.radius = { x: radius, y: radius };
    this.initialRadius = radius;
    this.rotationAngle =
      direction === "left"
        ? Utils.getRandomInRange(0, 0.2, 3)
        : Utils.getRandomInRange(-0.2, 0, 3);
    this.emojiRotationAngle = Utils.getRandomInRange(0, 2 * Math.PI);
    this.radiusYDirection = "down";

    const angle =
      direction === "left"
        ? Utils.getRandomInRange(82, 15) * DEG_TO_RAD
        : Utils.getRandomInRange(-15, -82) * DEG_TO_RAD;
    this.absCos = Math.abs(Math.cos(angle));
    this.absSin = Math.abs(Math.sin(angle));

    const offset = Utils.getRandomInRange(-150, 0);
    const position = {
      x:
        initialPosition.x +
        (direction === "left" ? -offset : offset) * this.absCos,
      y: initialPosition.y - offset * this.absSin,
    };

    this.position = { ...position };
    this.initialPosition = { ...position };
    this.color = emojis.length || svgIcon ? null : Utils.getRandomItem(colors);
    this.emoji = emojis.length ? Utils.getRandomItem(emojis) : null;
    this.svgIcon = null;

    // Preload SVG if provided
    if (svgIcon) {
      this.svgImage = new Image();
      this.svgImage.src = svgIcon;
      this.svgImage.onload = () => {
        this.svgIcon = this.svgImage; // Mark as ready once loaded
      };
    }

    this.createdAt = Date.now();
    this.direction = direction;
  }

  draw(context) {
    const { x, y } = this.position;
    const { x: radiusX, y: radiusY } = this.radius;
    const scale = window.devicePixelRatio;

    if (this.svgIcon) {
      context.save();
      context.translate(scale * x, scale * y);
      context.rotate(this.emojiRotationAngle);
      context.drawImage(
        this.svgIcon,
        -radiusX,
        -radiusY,
        radiusX * 2,
        radiusY * 2
      );
      context.restore();
    } else if (this.color) {
      context.fillStyle = this.color;
      context.beginPath();
      context.ellipse(
        x * scale,
        y * scale,
        radiusX * scale,
        radiusY * scale,
        this.rotationAngle,
        0,
        2 * Math.PI
      );
      context.fill();
    } else if (this.emoji) {
      context.font = `${radiusX * scale}px serif`;
      context.save();
      context.translate(scale * x, scale * y);
      context.rotate(this.emojiRotationAngle);
      context.textAlign = "center";
      context.fillText(this.emoji, 0, radiusY / 2); // Adjust vertical alignment
      context.restore();
    }
  }

  updatePosition(deltaTime, currentTime) {
    const elapsed = currentTime - this.createdAt;

    if (this.speed.x > this.finalSpeedX) {
      this.speed.x -= this.dragCoefficient * deltaTime;
    }

    this.position.x +=
      this.speed.x *
      (this.direction === "left" ? -this.absCos : this.absCos) *
      deltaTime;
    this.position.y =
      this.initialPosition.y -
      this.speed.y * this.absSin * elapsed +
      (0.00125 * Math.pow(elapsed, 2)) / 2;

    if (!this.emoji && !this.svgIcon) {
      this.rotationSpeed -= 1e-5 * deltaTime;
      this.rotationSpeed = Math.max(this.rotationSpeed, 0);

      if (this.radiusYDirection === "down") {
        this.radius.y -= deltaTime * this.rotationSpeed;
        if (this.radius.y <= 0) {
          this.radius.y = 0;
          this.radiusYDirection = "up";
        }
      } else {
        this.radius.y += deltaTime * this.rotationSpeed;
        if (this.radius.y >= this.initialRadius) {
          this.radius.y = this.initialRadius;
          this.radiusYDirection = "down";
        }
      }
    }
  }

  isVisible(canvasHeight) {
    return this.position.y < canvasHeight + 100;
  }
}

class ConfettiManager {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style =
      "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; pointer-events: none;";
    document.body.getElementsByClassName("content")[0].appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.confetti = [];
    this.lastUpdated = Date.now();
    window.addEventListener(
      "resize",
      Utils.debounce(() => this.resizeCanvas(), 200)
    );
    this.resizeCanvas();
    requestAnimationFrame(() => this.loop());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  addConfetti(config = {}) {
    const {
      confettiesNumber,
      confettiRadius,
      confettiColors,
      emojies,
      svgIcon,
    } = {
      ...defaultConfettiConfig,
      ...config,
    };

    const baseY = (5 * window.innerHeight) / 7;
    for (let i = 0; i < confettiesNumber / 2; i++) {
      this.confetti.push(
        new Confetti({
          initialPosition: { x: 0, y: baseY },
          direction: "right",
          radius: confettiRadius,
          colors: confettiColors,
          emojis: emojies,
          svgIcon,
        })
      );
      this.confetti.push(
        new Confetti({
          initialPosition: { x: window.innerWidth, y: baseY },
          direction: "left",
          radius: confettiRadius,
          colors: confettiColors,
          emojis: emojies,
          svgIcon,
        })
      );
    }
  }

  resetAndStart(config = {}) {
    // Clear existing confetti
    this.confetti = [];
    // Add new confetti
    this.addConfetti(config);
  }

  loop() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdated;
    this.lastUpdated = currentTime;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.confetti = this.confetti.filter((item) => {
      item.updatePosition(deltaTime, currentTime);
      item.draw(this.context);
      return item.isVisible(this.canvas.height);
    });

    requestAnimationFrame(() => this.loop());
  }
}


// Declaration of elements

let title = document.getElementsByClassName("title")[0];
let description = document.getElementsByClassName("description")[0];
let content = document.getElementsByClassName("content")[0];
let button = document.getElementsByClassName("button")[0];
let effects = document.getElementsByClassName("effects")[0];
let feedback = document.getElementsByClassName("feedback")[0];
let thankyou = document.getElementsByClassName("thankyou")[0];
let pin = document.getElementsByClassName("pin")[0];
let emojies = [];
let secret = '0000';
var onlongtouch;
var timer;
var touchduration = 3000; //length of time we want the user to touch before we do something
const manager = new ConfettiManager();

//Library functions

function touchstart() {
  timer = setTimeout(gotoPin, touchduration);
}

function touchend() {
  //stops short touches from firing the event
  if (timer)
    clearTimeout(timer); // clearTimeout, not cleartimeout..
}

function autoTab(current, next) {
  if (current.value.length === current.maxLength) {
    next.focus();
  }
}

function submitFeedback() {
  effects.style.display = "block";
  thankyou.style.display = "block";

  if (usrFeedback === 4) {
    manager.addConfetti();
  }

  setTimeout(() => {
    title.classList.remove("fadein");
    description.classList.remove("fadein");
    effects.style.display = "none";
    // disableButton();
    gotoThankyou();
  }, 1500);
}

function init() {
  for (var i = 0; i < 5; i++) {
    let emoji = document.getElementsByClassName("emoji-item")[i];
    emojies.push(emoji);
    setTimeout(() => {
      if (emoji) {
        emoji.classList.add("fadeup");
      }

    }, i * 100);
  }

  title.addEventListener("click", toogleFullScreen);
  button.addEventListener("click", submitFeedback);

  document.body.ontouchmove = function (event) {
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
  };
}
















function gotoPin() {
  feedback.classList.add("fadeoutleft");
  pin.classList.add("fadeinleft");
}



function gotoThankyou() {
  feedback.classList.add("fadeoutleft");
  thankyou.classList.add("fadeinleft");
  disableButton();
  setTimeout(() => {
    feedback.classList.remove("fadeoutleft");
    thankyou.classList.remove("fadeinleft");
    clearEmoji();

    setTimeout(() => {
      thankyou.style.display = "none";
    }, 1000);
  }, 3000);
}

function gotoFeedback() { }
// feedback.classList.add('fadeinleft');

// gotoFeedback();

function toogleFullScreen() {
  if (content.requestFullscreen) {
    content.requestFullscreen();
  } else if (content.webkitRequestFullscreen) {
    /* Safari */
    content.webkitRequestFullscreen();
  } else if (content.msRequestFullscreen) {
    /* IE11 */
    content.msRequestFullscreen();
  }
}

let usrFeedback = 1;

function selectFeedback(event, feedback) {
  clearEmoji();
  event.target.parentElement.getElementsByClassName(
    "emoji-circle"
  )[0].style.opacity = 1;

  usrFeedback = feedback;

  enableButton();
}

function enableButton() {
  button.classList.add("select");
  button.classList.remove("disable");
}

function disableButton() {
  button.classList.remove("select");
  button.classList.add("disable");
}

disableButton();

function clearEmoji() {
  usrFeedback = 1;
  let emojieCircles = document.getElementsByClassName("emoji-circle");

  for (let i = 0; i < emojieCircles.length; i++) {
    emojieCircles[i].style.opacity = 0;
  }
}


// manager.addConfetti();

// const triggerButton = document.getElementById("show-again");
// if (triggerButton) {
//   triggerButton.addEventListener("click", () => manager.addConfetti());
// }

// const resetInput = document.getElementById("reset");
// if (resetInput) {
//   resetInput.addEventListener("input", () => manager.resetAndStart());
// }
