class Sidebar {
  constructor() {
    this.template = `
      <nav class="sidebar">
        <div class="sidebar-header">
          <img src="assets/images/Title.png" class="logo">
        </div>
        
        <ul class="nav">
          <li class="nav-item active" data-section="dashboard">
            <i class="fas fa-chart-bar icon"></i>
            <span>Dashboard</span>
          </li>
          <li class="nav-item" data-section="transactions">
            <i class="fas fa-coins icon"></i>
            <span>Transacciones</span>
          </li>
          <li class="nav-item" data-section="categories">
            <i class="fas fa-tags icon"></i>
            <span>Categorias</span>
          </li>
          <li class="nav-item" data-section="budgets">
            <i class="fas fa-wallet icon"></i>
            <span>Presupuestos</span>
          </li>
        </ul>
        
        <div class="sidebar-footer"></div>
      </nav>
    `;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.template;
      this.initEvents();
      this.loadStyles();
    }
  }

  initEvents() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', function() {
        navItems.forEach(navItem => navItem.classList.remove('active'));
        this.classList.add('active');
        
        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('section-change', {
          detail: this.getAttribute('data-section')
        }));
      });
    });
  }

  loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/sidebar.css';
    document.head.appendChild(link);
  }
}