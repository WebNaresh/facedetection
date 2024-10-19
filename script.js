// Variables to store uploaded files
let galleryFiles = [];
let thiefFile = null;

// Load the face-api models
async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri("./models"); // Load SsdMobilenetv1 model
  await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("./models");
}

// Detect faces in the image using SsdMobilenetv1
async function detectFace(image) {
  const detections = await faceapi
    .detectAllFaces(image, new faceapi.SsdMobilenetv1Options()) // Use SsdMobilenetv1
    .withFaceLandmarks()
    .withFaceDescriptors();
  return detections;
}

// Store labeled face descriptors
let labeledFaceDescriptors = [];

// Load the thief image and create a labeled face descriptor
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
    console.log("Thief face loaded.");
  } else {
    console.log("No face detected in the thief image.");
  }
}

// Compare detected faces with known faces (thief)
async function compareFaces(detections, imageElement, file) {
  if (labeledFaceDescriptors.length === 0) {
    console.log("No thief face loaded for comparison.");
    return;
  }

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6); // 0.6 is the threshold
  let isThiefDetected = false;

  detections.forEach((detection) => {
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    console.log(`Match found: ${bestMatch.toString()}`); // Log match result

    if (bestMatch.label === "Thief") {
      isThiefDetected = true;
      drawThiefFace(imageElement, detection);
    }
  });

  if (!isThiefDetected) {
    displayUnknownImage(imageElement, file);
  }
}

// Draw thief face and rectangle on the thief images
function drawThiefFace(imageElement, detection) {
  const canvas = faceapi.createCanvasFromMedia(imageElement);
  const container = document.getElementById("thiefImages");

  faceapi.matchDimensions(canvas, imageElement);
  faceapi.draw.drawDetections(canvas, [detection]);

  // Set the size of the image and canvas
  imageElement.width = 80; // Set the width to 80px
  canvas.width = 80; // Set canvas to match image width
  canvas.style.width = "80px"; // Ensure canvas width is also styled correctly
  canvas.style.height = "80px"; // Set canvas height to 80px

  // Append image and canvas (with detection rectangle) to the thief section
  container.appendChild(imageElement);
  container.appendChild(canvas);
}

// Display unknown images in the unknown images section
function displayUnknownImage(imageElement, file) {
  const container = document.getElementById("unknownImages");
  const img = document.createElement("img");

  img.src = URL.createObjectURL(file);
  img.alt = "Unknown Face";
  img.width = 80; // Set the width to 80px

  container.appendChild(img); // Append the image to the unknown section
}

// Process gallery images
async function processGalleryImages(files) {
  for (const file of files) {
    console.log(`Processing gallery image: ${file.name}`); // Log the name of the file
    const imgElement = await faceapi.bufferToImage(file);
    const detections = await detectFace(imgElement);

    if (detections.length > 0) {
      await compareFaces(detections, imgElement, file);
    } else {
      displayUnknownImage(imgElement, file); // No face detected, consider as unknown
    }
  }
}

// Check if both thief image and gallery images are uploaded
function checkIfReady() {
  const startButton = document.getElementById("startDetection");
  if (thiefFile && galleryFiles.length > 0) {
    startButton.disabled = false;
  } else {
    startButton.disabled = true;
  }
}

// Listen for gallery image input change event
document
  .getElementById("galleryUpload")
  .addEventListener("change", async (event) => {
    galleryFiles = event.target.files;

    // Log the uploaded files
    console.log("Gallery images uploaded:", galleryFiles);

    checkIfReady(); // Check if ready to enable the Start button
  });

// Listen for thief image input change event
document
  .getElementById("thiefUpload")
  .addEventListener("change", async (event) => {
    thiefFile = event.target.files[0];
    if (thiefFile) {
      console.log(`Thief image selected: ${thiefFile.name}`); // Log the name of the selected thief image
      await loadThiefFace(thiefFile);
    } else {
      console.log("No thief image selected.");
    }

    checkIfReady(); // Check if ready to enable the Start button
  });

// Listen for start detection button click event
document
  .getElementById("startDetection")
  .addEventListener("click", async () => {
    if (galleryFiles.length > 0 && thiefFile) {
      console.log("Starting face detection...");
      await processGalleryImages(galleryFiles);
    } else {
      console.log("Please upload both gallery and thief images.");
    }
  });

// Load models when the page is loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Ensure face-api.js is loaded before calling loadModels
  if (typeof faceapi !== "undefined") {
    await loadModels();
    console.log("Models loaded successfully.");
  } else {
    console.error(
      "faceapi is not defined. Ensure face-api.js is loaded correctly."
    );
  }
});
