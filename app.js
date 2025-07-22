document.addEventListener('DOMContentLoaded', function() {
  // Inicializar sidebar
  const sidebar = new Sidebar();
  sidebar.render('sidebar-container');

  // Configurar manejo de secciones
  document.addEventListener('section-change', function(e) {
    loadSection(e.detail);
  });
  
  // Cargar sección inicial
  loadSection('dashboard');
});

function loadSection(sectionId) {
  // Ocultar todas las secciones
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Mostrar sección seleccionada
  document.getElementById(sectionId)?.classList.add('active');
  
  // Actualizar título
  updateSectionTitle(sectionId);
}

function updateSectionTitle(sectionId) {
  const titles = {
    'dashboard': 'Dashboard Financiero',
    'transactions': 'Gestion de Transacciones',
    'categories': 'Gestion de Categorias',
    'budgets': 'Gestion de Presupuestos'
  };
  
  const titleElement = document.getElementById('section-title');
  if (titleElement && titles[sectionId]) {
    titleElement.textContent = titles[sectionId];
  }
}