/**
 * ============================================================================
 * LOGICA DE APLICACIÓN - TASKEASY PWA (app.js)
 * ============================================================================
 * Este archivo gestiona la lógica de negocio de la lista de tareas,
 * interactúa con el LocalStorage, maneja el estado de conexión del navegador,
 * y coordina la instalación del Service Worker y la promoción de la PWA.
 */

// Estado Global de la Aplicación
const state = {
  tasks: [],
  currentFilter: 'all',
  deferredPrompt: null // Guardará el evento de instalación nativo
};

// Referencias a Elementos del DOM
const DOM = {
  taskForm: document.getElementById('task-form'),
  taskInput: document.getElementById('task-input'),
  taskList: document.getElementById('task-list'),
  emptyState: document.getElementById('empty-state'),
  emptyMessage: document.getElementById('empty-message'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  networkBadge: document.getElementById('network-badge'),
  badgeText: document.getElementById('badge-text'),
  connectionToast: document.getElementById('connection-toast'),
  toastMessage: document.getElementById('toast-message'),
  installBanner: document.getElementById('install-banner'),
  btnInstall: document.getElementById('btn-install'),
  btnCloseInstall: document.getElementById('btn-close-install')
};

/**
 * ----------------------------------------------------------------------------
 * 1. INICIALIZACIÓN DE LA APLICACIÓN
 * ----------------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Tareas y Eventos
  loadTasksFromStorage();
  setupEventListeners();
  renderTasks();
  
  // Registrar el Service Worker (Corazón de la PWA)
  registerServiceWorker();

  // Escuchar estado de conexión inicial
  updateNetworkStatus(navigator.onLine);
});

/**
 * ----------------------------------------------------------------------------
 * 2. REGISTRO DEL SERVICE WORKER (SW)
 * ----------------------------------------------------------------------------
 * El registro le indica al navegador dónde está el script del Service Worker.
 * Se realiza si el navegador soporta Service Workers (la mayoría de navegadores modernos).
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then((registration) => {
          console.log('✅ [PWA] Service Worker registrado exitosamente en el scope:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ [PWA] Error al registrar el Service Worker:', error);
        });
    });
  } else {
    console.warn('⚠️ [PWA] Los Service Workers no están soportados en este navegador.');
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. GESTIÓN DEL SOPORTE OFFLINE (ESTADO DE CONEXIÓN)
 * ----------------------------------------------------------------------------
 * Escuchamos eventos del navegador para advertir al usuario cuando pierde
 * o recupera la conexión a internet. ¡La PWA sigue funcionando offline!
 */
function setupEventListeners() {
  // Eventos de Conexión del Navegador
  window.addEventListener('online', () => updateNetworkStatus(true));
  window.addEventListener('offline', () => updateNetworkStatus(false));

  // Manejo del Formulario de Tareas
  DOM.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskText = DOM.taskInput.value.trim();
    if (taskText) {
      addTask(taskText);
      DOM.taskInput.value = '';
    }
  });

  // Delegación de Eventos en la Lista de Tareas (Completar / Eliminar)
  DOM.taskList.addEventListener('click', (e) => {
    const target = e.target;
    
    // Completar Tarea (click en el checkbox o en el texto de la tarea)
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;
    
    const taskId = parseInt(taskItem.dataset.id);

    if (target.closest('.btn-delete')) {
      // Si se hizo click en el botón de eliminar
      deleteTask(taskId, taskItem);
    } else if (target.closest('.task-content')) {
      // Si se hizo click en el área de la tarea (para alternar completada)
      toggleTaskStatus(taskId);
    }
  });

  // Filtrado de Tareas
  DOM.filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      DOM.filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.currentFilter = e.target.dataset.filter;
      renderTasks();
    });
  });

  // Manejo de la Instalación de PWA
  setupPWAInstallation();
}

/**
 * Actualiza el indicador visual en pantalla sobre el estado de conexión.
 */
function updateNetworkStatus(isOnline) {
  if (isOnline) {
    // Modo En Línea
    DOM.networkBadge.className = 'badge badge-online';
    DOM.badgeText.textContent = 'En línea';
    showToast('⚡ Conectado a internet. Sincronización activa.', 'online');
  } else {
    // Modo Sin Conexión
    DOM.networkBadge.className = 'badge badge-offline';
    DOM.badgeText.textContent = 'Sin conexión';
    showToast('📡 Estás navegando en modo offline. TaskEasy sigue funcionando.', 'offline');
  }
}

/**
 * Muestra un banner flotante temporal (toast).
 */
