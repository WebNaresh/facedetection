// Import report generation function if applicable

import { generateReport } from "./report.js";

let galleryFiles = [];
let thiefFile = null;
let thiefImages = [];
let detectedFaces = [];

// Load face-api models with error handling
async function loadModels() {
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromUri("./models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("./models");
    console.log("Models loaded successfully.");
  } catch (error) {
    console.error("Error loading models:", error);
    alert("Failed to load face detection models. Please try again later.");
  }
}

// Detect faces in the image using SsdMobilenetv1
async function detectFace(image) {
  return await faceapi
    .detectAllFaces(image, new faceapi.SsdMobilenetv1Options())
    .withFaceLandmarks()
    .withFaceDescriptors();
}

let labeledFaceDescriptors = [];

async function loadThiefFace(file) {
  const img = await faceapi.bufferToImage(file);
  const fullFaceDescription = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (fullFaceDescription) {
    const descriptor = fullFaceDescription.descriptor;
    labeledFaceDescriptors.push(
      new faceapi.LabeledFaceDescriptors("Thief", [descriptor])
    );
    document.getElementById("startDetection").disabled = false;
  } else {
    alert("No face detected in the thief image.");
  }
}

async function compareFaces(detections, imageElement, file) {
  if (labeledFaceDescriptors.length === 0) return;

  const threshold =
    parseFloat(document.getElementById("threshold").value) || 0.6;
  const faceMatcher = new faceapi.FaceMatcher(
    labeledFaceDescriptors,
    threshold
  );
  let isThiefDetected = false;

  detections.forEach((detection) => {
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    if (bestMatch.label === "Thief") {
      isThiefDetected = true;
      drawThiefFace(imageElement, detection); // Show only matched "Thief" images
      detectedFaces.push({
        imageName: file.name,
        confidence: bestMatch.distance.toFixed(2),
        isMatch: true,
      });
    }
  });

  // Skip adding to detectedFaces or displaying if no match is found
  if (!isThiefDetected) {
    detectedFaces.push({
      imageName: file.name,
      confidence: null,
      isMatch: false,
    });
  }
}

function drawThiefFace(imageElement, detection) {
  // Create a canvas with willReadFrequently set to true
  const canvas = document.createElement("canvas");
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  // Draw the detection on the canvas
  const container = document.getElementById("thiefImages");

  // Match the canvas dimensions to the image for accurate drawing
  faceapi.matchDimensions(canvas, imageElement);
  faceapi.draw.drawDetections(canvas, [detection]);

  // Adjust canvas size display settings
  imageElement.width = 80;
  canvas.width = 80;
  canvas.style.width = "80px";
  canvas.style.height = "80px";

  // Save the image source for downloading and append to DOM
  thiefImages.push(imageElement.src);
  container.appendChild(imageElement);
  container.appendChild(canvas);
}

function displayUnknownImage(image) {
  const unknownSection = document.getElementById("unknownImages");
  if (!unknownSection) {
    console.error("Element 'unknownImages' not found in the DOM");
    return;
  }
  // Now it's safe to appendChild since unknownSection is confirmed to exist
  unknownSection.appendChild(image);
}

