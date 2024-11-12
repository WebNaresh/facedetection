export function generateReport(
  detectedFaces,
  threshold,
  galleryImages,
  thiefImage
) {
  const reportContent = document.getElementById("reportContent");
  const reportSection = document.getElementById("reportSection");

  // Get case details from the input fields
  const caseNumber =
    document.getElementById("caseNumber").value || "Not Provided";
  const caseName = document.getElementById("caseName").value || "Not Provided";
  const caseDetails =
    document.getElementById("caseDetails").value || "Not Provided";

  // Clear previous report content
  reportContent.innerHTML = "";

  // Populate report with case details
  reportContent.innerHTML = `
    <h2 class="text-xl font-semibold text-gray-700">Case Details</h2>
    <p><strong>Case Number:</strong> ${caseNumber}</p>
    <p><strong>Case Name:</strong> ${caseName}</p>
    <p><strong>Other Details:</strong> ${caseDetails}</p>
    <p><strong>Total Gallery Images:</strong> ${galleryImages.length}</p>
    <p><strong>Thief Image:</strong> ${thiefImage.name}</p>
    <p><strong>Detection Threshold:</strong> ${threshold}</p>
    <p><strong>Number of Faces Detected:</strong> ${detectedFaces.length}</p>
    <p><strong>Matching Faces Found:</strong> ${
      detectedFaces.filter((face) => face.isMatch).length
    }</p>
  `;

  // List matching faces with details
  if (detectedFaces.some((face) => face.isMatch)) {
    const matchList = detectedFaces
      .filter((face) => face.isMatch)
      .map(
        (face) =>
          `<li>Match in ${face.imageName} with confidence ${face.confidence}</li>`
      )
      .join("");

    reportContent.innerHTML += `
      <h3 class="text-lg font-semibold text-gray-700 mt-4">Match Details:</h3>
      <ul class="list-disc list-inside">${matchList}</ul>
    `;
  } else {
    reportContent.innerHTML += `<p>No matching faces found.</p>`;
  }

  // Add Thief Image in the Report
  const thiefImageHTML = `
    <h3 class="text-lg font-semibold text-gray-700 mt-4">Thief Image:</h3>
    <div class="text-center">
      <img src="${URL.createObjectURL(
        thiefImage
      )}" alt="Thief Image" class="w-32 mx-auto rounded-md shadow-md" />
    </div>
  `;
  reportContent.innerHTML += thiefImageHTML;

  // Show the report section
  reportSection.classList.remove("hidden");

  // Add report download functionality
  document.getElementById("downloadReport").onclick = () =>
    downloadReportAsText(
      detectedFaces,
      threshold,
      galleryImages,
      thiefImage,
      caseNumber,
      caseName,
      caseDetails
    );
}

function downloadReportAsText(
  detectedFaces,
  threshold,
  galleryImages,
  thiefImage,
  caseNumber,
  caseName,
  caseDetails
) {
  let reportText = `Face Detection Report\n\n`;
  reportText += `Case Number: ${caseNumber}\n`;
  reportText += `Case Name: ${caseName}\n`;
  reportText += `Other Details: ${caseDetails}\n`;
  reportText += `Total Gallery Images: ${galleryImages.length}\n`;
  reportText += `Thief Image: ${thiefImage.name}\n`;
  reportText += `Detection Threshold: ${threshold}\n`;
  reportText += `Number of Faces Detected: ${detectedFaces.length}\n`;
  reportText += `Matching Faces Found: ${
    detectedFaces.filter((face) => face.isMatch).length
  }\n\n`;

  if (detectedFaces.some((face) => face.isMatch)) {
    reportText += `Match Details:\n`;
    detectedFaces
      .filter((face) => face.isMatch)
      .forEach((face) => {
        reportText += `- Match in ${face.imageName} with confidence ${face.confidence}\n`;
      });
  } else {
    reportText += `No matching faces found.\n`;
  }

  const blob = new Blob([reportText], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Face_Detection_Report.txt";
  link.click();
}
