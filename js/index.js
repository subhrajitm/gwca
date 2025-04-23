document.addEventListener('DOMContentLoaded', function() {
    // Sample data for the charts
    const models = ['Model1', 'Model2', 'Model3', 'Model4', 'Model5', 'Model6', 'Model7', 'Model8', 'Model9'];
    const creditsPaidData = [12500, 15000, 8900, 13200, 9800, 11500, 14200, 10500, 12800];
    const disallowedData = [2500, 3000, 1800, 2600, 1900, 2300, 2800, 2100, 2500];
    const transactionsData = [150, 180, 120, 160, 130, 140, 170, 140, 155];
    const closureTimeData = [5.2, 4.8, 6.1, 5.5, 5.9, 5.3, 4.9, 5.7, 5.1];
    const holdTimeData = [2.1, 1.8, 2.5, 2.2, 2.4, 2.0, 1.9, 2.3, 2.1];

    // Common chart options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: {
                        size: 11
                    }
                }
            }
        }
    };

    // Initialize Credits & Disallowed Chart
    const creditsCtx = document.getElementById('creditsChart').getContext('2d');
    new Chart(creditsCtx, {
        type: 'bar',
        data: {
            labels: models,
            datasets: [{
                label: 'Credits Paid',
                data: creditsPaidData,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }, {
                label: 'Disallowed Amount',
                data: disallowedData,
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 1
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount ($)',
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });

    // Initialize Transactions Chart
    const transactionsCtx = document.getElementById('transactionsChart').getContext('2d');
    new Chart(transactionsCtx, {
        type: 'line',
        data: {
            labels: models,
            datasets: [{
                label: 'Transactions',
                data: transactionsData,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Transactions',
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });

    // Initialize Time Metrics Chart
    const timeMetricsCtx = document.getElementById('timeMetricsChart').getContext('2d');
    new Chart(timeMetricsCtx, {
        type: 'radar',
        data: {
            labels: models,
            datasets: [{
                label: 'Avg. Claim Closure (Days)',
                data: closureTimeData,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 2,
                pointBackgroundColor: 'rgb(99, 102, 241)'
            }, {
                label: 'Avg. Hold Time (Days)',
                data: holdTimeData,
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderColor: 'rgb(245, 158, 11)',
                borderWidth: 2,
                pointBackgroundColor: 'rgb(245, 158, 11)'
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 2,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}); 