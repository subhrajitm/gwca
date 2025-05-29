// Global variables for data management
let allData = [];
let currentPage = 1;
let totalPages = 1;
const perPage = 1000;
let isLoading = false;
let hasMoreData = true;

// Store chart instances
let charts = {
    claimStatus: null,
    productLine: null,
    warrantyType: null,
    monthlyTrend: null,
    tatDistribution: null,
    claimsByMonth: null
};

// Function to destroy all charts
function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    // Reset chart instances
    charts = {
        claimStatus: null,
        productLine: null,
        warrantyType: null,
        monthlyTrend: null,
        tatDistribution: null,
        claimsByMonth: null
    };
}

// Initialize dashboard with data passed from Flask
function initializeDashboard(claimsData) {
    try {
        console.log('Initializing dashboard with data length:', claimsData.length);

        // Update dashboard statistics
        updateDashboardStats(claimsData);

        // Initialize charts
        initializeCharts(claimsData);

    } catch (error) {
        console.error('Error processing data:', error);
        document.body.innerHTML = '<div style="text-align: center; padding: 20px;"><h2>Error Processing Data</h2><p>' + error.message + '</p></div>';
    }
}

// Function to update dashboard statistics
function updateDashboardStats(data) {
    try {
        // Calculate total claims
        const totalClaims = data.length;
        document.getElementById('totalClaims').textContent = totalClaims;

        // Calculate approved and disallowed claims
        const approvedClaims = data.filter(claim => claim['Claim Status'] === 'Approved').length;
        const disallowedClaims = data.filter(claim => claim['Claim Status'] === 'Disallowed').length;
        document.getElementById('approvedClaims').textContent = approvedClaims;
        document.getElementById('disallowedClaims').textContent = disallowedClaims;

        // Calculate total credits and averages
        const totalCredits = data.reduce((sum, claim) => {
            const amount = typeof claim['Credited Amount'] === 'string' 
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, '')) 
                : parseFloat(claim['Credited Amount']);
            console.log('Processing credit amount:', claim['Credited Amount'], 'Parsed:', amount); // Debug log
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        console.log('Total credits calculated:', totalCredits); // Debug log
        document.getElementById('totalCredits').textContent = `$${totalCredits.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const avgCredit = totalCredits / totalClaims;
        document.getElementById('avgCredit').textContent = `$${avgCredit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const maxCredit = Math.max(...data.map(claim => {
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            console.log('Processing max credit amount:', claim['Credited Amount'], 'Parsed:', amount); // Debug log
            return isNaN(amount) ? 0 : amount;
        }));
        console.log('Max credit calculated:', maxCredit); // Debug log
        document.getElementById('maxCredit').textContent = `$${maxCredit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Calculate TAT statistics
        const tatValues = data.map(claim => parseInt(claim['TAT']) || 0);
        const avgTAT = tatValues.reduce((a, b) => a + b, 0) / tatValues.length;
        const minTAT = Math.min(...tatValues);
        const maxTAT = Math.max(...tatValues);

        document.getElementById('avgTAT').textContent = `${Math.round(avgTAT)} days`;
        document.getElementById('minTAT').textContent = `${minTAT} days`;
        document.getElementById('maxTAT').textContent = `${maxTAT} days`;

        // Calculate success and approval rates
        const successRate = (approvedClaims / totalClaims) * 100;
        const approvalRate = (approvedClaims / totalClaims) * 100;
        const rejectionRate = (disallowedClaims / totalClaims) * 100;

        document.getElementById('successRate').textContent = `${successRate.toFixed(1)}%`;
        document.getElementById('approvalRate').textContent = `${approvalRate.toFixed(1)}%`;
        document.getElementById('rejectionRate').textContent = `${rejectionRate.toFixed(1)}%`;

        // Update Performance Metrics Table
        updatePerformanceMetricsTable(data);

        // Update Claims Overview Table
        updateClaimsOverviewTable(data);

        // Update Financial Metrics Table
        updateFinancialMetricsTable(data);

    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        throw error;
    }
}

// Function to update Claims Overview Table
function updateClaimsOverviewTable(data) {
    try {
        // Group data by customer
        const customerData = {};
        
        data.forEach(claim => {
            const customer = claim['Customer Name'] || 'Unknown';
            
            if (!customerData[customer]) {
                customerData[customer] = {
                    totalClaims: 0,
                    approvedClaims: 0,
                    pendingClaims: 0,
                    disallowedClaims: 0,
                    totalAmount: 0,
                    totalTAT: 0
                };
            }
            
            customerData[customer].totalClaims++;
            
            switch(claim['Claim Status']) {
                case 'Approved':
                    customerData[customer].approvedClaims++;
                    break;
                case 'Pending':
                    customerData[customer].pendingClaims++;
                    break;
                case 'Disallowed':
                    customerData[customer].disallowedClaims++;
                    break;
            }
            
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            customerData[customer].totalAmount += isNaN(amount) ? 0 : amount;
            
            const tat = parseInt(claim['TAT']) || 0;
            customerData[customer].totalTAT += tat;
        });
        
        // Generate table rows
        const tableBody = document.getElementById('claimsOverviewTable');
        tableBody.innerHTML = '';
        
        Object.entries(customerData).forEach(([customer, stats]) => {
            const avgTAT = Math.round(stats.totalTAT / stats.totalClaims);
            const approvalRate = (stats.approvedClaims / stats.totalClaims) * 100;
            
            // Calculate status distribution
            const approvedWidth = (stats.approvedClaims / stats.totalClaims) * 100;
            const pendingWidth = (stats.pendingClaims / stats.totalClaims) * 100;
            const disallowedWidth = (stats.disallowedClaims / stats.totalClaims) * 100;
            
            // Determine performance status
            let performanceStatus = '';
            if (approvalRate >= 80) {
                performanceStatus = '<span class="badge badge-success">Excellent</span>';
            } else if (approvalRate >= 60) {
                performanceStatus = '<span class="badge badge-warning">Good</span>';
            } else {
                performanceStatus = '<span class="badge badge-danger">Needs Improvement</span>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer}</td>
                <td>${stats.totalClaims}</td>
                <td>
                    <div class="progress" style="width: 100px;">
                        <div class="progress-bar bg-success" style="width: ${approvedWidth}%"></div>
                        <div class="progress-bar bg-warning" style="width: ${pendingWidth}%"></div>
                        <div class="progress-bar bg-danger" style="width: ${disallowedWidth}%"></div>
                    </div>
                </td>
                <td>${approvalRate.toFixed(1)}%</td>
                <td>$${stats.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${avgTAT} days</td>
                <td>${performanceStatus}</td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error updating claims overview table:', error);
        throw error;
    }
}

// Function to update Financial Metrics Table
function updateFinancialMetricsTable(data) {
    try {
        // Group data by part number
        const partData = {};
        
        data.forEach(claim => {
            const partNumber = claim['Part Number'] || 'Unknown';
            
            if (!partData[partNumber]) {
                partData[partNumber] = {
                    frequency: 0,
                    totalAmount: 0,
                    amounts: []
                };
            }
            
            partData[partNumber].frequency++;
            
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            partData[partNumber].totalAmount += isNaN(amount) ? 0 : amount;
            partData[partNumber].amounts.push(amount);
        });
        
        // Sort by total amount in descending order
        const sortedParts = Object.entries(partData)
            .sort(([, a], [, b]) => b.totalAmount - a.totalAmount);
        
        // Generate table rows
        const tableBody = document.getElementById('financialMetricsTable');
        tableBody.innerHTML = '';
        
        sortedParts.forEach(([partNumber, stats]) => {
            const avgAmount = stats.totalAmount / stats.frequency;
            
            // Determine value category
            let valueCategory = '';
            if (avgAmount >= 5000) {
                valueCategory = '<span class="badge badge-success">High Value</span>';
            } else if (avgAmount >= 1000) {
                valueCategory = '<span class="badge badge-warning">Medium Value</span>';
            } else {
                valueCategory = '<span class="badge badge-danger">Low Value</span>';
            }
            
            // Calculate trend
            const amounts = stats.amounts;
            const trend = amounts.length > 1 ? 
                ((amounts[amounts.length - 1] - amounts[0]) / amounts[0] * 100).toFixed(1) : 0;
            
            const trendClass = trend > 0 ? 'trend-up' : 'trend-down';
            const trendIcon = trend > 0 ? '↑' : '↓';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${partNumber}</td>
                <td>${stats.frequency}</td>
                <td>$${stats.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>$${avgAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${valueCategory}</td>
                <td class="${trendClass}">${trendIcon} ${Math.abs(trend)}%</td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error updating financial metrics table:', error);
        throw error;
    }
}

// Function to update Performance Metrics Table
function updatePerformanceMetricsTable(data) {
    try {
        // Group data by month
        const monthlyData = {};
        
        data.forEach(claim => {
            const submissionDate = new Date(claim['Claim Submission Date']);
            const monthKey = submissionDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    submitted: 0,
                    closed: 0,
                    totalTAT: 0,
                    totalAmount: 0
                };
            }
            
            monthlyData[monthKey].submitted++;
            
            if (claim['Claim Close Date'] !== '-') {
                monthlyData[monthKey].closed++;
            }
            
            const tat = parseInt(claim['TAT']) || 0;
            monthlyData[monthKey].totalTAT += tat;
            
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            monthlyData[monthKey].totalAmount += isNaN(amount) ? 0 : amount;
        });
        
        // Sort months chronologically
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        
        // Generate table rows
        const tableBody = document.getElementById('performanceMetricsTable');
        tableBody.innerHTML = '';
        
        sortedMonths.forEach(month => {
            const monthData = monthlyData[month];
            const avgTAT = Math.round(monthData.totalTAT / monthData.submitted);
            const completionRate = (monthData.closed / monthData.submitted) * 100;
            
            // Determine status
            let status = '';
            if (completionRate >= 90 && avgTAT <= 30) {
                status = '<span class="badge badge-success">On Track</span>';
            } else if (completionRate >= 70 && avgTAT <= 45) {
                status = '<span class="badge badge-warning">At Risk</span>';
            } else {
                status = '<span class="badge badge-danger">Delayed</span>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${month}</td>
                <td>${monthData.submitted}</td>
                <td>${monthData.closed}</td>
                <td>
                    <div class="progress" style="width: 100px;">
                        <div class="progress-bar bg-success" style="width: ${completionRate}%"></div>
                    </div>
                    <small class="text-muted">${completionRate.toFixed(1)}%</small>
                </td>
                <td>${avgTAT} days</td>
                <td>$${monthData.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${status}</td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error updating performance metrics table:', error);
        throw error;
    }
}

// Function to initialize all charts
function initializeCharts(data) {
    try {
        // Initialize Claim Status Distribution Chart
        const claimStatusCtx = document.getElementById('claimStatusChart').getContext('2d');
        const claimStatusData = {
            approved: data.filter(claim => claim['Claim Status'] === 'Approved').length,
            pending: data.filter(claim => claim['Claim Status'] === 'Pending').length,
            disallowed: data.filter(claim => claim['Claim Status'] === 'Disallowed').length
        };
        if (charts.claimStatus) {
            charts.claimStatus.destroy();
        }
        charts.claimStatus = new Chart(claimStatusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Pending', 'Disallowed'],
                datasets: [{
                    data: [claimStatusData.approved, claimStatusData.pending, claimStatusData.disallowed],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Initialize Product Line Chart
        const productLineCtx = document.getElementById('productLineChart').getContext('2d');
        const productLineData = {};
        data.forEach(claim => {
            const productLine = claim['Product Line'] || 'Unknown';
            productLineData[productLine] = (productLineData[productLine] || 0) + 1;
        });
        if (charts.productLine) {
            charts.productLine.destroy();
        }
        charts.productLine = new Chart(productLineCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(productLineData),
                datasets: [{
                    label: 'Number of Claims',
                    data: Object.values(productLineData),
                    backgroundColor: '#0d6efd'
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
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Initialize Warranty Type Chart
        const warrantyTypeCtx = document.getElementById('warrantyTypeChart').getContext('2d');
        const warrantyTypeData = {};
        data.forEach(claim => {
            const warrantyType = claim['Warranty Type'] || 'Unknown';
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            warrantyTypeData[warrantyType] = (warrantyTypeData[warrantyType] || 0) + (isNaN(amount) ? 0 : amount);
        });
        if (charts.warrantyType) {
            charts.warrantyType.destroy();
        }
        charts.warrantyType = new Chart(warrantyTypeCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(warrantyTypeData),
                datasets: [{
                    data: Object.values(warrantyTypeData),
                    backgroundColor: ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Initialize Monthly Trend Chart
        const monthlyTrendCtx = document.getElementById('monthlyTrendChart').getContext('2d');
        const monthlyData = {};
        data.forEach(claim => {
            const date = new Date(claim['Claim Submission Date']);
            const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (isNaN(amount) ? 0 : amount);
        });
        if (charts.monthlyTrend) {
            charts.monthlyTrend.destroy();
        }
        charts.monthlyTrend = new Chart(monthlyTrendCtx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlyData),
                datasets: [{
                    label: 'Total Credits',
                    data: Object.values(monthlyData),
                    borderColor: '#0d6efd',
                    tension: 0.1
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
                        beginAtZero: true,
                        ticks: {
                            callback: value => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });

        // Initialize TAT Distribution Chart
        const tatDistributionCtx = document.getElementById('tatDistributionChart').getContext('2d');
        const tatRanges = {
            '0-7 days': 0,
            '8-14 days': 0,
            '15-21 days': 0,
            '22-30 days': 0,
            '>30 days': 0
        };
        data.forEach(claim => {
            const tat = parseInt(claim['TAT']) || 0;
            if (tat <= 7) tatRanges['0-7 days']++;
            else if (tat <= 14) tatRanges['8-14 days']++;
            else if (tat <= 21) tatRanges['15-21 days']++;
            else if (tat <= 30) tatRanges['22-30 days']++;
            else tatRanges['>30 days']++;
        });
        if (charts.tatDistribution) {
            charts.tatDistribution.destroy();
        }
        charts.tatDistribution = new Chart(tatDistributionCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(tatRanges),
                datasets: [{
                    label: 'Number of Claims',
                    data: Object.values(tatRanges),
                    backgroundColor: '#0d6efd'
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
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Initialize Claims by Month Chart
        const claimsByMonthCtx = document.getElementById('claimsByMonthChart').getContext('2d');
        const claimsByMonth = {};
        data.forEach(claim => {
            const date = new Date(claim['Claim Submission Date']);
            const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            claimsByMonth[monthKey] = (claimsByMonth[monthKey] || 0) + 1;
        });
        if (charts.claimsByMonth) {
            charts.claimsByMonth.destroy();
        }
        charts.claimsByMonth = new Chart(claimsByMonthCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(claimsByMonth),
                datasets: [{
                    label: 'Number of Claims',
                    data: Object.values(claimsByMonth),
                    backgroundColor: '#0d6efd'
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
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error initializing charts:', error);
        throw error;
    }
}

// Function to load data asynchronously
async function loadData(page = 1) {
    if (isLoading || !hasMoreData) return;
    
    try {
        isLoading = true;
        showLoadingIndicator();
        
        const response = await fetch(`/api/data?page=${page}&per_page=${perPage}`);
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (page === 1) {
            allData = result.data;
            // Destroy existing charts when starting fresh
            destroyCharts();
        } else {
            allData = [...allData, ...result.data];
        }
        
        currentPage = result.page;
        totalPages = result.total_pages;
        hasMoreData = currentPage < totalPages;
        
        // Update dashboard with current data
        updateDashboardStats(allData);
        
        // Initialize charts with current data
        initializeCharts(allData);
        
        // Update tables with current data
        updateClaimsOverviewTable(allData);
        updateFinancialMetricsTable(allData);
        updatePerformanceMetricsTable(allData);
        
        // If there's more data and we're not at the end, load the next page
        if (hasMoreData) {
            setTimeout(() => loadData(currentPage + 1), 100);
        } else {
            // Hide loading indicator only when all data is loaded
            hideLoadingIndicator();
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoadingIndicator();
        showError('Error loading data: ' + error.message);
    } finally {
        isLoading = false;
    }
}

// Function to show loading indicator
function showLoadingIndicator() {
    let loadingDiv = document.getElementById('loading-spinner');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-spinner';
        loadingDiv.className = 'loading-spinner';
        document.body.appendChild(loadingDiv);
    }
    loadingDiv.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p>Loading data... ${Math.round((currentPage / totalPages) * 100)}%</p>
    `;
    loadingDiv.style.display = 'block';
}

// Function to hide loading indicator
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-spinner');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

// Function to show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Get initial summary data
        const summaryResponse = await fetch('/api/summary');
        const summary = await summaryResponse.json();
        
        if (summary.error) {
            throw new Error(summary.error);
        }
        
        // Update summary statistics
        document.getElementById('totalClaims').textContent = summary.total_claims;
        document.getElementById('approvedClaims').textContent = summary.approved_claims;
        document.getElementById('disallowedClaims').textContent = summary.disallowed_claims;
        document.getElementById('totalCredits').textContent = `$${summary.total_credits.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('avgTAT').textContent = `${Math.round(summary.avg_tat)} days`;
        
        // Start loading data
        await loadData(1);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        hideLoadingIndicator();
        showError('Error initializing dashboard: ' + error.message);
    }
}); 