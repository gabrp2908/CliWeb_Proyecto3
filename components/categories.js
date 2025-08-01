class Categories {
  constructor() {
    this.categories = [];
    this.defaultCategories = [
      { id: 1, name: 'Alimentacion'},
      { id: 2, name: 'Transporte'},
      { id: 3, name: 'Ocio'},
      { id: 4, name: 'Servicios'},
      { id: 5, name: 'Salud'},
      { id: 6, name: 'Educacion'},
      { id: 7, name: 'Otros'},
      { id: 8, name: 'Salario'}
    ];
  }

  async render(containerId) {
    await this.loadCategories();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.getTemplate();
      this.initEvents();
      this.loadStyles();
      const modal = document.getElementById('category-modal');
      if (modal) modal.style.display = 'none';
    }
  }

  async loadCategories() {
    let cats = await window.idbUtils.getAll('categories');
    if (!cats || cats.length === 0) {
      await window.idbUtils.putBulk('categories', this.defaultCategories);
      cats = [...this.defaultCategories];
    }
    this.categories = cats;
  }

  getTemplate() {
    return `
      <div class="categories-container">
        <div class="categories-header">
          <button class="btn-add-category">Agregar Categoria</button>
        </div>
        <div class="categories-list">
          ${this.categories.map(category => `
            <div class="category-card" data-id="${category.id}">
              <div class="category-info">
                <h3>${category.name}</h3>
              </div>
              <div class="category-actions">
                <button class="btn-edit"><img src="./assets/images/edit.png" class="icon" alt="Editar"></button>
                <button class="btn-delete"><img src="./assets/images/delete.png" class="icon" alt="Eliminar"></button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="category-modal" id="category-modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2 id="modal-title">Nueva Categoria</h2>
            <form id="category-form">
              <input type="hidden" id="category-id">
              <div class="form-group">
                <label for="category-name">Nombre</label>
                <input type="text" id="category-name" required>
              </div>
              <button type="submit" class="btn-save">Guardar</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  initEvents() {
    document.querySelector('.categories-container')?.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-add-category')) {
        this.openModal();
      }
      
      if (e.target.closest('.btn-edit')) {
        const categoryId = parseInt(e.target.closest('.category-card').getAttribute('data-id'));
        this.editCategory(categoryId);
      }
      
      if (e.target.closest('.btn-delete')) {
        const categoryId = parseInt(e.target.closest('.category-card').getAttribute('data-id'));
        await this.deleteCategory(categoryId);
      }
      
      if (e.target.closest('.close-modal')) {
        this.closeModal();
      }
    });
    
    document.getElementById('category-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveCategory();
    });
  }

  openModal(category = null) {
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    
    if (category) {
      document.getElementById('modal-title').textContent = 'Editar Categoria';
      document.getElementById('category-id').value = category.id;
      document.getElementById('category-name').value = category.name;
    } else {
      document.getElementById('modal-title').textContent = 'Nueva Categoria';
      // Limpiar campos manualmente, no usar form.reset()
      document.getElementById('category-id').value = '';
      document.getElementById('category-name').value = '';
    }
    
    modal.style.display = 'flex';
  }

  closeModal() {
    document.getElementById('category-modal').style.display = 'none';
  }

  editCategory(id) {
    const category = this.categories.find(c => c.id === id);
    if (category) {
      this.openModal(category);
    }
  }

  async deleteCategory(id) {
    if (confirm('¿Esta seguro de eliminar esta categoria?')) {
      await window.idbUtils.deleteById('categories', id);
      await this.loadCategories();
      this.updateCategoriesList();
    }
  }

  async saveCategory() {
    const form = document.getElementById('category-form');
    const idInput = form.querySelector('#category-id');
    const name = form.querySelector('#category-name').value.trim();
    
    if (!name) {
      alert('Ingrese un nombre para la categoria');
      return;
    }

    const nameExists = this.categories.some(cat => 
      cat.name.toLowerCase() === name.toLowerCase() && 
      (!idInput.value || cat.id !== parseInt(idInput.value))
    );
    
    if (nameExists) {
      alert('Ya existe una categoria con ese nombre');
      return;
    }

    let id;
    if (idInput.value) {
      id = parseInt(idInput.value);
    } else {
      id = this.generateUniqueId();
    }

    await window.idbUtils.put('categories', { id, name});
    await this.loadCategories();
    this.closeModal();
    this.updateCategoriesList();
  }

  updateCategoriesList() {
    const categoriesList = document.querySelector('.categories-list');
    if (categoriesList) {
      categoriesList.innerHTML = this.categories.map(category => `
        <div class="category-card" data-id="${category.id}">
          <div class="category-info">
            <h3>${category.name}</h3>
          </div>
          <div class="category-actions">
            <button class="btn-edit"><img src="./assets/images/edit.png" class="icon" alt="Editar"></button>
            <button class="btn-delete"><img src="./assets/images/delete.png" class="icon" alt="Eliminar"></button>
          </div>
        </div>
      `).join('');
    }
  }

  generateUniqueId() {
    if (this.categories.length === 0) return 1;
    const maxId = this.categories.reduce((max, cat) => Math.max(max, cat.id), 0);
    return maxId + 1;
  }

  loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/categories.css';
    document.head.appendChild(link);
  }
}