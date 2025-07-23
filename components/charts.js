class Charts {
  constructor() {
    this.transactions = [];
    this.categories = [];
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.chartInstances = {};
  }

  async render(containerId) {
    await this.loadDataFromIDB();
    this.template = this.getTemplate();
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = this.template;
    this.showLoadingSkeletons();

    this.loadChartJs().then(() => {
      this.initCharts();
      this.initDateControls();
      this.hideLoadingSkeletons();
    }).catch(error => {
      console.error('Error loading Chart.js:', error);
      this.hideLoadingSkeletons();
    });

    this.loadStyles();
  }

  async loadDataFromIDB() {
    try {
      this.transactions = await window.idbUtils.getAll('transactions');
      this.categories = await window.idbUtils.getAll('categories');
    } catch (error) {
      console.error('Error al cargar datos de IndexedDB:', error);
      this.transactions = [];
      this.categories = [];
    }
  }

  getTemplate() {
    return `
    <div class="charts-container">
        <div class="date-controls">
          <h3>Filtrar por:</h3>
          <div class="select-wrapper">
            <select id="month-select" class="date-select">
              ${this.getMonthOptions()}
            </select>
            <div class="select-arrow"></div>
          </div>
          <div class="select-wrapper">
            <select id="year-select" class="date-select">
              ${this.getYearOptions()}
            </select>
            <div class="select-arrow"></div>
          </div>
          <button id="apply-filters-btn" class="apply-btn">Aplicar Filtros</button>
        </div>
      
      <div class="row">
        <div class="card chart-card">
          <h2>Egresos por Categoria</h2>
          <div id="expenses-by-category-chart-container" class="chart-container">
            <canvas id="expenses-by-category-chart"></canvas>
          </div>
        </div>
        
        <div class="card chart-card">
          <h2>Distribucion Egresos vs Ingresos</h2>
          <div id="expenses-vs-income-chart-container" class="chart-container">
            <canvas id="expenses-vs-income-chart"></canvas>
          </div>
        </div>
      </div>
        
      <div class="row">
        <div class="card chart-card">
            <h2>Balance Real vs Estimado</h2>
            <div id="real-vs-estimated-chart-container" class="chart-container">
            <canvas id="real-vs-estimated-chart"></canvas>
            </div>
        </div>
     
        <div class="card chart-card">
          <h2>Evolucion del Balance (Anual)</h2>
          <div id="balance-evolution-chart-container" class="chart-container">
            <canvas id="balance-evolution-chart"></canvas>
        </div>
      </div>
    </div>
    `;
  }

  getMonthOptions() {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const options = months.map((month, index) => 
      `<option value="${index}" ${index === this.currentMonth ? 'selected' : ''}>
        ${month}
      </option>`
    );
    
    return options.join('');
  }

  getYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 1;
    const years = [];
    for (let i = startYear; i <= endYear; i++) {
      years.push(i);
    }
    const options = years.map(year => 
      `<option value="${year}" ${year === this.currentYear ? 'selected' : ''}>
        ${year}
      </option>`
    );
    return options.join('');
  }

  filterTransactionsByMonthYear(transactions, month, year) {
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  filterTransactionsByYear(transactions, year) {
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getFullYear() === year;
    });
  }
  updateExpensesByCategory(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoriesData = {};

    expenses.forEach(expense => {
      const category = this.categories.find(c => c.id == expense.categoryId);
      const categoryName = category ? category.name : 'Desconocida';
      categoriesData[categoryName] = (categoriesData[categoryName] || 0) + expense.amount;
    });

    this.chartInstances.expensesByCategory.data.labels = Object.keys(categoriesData);
    this.chartInstances.expensesByCategory.data.datasets[0].data = Object.values(categoriesData);
    this.chartInstances.expensesByCategory.update();
  }

  updateExpensesVsIncome(transactions) {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    this.chartInstances.expensesVsIncome.data.datasets[0].data = [income, expenses];
    this.chartInstances.expensesVsIncome.update();
  }

  updateBalanceEvolution(transactions) {
    const monthlyBalance = Array(12).fill(0);
    
    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      monthlyBalance[month] += t.type === 'income' ? t.amount : -t.amount;
    });

    let accumulated = 0;
    const accumulatedData = monthlyBalance.map(value => accumulated += value);

    this.chartInstances.balanceEvolution.data.datasets[0].data = accumulatedData;
    this.chartInstances.balanceEvolution.update();
  }

  updateRealVsEstimated(transactions) {
    const monthlyData = Array(12).fill(0);
    
    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      monthlyData[month] += t.type === 'income' ? t.amount : -t.amount;
    });

    this.chartInstances.realVsEstimated.data.datasets[0].data = monthlyData;
    this.chartInstances.realVsEstimated.update();
  }

  initDateControls() {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const applyBtn = document.getElementById('apply-filters-btn');
    
    if (!monthSelect || !yearSelect || !applyBtn) return;

    this.currentMonth = parseInt(monthSelect.value);
    this.currentYear = parseInt(yearSelect.value);

    applyBtn.addEventListener('click', () => {
      this.currentMonth = parseInt(monthSelect.value);
      this.currentYear = parseInt(yearSelect.value);
      this.updateAllCharts();
    });

    let updateTimeout;
    const debounceUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        applyBtn.click(); 
      }, 1000);
    };

    monthSelect.addEventListener('change', debounceUpdate);
    yearSelect.addEventListener('change', debounceUpdate);
  }

  updateAllCharts() {
    const applyBtn = document.getElementById('apply-filters-btn');
    if (applyBtn) {
      applyBtn.classList.add('loading');
      applyBtn.disabled = true;
    }

    setTimeout(() => {
      try {
        const monthlyTransactions = this.filterTransactionsByMonthYear(
          this.transactions, 
          this.currentMonth, 
          this.currentYear
        );
        const yearlyTransactions = this.filterTransactionsByYear(
          this.transactions, 
          this.currentYear
        );

        if (this.chartInstances.expensesByCategory) {
          this.updateExpensesByCategory(monthlyTransactions);
        }
        if (this.chartInstances.expensesVsIncome) {
          this.updateExpensesVsIncome(monthlyTransactions);
        }
        if (this.chartInstances.balanceEvolution) {
          this.updateBalanceEvolution(yearlyTransactions);
        }
        if (this.chartInstances.realVsEstimated) {
          this.updateRealVsEstimated(yearlyTransactions);
        }
      } catch (error) {
        console.error('Error updating charts:', error);
      } finally {
        if (applyBtn) {
          applyBtn.classList.remove('loading');
          applyBtn.disabled = false;
        }
      }
    }, 100);
  }

  setupAutoUpdate() {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    let updateTimeout;

    const handleChange = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        this.currentMonth = parseInt(monthSelect.value);
        this.currentYear = parseInt(yearSelect.value);
        this.updateAllCharts();
      }, 300); 
    };

    monthSelect.addEventListener('change', handleChange);
    yearSelect.addEventListener('change', handleChange);
  }

  setLoadingState(isLoading) {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    
    if (isLoading) {
      monthSelect.classList.add('select-loading');
      yearSelect.classList.add('select-loading');
      
      document.querySelectorAll('.chart-container').forEach(container => {
        container.classList.add('chart-updating');
      });
    } else {
      monthSelect.classList.remove('select-loading');
      yearSelect.classList.remove('select-loading');
      document.querySelectorAll('.chart-container').forEach(container => {
        container.classList.remove('chart-updating');
      });
    }
  }

  showLoadingSkeletons() {
    document.querySelectorAll('.chart-container').forEach(container => {
      const skeleton = document.createElement('div');
      skeleton.className = 'chart-skeleton';
      container.appendChild(skeleton);
      container.style.position = 'relative';
    });
  }

  hideLoadingSkeletons() {
    document.querySelectorAll('.chart-skeleton').forEach(skeleton => {
      skeleton.remove();
    });
  }

  updateMonthlyCharts() {
    const filteredTransactions = this.filterTransactionsByDate(
      this.transactions, 
      this.currentMonth, 
      this.currentYear
    );

    if (this.chartInstances.expensesByCategory) {
      const categoriesData = this.getCategoriesData(filteredTransactions);
      this.chartInstances.expensesByCategory.data.labels = Object.keys(categoriesData);
      this.chartInstances.expensesByCategory.data.datasets[0].data = Object.values(categoriesData);
      this.chartInstances.expensesByCategory.update();
    }

    if (this.chartInstances.expensesVsIncome) {
      const { income, expenses } = this.getIncomeExpensesData(filteredTransactions);
      this.chartInstances.expensesVsIncome.data.datasets[0].data = [income, expenses];
      this.chartInstances.expensesVsIncome.update();
    }
  }

  updateAnnualChart() {
    const yearlyTransactions = this.filterTransactionsByYear(
      this.transactions,
      this.currentYear
    );
    
    if (this.chartInstances.balanceEvolution) {
      const balanceData = this.getYearlyBalanceData(yearlyTransactions);
      this.chartInstances.balanceEvolution.data.datasets[0].data = balanceData;
      this.chartInstances.balanceEvolution.update();
    }
  }

  getCategoriesData(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoriesData = {};
    
    expenses.forEach(expense => {
      const category = this.categories.find(c => c.id == expense.categoryId);
      const categoryName = category ? category.name : 'Desconocida';
      
      if (!categoriesData[categoryName]) {
        categoriesData[categoryName] = 0;
      }
      categoriesData[categoryName] += expense.amount;
    });
    
    return categoriesData;
  }

  getIncomeExpensesData(transactions) {
    let income = 0;
    let expenses = 0;
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expenses += t.amount;
      }
    });
    
    return { income, expenses };
  }

  getYearlyBalanceData(transactions) {
    const monthlyBalance = Array(12).fill(0);
    
    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      if (t.type === 'income') {
        monthlyBalance[month] += t.amount;
      } else {
        monthlyBalance[month] -= t.amount;
      }
    });
    
    let accumulated = 0;
    return monthlyBalance.map(value => {
      accumulated += value;
      return accumulated;
    });
  }

  loadChartJs() {
    return new Promise((resolve, reject) => {
      if (typeof Chart !== 'undefined') {
        console.log('Chart.js ya está cargado');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => {
        console.log('Chart.js cargado correctamente');
        resolve();
      };
      script.onerror = () => {
        console.error('Error al cargar Chart.js');
        reject(new Error('Error al cargar Chart.js'));
      };
      document.head.appendChild(script);
    });
  }

  initCharts() {
    Object.values(this.chartInstances || {}).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    
    this.chartInstances = {
      expensesByCategory: this.renderExpensesByCategoryChart(this.currentMonth, this.currentYear),
      realVsEstimated: this.renderRealVsEstimatedChart(this.currentYear),
      balanceEvolution: this.renderBalanceEvolutionChart(this.currentYear),
      expensesVsIncome: this.renderExpensesVsIncomeChart(this.currentMonth, this.currentYear)
    };
  }

  renderExpensesByCategoryChart(month, year) {
    const expenses = this.transactions.filter(t =>
      t.type === 'expense' &&
      new Date(t.date).getMonth() === month &&
      new Date(t.date).getFullYear() === year
    );

    const categoriesData = {};
    expenses.forEach(expense => {
      const category = this.categories.find(c => c.id == expense.categoryId);
      const categoryName = category ? category.name : 'Desconocida';
      categoriesData[categoryName] = (categoriesData[categoryName] || 0) + expense.amount;
    });

    const ctx = document.getElementById('expenses-by-category-chart');
    if (!ctx) {
      console.error('No se encontró el canvas para el gráfico de gastos por categoría');
      return null;
    }
    
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categoriesData),
        datasets: [{
          data: Object.values(categoriesData),
          backgroundColor: this.generateColors(Object.keys(categoriesData).length),
          borderWidth: 1,
          borderColor: 'var(--light-beige)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
        duration: 300,
        easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'left',
            labels: {
              font: {
                family: 'game',
                size: 20
              },
              padding: 22
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  renderRealVsEstimatedChart(year) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const realData = Array(12).fill(0);
    const estimatedData = Array(12).fill(0).map(() => Math.random() * 2000 + 1000); // Datos de ejemplo
    
    this.transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() === year) {
        const month = date.getMonth();
        if (t.type === 'income') {
          realData[month] += t.amount;
        } else {
          realData[month] -= t.amount;
        }
      }
    });
    
    const ctx = document.getElementById('real-vs-estimated-chart');
    if (!ctx) {
      console.error('No se encontró el canvas para el gráfico real vs estimado');
      return null;
    }
    
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Real',
            data: realData,
            borderColor: '#4a3c2a',
            backgroundColor: 'rgba(255, 209, 102, 0.1)',
            tension: 0.3,
            fill: true,
            borderWidth: 3
          },
          {
            label: 'Estimado',
            data: estimatedData,
            borderColor: '#4a3c2a',
            backgroundColor: 'rgba(255, 209, 102, 0.1)',
            borderDash: [5, 5],
            tension: 0.3,
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
        duration: 300,
        easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                family: 'game',
                size: 18
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: $${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              },
              font: {
                size: 18,
                family: 'game'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 18,
                family: 'game'
              }
            }
          }
        }
      }
    });
  }

  renderBalanceEvolutionChart(year) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const balanceData = Array(12).fill(0);
    
    this.transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() === year) {
        const month = date.getMonth();
        if (t.type === 'income') {
          balanceData[month] += t.amount;
        } else {
          balanceData[month] -= t.amount;
        }
      }
    });

    let accumulated = 0;
    const accumulatedData = balanceData.map(value => {
      accumulated += value;
      return accumulated;
    });
    
    const ctx = document.getElementById('balance-evolution-chart');
    if (!ctx) {
      console.error('No se encontró el canvas para el gráfico de evolución del balance');
      return null;
    }
    
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Balance Acumulado',
          data: accumulatedData,
          borderColor: '#4a3c2a',
          backgroundColor: 'rgba(255, 209, 102, 0.1)',
          tension: 0.3,
          fill: true,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
        duration: 300,
        easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false,
            labels: {
              font: {
                family: 'game',
                size: 18
              }
            }
          },
          tooltip: {
            bodyFont: {
            size: 14 // Tamaño de fuente en tooltips
          },
            callbacks: {
              label: function(context) {
                return `Balance: $${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              },
              font: {
                size: 18,
                family: 'game'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 18,
                family: 'game'
              }
            }
          }
        }
      }
    });
  }

  renderExpensesVsIncomeChart(month, year) {
    let totalIncome = 0;
    let totalExpenses = 0;
    
    this.transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getMonth() === month && date.getFullYear() === year) {
        if (t.type === 'income') {
          totalIncome += t.amount;
        } else {
          totalExpenses += t.amount;
        }
      }
    });
    
    const ctx = document.getElementById('expenses-vs-income-chart');
    if (!ctx) {
      console.error('No se encontró el canvas para el gráfico de gastos vs ingresos');
      return null;
    }
    
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
          data: [totalIncome, totalExpenses],
          backgroundColor: ['#5ddc63ff', '#EF476F'],
          borderColor: ['#5ddc63ff', '#EF476F'],
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
        duration: 300,
        easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label || ''}: $${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              },
              font: {
                family: 'game',
                size: 18
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: 'game',
                size: 18
              }
            }
          }
        }
      }
    });
  }

  generateColors(count) {
    const colors = [
      '#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93',
      '#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#073B4C',
      '#FF9F1C', '#2EC4B6', '#E71D36', '#011627', '#FDFFFC'
    ];
    
    while (colors.length < count) {
      colors.push(`#${Math.floor(Math.random()*16777215).toString(16)}`);
    }
    
    return colors.slice(0, count);
  }

  loadStyles() {
    if (document.querySelector('link[href="./css/charts.css"]')) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/charts.css';
    document.head.appendChild(link);
  }
}