function showToast(message, type) {
  DOM.toastMessage.textContent = message;
  DOM.connectionToast.className = `toast ${type}`;
  
  // Ocultar automáticamente después de 4 segundos
  setTimeout(() => {
    DOM.connectionToast.classList.add('hide');
  }, 4000);
}

/**
 * ----------------------------------------------------------------------------
 * 4. INSTALACIÓN DE LA PWA (PROMPT DE INSTALACIÓN PERSONALIZADO)
 * ----------------------------------------------------------------------------
 * Las PWAs pueden instalarse nativamente. Capturamos el evento 'beforeinstallprompt'
 * para mostrar nuestro banner personalizado "Instalar App".
 */
function setupPWAInstallation() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previene el prompt nativo automático del navegador
    e.preventDefault();
    // Guarda el evento para dispararlo más tarde
    state.deferredPrompt = e;
    
    // Muestra el banner personalizado de instalación
    DOM.installBanner.classList.remove('hide');
    console.log('📲 [PWA] Evento beforeinstallprompt capturado. Banner visible.');
  });

  // Acción al presionar "Instalar"
  DOM.btnInstall.addEventListener('click', () => {
    const promptEvent = state.deferredPrompt;
    if (!promptEvent) return;

    // Dispara el prompt de instalación nativo
    promptEvent.prompt();

    // Evalúa la respuesta del usuario (Aceptada / Cancelada)
    promptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('😊 [PWA] El usuario aceptó la instalación.');
      } else {
        console.log('😢 [PWA] El usuario canceló la instalación.');
      }
      // Limpiamos el prompt ya que solo se puede usar una vez
      state.deferredPrompt = null;
      DOM.installBanner.classList.add('hide');
    });
  });

  // Cerrar el banner manualmente
  DOM.btnCloseInstall.addEventListener('click', () => {
    DOM.installBanner.classList.add('hide');
  });

  // Evento que se dispara cuando la aplicación se instala con éxito
  window.addEventListener('appinstalled', (event) => {
    console.log('🎉 [PWA] ¡TaskEasy instalada con éxito en el sistema!');
    DOM.installBanner.classList.add('hide');
    state.deferredPrompt = null;
  });
}

/**
 * ----------------------------------------------------------------------------
 * 5. LÓGICA DE NEGOCIO Y PERSISTENCIA (LOCALSTORAGE)
 * ----------------------------------------------------------------------------
 */

function loadTasksFromStorage() {
  const localTasks = localStorage.getItem('taskeasy_tasks');
  state.tasks = localTasks ? JSON.parse(localTasks) : [];
}

function saveTasksToStorage() {
  localStorage.setItem('taskeasy_tasks', JSON.stringify(state.tasks));
}

function addTask(text) {
  const newTask = {
    id: Date.now(), // ID único basado en timestamp
    text: text,
    completed: false
  };

  // Agregar al inicio del array para que aparezca arriba
  state.tasks.unshift(newTask);
  saveTasksToStorage();
  renderTasks();
}

function toggleTaskStatus(id) {
  state.tasks = state.tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  // Re-ordenar tareas: Las completadas se mueven al final
  state.tasks.sort((a, b) => a.completed - b.completed);

  saveTasksToStorage();
  renderTasks();
}

function deleteTask(id, taskElement) {
  // Agregar clase de animación de salida en el DOM
  taskElement.classList.add('removing');

  // Esperar a que termine la animación CSS (250ms) para eliminarlo del estado
  setTimeout(() => {
    state.tasks = state.tasks.filter(task => task.id !== id);
    saveTasksToStorage();
    renderTasks();
  }, 250);
}

/**
 * Renderiza dinámicamente las tareas en el DOM según el filtro seleccionado.
 */
function renderTasks() {
  // Filtrado de tareas
  const filteredTasks = state.tasks.filter(task => {
    if (state.currentFilter === 'active') return !task.completed;
    if (state.currentFilter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Limpiar lista HTML
  DOM.taskList.innerHTML = '';

  // Controlar Estado Vacío (Empty State)
  if (filteredTasks.length === 0) {
    DOM.emptyState.classList.remove('hide');
    
    // Mensaje dinámico según el filtro
    if (state.currentFilter === 'active') {
      DOM.emptyMessage.textContent = '¡No tienes tareas pendientes! Excelente.';
    } else if (state.currentFilter === 'completed') {
      DOM.emptyMessage.textContent = 'Aún no has completado ninguna tarea.';
    } else {
      DOM.emptyMessage.textContent = '¡Todo limpio por aquí! Agrega una tarea para comenzar.';
    }
  } else {
    DOM.emptyState.classList.add('hide');

    // Construir los elementos de la lista
    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
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

/**
 * Función auxiliar para evitar ataques de inyección de código (XSS).
 */
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
