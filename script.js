const API_URL = "https://api.example.com";
const MAX_RETRIES = 3;

// Helper functions
function fetchData(endpoint) {
  return fetch(`${API_URL}/${endpoint}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      return null;
    });
}

// Basic event handling
document.addEventListener("DOMContentLoaded", () => {
  console.log("Document ready!");
  init();
});

// Application initialization
function init() {
  setupEventListeners();
  loadInitialData();
}

function setupEventListeners() {
  const submitButton = document.getElementById("submit");
  if (submitButton) {
    submitButton.addEventListener("click", handleSubmit);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  console.log("Form submitted!");
  // Form handling logic here
}

function loadInitialData() {
  fetchData("users").then((data) => {
    if (data) {
      console.log("Data loaded successfully:", data);
      renderData(data);
    }
  });
}

function renderData(data) {
  // Render data to the DOM
  const container = document.getElementById("data-container");
  if (container && Array.isArray(data)) {
    container.innerHTML = data
      .map((item) => `<div class="item">${item.name}</div>`)
      .join("");
  }
}

// Export functions for module usage
export { fetchData, init, renderData };
