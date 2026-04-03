let classifier;
let userImage = null;
let userImageSrc = null;
let userChart = null;

const exampleImages = [
  {
    src: "images/rottweiler.jpg",
    expectedLabel: "rottweiler",
    title: "Beispiel 1",
    p5img: null
  },
  {
    src: "images/tiger.jpg",
    expectedLabel: "tiger",
    title: "Beispiel 2",
    p5img: null
  },
  {
    src: "images/orca.jpg",
    expectedLabel: "orca",
    title: "Beispiel 3",
    p5img: null
  },
  {
    src: "images/golden_retriever.jpg",
    expectedLabel: "golden retriever",
    title: "Beispiel 4",
    p5img: null
  },
    {
    src: "images/Tree Swallow.jpg",
    expectedLabel: "tree swallow",
    title: "Beispiel 5",
    p5img: null
  },
  {
    src: "images/hawk.jpg",
    expectedLabel: "hawk",
    title: "Beispiel 6",
    p5img: null
  },
];

async function setup() {
  noCanvas();

  await ml5.setBackend("cpu");
  classifier = await ml5.imageClassifier("MobileNet");

  renderExampleCards();
  loadAllImagesAndClassify();
  setupUpload();
}

function renderExampleCards() {
  const correctContainer = document.getElementById("correctContainer");
  const wrongContainer = document.getElementById("wrongContainer");

  correctContainer.innerHTML = "";
  wrongContainer.innerHTML = "";

  for (let i = 0; i < exampleImages.length; i++) {
    const item = exampleImages[i];

    const card = document.createElement("article");
    card.className = "result-card";
    card.id = `example-card-${i}`;

    card.innerHTML = `
      <h3>${item.title}</h3>
      <div class="result-layout">
        <div class="image-box">
          <img id="example-img-${i}" src="${item.src}" alt="${item.title}">
          <div class="meta">
            <div><strong>Erwartete Klasse:</strong> ${item.expectedLabel}</div>
            <div><strong>Vorhersage:</strong> <span id="prediction-${i}">Ergebnis wird berechnet...</span></div>
            <div><strong>Status:</strong> <span id="status-${i}">Wird geprüft...</span></div>
          </div>
        </div>
        <div>
          <canvas id="chart-${i}" width="400" height="250"></canvas>
        </div>
      </div>
    `;

    if (i < 3) {
      correctContainer.appendChild(card);
    } else {
      wrongContainer.appendChild(card);
    }
  }
}

function loadAllImagesAndClassify() {
  for (let i = 0; i < exampleImages.length; i++) {
    loadImage(
      exampleImages[i].src,
      async (loadedImage) => {
        exampleImages[i].p5img = loadedImage;
        await classifyExampleImage(i, exampleImages[i]);
      },
      (err) => {
        console.error("Bild konnte nicht geladen werden:", exampleImages[i].src, err);
        document.getElementById(`prediction-${i}`).textContent = "Fehler beim Laden";
        document.getElementById(`status-${i}`).textContent = "nicht klassifiziert";
      }
    );
  }
}

async function classifyExampleImage(index, item) {
  const results = await classifier.classify(item.p5img);

  const top3 = results.slice(0, 3);
  const topPrediction = top3[0].label;
  const topConfidence = (top3[0].confidence * 100).toFixed(2);

  document.getElementById(`prediction-${index}`).textContent =
    `${topPrediction} (${topConfidence}%)`;

  const isCorrect = normalizeLabel(topPrediction).includes(normalizeLabel(item.expectedLabel));

  document.getElementById(`status-${index}`).textContent =
    isCorrect ? "korrekt klassifiziert" : "falsch klassifiziert";

  document.getElementById(`example-card-${index}`).classList.add(
    isCorrect ? "correct" : "wrong"
  );

  createChart(`chart-${index}`, top3);
}

