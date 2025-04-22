document.addEventListener('DOMContentLoaded', function() {
    // Initialize table functionality
    initializeTable();
    
    // Initialize column toggle
    initializeColumnToggle();
    
    // Initialize filters
    initializeFilters();
    
    // Initialize export functionality
    initializeExport();

    // Initialize all charts
    initializeCharts();
});

function initializeTable() {
    const table = document.getElementById('metricsTable');
    if (!table) return;

    // Initialize sorting
    const sortableHeaders = table.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            const isAsc = header.classList.contains('asc');
            
            // Remove all sort classes
            sortableHeaders.forEach(h => {
                h.classList.remove('asc', 'desc', 'active');
            });
            
            // Add appropriate sort class
            header.classList.add(isAsc ? 'desc' : 'asc', 'active');
            
            // Sort the table
            sortTable(table, column, !isAsc);
        });
    });

    // Initialize expandable rows
    const expandableRows = table.querySelectorAll('.expandable-row');
    expandableRows.forEach(row => {
        row.addEventListener('click', () => {
            const detailsRow = row.nextElementSibling;
            const isExpanded = row.classList.contains('expanded');
            
            // Close all other rows
            expandableRows.forEach(r => {
                if (r !== row) {
                    r.classList.remove('expanded');
                    r.nextElementSibling.style.display = 'none';
                }
            });
            
            // Toggle current row
            row.classList.toggle('expanded');
            detailsRow.style.display = isExpanded ? 'none' : 'table-row';
            
            // Initialize chart if not already done
            if (!isExpanded && !detailsRow.dataset.chartInitialized) {
                initializeDetailChart(detailsRow, row.dataset.model);
                detailsRow.dataset.chartInitialized = 'true';
            }
        });
    });

    // Initialize search
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const rows = table.querySelectorAll('.expandable-row');
            
            rows.forEach(row => {
                const text = Array.from(row.cells).map(cell => cell.textContent).join(' ').toLowerCase();
                const match = text.includes(searchTerm);
                row.style.display = match ? '' : 'none';
                if (!match) {
                    row.nextElementSibling.style.display = 'none';
                    row.classList.remove('expanded');
                }
            });
            
            updateTableInfo();
        });
    }
}

function initializeColumnToggle() {
    const toggles = document.querySelectorAll('.column-toggle-menu .form-check-input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const column = toggle.value;
            const cells = document.querySelectorAll(`td:nth-child(${getColumnIndex(column)}), th:nth-child(${getColumnIndex(column)})`);
            cells.forEach(cell => {
                cell.style.display = toggle.checked ? '' : 'none';
            });
        });
    });
}

function initializeFilters() {
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    
    if (applyFilters) {
        applyFilters.addEventListener('click', () => {
            const filters = {
                credits: {
                    min: parseFloat(document.getElementById('creditMin').value) || 0,
                    max: parseFloat(document.getElementById('creditMax').value) || Infinity
                },
                closure: {
                    min: parseFloat(document.getElementById('closureMin').value) || 0,
                    max: parseFloat(document.getElementById('closureMax').value) || Infinity
                },
                transactions: {
                    min: parseFloat(document.getElementById('transactionMin').value) || 0,
                    max: parseFloat(document.getElementById('transactionMax').value) || Infinity
                }
            };
            
            filterTable(filters);
        });
    }
    
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            // Clear input values
            document.getElementById('creditMin').value = '';
            document.getElementById('creditMax').value = '';
            document.getElementById('closureMin').value = '';
            document.getElementById('closureMax').value = '';
            document.getElementById('transactionMin').value = '';
            document.getElementById('transactionMax').value = '';
            
            // Show all rows
            const rows = document.querySelectorAll('.expandable-row');
            rows.forEach(row => {
                row.style.display = '';
            });
            
            updateTableInfo();
        });
    }
}

function initializeExport() {
    document.getElementById('exportCSV')?.addEventListener('click', () => exportTable('csv'));
    document.getElementById('exportExcel')?.addEventListener('click', () => exportTable('excel'));
    document.getElementById('exportPDF')?.addEventListener('click', () => exportTable('pdf'));
}

