const state = {
  tasks: [],
  currentFilter: "all",
  deferredPrompt: null, // Guarda el evento de instalación nativo
};

const DOM = {
  taskForm: document.getElementById("task-form"),
  taskInput: document.getElementById("task-input"),
  taskList: document.getElementById("task-list"),
  emptyState: document.getElementById("empty-state"),
  emptyMessage: document.getElementById("empty-message"),
  filterBtns: document.querySelectorAll(".filter-btn"),
  networkBadge: document.getElementById("network-badge"),
  badgeText: document.getElementById("badge-text"),
  connectionToast: document.getElementById("connection-toast"),
  toastMessage: document.getElementById("toast-message"),
  installBanner: document.getElementById("install-banner"),
  btnInstall: document.getElementById("btn-install"),
  btnCloseInstall: document.getElementById("btn-close-install"),
};

document.addEventListener("DOMContentLoaded", () => {
  loadTasksFromStorage();
  setupEventListeners();
  renderTasks();
  registerServiceWorker();
  updateNetworkStatus(navigator.onLine);
});

// Registro del Service Worker
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then((registration) => {
          console.log(
            "✅ [PWA] Service Worker registrado exitosamente en el scope:",
            registration.scope,
          );
        })
        .catch((error) => {
          console.error(
            "❌ [PWA] Error al registrar el Service Worker:",
            error,
          );
        });
    });
  } else {
    console.warn(
      "⚠️ [PWA] Los Service Workers no están soportados en este navegador.",
    );
  }
}

function setupEventListeners() {
  window.addEventListener("online", () => updateNetworkStatus(true));
  window.addEventListener("offline", () => updateNetworkStatus(false));

  DOM.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const taskText = DOM.taskInput.value.trim();
    if (taskText) {
      addTask(taskText);
      DOM.taskInput.value = "";
    }
  });

  DOM.taskList.addEventListener("click", (e) => {
    const target = e.target;

    const taskItem = target.closest(".task-item");
    if (!taskItem) return;

    const taskId = parseInt(taskItem.dataset.id);

    if (target.closest(".btn-delete")) {
      deleteTask(taskId, taskItem);
    } else if (target.closest(".task-content")) {
      toggleTaskStatus(taskId);
    }
  });

  DOM.filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      DOM.filterBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      state.currentFilter = e.target.dataset.filter;
      renderTasks();
    });
  });

  setupPWAInstallation();
}

function updateNetworkStatus(isOnline) {
  if (isOnline) {
    DOM.networkBadge.className = "badge badge-online";
    DOM.badgeText.textContent = "En línea";
    showToast("⚡ Conectado a internet. Sincronización activa.", "online");
  } else {
    DOM.networkBadge.className = "badge badge-offline";
    DOM.badgeText.textContent = "Sin conexión";
    showToast(
      "📡 Estás navegando en modo offline. TaskEasy sigue funcionando.",
      "offline",
    );
  }
}

function showToast(message, type) {
  DOM.toastMessage.textContent = message;
  DOM.connectionToast.className = `toast ${type}`;

  setTimeout(() => {
    DOM.connectionToast.classList.add("hide");
  }, 4000);
}

function setupPWAInstallation() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredPrompt = e;

    DOM.installBanner.classList.remove("hide");
    console.log(
      "📲 [PWA] Evento beforeinstallprompt capturado. Banner visible.",
    );
  });

  DOM.btnInstall.addEventListener("click", () => {
    const promptEvent = state.deferredPrompt;
    if (!promptEvent) return;

    promptEvent.prompt();

    promptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("😊 [PWA] El usuario aceptó la instalación.");
      } else {
        console.log("😢 [PWA] El usuario canceló la instalación.");
      }
      state.deferredPrompt = null;
      DOM.installBanner.classList.add("hide");
    });
  });

  DOM.btnCloseInstall.addEventListener("click", () => {
    DOM.installBanner.classList.add("hide");
  });

  window.addEventListener("appinstalled", (event) => {
    console.log("🎉 [PWA] ¡TaskEasy instalada con éxito en el sistema!");
    DOM.installBanner.classList.add("hide");
    state.deferredPrompt = null;
  });
}

function loadTasksFromStorage() {
  const localTasks = localStorage.getItem("taskeasy_tasks");
  state.tasks = localTasks ? JSON.parse(localTasks) : [];
}

function saveTasksToStorage() {
  localStorage.setItem("taskeasy_tasks", JSON.stringify(state.tasks)); // Guardar tareas
}

function addTask(text) {
  const newTask = {
    id: Date.now(),
    text: text,
    completed: false,
  };

  state.tasks.unshift(newTask);
  saveTasksToStorage();
  renderTasks();
}

function toggleTaskStatus(id) {
  state.tasks = state.tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  state.tasks.sort((a, b) => a.completed - b.completed); //Tareas pendientes primero

  saveTasksToStorage();
  renderTasks();
}

function deleteTask(id, taskElement) {
  taskElement.classList.add("removing");

  setTimeout(() => {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    saveTasksToStorage();
    renderTasks();
  }, 250);
}

function renderTasks() {
  const filteredTasks = state.tasks.filter((task) => {
    if (state.currentFilter === "active") return !task.completed;
    if (state.currentFilter === "completed") return task.completed;
    return true;
  });

  DOM.taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    DOM.emptyState.classList.remove("hide");

    if (state.currentFilter === "active") {
      DOM.emptyMessage.textContent = "¡No tienes tareas pendientes! Excelente.";
    } else if (state.currentFilter === "completed") {
      DOM.emptyMessage.textContent = "Aún no has completado ninguna tarea.";
    } else {
      DOM.emptyMessage.textContent =
        "¡Todo limpio por aquí! Agrega una tarea para comenzar.";
    }
  } else {
    DOM.emptyState.classList.add("hide");

    filteredTasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = `task-item ${task.completed ? "completed" : ""}`;
      li.dataset.id = task.id;

      li.innerHTML = `
        <div class="task-content" role="checkbox" aria-checked="${task.completed}">
          <div class="checkbox-custom">
            <svg class="checkbox-icon" viewBox="0 0 10 8">
              <path d="M1 4L3.5 6.5L9 1" />
            </svg>
          </div>
          <span class="task-text">${escapeHTML(task.text)}</span>
        </div>
        <button class="btn btn-delete" aria-label="Eliminar tarea">
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 3.8H2.33333M2.33333 3.8H13M2.33333 3.8V13.4C2.33333 13.7713 2.47381 14.1274 2.72386 14.3899C2.97391 14.6525 3.31304 14.8 3.66667 14.8H10.3333C10.687 14.8 11.0261 14.6525 11.2761 14.3899C11.5262 14.1274 11.6667 13.7713 11.6667 13.4V3.8M4.33333 3.8V2.2C4.33333 1.8287 4.47381 1.4726 4.72386 1.21005C2.97391 0.947499 3.31304 0.8 3.66667 0.8H10.3333C10.6869 0.8 11.0261 0.947499 11.2761 1.21005C11.5262 1.4726 11.6667 1.8287 11.6667 2.2V3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      `;
      DOM.taskList.appendChild(li);
    });
  }
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}