// Timer implementation for detection process
async function processGalleryImages(files) {
  const totalImages = files.length;
  const progressBar = document.getElementById("progressBar");
  const currentImageText = document.getElementById("currentImage");
  const totalImagesText = document.getElementById("totalImages");
  const estimatedTimeText = document.getElementById("estimatedTime");

  // Display the progress and set total image count
  document.getElementById("progress").style.display = "block";
  totalImagesText.textContent = totalImages;

  detectedFaces = [];
  let elapsedTimes = [];

  for (let i = 0; i < totalImages; i++) {
    const file = files[i];
    const imgElement = await faceapi.bufferToImage(file);

    const startTime = performance.now(); // Start timer for each image

    const detections = await detectFace(imgElement);
    if (detections.length > 0) {
      await compareFaces(detections, imgElement, file);
    } else {
      displayUnknownImage(imgElement, file);
      detectedFaces.push({
        imageName: file.name,
        confidence: null,
        isMatch: false,
      });
    }

    const endTime = performance.now(); // End timer for each image
    const elapsedTime = (endTime - startTime) / 1000;
    elapsedTimes.push(elapsedTime);

    // Update progress display
    currentImageText.textContent = i + 1;
    progressBar.style.width = `${((i + 1) / totalImages) * 100}%`;

    // Calculate estimated time remaining
    const averageTimePerImage =
      elapsedTimes.reduce((a, b) => a + b) / elapsedTimes.length;
    const estimatedTimeRemaining =
      (totalImages - (i + 1)) * averageTimePerImage;
    estimatedTimeText.textContent = `Estimated time remaining: ${estimatedTimeRemaining.toFixed(
      2
    )} seconds`;

    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for smoother progress update
  }

  document.getElementById("progress").style.display = "none";
  const totalElapsedTime = elapsedTimes.reduce((a, b) => a + b, 0).toFixed(2);
  document.getElementById(
    "results"
  ).textContent = `Time taken for face detection: ${totalElapsedTime} seconds`;

  const threshold =
    parseFloat(document.getElementById("threshold").value) || 0.6;
  generateReport(detectedFaces, threshold, galleryFiles, thiefFile);
}

function previewThiefImage(input) {
  const container = document.getElementById("thiefPreview");
  container.innerHTML = "";

  const img = document.createElement("img");
  img.src = URL.createObjectURL(input.files[0]);
  img.width = 80;
  img.alt = input.files[0].name;

  img.onload = () => URL.revokeObjectURL(img.src);
  container.appendChild(img);
}

function reset() {
  galleryFiles = [];
  thiefFile = null;
  labeledFaceDescriptors = [];

  document.getElementById("galleryUpload").value = "";
  document.getElementById("thiefUpload").value = "";
  document.getElementById("thiefPreview").innerHTML = "";
  document.getElementById("unknownImages").innerHTML = "";
  document.getElementById("thiefImages").innerHTML = "";
  document.getElementById("startDetection").disabled = true;
  document.getElementById("reset").disabled = true;
  document.getElementById("results").textContent = "";
}

// Event Listeners
document.getElementById("galleryUpload").addEventListener("change", (event) => {
  galleryFiles = event.target.files;
  document.getElementById("reset").disabled = false;
});

document
  .getElementById("thiefUpload")
  .addEventListener("change", async (event) => {
    thiefFile = event.target.files[0];
    previewThiefImage(event.target);
    if (thiefFile) await loadThiefFace(thiefFile);
  });

document
  .getElementById("startDetection")
  .addEventListener("click", async () => {
    if (galleryFiles.length > 0 && thiefFile) {
      await processGalleryImages(galleryFiles);
    } else {
      alert("Please upload both gallery and thief images.");
    }
  });

document.getElementById("reset").addEventListener("click", reset);

document.addEventListener("DOMContentLoaded", async () => {
  await loadModels();
});
// Function to download all thief images as a single PDF
async function downloadThiefImagesAsPDF() {
  if (thiefImages.length === 0) {
    alert("No thief images to download.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const imgWidth = 80;
  const imgHeight = 80;
  let yPosition = 10;

  for (const imageUrl of thiefImages) {
    const imgData = await fetch(imageUrl)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          })
      );

    pdf.addImage(imgData, "JPEG", 10, yPosition, imgWidth, imgHeight);
    yPosition += imgHeight + 10;

    if (yPosition + imgHeight > pdf.internal.pageSize.height) {
      pdf.addPage();
      yPosition = 10;
    }
  }

  pdf.save("ThiefImages.pdf");
}
// Add event listener to the button after the DOM has fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const downloadButton = document.getElementById("downloadThiefImagesPdf");
  downloadButton.addEventListener("click", downloadThiefImagesAsPDF);
});
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");

mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };
  document.getElementById("dateTime").innerText = now.toLocaleDateString(
    "en-US",
    options
  );
}

// Update date and time on page load and every second
window.onload = function () {
  updateDateTime();
  setInterval(updateDateTime, 1000);
};
