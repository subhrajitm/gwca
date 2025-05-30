// Store chart instances
let charts = {
    claimStatus: null,
    productLine: null,
    warrantyType: null,
    tatDistribution: null,
    monthlyTrend: null,
    claimsByMonth: null
};

// Function to destroy existing charts
function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
}

// Function to initialize all charts
function initializeCharts(data) {
    // Common chart options for responsiveness
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    padding: 15
                }
            }
        }
    };

    // Initialize Claim Status Distribution Chart
    const claimStatusCtx = document.getElementById('claimStatusChart').getContext('2d');
    const claimStatusData = processClaimStatusData(data);
    new Chart(claimStatusCtx, {
        type: 'doughnut',
        data: {
            labels: claimStatusData.labels,
            datasets: [{
                data: claimStatusData.values,
                backgroundColor: ['#1cc88a', '#e74a3b'],
                borderWidth: 1
            }]
        },
        options: {
            ...commonOptions,
            cutout: '70%'
        }
    });

    // Initialize Product Line Chart
    const productLineCtx = document.getElementById('productLineChart').getContext('2d');
    const productLineData = processProductLineData(data);
    new Chart(productLineCtx, {
        type: 'bar',
        data: {
            labels: productLineData.labels,
            datasets: [{
                label: 'Claims by Product Line',
                data: productLineData.values,
                backgroundColor: '#4e73df',
                borderWidth: 1
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    // Initialize Warranty Type Chart
    const warrantyTypeCtx = document.getElementById('warrantyTypeChart').getContext('2d');
    const warrantyTypeData = processWarrantyTypeData(data);
    new Chart(warrantyTypeCtx, {
        type: 'pie',
        data: {
            labels: warrantyTypeData.labels,
            datasets: [{
                data: warrantyTypeData.values,
                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc'],
                borderWidth: 1
            }]
        },
        options: {
            ...commonOptions,
            cutout: '0%'
        }
    });

    // Initialize Monthly Trend Chart
    const monthlyTrendCtx = document.getElementById('monthlyTrendChart').getContext('2d');
    const monthlyTrendData = processMonthlyTrendData(data);
    new Chart(monthlyTrendCtx, {
        type: 'line',
        data: {
            labels: monthlyTrendData.labels,
            datasets: [{
                label: 'Monthly Credits',
                data: monthlyTrendData.values,
                borderColor: '#4e73df',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Initialize TAT Distribution Chart
    const tatDistributionCtx = document.getElementById('tatDistributionChart').getContext('2d');
    const tatDistributionData = processTATDistributionData(data);
    new Chart(tatDistributionCtx, {
        type: 'bar',
        data: {
            labels: tatDistributionData.labels,
            datasets: [{
                label: 'TAT Distribution',
                data: tatDistributionData.values,
                backgroundColor: '#36b9cc',
                borderWidth: 1
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    // Initialize Claims by Month Chart
    const claimsByMonthCtx = document.getElementById('claimsByMonthChart').getContext('2d');
    const claimsByMonthData = processClaimsByMonthData(data);
    new Chart(claimsByMonthCtx, {
        type: 'bar',
        data: {
            labels: claimsByMonthData.labels,
            datasets: [{
                label: 'Claims by Month',
                data: claimsByMonthData.values,
                backgroundColor: '#f6c23e',
                borderWidth: 1
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Helper functions to process data for charts
function processClaimStatusData(data) {
    const statusCount = {};
    data.forEach(claim => {
        const status = claim['Claim Status'];
        statusCount[status] = (statusCount[status] || 0) + 1;
    });
    return {
        labels: Object.keys(statusCount),
        values: Object.values(statusCount)
    };
}

function processProductLineData(data) {
    const productLineCount = {};
    data.forEach(claim => {
        const productLine = claim['Product Line'];
        productLineCount[productLine] = (productLineCount[productLine] || 0) + 1;
    });
    return {
        labels: Object.keys(productLineCount),
        values: Object.values(productLineCount)
    };
}

function processWarrantyTypeData(data) {
    const warrantyTypeCount = {};
    data.forEach(claim => {
        const warrantyType = claim['Warranty Type'];
        warrantyTypeCount[warrantyType] = (warrantyTypeCount[warrantyType] || 0) + 1;
    });
    return {
        labels: Object.keys(warrantyTypeCount),
        values: Object.values(warrantyTypeCount)
    };
}

function processMonthlyTrendData(data) {
    const monthlyCredits = {};
    data.forEach(claim => {
        const date = new Date(claim['Claim Submitted Date']);
        const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
        const amount = parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''));
        monthlyCredits[monthKey] = (monthlyCredits[monthKey] || 0) + (isNaN(amount) ? 0 : amount);
    });
    return {
        labels: Object.keys(monthlyCredits),
        values: Object.values(monthlyCredits)
    };
}

function processTATDistributionData(data) {
    const tatRanges = {
        '0-10': 0,
        '11-20': 0,
        '21-30': 0,
        '31-40': 0,
        '41+': 0
    };
    
    data.forEach(claim => {
        const tat = parseInt(claim.TAT);
        if (!isNaN(tat)) {
            if (tat <= 10) tatRanges['0-10']++;
            else if (tat <= 20) tatRanges['11-20']++;
            else if (tat <= 30) tatRanges['21-30']++;
            else if (tat <= 40) tatRanges['31-40']++;
            else tatRanges['41+']++;
        }
    });
    
    return {
        labels: Object.keys(tatRanges),
        values: Object.values(tatRanges)
    };
}

function processClaimsByMonthData(data) {
    const monthlyClaims = {};
    data.forEach(claim => {
        const date = new Date(claim['Claim Submitted Date']);
        const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthlyClaims[monthKey] = (monthlyClaims[monthKey] || 0) + 1;
    });
    return {
        labels: Object.keys(monthlyClaims),
        values: Object.values(monthlyClaims)
    };
}

// Add chart resize handler
window.addEventListener('resize', function() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
}); 