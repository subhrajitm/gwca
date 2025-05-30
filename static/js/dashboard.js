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

        // Calculate approved claims
        const approvedClaims = data.filter(claim => claim['Claim Status'] === 'Approved').length;
        document.getElementById('approvedClaims').textContent = approvedClaims;

        // Calculate disallowed claims
        const disallowedClaims = data.filter(claim => claim['Claim Status'] === 'Disallowed').length;
        document.getElementById('disallowedClaims').textContent = disallowedClaims;

        // Calculate rates
        const successRate = totalClaims > 0 ? (approvedClaims / totalClaims * 100) : 0;
        const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims * 100) : 0;
        const rejectionRate = totalClaims > 0 ? (disallowedClaims / totalClaims * 100) : 0;

        // Update rate displays
        document.getElementById('successRate').textContent = `${successRate.toFixed(2)}%`;
        document.getElementById('approvalRate').textContent = `${approvalRate.toFixed(2)}%`;
        document.getElementById('rejectionRate').textContent = `${rejectionRate.toFixed(2)}%`;

        // Calculate total credits
        const totalCredits = data.reduce((sum, claim) => {
            const amount = typeof claim['Credited Amount'] === 'string'
                ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                : parseFloat(claim['Credited Amount']);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        document.getElementById('totalCredits').textContent = `$${totalCredits.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Calculate average TAT
        const tatValues = data.map(claim => parseInt(claim['TAT']) || 0);
        const avgTAT = tatValues.reduce((a, b) => a + b, 0) / tatValues.length;
        document.getElementById('avgTAT').textContent = `${Math.round(avgTAT)} days`;

    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        throw error;
    }
}

// Function to initialize all charts
function initializeCharts(data) {
    try {
        // Initialize Claim Status Distribution Chart
        const claimStatusCtx = document.getElementById('claimStatusChart').getContext('2d');
        
        // Process claim status data
        const statusCount = {};
        data.forEach(claim => {
            const status = claim['Claim Status'] || 'Unknown';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        
        // Sort statuses for consistent display
        const sortedStatuses = Object.keys(statusCount).sort();
        const statusColors = {
            'Approved': '#28a745',
            'Pending': '#ffc107',
            'Disallowed': '#dc3545',
            'Unknown': '#6c757d'
        };
        
        if (charts.claimStatus) {
            charts.claimStatus.destroy();
        }
        
        charts.claimStatus = new Chart(claimStatusCtx, {
            type: 'doughnut',
            data: {
                labels: sortedStatuses,
                datasets: [{
                    data: sortedStatuses.map(status => statusCount[status]),
                    backgroundColor: sortedStatuses.map(status => statusColors[status] || '#6c757d')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
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
        
        console.log('Initializing Monthly Trend Chart with data length:', data.length);
        
        // Process data for monthly trend
        data.forEach((claim, index) => {
            if (!claim['Claim Submitted Date']) {
                console.log(`Skipping claim ${index} - No submission date`);
                return;
            }
            
            try {
                console.log(`Processing claim ${index} - Date: ${claim['Claim Submitted Date']}`);
                const date = new Date(claim['Claim Submitted Date']);
                
                if (isNaN(date.getTime())) {
                    console.log(`Skipping claim ${index} - Invalid date: ${claim['Claim Submitted Date']}`);
                    return;
                }
                
                const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                console.log(`Claim ${index} - Month key: ${monthKey}`);
                
                const amount = typeof claim['Credited Amount'] === 'string'
                    ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                    : parseFloat(claim['Credited Amount']);
                
                console.log(`Claim ${index} - Amount: ${amount}`);
                
                if (!isNaN(amount)) {
                    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
                    console.log(`Updated monthly data for ${monthKey}: ${monthlyData[monthKey]}`);
                } else {
                    console.log(`Skipping claim ${index} - Invalid amount: ${claim['Credited Amount']}`);
                }
            } catch (error) {
                console.error(`Error processing claim ${index}:`, error);
            }
        });
        
        console.log('Final monthly data:', monthlyData);
        
        // Sort months chronologically
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
        
        console.log('Sorted months:', sortedMonths);
        
        if (charts.monthlyTrend) {
            charts.monthlyTrend.destroy();
        }
        
        // Only create chart if we have data
        if (Object.keys(monthlyData).length > 0) {
            console.log('Creating monthly trend chart with data');
            charts.monthlyTrend = new Chart(monthlyTrendCtx, {
                type: 'line',
                data: {
                    labels: sortedMonths,
                    datasets: [{
                        label: 'Total Credits',
                        data: sortedMonths.map(month => monthlyData[month]),
                        borderColor: '#0d6efd',
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `$${context.raw.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}`;
                                }
                            }
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
        } else {
            console.warn('No valid data for monthly trend chart');
        }

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
        
        console.log('Initializing Claims by Month Chart with data length:', data.length);
        if (data.length > 0) {
            console.log('First record:', data[0]);
            console.log('Available fields:', Object.keys(data[0]));
            console.log('Sample submission date:', data[0]['Claim Submitted Date']);
        }
        
        // Process data for claims by month
        let validDates = 0;
        let invalidDates = 0;
        
        data.forEach((claim, index) => {
            // Get the submission date
            const submissionDate = claim['Claim Submitted Date'];
            
            if (!submissionDate) {
                console.log(`Skipping claim ${index} - No submission date found. Available fields:`, Object.keys(claim));
                invalidDates++;
                return;
            }
            
            try {
                console.log(`Processing claim ${index} - Date: ${submissionDate}, type: ${typeof submissionDate}`);
                
                // Parse the date string (format: YYYY-MM-DD)
                const [year, month, day] = submissionDate.split('-').map(Number);
                if (!year || !month || !day) {
                    console.log(`Skipping claim ${index} - Invalid date format: ${submissionDate}`);
                    invalidDates++;
                    return;
                }
                
                const date = new Date(year, month - 1, day);
                
                if (isNaN(date.getTime())) {
                    console.log(`Skipping claim ${index} - Invalid date: ${submissionDate}`);
                    invalidDates++;
                    return;
                }
                
                const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                console.log(`Claim ${index} - Month key: ${monthKey}`);
                
                claimsByMonth[monthKey] = (claimsByMonth[monthKey] || 0) + 1;
                validDates++;
                console.log(`Updated claims count for ${monthKey}: ${claimsByMonth[monthKey]}`);
            } catch (error) {
                console.error(`Error processing claim ${index}:`, error);
                invalidDates++;
            }
        });
        
        console.log(`Date processing summary: ${validDates} valid dates, ${invalidDates} invalid dates`);
        console.log('Final claims by month data:', claimsByMonth);
        
        // Sort months chronologically
        const sortedClaimMonths = Object.keys(claimsByMonth).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
        
        console.log('Sorted months:', sortedClaimMonths);
        
        if (charts.claimsByMonth) {
            charts.claimsByMonth.destroy();
        }
        
        // Only create chart if we have data
        if (Object.keys(claimsByMonth).length > 0) {
            console.log('Creating claims by month chart with data');
            charts.claimsByMonth = new Chart(claimsByMonthCtx, {
                type: 'bar',
                data: {
                    labels: sortedClaimMonths,
                    datasets: [{
                        label: 'Number of Claims',
                        data: sortedClaimMonths.map(month => claimsByMonth[month]),
                        backgroundColor: '#0d6efd'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.raw} claims`;
                                }
                            }
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
        } else {
            console.warn('No valid data for claims by month chart');
            // Add a message to the chart area
            const chartContainer = document.getElementById('claimsByMonthChart').parentElement;
            chartContainer.innerHTML = `
                <div class="text-center p-3">
                    <p>No data available for Claims by Month</p>
                    <small class="text-muted">
                        Valid dates: ${validDates}<br>
                        Invalid dates: ${invalidDates}<br>
                        Total records: ${data.length}<br>
                        Sample date: ${data.length > 0 ? data[0]['Claim Submitted Date'] : 'No data'}<br>
                        Available fields: ${data.length > 0 ? Object.keys(data[0]).join(', ') : 'No data'}
                    </small>
                </div>
            `;
        }

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
        
        // Update success rate statistics
        document.getElementById('successRate').textContent = `${summary.success_rate}%`;
        document.getElementById('approvalRate').textContent = `${summary.approval_rate}%`;
        document.getElementById('rejectionRate').textContent = `${summary.rejection_rate}%`;
        
        // Start loading data
        await loadData(1);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        hideLoadingIndicator();
        showError('Error initializing dashboard: ' + error.message);
    }
}); 