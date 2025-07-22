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
    section.innerHTML = ''; // Limpiar contenido anterior
  });
  
  // Mostrar sección seleccionada
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');
    
    // Cargar componente correspondiente
    switch(sectionId) {
      case 'categories':
        const categories = new Categories();
        categories.render(sectionId);
        break;
      // Puedes añadir más casos para otros componentes aquí
    }
  }
  
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