class Sidebar {
  constructor() {
    this.template = `
      <nav class="sidebar">
        <div class="sidebar-header">
          <img src="assets/images/Title.png" class="logo">
        </div>
        
        <ul class="nav">
          <li class="nav-item active" data-section="dashboard">
            <img src="./assets/images/blue_chicken.png" class="icon">
            <span>Dashboard</span>
          </li>
          <li class="nav-item" data-section="transactions">
            <img src="./assets/images/stardrop.png" class="icon">
            <span>Transacciones</span>
          </li>
          <li class="nav-item" data-section="categories">
            <img src="./assets/images/junimo.png" class="icon">
            <span>Categorias</span>
          </li>
          <li class="nav-item" data-section="budgets">
            <img src="./assets/images/prismatic_shard.png" class="icon">
            <span>Presupuestos</span>
          </li>
        </ul>
        
        <div class="sidebar-footer">
        <img src="./assets/images/erick.png"><img src="./assets/images/gabriela.png">
        <h5>Creado por:</h5> 
        <h5>Erick Diaz y Gabriela Rey</h5>
        </div>
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