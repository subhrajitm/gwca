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

// Function to initialize charts
function initializeCharts(claims) {
    if (!claims || claims.length === 0) return;

    // Destroy existing charts before creating new ones
    destroyCharts();

    // Calculate chart data
    const approvedClaims = claims.filter(claim => claim['Claim Status'] === 'Approved').length;
    const disallowedClaims = claims.filter(claim => claim['Claim Status'] === 'Disallowed').length;

    // Product Line Distribution
    const productLineData = {};
    claims.forEach(claim => {
        const productLine = claim['Product Line'];
        productLineData[productLine] = (productLineData[productLine] || 0) + 1;
    });

    // Warranty Type Distribution
    const warrantyTypeData = {};
    claims.forEach(claim => {
        const warrantyType = claim['Warranty Type'];
        warrantyTypeData[warrantyType] = (warrantyTypeData[warrantyType] || 0) + 1;
    });

    // TAT Distribution
    const validTATs = claims
        .filter(claim => claim.TAT && !isNaN(parseInt(claim.TAT)))
        .map(claim => parseInt(claim.TAT));

    const tatRanges = {
        '0-10': 0,
        '11-20': 0,
        '21-30': 0,
        '31-40': 0,
        '41+': 0
    };

    validTATs.forEach(tat => {
        if (tat <= 10) tatRanges['0-10']++;
        else if (tat <= 20) tatRanges['11-20']++;
        else if (tat <= 30) tatRanges['21-30']++;
        else if (tat <= 40) tatRanges['31-40']++;
        else tatRanges['41+']++;
    });

    // Monthly Credits Trend
    const monthlyCredits = {};
    claims.forEach(claim => {
        const date = new Date(claim['Claim Submission Date']);
        const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        const amount = parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''));
        if (!isNaN(amount)) {
            monthlyCredits[monthKey] = (monthlyCredits[monthKey] || 0) + amount;
        }
    });

    // Claims by Month
    const claimsByMonth = {};
    claims.forEach(claim => {
        const date = new Date(claim['Claim Submission Date']);
        const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        claimsByMonth[monthKey] = (claimsByMonth[monthKey] || 0) + 1;
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyCredits).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);
        return dateA - dateB;
    });

    // Modern chart options
    const modernOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                align: 'center',
                labels: {
                    boxWidth: 8,
                    padding: 15,
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif",
                        weight: '500'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 8,
                titleFont: {
                    size: 11,
                    family: "'Inter', sans-serif",
                    weight: '600'
                },
                bodyFont: {
                    size: 11,
                    family: "'Inter', sans-serif"
                },
                cornerRadius: 4,
                displayColors: true,
                boxPadding: 4
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        },
        layout: {
            padding: {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
            }
        }
    };

    // Initialize charts
    const claimStatusCanvas = document.getElementById('claimStatusChart');
    if (claimStatusCanvas) {
        charts.claimStatus = new Chart(claimStatusCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Disallowed'],
                datasets: [{
                    data: [approvedClaims, disallowedClaims],
                    backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
                    borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
                    borderWidth: 1,
                    borderRadius: 4,
                    cutout: '70%'
                }]
            },
            options: {
                ...modernOptions,
                plugins: {
                    ...modernOptions.plugins,
                    legend: {
                        ...modernOptions.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const productLineCanvas = document.getElementById('productLineChart');
    if (productLineCanvas) {
        charts.productLine = new Chart(productLineCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(productLineData),
                datasets: [{
                    data: Object.values(productLineData),
                    backgroundColor: [
                        'rgba(0, 123, 255, 0.8)',
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)',
                        'rgba(23, 162, 184, 0.8)'
                    ],
                    borderColor: [
                        'rgba(0, 123, 255, 1)',
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)',
                        'rgba(23, 162, 184, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 4,
                    cutout: '70%'
                }]
            },
            options: {
                ...modernOptions,
                plugins: {
                    ...modernOptions.plugins,
                    legend: {
                        ...modernOptions.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const warrantyTypeCanvas = document.getElementById('warrantyTypeChart');
    if (warrantyTypeCanvas) {
        charts.warrantyType = new Chart(warrantyTypeCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(warrantyTypeData),
                datasets: [{
                    data: Object.values(warrantyTypeData),
                    backgroundColor: [
                        'rgba(0, 123, 255, 0.8)',
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)',
                        'rgba(23, 162, 184, 0.8)'
                    ],
                    borderColor: [
                        'rgba(0, 123, 255, 1)',
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)',
                        'rgba(23, 162, 184, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 4,
                    cutout: '70%'
                }]
            },
            options: {
                ...modernOptions,
                plugins: {
                    ...modernOptions.plugins,
                    legend: {
                        ...modernOptions.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const tatDistributionCanvas = document.getElementById('tatDistributionChart');
    if (tatDistributionCanvas) {
        charts.tatDistribution = new Chart(tatDistributionCanvas, {
            type: 'bar',
            data: {
                labels: Object.keys(tatRanges),
                datasets: [{
                    label: 'Number of Claims',
                    data: Object.values(tatRanges),
                    backgroundColor: 'rgba(0, 123, 255, 0.8)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 16
                }]
            },
            options: {
                ...modernOptions,
                plugins: {
                    ...modernOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280',
                            padding: 8,
                            stepSize: 1
                        },
                        border: {
                            display: false
                        }
                    }
                },
                barPercentage: 0.8,
                categoryPercentage: 0.8
            }
        });
    }

    // Monthly Credits Trend Chart
    const monthlyTrendCanvas = document.getElementById('monthlyTrendChart');
    if (monthlyTrendCanvas) {
        charts.monthlyTrend = new Chart(monthlyTrendCanvas, {
            type: 'line',
            data: {
                labels: sortedMonths,
                datasets: [{
                    label: 'Monthly Credits',
                    data: sortedMonths.map(month => monthlyCredits[month]),
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(0, 123, 255, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                ...modernOptions,
                plugins: {
                    ...modernOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280',
                            maxRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280',
                            padding: 8,
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Claims by Month Chart
    const claimsByMonthCanvas = document.getElementById('claimsByMonthChart');
    if (claimsByMonthCanvas) {
        charts.claimsByMonth = new Chart(claimsByMonthCanvas, {
            type: 'bar',
            data: {
                labels: sortedMonths,
                datasets: [{
                    label: 'Number of Claims',
                    data: sortedMonths.map(month => claimsByMonth[month]),
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 16
                }]
            },
            options: {
                ...modernOptions,
                plugins: {
                    ...modernOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280',
                            maxRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280',
                            padding: 8,
                            stepSize: 1
                        },
                        border: {
                            display: false
                        }
                    }
                },
                barPercentage: 0.8,
                categoryPercentage: 0.8
            }
        });
    }

    // Add chart resize handler
    window.addEventListener('resize', function() {
        Object.values(charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    });
} 