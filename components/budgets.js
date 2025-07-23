class Budgets {
  constructor() {
    this.budgets = this.loadBudgets();
    this.transactions = this.loadTransactions();
    this.categories = this.loadCategories().filter(c => c.type === 'expense');
    
    this.template = `
      <div class="budgets-container">
        <div class="budgets-header">
          <div class="budgets-actions">
            <button class="btn-add-budget">Agregar Presupuesto</button>
            <div class="budget-filter-container">
              <select id="year-filter">
                ${this.generateYearOptions()}
              </select>
              <select id="month-filter">
                  <option value="0">Todos los meses</option>
                  ${Array.from({length: 12}, (_, i) => `
                    <option value="${i + 1}">${this.getMonthName(i + 1)}</option>
                  `).join('')}
                </select>
              <button class="btn-apply-filters">Aplicar Filtros</button>
            </div>
          </div>
        </div>
        
        <div class="budgets-content">
          <div class="budgets-summary">
            <div class="summary-card">
              <h3>Presupuesto Total</h3>
              <span class="amount" id="total-budget">$0.00</span>
            </div>
            <div class="summary-card">
              <h3>Egresos Reales</h3>
              <span class="amount" id="total-expenses">$0.00</span>
            </div>
            <div class="summary-card">
              <h3>Diferencia</h3>
              <span class="amount balance" id="total-difference">$0.00</span>
            </div>
          </div>
          
          <div class="budgets-alerts" id="budgets-alerts"></div>
          
          <div class="budgets-table-container">
            <table class="budgets-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Presupuesto</th>
                  <th>Egresos Reales</th>
                  <th>Diferencia</th>
                  <th>% Usado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="budgets-body">
                ${this.renderBudgets()}
              </tbody>
            </table>
          </div>
          
          <div class="budget-projection">
            <h3>Proyeccion Mensual de Egresos</h3>
            <canvas id="expenses-chart"></canvas>
          </div>
        </div>
        
        <div class="budget-modal" id="budget-modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2 id="modal-title">Nuevo Presupuesto</h2>
            
            <form id="budget-form">
              <input type="hidden" id="budget-id">
              
              <div class="form-group">
                <label for="budget-year">Año</label>
                <select id="budget-year" required>
                  ${this.generateYearOptions()}
                </select>
              </div>
              
              <div class="form-group">
                <label for="budget-month">Mes</label>
                <select id="budget-month" required>
                  ${Array.from({length: 12}, (_, i) => `
                    <option value="${i + 1}">${this.getMonthName(i + 1)}</option>
                  `).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label for="budget-category">Categoria</label>
                <select id="budget-category" required>
                  ${this.categories.map(cat => `
                    <option value="${cat.id}">${cat.name}</option>
                  `).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label for="budget-amount">Monto Presupuestado</label>
                <input type="number" id="budget-amount" min="0" step="0.01" required>
              </div>
              
              <button type="submit" class="btn-save">Guardar</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  loadBudgets() {
    try {
      const savedBudgets = localStorage.getItem('budgets');
      return savedBudgets ? JSON.parse(savedBudgets) : [];
    } catch (error) {
      console.error('Error al cargar presupuestos:', error);
      return [];
    }
  }

  loadTransactions() {
    try {
      const savedTransactions = localStorage.getItem('transactions');
      return savedTransactions ? JSON.parse(savedTransactions) : [];
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
      return [];
    }
  }

  loadCategories() {
    try {
      const savedCategories = localStorage.getItem('categories');
      return savedCategories ? JSON.parse(savedCategories) : [];
    } catch (error) {
      console.error('Error al cargar categorias:', error);
      return [];
    }
  }

  generateYearOptions() {
    const currentYear = new Date().getFullYear();
    return Array.from({length: 5}, (_, i) => `
      <option value="${currentYear + i}">${currentYear + i}</option>
    `).join('');
  }

  getMonthName(monthNumber) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthNumber - 1];
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.template;
      this.initEvents();
      this.updateSummary();
      this.renderAlerts();
      this.loadStyles();
      this.initChart();
    }
  }

  initEvents() {
    // Delegacion de eventos
    document.querySelector('.budgets-container')?.addEventListener('click', (e) => {
      // Abrir modal para añadir nuevo presupuesto
      if (e.target.closest('.btn-add-budget')) {
        this.openModal();
      }
      
      // Botones de editar
      if (e.target.closest('.btn-edit')) {
        const budgetId = e.target.closest('tr').getAttribute('data-id');
        this.editBudget(budgetId);
      }
      
      // Botones de eliminar
      if (e.target.closest('.btn-delete')) {
        const budgetId = e.target.closest('tr').getAttribute('data-id');
        this.deleteBudget(budgetId);
      }
      
      // Cerrar modal
      if (e.target.closest('.close-modal')) {
        this.closeModal();
      }
      
      // Aplicar filtros
      if (e.target.closest('.btn-apply-filters')) {
        this.applyFilters();
      }
    });
    
    // Guardar presupuesto
    document.getElementById('budget-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBudget();
    });
  }

  openModal(budget = null) {
    const modal = document.getElementById('budget-modal');
    const form = document.getElementById('budget-form');
    
    if (budget) {
      document.getElementById('modal-title').textContent = 'Editar Presupuesto';
      document.getElementById('budget-id').value = budget.id;
      document.getElementById('budget-year').value = budget.year;
      document.getElementById('budget-month').value = budget.month;
      document.getElementById('budget-category').value = budget.categoryId;
      document.getElementById('budget-amount').value = budget.amount;
    } else {
      document.getElementById('modal-title').textContent = 'Nuevo Presupuesto';
      form.reset();
      document.getElementById('budget-id').value = '';
      // Establecer año y mes actual por defecto
      const now = new Date();
      document.getElementById('budget-year').value = now.getFullYear();
      document.getElementById('budget-month').value = now.getMonth() + 1;
    }
    
    modal.style.display = 'block';
  }

  closeModal() {
    document.getElementById('budget-modal').style.display = 'none';
  }

  editBudget(id) {
    const budget = this.budgets.find(b => b.id === id);
    if (budget) {
      this.openModal(budget);
    }
  }

  deleteBudget(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      this.budgets = this.budgets.filter(b => b.id !== id);
      this.saveBudgets();
      this.updateBudgetsList();
      this.updateSummary();
      this.renderAlerts();
      this.updateChart();
    }
  }

  saveBudget() {
    const form = document.getElementById('budget-form');
    const idInput = form.querySelector('#budget-id');
    const year = parseInt(form.querySelector('#budget-year').value);
    const month = parseInt(form.querySelector('#budget-month').value);
    const categoryId = form.querySelector('#budget-category').value;
    const amount = parseFloat(form.querySelector('#budget-amount').value);
    
    // Validaciones
    if (isNaN(year) || year < 2000 || year > 2100) {
      alert('Por favor ingresa un año válido');
      return;
    }
    
    if (isNaN(month) || month < 1 || month > 12) {
      alert('Por favor selecciona un mes válido');
      return;
    }
    
    if (!categoryId) {
      alert('Por favor selecciona una categoria');
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    // Verificar si ya existe un presupuesto para esta categoria en el mismo mes/año
    const existingBudget = this.budgets.find(b => 
      b.year === year && 
      b.month === month && 
      b.categoryId === categoryId &&
      (!idInput.value || b.id !== idInput.value)
    );
    
    if (existingBudget) {
      const category = this.categories.find(c => c.id === categoryId);
      alert(`Ya existe un presupuesto para ${category.name} en ${this.getMonthName(month)}/${year}`);
      return;
    }

    if (idInput.value) {
      // Editar presupuesto existente
      const id = idInput.value;
      const index = this.budgets.findIndex(b => b.id === id);
      if (index !== -1) {
        this.budgets[index] = { id, year, month, categoryId, amount };
      }
    } else {
      // Crear nuevo presupuesto
      const newId = this.generateUniqueId();
      this.budgets.push({ id: newId, year, month, categoryId, amount });
    }

    this.saveBudgets();
    this.closeModal();
    this.updateBudgetsList();
    this.updateSummary();
    this.renderAlerts();
    this.updateChart();
  }

  saveBudgets() {
    localStorage.setItem('budgets', JSON.stringify(this.budgets));
  }

  updateBudgetsList() {
    const tbody = document.getElementById('budgets-body');
    if (tbody) {
      tbody.innerHTML = this.renderBudgets();
    }
  }

  renderBudgets() {
    const selectedYear = document.getElementById('year-filter')?.value || new Date().getFullYear();
    const selectedMonth = document.getElementById('month-filter')?.value || '0';
    
    // Filtramos presupuestos por año y mes (si no es "Todos los meses")
    const filteredBudgets = this.budgets.filter(b => 
      b.year == selectedYear && 
      (selectedMonth === '0' || b.month == selectedMonth)
    );

    // Obtenemos todas las categorias con presupuesto según los filtros
    const categoriesWithBudget = [...new Set(
      filteredBudgets.map(b => b.categoryId)
    )];

    return categoriesWithBudget.map(categoryId => {
      const category = this.categories.find(c => c.id == categoryId) || { name: 'Desconocida' };
      
      // Calculamos el presupuesto total para la categoria según los filtros
      const totalBudget = filteredBudgets
        .filter(b => b.categoryId == categoryId)
        .reduce((sum, b) => sum + b.amount, 0);
      
      // Calculamos los gastos reales para la categoria según los filtros
      const totalExpenses = this.transactions
        .filter(t => 
          t.type === 'expense' && 
          t.categoryId == categoryId &&
          new Date(t.date).getFullYear() == selectedYear &&
          (selectedMonth === '0' || new Date(t.date).getMonth() + 1 == selectedMonth)
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Resto del método permanece igual
      const difference = totalBudget - totalExpenses;
      const percentageUsed = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
      
      let statusClass = '';
      let statusText = '';
      
      if (totalBudget === 0) {
        statusClass = 'inactive';
        statusText = 'Sin presupuesto';
      } else if (percentageUsed >= 90) {
        statusClass = 'danger';
        statusText = 'Egreso Alto';
      } else if (percentageUsed >= 70) {
        statusClass = 'warning';
        statusText = 'Egreso Medio';
      } else {
        statusClass = 'safe';
        statusText = 'Egreso Bajo';
      }
      
      return `
        <tr data-id="${categoryId}">
          <td>${category.name}</td>
          <td class="amount">${this.formatCurrency(totalBudget)}</td>
          <td class="amount">${this.formatCurrency(totalExpenses)}</td>
          <td class="amount ${difference >= 0 ? 'positive' : 'negative'}">
            ${this.formatCurrency(Math.abs(difference))}
          </td>
          <td>
            <div class="progress-container">
              <div class="progress-bar" style="width: ${Math.min(percentageUsed, 100)}%"></div>
              <span>${percentageUsed.toFixed(1)}%</span>
            </div>
          </td>
          <td>
            <span class="status ${statusClass}">${statusText}</span>
          </td>
          <td class="actions">
            <button class="btn-edit"><img src="./assets/images/edit.png" class="icon" alt="Editar"></button>
            <button class="btn-delete"><img src="./assets/images/delete.png" class="icon" alt="Eliminar"></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  applyFilters() {
    this.updateBudgetsList();
    this.updateSummary();
    this.renderAlerts();
    this.updateChart();
  }

  updateSummary() {
    const selectedYear = document.getElementById('year-filter')?.value || new Date().getFullYear();
    const selectedMonth = document.getElementById('month-filter')?.value || '0';
    
    const filteredBudgets = this.budgets.filter(b => 
      b.year == selectedYear && 
      (selectedMonth === '0' || b.month == selectedMonth)
    );
    
    const filteredExpenses = this.transactions
      .filter(t => 
        t.type === 'expense' && 
        new Date(t.date).getFullYear() == selectedYear &&
        (selectedMonth === '0' || new Date(t.date).getMonth() + 1 == selectedMonth)
      );
    
    // Resto del método permanece igual
    const totalBudget = filteredBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);
    const difference = totalBudget - totalExpenses;
    
    const totalBudgetElement = document.getElementById('total-budget');
    const totalExpensesElement = document.getElementById('total-expenses');
    const totalDifferenceElement = document.getElementById('total-difference');
    
    if (totalBudgetElement) totalBudgetElement.textContent = this.formatCurrency(totalBudget);
    if (totalExpensesElement) totalExpensesElement.textContent = this.formatCurrency(totalExpenses);
    if (totalDifferenceElement) {
      totalDifferenceElement.textContent = this.formatCurrency(Math.abs(difference));
      totalDifferenceElement.className = 'amount balance ' + (difference >= 0 ? 'positive' : 'negative');
    }
  }

  renderAlerts() {
    const alertsContainer = document.getElementById('budgets-alerts');
    if (!alertsContainer) return;
    
    const selectedYear = document.getElementById('year-filter')?.value || new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Solo mostrar alertas para el mes actual del año actual
    if (selectedYear != currentYear) {
      alertsContainer.innerHTML = `
        <div class="alert info">
          Las alertas solo están disponibles para el año en curso.
        </div>
      `;
      return;
    }

    // Obtener presupuestos del mes actual
    const currentBudgets = this.budgets.filter(b => 
      b.year == selectedYear && b.month == currentMonth
    );
    
    const alerts = [];
    
    currentBudgets.forEach(budget => {
      const category = this.categories.find(c => c.id === budget.categoryId) || { name: 'Desconocida' };
      
      // Calcular gastos reales para esta categoria en el mes actual
      const expenses = this.transactions
        .filter(t => 
          t.type === 'expense' && 
          t.categoryId === budget.categoryId &&
          new Date(t.date).getFullYear() == budget.year &&
          new Date(t.date).getMonth() + 1 == budget.month
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calcular porcentaje usado (con proteccion contra division por cero)
      const percentage = budget.amount > 0 ? (expenses / budget.amount) * 100 : 0;
      
      // Generar alertas solo si hay presupuesto asignado
      if (budget.amount > 0) {
        if (expenses > budget.amount) {
          alerts.push(`
            <div class="alert danger">
              <strong>¡Presupuesto excedido!</strong> 
              ${category.name}: Presupuesto ${this.formatCurrency(budget.amount)} | 
              Egresos ${this.formatCurrency(expenses)} | 
              Exceso ${this.formatCurrency(expenses - budget.amount)} (${percentage.toFixed(1)}%)
            </div>
          `);
        } else if (percentage > 80) {
          alerts.push(`
            <div class="alert warning">
              <strong>Atencion:</strong> 
              ${category.name} ha usado el ${percentage.toFixed(1)}% de su presupuesto 
              (${this.formatCurrency(expenses)} de ${this.formatCurrency(budget.amount)})
            </div>
          `);
        }
      }
    });
    
    }

  initChart() {
    this.chartCanvas = document.getElementById('expenses-chart');
    if (this.chartCanvas && window.Chart) {
      this.updateChart();
    }
  }

  updateChart() {
    if (!this.chartCanvas || !window.Chart) return;
    
    const selectedYear = document.getElementById('year-filter')?.value || new Date().getFullYear();
    const selectedMonth = document.getElementById('month-filter')?.value || '0';
    
    // Si hay un mes seleccionado, mostramos solo ese mes
    if (selectedMonth !== '0') {
      const monthName = this.getMonthName(selectedMonth);
      
      // Calcular gastos para el mes seleccionado
      const expenses = this.transactions
        .filter(t => 
          t.type === 'expense' && 
          new Date(t.date).getFullYear() == selectedYear &&
          new Date(t.date).getMonth() + 1 == selectedMonth
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calcular presupuesto para el mes seleccionado
      const budget = this.budgets
        .filter(b => b.year == selectedYear && b.month == selectedMonth)
        .reduce((sum, b) => sum + b.amount, 0);
      
      // Destruir el gráfico anterior si existe
      if (this.expensesChart) {
        this.expensesChart.destroy();
      }
      
      this.expensesChart = new Chart(this.chartCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [monthName],
          datasets: [
            {
              label: 'Presupuesto',
              data: [budget],
              backgroundColor: 'rgba(236, 168, 103, 0.7)',
              borderColor: 'rgba(236, 168, 103, 1)',
              borderWidth: 1
            },
            {
              label: 'Egresos Reales',
              data: [expenses],
              backgroundColor: 'rgba(255, 107, 107, 0.7)',
              borderColor: 'rgba(255, 107, 107, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: value => this.formatCurrency(value)
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: context => {
                  const label = context.dataset.label || '';
                  const value = context.raw || 0;
                  return `${label}: ${this.formatCurrency(value)}`;
                }
              }
            }
          }
        }
      });
    } else {
      // Mostrar todos los meses (código original)
      const months = Array.from({length: 12}, (_, i) => this.getMonthName(i + 1));
      
      const monthlyExpenses = Array(12).fill(0);
      this.transactions
        .filter(t => 
          t.type === 'expense' && 
          new Date(t.date).getFullYear() == selectedYear
        )
        .forEach(t => {
          const month = new Date(t.date).getMonth();
          monthlyExpenses[month] += t.amount;
        });
      
      const monthlyBudgets = Array(12).fill(0);
      this.budgets
        .filter(b => b.year == selectedYear)
        .forEach(b => {
          monthlyBudgets[b.month - 1] += b.amount;
        });
      
      if (this.expensesChart) {
        this.expensesChart.destroy();
      }
      
      this.expensesChart = new Chart(this.chartCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Presupuesto',
              data: monthlyBudgets,
              backgroundColor: 'rgba(236, 168, 103, 0.7)',
              borderColor: 'rgba(236, 168, 103, 1)',
              borderWidth: 1
            },
            {
              label: 'Egresos Reales',
              data: monthlyExpenses,
              backgroundColor: 'rgba(255, 107, 107, 0.7)',
              borderColor: 'rgba(255, 107, 107, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: value => this.formatCurrency(value)
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: context => {
                  const label = context.dataset.label || '';
                  const value = context.raw || 0;
                  return `${label}: ${this.formatCurrency(value)}`;
                }
              }
            }
          }
        }
      });
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  generateUniqueId() {
    if (this.budgets.length === 0) return '1';
    const maxId = this.budgets.reduce((max, b) => Math.max(max, parseInt(b.id)), 0);
    return (maxId + 1).toString();
  }

  loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/budgets.css';
    document.head.appendChild(link);
  }
}