function initializeDetailChart(detailsRow, model) {
    const canvas = detailsRow.querySelector('.detail-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Claims Trend',
                data: generateRandomData(6),
                borderColor: '#3b82f6',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function initializeCharts() {
    // Chart data
    const chartData = {
        Model1: { creditsPaid: 152.2, disallowed: 80.70 },
        Model2: { creditsPaid: 21.6, disallowed: 67.40 },
        Model3: { creditsPaid: 139.0, disallowed: 65.41 },
        Model4: { creditsPaid: 473.8, disallowed: 371.06 },
        Model5: { creditsPaid: 115.8, disallowed: 237.88 },
        Model6: { creditsPaid: 35.5, disallowed: 10.62 },
        Model7: { creditsPaid: 1.8, disallowed: 0.00111 },
        Model8: { creditsPaid: 462.2, disallowed: 543.52 },
        Model9: { creditsPaid: 3.6, disallowed: 1.67 }
    };

    // Warranty Trends Chart
    const trendsCtx = document.getElementById('warrantyTrendsChart')?.getContext('2d');
    if (trendsCtx) {
        window.trendsChart = new Chart(trendsCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    label: 'Credits Paid',
                    data: Object.values(chartData).map(d => d.creditsPaid),
                    backgroundColor: '#10B981',
                    borderColor: '#10B981',
                    borderWidth: 1
                }, {
                    label: 'Disallowed Amount',
                    data: Object.values(chartData).map(d => d.disallowed),
                    backgroundColor: '#EF4444',
                    borderColor: '#EF4444',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    title: {
                        display: true,
                        text: 'Credits Paid vs Disallowed Amount by Model (in Millions $)',
                        padding: 10
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toFixed(2) + 'M';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount in Millions ($)'
                        }
                    }
                }
            }
        });
    }

    // Claims Distribution Chart
    const distributionCtx = document.getElementById('claimsDistributionChart')?.getContext('2d');
    if (distributionCtx) {
        new Chart(distributionCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    data: [9650, 1249, 6042, 17457, 8649, 344, 2609, 71331, 827],
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                        '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    title: {
                        display: true,
                        text: 'Transaction Distribution by Model',
                        padding: 10
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Shop Performance Chart
    const performanceCtx = document.getElementById('shopPerformanceChart')?.getContext('2d');
    if (performanceCtx) {
        new Chart(performanceCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    label: 'Claim Closure (Days)',
                    data: [20, 22, 30, 28, 29, 23, 5, 43, 41],
                    backgroundColor: '#3B82F6'
                }, {
                    label: 'Claim Open (Days)',
                    data: [30, 28, 36, 37, 49, 30, 6, 56, 47],
                    backgroundColor: '#F59E0B'
                }, {
                    label: 'Hold Time (Days)',
                    data: [45, 44, 30, 63, 72, 64, 37, 58, 66],
                    backgroundColor: '#EF4444'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    title: {
                        display: true,
                        text: 'Processing Times by Model',
                        padding: 10
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Days'
                        }
                    }
                }
            }
        });
    }

    // Processing Time Chart
    const timeCtx = document.getElementById('processingTimeChart')?.getContext('2d');
    if (timeCtx) {
        new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    label: 'Claim Closure Time',
                    data: [20, 22, 30, 28, 29, 23, 5, 43, 41],
                    borderColor: '#8B5CF6',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#8B5CF6',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Claim Open Time',
                    data: [30, 28, 36, 37, 49, 30, 6, 56, 47],
                    borderColor: '#F59E0B',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#F59E0B',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    title: {
                        display: true,
                        text: 'Claim Processing Time Analysis',
                        padding: 10
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Days'
                        }
                    }
                }
            }
        });
    }

    // Initialize model filter functionality
    initializeModelFilter(chartData);
}

function initializeModelFilter(chartData) {
    const dropdownToggle = document.getElementById('modelFilter');
    const dropdownMenu = dropdownToggle?.nextElementSibling;
    const searchInput = dropdownMenu?.querySelector('.search-input');
    const optionItems = dropdownMenu?.querySelectorAll('.option-item');
    const selectedCount = dropdownToggle?.querySelector('.selected-count');

    if (!dropdownToggle || !dropdownMenu || !searchInput || !optionItems || !selectedCount) return;

    dropdownToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        optionItems.forEach(item => {
            const text = item.querySelector('.option-label').textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // Handle checkbox changes
    optionItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            updateSelectedCount();
            updateTrendsChart();
        });
    });

    function updateSelectedCount() {
        const checkedCount = dropdownMenu.querySelectorAll('input[type="checkbox"]:checked').length;
        selectedCount.textContent = `${checkedCount} selected`;
    }

    function updateTrendsChart() {
        const selectedModels = Array.from(dropdownMenu.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        const filteredLabels = selectedModels;
        const filteredCreditsPaid = selectedModels.map(model => chartData[model].creditsPaid);
        const filteredDisallowed = selectedModels.map(model => chartData[model].disallowed);

        if (window.trendsChart) {
            window.trendsChart.data.labels = filteredLabels;
            window.trendsChart.data.datasets[0].data = filteredCreditsPaid;
            window.trendsChart.data.datasets[1].data = filteredDisallowed;
            window.trendsChart.update();
        }
    }

    // Initialize selected count
    updateSelectedCount();
}

