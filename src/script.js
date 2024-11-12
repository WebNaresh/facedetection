// Import report generation function if applicable

import { generateReport } from './report.js';

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

    const threshold = parseFloat(document.getElementById("threshold").value) || 0.6;
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold);
    let isThiefDetected = false;

    detections.forEach((detection) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        if (bestMatch.label === "Thief") {
            isThiefDetected = true;
            drawThiefFace(imageElement, detection);
            detectedFaces.push({
                imageName: file.name,
                confidence: bestMatch.distance.toFixed(2),
                isMatch: true,
            });
        }
    });

    if (!isThiefDetected) {
        displayUnknownImage(imageElement, file);
        detectedFaces.push({
            imageName: file.name,
            confidence: null,
            isMatch: false,
        });
    }
}

function drawThiefFace(imageElement, detection) {
    const canvas = faceapi.createCanvasFromMedia(imageElement);
    const container = document.getElementById("thiefImages");

    faceapi.matchDimensions(canvas, imageElement);
    faceapi.draw.drawDetections(canvas, [detection]);

    imageElement.width = 80;
    canvas.width = 80;
    canvas.style.width = "80px";
    canvas.style.height = "80px";

    thiefImages.push(imageElement.src);

    container.appendChild(imageElement);
    container.appendChild(canvas);
}

function displayUnknownImage(imageElement, file) {
    const container = document.getElementById("unknownImages");
    const img = document.createElement("img");

    img.src = URL.createObjectURL(file);
    img.alt = "Unknown Face";
    img.width = 80;

    img.onload = () => URL.revokeObjectURL(img.src);
    container.appendChild(img);
}

// Timer implementation for detection process
async function processGalleryImages(files) {
    document.getElementById("progress").style.display = "block";
    detectedFaces = [];
    
    const startTime = performance.now(); // Start timer

    for (const file of files) {
        const imgElement = await faceapi.bufferToImage(file);
        const detections = await detectFace(imgElement);

        if (detections.length > 0) {
            await compareFaces(detections, imgElement, file);
        } else {
            displayUnknownImage(imgElement, file);
            detectedFaces.push({ imageName: file.name, confidence: null, isMatch: false });
        }
    }

    document.getElementById("progress").style.display = "none";

    const endTime = performance.now(); // End timer
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(2); // Time in seconds

    // Display the elapsed time
    document.getElementById("results").textContent = `Time taken for face detection: ${elapsedTime} seconds`;

    const threshold = parseFloat(document.getElementById("threshold").value) || 0.6;
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

document.getElementById("thiefUpload").addEventListener("change", async (event) => {
    thiefFile = event.target.files[0];
    previewThiefImage(event.target);
    if (thiefFile) await loadThiefFace(thiefFile);
});

document.getElementById("startDetection").addEventListener("click", async () => {
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