function createChart(canvasId, results) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  const labels = results.map(r => {
    let shortLabel = r.label.split(",")[0].trim();
    if (shortLabel.length > 18) {
      shortLabel = shortLabel.substring(0, 18) + "...";
    }
    return shortLabel;
  });

  const values = results.map(r => Number((r.confidence * 100).toFixed(2)));

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Confidence in %",
        data: values,
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        },
        x: {
          ticks: {
            maxRotation: 0,
            minRotation: 0
          }
        }
      },
      plugins: {
        datalabels: {
          anchor: "end",
          align: "top",
          formatter: function(value) {
            return value + "%";
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function normalizeLabel(label) {
  return label.toLowerCase().trim();
}

function setUploadMessage(text, type = "") {
  const messageEl = document.getElementById("uploadMessage");
  messageEl.textContent = text;
  messageEl.className = "upload-message";

  if (type) {
    messageEl.classList.add(type);
  }
}

function setupUpload() {
  const fileInput = document.getElementById("fileInput");
  const classifyButton = document.getElementById("classifyButton");
  const dropZone = document.getElementById("dropZone");

  fileInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    handleSelectedFile(file);
  });

  classifyButton.addEventListener("click", async function() {
  if (!userImage) {
    classifyButton.disabled = true;
    setUploadMessage("Bitte zuerst ein gültiges Bild auswählen.", "error");
    return;
  }

  await renderUserImageResult();
});

  dropZone.addEventListener("dragover", function(event) {
    event.preventDefault();
    dropZone.classList.add("dragover");
    setUploadMessage("Bild hier ablegen.", "info");
  });

  dropZone.addEventListener("dragleave", function() {
    dropZone.classList.remove("dragover");
    setUploadMessage("Noch kein Bild ausgewählt.");
  });

  dropZone.addEventListener("drop", function(event) {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const file = event.dataTransfer.files[0];
    handleSelectedFile(file);
  });
}

function handleSelectedFile(file) {
  const classifyButton = document.getElementById("classifyButton");

  if (!file) {
    resetUserUploadState();
    setUploadMessage("Keine Datei ausgewählt.", "error");
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    resetUserUploadState();
    setUploadMessage("Ungültiges Dateiformat. Bitte JPG, PNG oder WEBP verwenden.", "error");
    return;
  }

  classifyButton.disabled = true;
  setUploadMessage("Bild wird geladen ...", "info");

  const reader = new FileReader();

  reader.onload = function(event) {
    userImageSrc = event.target.result;

    loadImage(
      userImageSrc,
      function(loadedImage) {
        userImage = loadedImage;
        classifyButton.disabled = false;
        showSelectedUserImage();
        setUploadMessage(`Bild erfolgreich geladen: ${file.name}`, "success");
      },
      function(err) {
        console.error("Bild konnte nicht geladen werden:", err);
        resetUserUploadState();
        setUploadMessage("Das Bild konnte nicht geladen werden.", "error");
      }
    );
  };

  reader.readAsDataURL(file);
}

function showSelectedUserImage() {
  const container = document.getElementById("userResultContainer");

  container.innerHTML = `
    <article class="result-card">
      <h3>Nutzerbild</h3>
      <div class="result-layout">
        <div class="image-box">
          <img src="${userImageSrc}" alt="Hochgeladenes Bild">
          <div class="meta">
            <div><strong>Vorhersage:</strong> <span id="user-prediction">Noch nicht klassifiziert</span></div>
            <div><strong>Status:</strong> <span id="user-status">Bereit zur Klassifikation</span></div>
          </div>
        </div>
        <div>
          <canvas id="user-chart" width="400" height="250"></canvas>
        </div>
      </div>
    </article>
  `;
}

async function renderUserImageResult() {
  const classifyButton = document.getElementById("classifyButton");

  classifyButton.disabled = true;
  classifyButton.textContent = "Classifying...";

  setUploadMessage("Bild wird klassifiziert ...", "info");

  try {
    const results = await classifier.classify(userImage);
    const top3 = results.slice(0, 3);

    document.getElementById("user-prediction").textContent =
      `${top3[0].label} (${(top3[0].confidence * 100).toFixed(2)}%)`;

    document.getElementById("user-status").textContent = "klassifiziert";

    if (userChart) {
      userChart.destroy();
    }

    userChart = createChart("user-chart", top3);

    setUploadMessage("Klassifikation erfolgreich abgeschlossen.", "success");
  } catch (error) {
    console.error(error);
    setUploadMessage("Bei der Klassifikation ist ein Fehler aufgetreten.", "error");
    document.getElementById("user-status").textContent = "Fehler";
  }

  classifyButton.disabled = false;
  classifyButton.textContent = "Classify";
}

function resetUserUploadState() {
  userImage = null;
  userImageSrc = null;

  const classifyButton = document.getElementById("classifyButton");
  classifyButton.disabled = true;

  const container = document.getElementById("userResultContainer");
  container.innerHTML = "";
}