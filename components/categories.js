class Categories {
  constructor() {
    const defaultCategories = [
      { id: 1, name: 'Alimentacion', type: 'expense' },
      { id: 2, name: 'Transporte', type: 'expense' },
      { id: 3, name: 'Entretenimiento', type: 'expense' },
      { id: 4, name: 'Servicios', type: 'income' },
      { id: 5, name: 'Salud', type: 'income' },
      { id: 6, name: 'Educacion', type: 'income' },
      { id: 7, name: 'Otros', type: 'income' }
    ];

    try {
      const savedCategories = localStorage.getItem('categories');
      this.categories = savedCategories ? JSON.parse(savedCategories) : defaultCategories;
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.categories = defaultCategories;
    }

    this.template = `
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
            <h2 id="modal-title">Nueva Categoría</h2>
            
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

  render(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.template;
      this.initEvents();
      this.loadStyles();
    }
  }

  initEvents() {
    // Delegación de eventos para evitar duplicados
    document.querySelector('.categories-container')?.addEventListener('click', (e) => {
      // Abrir modal para añadir nueva categoría
      if (e.target.closest('.btn-add-category')) {
        this.openModal();
      }
      
      // Botones de editar
      if (e.target.closest('.btn-edit')) {
        const categoryId = parseInt(e.target.closest('.category-card').getAttribute('data-id'));
        this.editCategory(categoryId);
      }
      
      // Botones de eliminar
      if (e.target.closest('.btn-delete')) {
        const categoryId = parseInt(e.target.closest('.category-card').getAttribute('data-id'));
        this.deleteCategory(categoryId);
      }
      
      // Cerrar modal
      if (e.target.closest('.close-modal')) {
        this.closeModal();
      }
    });
    
    // Guardar categoría
    document.getElementById('category-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCategory();
    });
  }

  openModal(category = null) {
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    
    if (category) {
      document.getElementById('modal-title').textContent = 'Editar Categoría';
      document.getElementById('category-id').value = category.id;
      document.getElementById('category-name').value = category.name;
      document.getElementById('category-type').value = category.type;
    } else {
      document.getElementById('modal-title').textContent = 'Nueva Categoría';
      form.reset();
      document.getElementById('category-id').value = '';
    }
    
    modal.style.display = 'block';
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

  deleteCategory(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      this.categories = this.categories.filter(c => c.id !== id);
      localStorage.setItem('categories', JSON.stringify(this.categories));
      this.updateCategoriesList();
    }
  }

  saveCategory() {
    const form = document.getElementById('category-form');
    const idInput = form.querySelector('#category-id');
    const name = form.querySelector('#category-name').value.trim();
    const type = form.querySelector('#category-type').value;
    
    if (!name) {
      alert('Por favor ingresa un nombre para la categoría');
      return;
    }

    if (!['expense', 'income'].includes(type)) {
      alert('Tipo de categoría no válido');
      return;
    }

    const nameExists = this.categories.some(cat => 
      cat.name.toLowerCase() === name.toLowerCase() && 
      (!idInput.value || cat.id !== parseInt(idInput.value))
    );
    
    if (nameExists) {
      alert('Ya existe una categoría con ese nombre');
      return;
    }

    if (idInput.value) {
      const id = parseInt(idInput.value);
      const index = this.categories.findIndex(c => c.id === id);
      if (index !== -1) {
        this.categories[index] = { id, name, type };
      }
    } else {
      const newId = this.generateUniqueId();
      this.categories.push({ id: newId, name, type });
    }

    localStorage.setItem('categories', JSON.stringify(this.categories));
    this.closeModal();
    this.updateCategoriesList(); // Cambiamos this.render por esta nueva función
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