// Helper Functions
function sortTable(table, column, asc) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('.expandable-row'));
    
    const sortedRows = rows.sort((a, b) => {
        const aValue = getCellValue(a, column);
        const bValue = getCellValue(b, column);
        return asc ? compareValues(aValue, bValue) : compareValues(bValue, aValue);
    });
    
    // Clear tbody
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    // Append sorted rows
    sortedRows.forEach(row => {
        tbody.appendChild(row);
        tbody.appendChild(row.nextElementSibling);
    });
}

function filterTable(filters) {
    const rows = document.querySelectorAll('.expandable-row');
    
    rows.forEach(row => {
        const credits = parseFloat(row.cells[1].textContent.replace(/[^0-9.-]+/g, ''));
        const closure = parseFloat(row.cells[4].textContent);
        const transactions = parseFloat(row.cells[3].textContent.replace(/,/g, ''));
        
        const matchesFilters = 
            credits >= filters.credits.min && credits <= filters.credits.max &&
            closure >= filters.closure.min && closure <= filters.closure.max &&
            transactions >= filters.transactions.min && transactions <= filters.transactions.max;
        
        row.style.display = matchesFilters ? '' : 'none';
        if (!matchesFilters) {
            row.nextElementSibling.style.display = 'none';
            row.classList.remove('expanded');
        }
    });
    
    updateTableInfo();
}

function getCellValue(row, column) {
    const cell = row.querySelector(`td:nth-child(${getColumnIndex(column)})`);
    const text = cell.textContent.trim();
    
    // Handle different data types
    if (column === 'model') return text;
    if (text.includes('$')) return parseFloat(text.replace(/[^0-9.-]+/g, ''));
    if (text.includes('days')) return parseFloat(text);
    return parseFloat(text.replace(/,/g, ''));
}

function compareValues(a, b) {
    if (typeof a === 'string') return a.localeCompare(b);
    return a - b;
}

function getColumnIndex(column) {
    const columnMap = {
        'model': 1,
        'credits': 2,
        'disallowed': 3,
        'transactions': 4,
        'closure': 5,
        'open': 6,
        'hold': 7
    };
    return columnMap[column];
}

function updateTableInfo() {
    const showingCount = document.querySelectorAll('.expandable-row:not([style*="display: none"])').length;
    const totalCount = document.querySelectorAll('.expandable-row').length;
    
    document.getElementById('showingCount').textContent = showingCount;
    document.getElementById('totalCount').textContent = totalCount;
}

function generateRandomData(count) {
    return Array.from({ length: count }, () => Math.floor(Math.random() * 100));
}

function exportTable(format) {
    const table = document.getElementById('metricsTable');
    const rows = Array.from(table.querySelectorAll('.expandable-row'));
    
    const data = rows.map(row => ({
        Model: row.cells[0].textContent,
        'Credits Paid': row.cells[1].textContent,
        'Disallowed Amount': row.cells[2].textContent,
        Transactions: row.cells[3].textContent,
        'Claim Closure': row.cells[4].textContent,
        'Claim Open': row.cells[5].textContent,
        'Hold Time': row.cells[6].textContent
    }));
    
    switch (format) {
        case 'csv':
            exportCSV(data);
            break;
        case 'excel':
            exportExcel(data);
            break;
        case 'pdf':
            exportPDF(data);
            break;
    }
}

function exportCSV(data) {
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    downloadFile(csv, 'warranty-metrics.csv', 'text/csv');
}

function exportExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Warranty Metrics');
    XLSX.writeFile(workbook, 'warranty-metrics.xlsx');
}

function exportPDF(data) {
    const doc = new jsPDF();
    doc.autoTable({
        head: [Object.keys(data[0])],
        body: data.map(row => Object.values(row))
    });
    doc.save('warranty-metrics.pdf');
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
} 