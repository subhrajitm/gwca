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
            const amount = parseFloat(claim['Credited Amount']) || 0;
            return sum + amount;
        }, 0);
        document.getElementById('totalCredits').textContent = `$${totalCredits.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Calculate average credit
        const avgCredit = totalClaims > 0 ? totalCredits / totalClaims : 0;
        document.getElementById('avgCredit').textContent = `$${avgCredit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Calculate max credit
        const maxCredit = Math.max(...data.map(claim => parseFloat(claim['Credited Amount']) || 0));
        document.getElementById('maxCredit').textContent = `$${maxCredit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Calculate TAT statistics
        const tatValues = data.map(claim => parseFloat(claim['TAT']) || 0).filter(tat => !isNaN(tat));
        const avgTAT = tatValues.length > 0 ? tatValues.reduce((a, b) => a + b, 0) / tatValues.length : 0;
        const minTAT = tatValues.length > 0 ? Math.min(...tatValues) : 0;
        const maxTAT = tatValues.length > 0 ? Math.max(...tatValues) : 0;

        document.getElementById('avgTAT').textContent = `${Math.round(avgTAT)} days`;
        document.getElementById('minTAT').textContent = `${Math.round(minTAT)} days`;
        document.getElementById('maxTAT').textContent = `${Math.round(maxTAT)} days`;

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
        
        // Process product line data with more metrics
        const productLineData = {};
        const productLineAmounts = {};
        const productLineApprovalRates = {};
        const productLineTATs = {};
        
        data.forEach(claim => {
            const productLine = claim['Product Line'] || 'Unknown';
            // Count claims per product line
            productLineData[productLine] = (productLineData[productLine] || 0) + 1;
            
            // Sum credited amounts per product line
            const amount = parseFloat(claim['Credited Amount']) || 0;
            productLineAmounts[productLine] = (productLineAmounts[productLine] || 0) + amount;
            
            // Track approval status for calculating rates
            if (!productLineApprovalRates[productLine]) {
                productLineApprovalRates[productLine] = { total: 0, approved: 0 };
            }
            productLineApprovalRates[productLine].total++;
            if (claim['Claim Status'] === 'Approved') {
                productLineApprovalRates[productLine].approved++;
            }
            
            // Track TAT values
            const tat = parseFloat(claim['TAT']) || 0;
            if (!productLineTATs[productLine]) {
                productLineTATs[productLine] = [];
            }
            if (tat > 0) {
                productLineTATs[productLine].push(tat);
            }
        });
        
        // Calculate average TAT per product line
        const productLineAvgTATs = {};
        Object.keys(productLineTATs).forEach(productLine => {
            const tats = productLineTATs[productLine];
            productLineAvgTATs[productLine] = tats.length > 0 
                ? tats.reduce((sum, tat) => sum + tat, 0) / tats.length 
                : 0;
        });
        
        // Sort product lines by number of claims (descending)
        const sortedProductLines = Object.keys(productLineData).sort((a, b) => 
            productLineData[b] - productLineData[a]
        );
        
        // Calculate approval rates
        const approvalRates = {};
        Object.keys(productLineApprovalRates).forEach(productLine => {
            const { total, approved } = productLineApprovalRates[productLine];
            approvalRates[productLine] = total > 0 ? (approved / total) * 100 : 0;
        });
        
        // Generate color palette based on number of product lines
        const generateColors = (count) => {
            const baseColors = [
                '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', 
                '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395'
            ];
            const colors = [];
            for (let i = 0; i < count; i++) {
                colors.push(baseColors[i % baseColors.length]);
            }
            return colors;
        };
        
        const colors = generateColors(sortedProductLines.length);
        
        if (charts.productLine) {
            charts.productLine.destroy();
        }
        
        charts.productLine = new Chart(productLineCtx, {
            type: 'bar',
            data: {
                labels: sortedProductLines,
                datasets: [
                    {
                        label: 'Number of Claims',
                        data: sortedProductLines.map(productLine => productLineData[productLine]),
                        backgroundColor: colors,
                        order: 1
                    },
                    {
                        label: 'Approval Rate (%)',
                        data: sortedProductLines.map(productLine => approvalRates[productLine]),
                        type: 'line',
                        borderColor: '#ff6384',
                        borderWidth: 2,
                        pointBackgroundColor: '#ff6384',
                        pointRadius: 4,
                        fill: false,
                        yAxisID: 'y1',
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const productLine = context.label;
                                const avgTAT = productLineAvgTATs[productLine].toFixed(1);
                                const totalAmount = productLineAmounts[productLine].toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2
                                });
                                
                                return [
                                    `Total Amount: ${totalAmount}`,
                                    `Avg TAT: ${avgTAT} days`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Claims'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        max: 100,
                        title: {
                            display: true,
                            text: 'Approval Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });

        // Initialize Warranty Type Chart
        const warrantyTypeCtx = document.getElementById('warrantyTypeChart').getContext('2d');
        
        // Process warranty type data with more metrics
        const warrantyTypeData = {};
        const warrantyTypeCounts = {};
        const warrantyTypeApprovalRates = {};
        const warrantyTypeTATs = {};
        
        data.forEach(claim => {
            const warrantyType = claim['Warranty Type'] || 'Unknown';
            
            // Count claims per warranty type
            warrantyTypeCounts[warrantyType] = (warrantyTypeCounts[warrantyType] || 0) + 1;
            
            // Sum credited amounts per warranty type
            const amount = parseFloat(claim['Credited Amount']) || 0;
            warrantyTypeData[warrantyType] = (warrantyTypeData[warrantyType] || 0) + amount;
            
            // Track approval status for calculating rates
            if (!warrantyTypeApprovalRates[warrantyType]) {
                warrantyTypeApprovalRates[warrantyType] = { total: 0, approved: 0 };
            }
            warrantyTypeApprovalRates[warrantyType].total++;
            if (claim['Claim Status'] === 'Approved') {
                warrantyTypeApprovalRates[warrantyType].approved++;
            }
            
            // Track TAT values
            const tat = parseFloat(claim['TAT']) || 0;
            if (!warrantyTypeTATs[warrantyType]) {
                warrantyTypeTATs[warrantyType] = [];
            }
            if (tat > 0) {
                warrantyTypeTATs[warrantyType].push(tat);
            }
        });
        
        // Calculate average TAT per warranty type
        const warrantyTypeAvgTATs = {};
        Object.keys(warrantyTypeTATs).forEach(warrantyType => {
            const tats = warrantyTypeTATs[warrantyType];
            warrantyTypeAvgTATs[warrantyType] = tats.length > 0 
                ? tats.reduce((sum, tat) => sum + tat, 0) / tats.length 
                : 0;
        });
        
        // Calculate approval rates
        const warrantyApprovalRates = {};
        Object.keys(warrantyTypeApprovalRates).forEach(warrantyType => {
            const { total, approved } = warrantyTypeApprovalRates[warrantyType];
            warrantyApprovalRates[warrantyType] = total > 0 ? (approved / total) * 100 : 0;
        });
        
        // Sort warranty types by amount (descending)
        const sortedWarrantyTypes = Object.keys(warrantyTypeData).sort((a, b) => 
            warrantyTypeData[b] - warrantyTypeData[a]
        );
        
        // Enhanced color palette
        const warrantyColors = [
            '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
            '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
        ];
        
        // Prepare data for the doughnut chart
        const warrantyDataset = {
            labels: sortedWarrantyTypes,
            datasets: [{
                data: sortedWarrantyTypes.map(type => warrantyTypeData[type]),
                backgroundColor: warrantyColors.slice(0, sortedWarrantyTypes.length),
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        };
        
        if (charts.warrantyType) {
            charts.warrantyType.destroy();
        }
        
        // Create a doughnut chart with enhanced tooltips
        charts.warrantyType = new Chart(warrantyTypeCtx, {
            type: 'doughnut',
            data: warrantyDataset,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 15,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const meta = chart.getDatasetMeta(0);
                                        const style = meta.controller.getStyle(i);
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        
                                        return {
                                            text: `${label}: ${percentage}%`,
                                            fillStyle: style.backgroundColor,
                                            strokeStyle: style.borderColor,
                                            lineWidth: style.borderWidth,
                                            hidden: isNaN(value) || meta.data[i].hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                const formattedValue = value.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2
                                });
                                return `${label}: ${formattedValue} (${percentage}%)`;
                            },
                            afterLabel: function(context) {
                                const warrantyType = context.label;
                                const claimCount = warrantyTypeCounts[warrantyType];
                                const approvalRate = warrantyApprovalRates[warrantyType].toFixed(1);
                                const avgTAT = warrantyTypeAvgTATs[warrantyType].toFixed(1);
                                
                                return [
                                    `Claims: ${claimCount}`,
                                    `Approval Rate: ${approvalRate}%`,
                                    `Avg TAT: ${avgTAT} days`
                                ];
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });

        // Initialize Monthly Trend Chart
        const monthlyTrendCtx = document.getElementById('monthlyTrendChart').getContext('2d');
        
        // Create data structures for monthly metrics
        const monthlyCredits = {};
        const monthlyClaims = {};
        const monthlyApproved = {};
        const monthlyDisallowed = {};
        const monthlyAvgTAT = {};
        const monthlyTATs = {};
        
        // Process data for monthly trend with reduced console logging
        data.forEach((claim) => {
            if (!claim['Claim Submitted Date']) {
                return;
            }
            
            try {
                const date = new Date(claim['Claim Submitted Date']);
                
                if (isNaN(date.getTime())) {
                    return;
                }
                
                const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                
                // Count claims per month
                monthlyClaims[monthKey] = (monthlyClaims[monthKey] || 0) + 1;
                
                // Track claim status
                if (claim['Claim Status'] === 'Approved') {
                    monthlyApproved[monthKey] = (monthlyApproved[monthKey] || 0) + 1;
                } else if (claim['Claim Status'] === 'Disallowed') {
                    monthlyDisallowed[monthKey] = (monthlyDisallowed[monthKey] || 0) + 1;
                }
                
                // Track credited amounts
                const amount = typeof claim['Credited Amount'] === 'string'
                    ? parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''))
                    : parseFloat(claim['Credited Amount']);
                
                if (!isNaN(amount)) {
                    monthlyCredits[monthKey] = (monthlyCredits[monthKey] || 0) + amount;
                }
                
                // Track TAT values for calculating averages
                const tat = parseFloat(claim['TAT']) || 0;
                if (tat > 0) {
                    if (!monthlyTATs[monthKey]) {
                        monthlyTATs[monthKey] = [];
                    }
                    monthlyTATs[monthKey].push(tat);
                }
            } catch (error) {
                console.error(`Error processing claim for monthly trend:`, error);
            }
        });
        
        // Calculate average TAT per month
        Object.keys(monthlyTATs).forEach(month => {
            const tats = monthlyTATs[month];
            monthlyAvgTAT[month] = tats.length > 0 
                ? tats.reduce((sum, tat) => sum + tat, 0) / tats.length 
                : 0;
        });
        
        // Sort months chronologically
        const sortedMonths = Object.keys(monthlyClaims).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
        
        // Calculate 3-month moving average for credits
        const calculateCreditsMovingAverage = (data, months, window = 3) => {
            const result = {};
            months.forEach((month, index) => {
                if (index >= window - 1) {
                    let sum = 0;
                    for (let i = 0; i < window; i++) {
                        sum += data[months[index - i]] || 0;
                    }
                    result[month] = sum / window;
                } else {
                    // For the first few months where we don't have enough data for a full window
                    let sum = 0;
                    for (let i = 0; i <= index; i++) {
                        sum += data[months[index - i]] || 0;
                    }
                    result[month] = sum / (index + 1);
                }
            });
            return result;
        };
        
        const creditMovingAvg = calculateCreditsMovingAverage(monthlyCredits, sortedMonths);
        
        if (charts.monthlyTrend) {
            charts.monthlyTrend.destroy();
        }
        
        // Only create chart if we have data
        if (sortedMonths.length > 0) {
            charts.monthlyTrend = new Chart(monthlyTrendCtx, {
                type: 'line',
                data: {
                    labels: sortedMonths,
                    datasets: [
                        {
                            label: 'Total Credits',
                            data: sortedMonths.map(month => monthlyCredits[month] || 0),
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: '3-Month Avg Credits',
                            data: sortedMonths.map(month => creditMovingAvg[month] || 0),
                            borderColor: '#198754',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            tension: 0.3,
                            fill: false,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Number of Claims',
                            data: sortedMonths.map(month => monthlyClaims[month] || 0),
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Avg TAT (days)',
                            data: sortedMonths.map(month => monthlyAvgTAT[month] || 0),
                            borderColor: '#fd7e14',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false,
                            yAxisID: 'y2',
                            hidden: true // Hidden by default, can be toggled
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw;
                                    
                                    if (label.includes('Credits')) {
                                        return `${label}: $${value.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}`;
                                    } else if (label === 'Avg TAT (days)') {
                                        return `${label}: ${value.toFixed(1)} days`;
                                    } else {
                                        return `${label}: ${value}`;
                                    }
                                },
                                afterBody: function(context) {
                                    const month = context[0].label;
                                    const approved = monthlyApproved[month] || 0;
                                    const disallowed = monthlyDisallowed[month] || 0;
                                    const total = monthlyClaims[month] || 0;
                                    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
                                    
                                    return [
                                        `Approved: ${approved} (${approvalRate}%)`,
                                        `Disallowed: ${disallowed}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount ($)'
                            },
                            ticks: {
                                callback: value => '$' + value.toLocaleString()
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Claims'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        },
                        y2: {
                            type: 'linear',
                            display: false, // Hidden by default, will show when dataset is toggled
                            position: 'right',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'TAT (days)'
                            },
                            grid: {
                                drawOnChartArea: false
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
        
        // Define TAT ranges with more granularity
        const tatRanges = {
            '0-3 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 },
            '4-7 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 },
            '8-14 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 },
            '15-21 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 },
            '22-30 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 },
            '31-45 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 },
            '>45 days': { count: 0, approved: 0, disallowed: 0, totalAmount: 0 }
        };
        
        // Process data for TAT distribution with more metrics
        let totalClaims = 0;
        let validTATClaims = 0;
        
        data.forEach(claim => {
            const tat = parseInt(claim['TAT']) || 0;
            if (tat <= 0) return; // Skip invalid TAT values
            
            validTATClaims++;
            const amount = parseFloat(claim['Credited Amount']) || 0;
            const isApproved = claim['Claim Status'] === 'Approved';
            const isDisallowed = claim['Claim Status'] === 'Disallowed';
            
            let rangeKey;
            if (tat <= 3) rangeKey = '0-3 days';
            else if (tat <= 7) rangeKey = '4-7 days';
            else if (tat <= 14) rangeKey = '8-14 days';
            else if (tat <= 21) rangeKey = '15-21 days';
            else if (tat <= 30) rangeKey = '22-30 days';
            else if (tat <= 45) rangeKey = '31-45 days';
            else rangeKey = '>45 days';
            
            tatRanges[rangeKey].count++;
            if (isApproved) tatRanges[rangeKey].approved++;
            if (isDisallowed) tatRanges[rangeKey].disallowed++;
            tatRanges[rangeKey].totalAmount += amount;
            
            totalClaims++;
        });
        
        // Calculate approval rates and average amounts
        const tatApprovalRates = {};
        const tatAvgAmounts = {};
        
        Object.keys(tatRanges).forEach(range => {
            const { count, approved, totalAmount } = tatRanges[range];
            tatApprovalRates[range] = count > 0 ? (approved / count) * 100 : 0;
            tatAvgAmounts[range] = count > 0 ? totalAmount / count : 0;
        });
        
        // Generate gradient colors based on TAT ranges (green to red)
        const generateGradientColors = () => {
            return [
                'rgba(40, 167, 69, 0.8)',    // 0-3 days (green)
                'rgba(92, 184, 92, 0.8)',     // 4-7 days (light green)
                'rgba(240, 173, 78, 0.8)',    // 8-14 days (yellow)
                'rgba(236, 151, 31, 0.8)',    // 15-21 days (orange)
                'rgba(217, 83, 79, 0.8)',     // 22-30 days (light red)
                'rgba(204, 51, 51, 0.8)',     // 31-45 days (red)
                'rgba(165, 42, 42, 0.8)'      // >45 days (dark red)
            ];
        };
        
        if (charts.tatDistribution) {
            charts.tatDistribution.destroy();
        }
        
        // Create a more informative TAT distribution chart
        charts.tatDistribution = new Chart(tatDistributionCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(tatRanges),
                datasets: [
                    {
                        label: 'Number of Claims',
                        data: Object.keys(tatRanges).map(range => tatRanges[range].count),
                        backgroundColor: generateGradientColors(),
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        order: 1
                    },
                    {
                        label: 'Approval Rate (%)',
                        data: Object.keys(tatRanges).map(range => tatApprovalRates[range]),
                        type: 'line',
                        borderColor: '#6f42c1',
                        backgroundColor: 'rgba(111, 66, 193, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#6f42c1',
                        pointRadius: 4,
                        fill: false,
                        yAxisID: 'y1',
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw;
                                
                                if (label === 'Approval Rate (%)') {
                                    return `${label}: ${value.toFixed(1)}%`;
                                } else {
                                    return `${label}: ${value}`;
                                }
                            },
                            afterLabel: function(context) {
                                if (context.datasetIndex === 0) { // Only for the bar dataset
                                    const range = context.label;
                                    const { approved, disallowed, totalAmount } = tatRanges[range];
                                    const avgAmount = tatAvgAmounts[range];
                                    
                                    return [
                                        `Approved: ${approved}`,
                                        `Disallowed: ${disallowed}`,
                                        `Total Amount: ${totalAmount.toLocaleString('en-US', {
                                            style: 'currency',
                                            currency: 'USD'
                                        })}`,
                                        `Avg Amount: ${avgAmount.toLocaleString('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                            minimumFractionDigits: 2
                                        })}`
                                    ];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Claims'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        max: 100,
                        title: {
                            display: true,
                            text: 'Approval Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
        
        // Add a note about the data coverage
        if (validTATClaims === 0) {
            const chartContainer = document.getElementById('tatDistributionChart').parentElement;
            chartContainer.innerHTML = `
                <div class="text-center p-3">
                    <p>No valid TAT data available</p>
                </div>
            `;
        }

        // Initialize Claims by Month Chart
        const claimsByMonthCtx = document.getElementById('claimsByMonthChart').getContext('2d');
        
        // Create data structures for monthly metrics
        const claimsByMonth = {};
        const approvedByMonth = {};
        const disallowedByMonth = {};
        const pendingByMonth = {};
        const amountsByMonth = {};
        
        // Process data for claims by month with reduced logging
        let validDates = 0;
        let invalidDates = 0;
        
        data.forEach(claim => {
            const submissionDate = claim['Claim Submitted Date'];
            if (!submissionDate) {
                invalidDates++;
                return;
            }
            
            try {
                // Parse the date string (format: YYYY-MM-DD)
                const date = new Date(submissionDate);
                if (isNaN(date.getTime())) {
                    invalidDates++;
                    return;
                }
                
                const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                
                // Count total claims by month
                claimsByMonth[monthKey] = (claimsByMonth[monthKey] || 0) + 1;
                
                // Track claim status by month
                const status = claim['Claim Status'] || 'Unknown';
                if (status === 'Approved') {
                    approvedByMonth[monthKey] = (approvedByMonth[monthKey] || 0) + 1;
                } else if (status === 'Disallowed') {
                    disallowedByMonth[monthKey] = (disallowedByMonth[monthKey] || 0) + 1;
                } else {
                    pendingByMonth[monthKey] = (pendingByMonth[monthKey] || 0) + 1;
                }
                
                // Track amounts by month
                const amount = parseFloat(claim['Credited Amount']) || 0;
                if (!isNaN(amount)) {
                    amountsByMonth[monthKey] = (amountsByMonth[monthKey] || 0) + amount;
                }
                
                validDates++;
            } catch (error) {
                console.error(`Error processing claim for claims by month:`, error);
                invalidDates++;
            }
        });
        
        // Sort months chronologically
        const sortedClaimMonths = Object.keys(claimsByMonth).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
        
        // Calculate approval rates by month
        const approvalRatesByMonth = {};
        sortedClaimMonths.forEach(month => {
            const total = claimsByMonth[month] || 0;
            const approved = approvedByMonth[month] || 0;
            approvalRatesByMonth[month] = total > 0 ? (approved / total) * 100 : 0;
        });
        
        // Calculate average amount per claim by month
        const avgAmountByMonth = {};
        sortedClaimMonths.forEach(month => {
            const total = claimsByMonth[month] || 0;
            const amount = amountsByMonth[month] || 0;
            avgAmountByMonth[month] = total > 0 ? amount / total : 0;
        });
        
        // Calculate 3-month moving average for claims
        const calculateClaimsMovingAverage = (data, months, window = 3) => {
            const result = {};
            months.forEach((month, index) => {
                if (index >= window - 1) {
                    let sum = 0;
                    for (let i = 0; i < window; i++) {
                        sum += data[months[index - i]] || 0;
                    }
                    result[month] = sum / window;
                } else {
                    // For the first few months where we don't have enough data for a full window
                    let sum = 0;
                    for (let i = 0; i <= index; i++) {
                        sum += data[months[index - i]] || 0;
                    }
                    result[month] = sum / (index + 1);
                }
            });
            return result;
        };
        
        const claimsMovingAvg = calculateClaimsMovingAverage(claimsByMonth, sortedClaimMonths);
        
        if (charts.claimsByMonth) {
            charts.claimsByMonth.destroy();
        }
        
        // Generate a color palette for the stacked bar chart
        const claimStatusColors = {
            approved: 'rgba(40, 167, 69, 0.8)',   // green
            disallowed: 'rgba(220, 53, 69, 0.8)',  // red
            pending: 'rgba(255, 193, 7, 0.8)'      // yellow
        };
        
        // Only create chart if we have data
        if (sortedClaimMonths.length > 0) {
            charts.claimsByMonth = new Chart(claimsByMonthCtx, {
                type: 'bar',
                data: {
                    labels: sortedClaimMonths,
                    datasets: [
                        {
                            label: 'Approved',
                            data: sortedClaimMonths.map(month => approvedByMonth[month] || 0),
                            backgroundColor: claimStatusColors.approved,
                            stack: 'Stack 0'
                        },
                        {
                            label: 'Disallowed',
                            data: sortedClaimMonths.map(month => disallowedByMonth[month] || 0),
                            backgroundColor: claimStatusColors.disallowed,
                            stack: 'Stack 0'
                        },
                        {
                            label: 'Pending/Other',
                            data: sortedClaimMonths.map(month => pendingByMonth[month] || 0),
                            backgroundColor: claimStatusColors.pending,
                            stack: 'Stack 0'
                        },
                        {
                            label: '3-Month Avg Claims',
                            data: sortedClaimMonths.map(month => claimsMovingAvg[month] || 0),
                            type: 'line',
                            borderColor: '#6610f2',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 3,
                            fill: false,
                            tension: 0.3,
                            order: 0
                        },
                        {
                            label: 'Approval Rate (%)',
                            data: sortedClaimMonths.map(month => approvalRatesByMonth[month] || 0),
                            type: 'line',
                            borderColor: '#20c997',
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: false,
                            tension: 0.3,
                            yAxisID: 'y1',
                            hidden: true // Hidden by default, can be toggled
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw;
                                    
                                    if (label === 'Approval Rate (%)') {
                                        return `${label}: ${value.toFixed(1)}%`;
                                    } else if (label.includes('Avg')) {
                                        return `${label}: ${value.toFixed(1)}`;
                                    } else {
                                        return `${label}: ${value} claims`;
                                    }
                                },
                                afterBody: function(context) {
                                    const month = context[0].label;
                                    const totalClaims = claimsByMonth[month] || 0;
                                    const totalAmount = amountsByMonth[month] || 0;
                                    const avgAmount = avgAmountByMonth[month] || 0;
                                    
                                    return [
                                        `Total Claims: ${totalClaims}`,
                                        `Total Amount: ${totalAmount.toLocaleString('en-US', {
                                            style: 'currency',
                                            currency: 'USD'
                                        })}`,
                                        `Avg Amount: ${avgAmount.toLocaleString('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                            minimumFractionDigits: 2
                                        })}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Number of Claims'
                            }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            max: 100,
                            title: {
                                display: true,
                                text: 'Approval Rate (%)'
                            },
                            grid: {
                                drawOnChartArea: false
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
                        Total records: ${data.length}
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