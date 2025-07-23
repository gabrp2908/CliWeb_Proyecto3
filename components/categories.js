class Categories {
  constructor() {
    this.categories = [];
    this.defaultCategories = [
      { id: 1, name: 'Alimentacion', type: 'expense' },
      { id: 2, name: 'Transporte', type: 'expense' },
      { id: 3, name: 'Ocio', type: 'expense' },
      { id: 4, name: 'Servicios', type: 'expense' },
      { id: 5, name: 'Salud', type: 'expense' },
      { id: 6, name: 'Educacion', type: 'expense' },
      { id: 7, name: 'Otros', type: 'income' },
      { id: 8, name: 'Salario', type: 'income' }
    ];
  }

  async render(containerId) {
    await this.loadCategories();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.getTemplate();
      this.initEvents();
      this.loadStyles();
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
                <span class="category-type ${category.type}">${category.type === 'expense' ? 'Egreso' : 'Ingreso'}</span>
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
              <div class="form-group">
                <label for="category-type">Tipo</label>
                <select id="category-type" required>
                  <option value="expense">Egreso</option>
                  <option value="income">Ingreso</option>
                </select>
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
      document.getElementById('category-type').value = category.type;
    } else {
      document.getElementById('modal-title').textContent = 'Nueva Categoria';
      form.reset();
      document.getElementById('category-id').value = '';
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
    const type = form.querySelector('#category-type').value;
    
    if (!name) {
      alert('Ingrese un nombre para la categoria');
      return;
    }

    if (!['expense', 'income'].includes(type)) {
      alert('Tipo de categoria no valido');
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

    await window.idbUtils.put('categories', { id, name, type });
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
            <span class="category-type ${category.type}">${category.type === 'expense' ? 'Egreso' : 'Ingreso'}</span>
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