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
        '0-5': 0,
        '6-10': 0,
        '11-15': 0,
        '16-20': 0,
        '21-25': 0,
        '26-30': 0,
        '31+': 0
    };

    validTATs.forEach(tat => {
        if (tat <= 5) tatRanges['0-5']++;
        else if (tat <= 10) tatRanges['6-10']++;
        else if (tat <= 15) tatRanges['11-15']++;
        else if (tat <= 20) tatRanges['16-20']++;
        else if (tat <= 25) tatRanges['21-25']++;
        else if (tat <= 30) tatRanges['26-30']++;
        else tatRanges['31+']++;
    });

    // Calculate average TAT
    const avgTAT = validTATs.length > 0 
        ? validTATs.reduce((sum, tat) => sum + tat, 0) / validTATs.length 
        : 0;

    // Calculate percentage of claims within 30 days
    const within30Days = validTATs.filter(tat => tat <= 30).length;
    const within30DaysPercentage = (within30Days / validTATs.length) * 100;

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
                    backgroundColor: function(context) {
                        const value = context.raw;
                        const max = Math.max(...Object.values(tatRanges));
                        const ratio = value / max;
                        return `rgba(78, 115, 223, ${0.3 + (ratio * 0.5)})`;
                    },
                    borderColor: '#4e73df',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 20,
                    maxBarThickness: 25
                }]
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
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#2d3748',
                        bodyColor: '#4a5568',
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        callbacks: {
                            title: function(context) {
                                return `TAT Range: ${context[0].label} days`;
                            },
                            label: function(context) {
                                const value = context.raw;
                                const total = Object.values(tatRanges).reduce((sum, val) => sum + val, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${value} claims (${percentage}%)`;
                            },
                            afterBody: function() {
                                return [
                                    '',
                                    `Average TAT: ${avgTAT.toFixed(1)} days`,
                                    `${within30DaysPercentage.toFixed(1)}% within 30 days`
                                ];
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            avgLine: {
                                type: 'line',
                                yMin: 0,
                                yMax: Math.max(...Object.values(tatRanges)),
                                xMin: '21-25',
                                xMax: '21-25',
                                borderColor: '#e74a3b',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: 'Avg TAT',
                                    enabled: true,
                                    position: 'top',
                                    backgroundColor: '#e74a3b',
                                    color: '#fff',
                                    font: {
                                        size: 11,
                                        weight: '500'
                                    },
                                    padding: 4
                                }
                            }
                        }
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
                                weight: '500'
                            },
                            color: '#6B7280'
                        },
                        title: {
                            display: true,
                            text: 'Turnaround Time (Days)',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#4B5563',
                            padding: { top: 10 }
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
                                weight: '500'
                            },
                            color: '#6B7280',
                            padding: 8,
                            stepSize: 1
                        },
                        border: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Claims',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#4B5563',
                            padding: { bottom: 10 }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
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
    const claimsByMonthCtx = document.getElementById('claimsByMonthChart');
    if (claimsByMonthCtx) {
        // Prepare monthly data
        const monthlyData = {};
        claims.forEach(claim => {
            const date = new Date(claim['Claim Submission Date']);
            const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    submitted: 0,
                    closed: 0,
                    totalAmount: 0
                };
            }
            
            monthlyData[monthKey].submitted++;
            if (claim['Claim Close Date'] && claim['Claim Close Date'] !== '-') {
                monthlyData[monthKey].closed++;
            }
            
            const amount = parseFloat(claim['Credited Amount'].replace(/[^0-9.-]+/g, ''));
            monthlyData[monthKey].totalAmount += isNaN(amount) ? 0 : amount;
        });

        // Sort months chronologically
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');
            const dateA = new Date(`${monthA} 1, ${yearA}`);
            const dateB = new Date(`${monthB} 1, ${yearB}`);
            return dateA - dateB;
        });

        charts.claimsByMonth = new Chart(claimsByMonthCtx, {
            type: 'line',
            data: {
                labels: sortedMonths,
                datasets: [
                    {
                        label: 'Submitted Claims',
                        data: sortedMonths.map(month => monthlyData[month].submitted),
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#4e73df',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        order: 1
                    },
                    {
                        label: 'Closed Claims',
                        data: sortedMonths.map(month => monthlyData[month].closed),
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#1cc88a',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        order: 2
                    },
                    {
                        label: 'Total Amount ($)',
                        data: sortedMonths.map(month => monthlyData[month].totalAmount),
                        borderColor: '#f6c23e',
                        backgroundColor: 'rgba(246, 194, 62, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#f6c23e',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y1',
                        order: 3
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
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#2d3748',
                        bodyColor: '#4a5568',
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.dataset.yAxisID === 'y1') {
                                    label += '$' + context.parsed.y.toLocaleString();
                                } else {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value;
                            }
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
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