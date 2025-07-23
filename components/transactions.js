class Transactions {
  constructor() {
    this.transactions = [];
    this.categories = [];
  }

  async render(containerId) {
    await this.loadCategories();
    await this.loadTransactions();
    this.template = this.getTemplate();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.template;
      this.initEvents();
      this.updateSummary();
      this.loadStyles();
      const modal = document.getElementById('transaction-modal');
      if (modal) modal.style.display = 'none';
    }
  }

  async loadTransactions() {
    try {
      this.transactions = await window.idbUtils.getAll('transactions');
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
      this.transactions = [];
    }
  }

  async loadCategories() {
    try {
      this.categories = await window.idbUtils.getAll('categories');
    } catch (error) {
      console.error('Error al cargar categorias:', error);
      this.categories = [];
    }
  }

  getTemplate() {
    return `
      <div class="transactions-container">
        <div class="transactions-header">
          <div class="transactions-actions">
            <button class="btn-add-transaction">Agregar Transaccion</button>
            <div class="search-filter-container">
              <input type="text" id="search-input" placeholder="Buscar por descripcion...">
              <select id="type-filter">
                <option value="all">Todos los tipos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Egresos</option>
              </select>
              <select id="category-filter">
                <option value="all">Todas las categorias</option>
                ${this.categories.map(cat => 
                  `<option value="${cat.id}">${cat.name}</option>`
                ).join('')}
              </select>
              <button class="btn-apply-filters">Aplicar Filtros</button>
              <button class="btn-clear-filters">Limpiar Filtros</button>
            </div>
          </div>
        </div>
        <div class="transactions-list">
          <div class="transactions-summary">
            <div class="summary-card">
              <h3>Ingresos</h3>
              <span class="amount income" id="total-income">$0.00</span>
            </div>
            <div class="summary-card">
              <h3>Egresos</h3>
              <span class="amount expense" id="total-expense">$0.00</span>
            </div>
            <div class="summary-card">
              <h3>Balance</h3>
              <span class="amount balance" id="total-balance">$0.00</span>
            </div>
          </div>
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripcion</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="transactions-body">
              ${this.renderTransactions(this.transactions)}
            </tbody>
          </table>
        </div>
        <div class="transaction-modal" id="transaction-modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2 id="modal-title">Nueva Transaccion</h2>
            <form id="transaction-form">
              <input type="hidden" id="transaction-id">
              <div class="form-group">
                <label for="transaction-date">Fecha</label>
                <input type="date" id="transaction-date" required>
              </div>
              <div class="form-group">
                <label for="transaction-description">Descripcion</label>
                <input type="text" id="transaction-description" required>
              </div>
              <div class="form-group">
                <label for="transaction-category">Categoria</label>
                <select id="transaction-category" required>
                  ${this.categories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="transaction-type">Tipo</label>
                <select id="transaction-type" required>
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <div class="form-group">
                <label for="transaction-amount">Monto</label>
                <input type="number" id="transaction-amount" min="0" step="0.01" required>
              </div>
              <button type="submit" class="btn-save">Guardar</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  initEvents() {
    document.querySelector('.transactions-container')?.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-add-transaction')) {
        this.openModal();
      }
      if (e.target.closest('.btn-edit')) {
        const transactionId = e.target.closest('tr').getAttribute('data-id');
        this.editTransaction(transactionId);
      }
      if (e.target.closest('.btn-delete')) {
        const transactionId = e.target.closest('tr').getAttribute('data-id');
        await this.deleteTransaction(transactionId);
      }
      if (e.target.closest('.close-modal')) {
        this.closeModal();
      }
    });
    document.querySelector('.btn-apply-filters')?.addEventListener('click', () => {
      this.applyFilters();
    });
    document.querySelector('.btn-clear-filters')?.addEventListener('click', () => {
      this.clearFilters();
    });
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.applyFilters();
      }
    });
    document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveTransaction();
    });
  }

  openModal(transaction = null) {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    
    if (transaction) {
      document.getElementById('modal-title').textContent = 'Editar Transaccion';
      document.getElementById('transaction-id').value = transaction.id;
      document.getElementById('transaction-date').value = transaction.date;
      document.getElementById('transaction-description').value = transaction.description;
      document.getElementById('transaction-category').value = transaction.categoryId;
      document.getElementById('transaction-type').value = transaction.type;
      document.getElementById('transaction-amount').value = transaction.amount;
    } else {
      document.getElementById('modal-title').textContent = 'Nueva Transaccion';
      form.reset();
      document.getElementById('transaction-id').value = '';
      // Establecer fecha actual por defecto
      document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
  }

  closeModal() {
    document.getElementById('transaction-modal').style.display = 'none';
  }

  editTransaction(id) {
    const transaction = this.transactions.find(t => t.id === id);
    if (transaction) {
      this.openModal(transaction);
    }
  }

  async deleteTransaction(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta transaccion?')) {
      await window.idbUtils.deleteById('transactions', id);
      await this.loadTransactions();
      this.updateTransactionsList();
      this.updateSummary();
    }
  }

  async saveTransaction() {
    const form = document.getElementById('transaction-form');
    const idInput = form.querySelector('#transaction-id');
    const date = form.querySelector('#transaction-date').value;
    const description = form.querySelector('#transaction-description').value.trim();
    const categoryId = form.querySelector('#transaction-category').value;
    const type = form.querySelector('#transaction-type').value;
    const amount = parseFloat(form.querySelector('#transaction-amount').value);
    
    // Validaciones
    if (!date) {
      alert('Por favor ingresa una fecha');
      return;
    }
    
    if (!description) {
      alert('Por favor ingresa una descripcion');
      return;
    }
    
    if (!categoryId) {
      alert('Por favor selecciona una categoria');
      return;
    }
    
    if (!['income', 'expense'].includes(type)) {
      alert('Tipo de transaccion no válido');
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }
    let id;
    if (idInput.value) {
      id = idInput.value;
    } else {
      id = this.generateUniqueId();
    }
    await window.idbUtils.put('transactions', { id, date, description, categoryId, type, amount });
    await this.loadTransactions();
    this.closeModal();
    this.updateTransactionsList();
    this.updateSummary();
  }

  updateTransactionsList(transactions = this.transactions) {
    const tbody = document.getElementById('transactions-body');
    if (tbody) {
      tbody.innerHTML = this.renderTransactions(transactions);
    }
  }

  renderTransactions(transactions) {
    return transactions.map(transaction => {
      const category = this.categories.find(c => c.id == transaction.categoryId) || { name: 'Desconocida' };
      return `
        <tr data-id="${transaction.id}">
          <td>${this.formatDate(transaction.date)}</td>
          <td>${transaction.description}</td>
          <td>${category.name}</td>
          <td><span class="transaction-type ${transaction.type}">${transaction.type === 'income' ? 'Ingreso' : 'Egreso'}</span></td>
          <td class="amount ${transaction.type}">${this.formatCurrency(transaction.amount)}</td>
          <td class="actions">
            <button class="btn-edit"><img src="./assets/images/edit.png" class="icon" alt="Editar"></button>
            <button class="btn-delete"><img src="./assets/images/delete.png" class="icon" alt="Eliminar"></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filteredTransactions = this.transactions;
    
    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.description.toLowerCase().includes(searchTerm))
    }
    
    // Aplicar filtro por tipo
    if (typeFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    // Aplicar filtro por categoria
    if (categoryFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.categoryId == categoryFilter);
    }
    
    this.updateTransactionsList(filteredTransactions);
  }

  clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('type-filter').value = 'all';
    document.getElementById('category-filter').value = 'all';
    this.updateTransactionsList();
  }

  updateSummary() {
    const income = this.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = this.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    const totalIncomeElement = document.getElementById('total-income');
    const totalExpenseElement = document.getElementById('total-expense');
    const totalBalanceElement = document.getElementById('total-balance');
    
    if (totalIncomeElement) totalIncomeElement.textContent = this.formatCurrency(income);
    if (totalExpenseElement) totalExpenseElement.textContent = this.formatCurrency(expense);
    if (totalBalanceElement) totalBalanceElement.textContent = this.formatCurrency(balance);
    
    // Actualizar clase del balance según sea positivo o negativo
    if (totalBalanceElement) {
      totalBalanceElement.className = 'amount balance ' + (balance >= 0 ? 'positive' : 'negative');
    }
  }

  formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  generateUniqueId() {
    if (this.transactions.length === 0) return '1';
    const maxId = this.transactions.reduce((max, t) => Math.max(max, parseInt(t.id)), 0);
    return (maxId + 1).toString();
  }

  loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/transactions.css';
    document.head.appendChild(link);
  }
}