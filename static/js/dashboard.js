// Global variables for data management
let allData = [];
let currentPage = 1;
let totalPages = 1;
const perPage = 1000;
let isLoading = false;
let hasMoreData = true;

// Store chart instances
let charts = {
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
        warrantyType: null,
        monthlyTrend: null,
        tatDistribution: null,
        claimsByMonth: null
    };
}

// Function to process text for word cloud
function processTextForWordCloud(text) {
    if (!text) return '';
    // Convert to lowercase and remove special characters
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Function to generate word cloud
function generateWordCloud(data) {
    try {
        console.log('Starting word cloud generation with data length:', data.length);
        
        // Get all disallowed item comments
        const comments = data
            .filter(claim => claim['Claim Status'] === 'Disallowed' && claim['Disallowed Item Comment'])
            .map(claim => processTextForWordCloud(claim['Disallowed Item Comment']))
            .join(' ');

        console.log('Processed comments length:', comments.length);

        // Split into words and count frequencies using a Map for better performance
        const wordCounts = new Map();
        const words = comments.split(/\s+/);
        
        // Extended list of stop words
        const stopWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'that', 'this',
            'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here', 'where', 'when',
            'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'if', 'then', 'else', 'when', 'while',
            'until', 'unless', 'because', 'since', 'although', 'though', 'whether', 'while', 'whereas',
            'whereby', 'wherein', 'whereupon', 'wherever', 'whenever', 'whatever', 'whichever', 'whoever',
            'whomever', 'whosever', 'however', 'nevertheless', 'nonetheless', 'notwithstanding', 'therefore',
            'thus', 'hence', 'consequently', 'accordingly', 'furthermore', 'moreover', 'besides', 'also',
            'too', 'either', 'neither', 'both', 'each', 'every', 'any', 'all', 'some', 'none', 'no',
            'such', 'same', 'other', 'another', 'either', 'neither', 'both', 'each', 'every', 'any',
            'all', 'some', 'none', 'no', 'such', 'same', 'other', 'another'
        ]);
        
        // Common warranty-related words to keep
        const importantWords = new Set([
            'warranty', 'claim', 'damage', 'repair', 'replace', 'defect', 'fault', 'broken', 'damaged',
            'failed', 'failure', 'issue', 'problem', 'error', 'malfunction', 'worn', 'wear', 'tear',
            'crack', 'cracked', 'leak', 'leaking', 'rust', 'rusted', 'corrosion', 'corroded', 'dent',
            'dented', 'scratch', 'scratched', 'bent', 'broken', 'missing', 'loose', 'tight', 'stuck',
            'jammed', 'blocked', 'clogged', 'frozen', 'seized', 'burned', 'burnt', 'overheated',
            'electrical', 'mechanical', 'structural', 'cosmetic', 'functional', 'operational'
        ]);
        
        words.forEach(word => {
            if (word.length > 2 && !stopWords.has(word)) {
                // Keep important words regardless of frequency
                if (importantWords.has(word)) {
                    wordCounts.set(word, (wordCounts.get(word) || 0) + 2); // Give higher weight to important words
                } else {
                    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                }
            }
        });

        console.log('Unique words count:', wordCounts.size);

        // Convert to array and sort by frequency
        const wordData = Array.from(wordCounts.entries())
            .map(([text, size]) => ({ 
                text, 
                size,
                frequency: size,
                percentage: 0 // Will be calculated below
            }))
            .sort((a, b) => b.size - a.size)
            .slice(0, 50); // Limit to top 50 words

        // Calculate percentage of total
        const totalWords = wordData.reduce((sum, word) => sum + word.frequency, 0);
        wordData.forEach(word => {
            word.percentage = ((word.frequency / totalWords) * 100).toFixed(1);
        });

        console.log('Final word data length:', wordData.length);

        // Clear previous word cloud
        const container = document.getElementById('wordCloudChart');
        container.innerHTML = '';

        // Create a table to display the words
        const table = document.createElement('table');
        table.className = 'table table-hover';
        table.style.width = '100%';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Word</th>
                <th>Frequency</th>
                <th>Percentage</th>
            </tr>
        `;
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        wordData.forEach(word => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${word.text}</td>
                <td>${word.frequency}</td>
                <td>${word.percentage}%</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        // Add the table to the container
        container.appendChild(table);

        // Add resize handler
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                generateWordCloud(data);
            }, 500);
        };

        window.addEventListener('resize', handleResize);

    } catch (error) {
        console.error('Error generating word cloud:', error);
        const container = document.getElementById('wordCloudChart');
        container.innerHTML = `
            <div class="alert alert-danger">
                <p>Error generating word cloud</p>
                <small>${error.message}</small>
            </div>
        `;
    }
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
function updateDashboardStats(claims) {
    // Update total claims
    const totalClaims = claims.length;
    document.getElementById('totalClaims').textContent = totalClaims.toLocaleString();

    // Calculate approved and disallowed claims
    const approvedClaims = claims.filter(claim => claim['Claim Status'] === 'Approved').length;
    const disallowedClaims = claims.filter(claim => claim['Claim Status'] === 'Disallowed').length;
    
    // Calculate percentages for claims
    const approvedClaimsPercentage = totalClaims > 0 ? (approvedClaims / totalClaims * 100) : 0;
    const disallowedClaimsPercentage = totalClaims > 0 ? (disallowedClaims / totalClaims * 100) : 0;
    
    // Update approved and disallowed claims with percentages
    document.getElementById('approvedClaims').textContent = `${approvedClaims.toLocaleString()} (${approvedClaimsPercentage.toFixed(1)}%)`;
    document.getElementById('disallowedClaims').textContent = `${disallowedClaims.toLocaleString()} (${disallowedClaimsPercentage.toFixed(1)}%)`;

    // Calculate rates
    const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims * 100) : 0;
    const rejectionRate = totalClaims > 0 ? (disallowedClaims / totalClaims * 100) : 0;
    const successRate = totalClaims > 0 ? (approvedClaims / totalClaims * 100) : 0;

    // Update rates
    document.getElementById('successRate').textContent = `${successRate.toFixed(1)}%`;
    document.getElementById('approvalRate').textContent = `${approvalRate.toFixed(1)}%`;
    document.getElementById('rejectionRate').textContent = `${rejectionRate.toFixed(1)}%`;

    // Calculate total credits (using Credited Amount for approved and Requested Credits for disallowed)
    const totalCredits = claims.reduce((sum, claim) => {
        let amount = 0;
        if (claim['Claim Status'] === 'Approved') {
            amount = parseFloat(claim['Credited Amount']) || 0;
        } else if (claim['Claim Status'] === 'Disallowed') {
            amount = parseFloat(claim['Requested Credits']) || 0;
        }
        return sum + amount;
    }, 0);
    document.getElementById('totalCredits').textContent = `$${(totalCredits / 1000000).toFixed(2)}M`;

    // Calculate approved credits (using Credited Amount)
    const approvedCredits = claims
        .filter(claim => claim['Claim Status'] === 'Approved')
        .reduce((sum, claim) => {
            const amount = parseFloat(claim['Credited Amount']) || 0;
            return sum + amount;
        }, 0);

    // Calculate disallowed credits (using Requested Credits)
    const disallowedCredits = claims
        .filter(claim => claim['Claim Status'] === 'Disallowed')
        .reduce((sum, claim) => {
            const amount = parseFloat(claim['Requested Credits']) || 0;
            return sum + amount;
        }, 0);

    // Calculate percentages for credits
    const approvedCreditsPercentage = totalCredits > 0 ? (approvedCredits / totalCredits * 100).toFixed(1) : 0;
    const disallowedCreditsPercentage = totalCredits > 0 ? (disallowedCredits / totalCredits * 100).toFixed(1) : 0;

    // Update approved and disallowed credits with percentages
    document.getElementById('approvedCredits').textContent = `$${(approvedCredits / 1000000).toFixed(2)}M (${approvedCreditsPercentage}%)`;
    document.getElementById('disallowedCredits').textContent = `$${(disallowedCredits / 1000000).toFixed(2)}M (${disallowedCreditsPercentage}%)`;

    // Calculate TAT statistics
    const tatValues = claims
        .filter(claim => claim['TAT'] !== null && !isNaN(claim['TAT']))
        .map(claim => parseFloat(claim['TAT']));
    
    const avgTAT = tatValues.length > 0 ? tatValues.reduce((a, b) => a + b, 0) / tatValues.length : 0;
    const minTAT = tatValues.length > 0 ? Math.min(...tatValues) : 0;
    const maxTAT = tatValues.length > 0 ? Math.max(...tatValues) : 0;

    // Update TAT statistics
    document.getElementById('avgTAT').textContent = `${avgTAT.toFixed(1)} days`;
    document.getElementById('minTAT').textContent = `${minTAT.toFixed(1)} days`;
    document.getElementById('maxTAT').textContent = `${maxTAT.toFixed(1)} days`;
}

// Function to initialize all charts
function initializeCharts(data) {
    try {
        // Generate word cloud for disallowed item comments
        generateWordCloud(data);

        // Initialize Warranty Type Chart
        const warrantyTypeCtx = document.getElementById('warrantyTypeChart').getContext('2d');
        const warrantyTypeData = {};
        data.forEach(claim => {
            const warrantyType = claim['Warranty Type'] || 'Unknown';
            const amount = parseFloat(claim['Credited Amount']) || 0;
            warrantyTypeData[warrantyType] = (warrantyTypeData[warrantyType] || 0) + amount;
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
                // Parse the date string properly
                const dateStr = claim['Claim Submitted Date'].split(' ')[0]; // Get just the date part
                const date = new Date(dateStr);
                
                if (isNaN(date.getTime())) {
                    console.log(`Skipping claim ${index} - Invalid date: ${claim['Claim Submitted Date']}`);
                    return;
                }
                
                const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                console.log(`Claim ${index} - Month key: ${monthKey}`);
                
                // Handle amount parsing more carefully
                let amount = 0;
                if (typeof claim['Credited Amount'] === 'string') {
                    // Remove any currency symbols and commas
                    const cleanAmount = claim['Credited Amount'].replace(/[^0-9.-]+/g, '');
                    amount = parseFloat(cleanAmount) || 0;
                } else if (typeof claim['Credited Amount'] === 'number') {
                    amount = claim['Credited Amount'];
                }
                
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
        
        // Process data for claims by month and status
        let validDates = 0;
        let invalidDates = 0;
        
        // Initialize data structure for each month
        data.forEach((claim, index) => {
            const submissionDate = claim['Claim Submitted Date'];
            if (!submissionDate) {
                console.log(`Skipping claim ${index} - No submission date found. Available fields:`, Object.keys(claim));
                invalidDates++;
                return;
            }
            
            try {
                // Parse the date string properly
                const dateStr = submissionDate.split(' ')[0]; // Get just the date part
                const date = new Date(dateStr);
                
                if (isNaN(date.getTime())) {
                    console.log(`Skipping claim ${index} - Invalid date: ${submissionDate}`);
                    invalidDates++;
                    return;
                }
                
                const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                
                // Initialize month data if not exists
                if (!claimsByMonth[monthKey]) {
                    claimsByMonth[monthKey] = {
                        'Approved': { count: 0, amount: 0 },
                        'Disallowed': { count: 0, amount: 0 },
                        'Pending': { count: 0, amount: 0 },
                        'TAT': { sum: 0, count: 0 } // Add TAT tracking
                    };
                }
                
                // Increment the count and amount for the claim's status
                const status = claim['Claim Status'] || 'Pending';
                claimsByMonth[monthKey][status].count++;
                
                // Add amount based on status
                if (status === 'Approved') {
                    claimsByMonth[monthKey][status].amount += parseFloat(claim['Credited Amount']) || 0;
                } else if (status === 'Disallowed') {
                    claimsByMonth[monthKey][status].amount += parseFloat(claim['Requested Credits']) || 0;
                }

                // Add TAT to the monthly data
                const tat = parseFloat(claim['TAT']) || 0;
                if (!isNaN(tat)) {
                    claimsByMonth[monthKey]['TAT'].sum += tat;
                    claimsByMonth[monthKey]['TAT'].count++;
                }
                
                validDates++;
                
            } catch (error) {
                console.error(`Error processing claim ${index}:`, error);
                invalidDates++;
            }
        });
        
        // Sort months chronologically
        const sortedClaimMonths = Object.keys(claimsByMonth).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
        
        if (charts.claimsByMonth) {
            charts.claimsByMonth.destroy();
        }
        
        // Only create chart if we have data
        if (Object.keys(claimsByMonth).length > 0) {
            console.log('Creating claims by month chart with data');
            
            // Check if there are any pending claims
            const hasPendingClaims = sortedClaimMonths.some(month => claimsByMonth[month]['Pending'].count > 0);
            
            // Prepare datasets
            const datasets = [
                {
                    label: 'Approved',
                    data: sortedClaimMonths.map(month => claimsByMonth[month]['Approved'].count),
                    type: 'line',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.15)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(40, 167, 69, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: 'rgba(40, 167, 69, 1)',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y'
                },
                {
                    label: 'Disallowed',
                    data: sortedClaimMonths.map(month => claimsByMonth[month]['Disallowed'].count),
                    type: 'line',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.15)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(220, 53, 69, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: 'rgba(220, 53, 69, 1)',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y'
                }
            ];

            // Add TAT as a bar
            datasets.push({
                label: 'Average TAT',
                data: sortedClaimMonths.map(month => {
                    const tatData = claimsByMonth[month]['TAT'];
                    return tatData.count > 0 ? (tatData.sum / tatData.count) : 0;
                }),
                type: 'bar',
                backgroundColor: 'rgba(23, 162, 184, 0.8)',
                borderColor: 'rgba(23, 162, 184, 1)',
                borderWidth: 1,
                borderRadius: 0,
                hoverBackgroundColor: 'rgba(23, 162, 184, 1)',
                hoverBorderColor: 'rgba(23, 162, 184, 1)',
                hoverBorderWidth: 2,
                yAxisID: 'y1',
                order: 1
            });

            charts.claimsByMonth = new Chart(claimsByMonthCtx, {
                type: 'bar',
                data: {
                    labels: sortedClaimMonths,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                    },
                    plugins: {
                        title: {
                            display: false,
                            text: 'Claims by Month and Status',
                            font: {
                                size: 18,
                                weight: 'bold',
                                family: "'Inter', sans-serif"
                            },
                            padding: {
                                top: 10,
                                bottom: 20
                            },
                            color: '#333'
                        },
                        legend: {
                            position: 'top',
                            align: 'center',
                            labels: {
                                boxWidth: 12,
                                padding: 15,
                                font: {
                                    size: 12,
                                    family: "'Inter', sans-serif"
                                },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#333',
                            bodyColor: '#666',
                            borderColor: '#ddd',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: true,
                            usePointStyle: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw;
                                    const month = context.label;
                                    
                                    if (label === 'Average TAT') {
                                        return `${label}: ${value.toFixed(1)} days`;
                                    }
                                    
                                    // For bar charts, show percentage
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    
                                    if (label === 'Approved') {
                                        return `${label}: ${value} claims (${percentage}%)`;
                                    } else if (label === 'Disallowed') {
                                        return `${label}: ${value} claims (${percentage}%)`;
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
                            border: {
                                display: true,
                                color: '#ddd'
                            },
                            ticks: {
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 12
                                },
                                color: '#666'
                            },
                            title: {
                                display: true,
                                text: 'Month',
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 14,
                                    weight: 'bold'
                                },
                                padding: {
                                    top: 10
                                },
                                color: '#333'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            border: {
                                display: true,
                                color: '#ddd'
                            },
                            ticks: {
                                stepSize: 1,
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 12
                                },
                                color: '#666'
                            },
                            title: {
                                display: true,
                                text: 'Number of Claims',
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 14,
                                    weight: 'bold'
                                },
                                padding: {
                                    bottom: 10
                                },
                                color: '#333'
                            }
                        },
                        y1: {
                            position: 'right',
                            beginAtZero: true,
                            grid: {
                                display: false
                            },
                            border: {
                                display: false
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(1) + ' days';
                                },
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 12
                                },
                                color: '#666'
                            },
                            title: {
                                display: true,
                                text: 'Average TAT (days)',
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 14,
                                    weight: 'bold'
                                },
                                padding: {
                                    bottom: 10
                                },
                                color: '#333'
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    barPercentage: 1.0,
                    categoryPercentage: 0.7,
                    borderRadius: 0
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
        document.getElementById('totalCredits').textContent = `$${(summary.total_credits / 1000000).toFixed(2)}M`;
        document.getElementById('avgTAT').textContent = `${Math.round(summary.avg_tat)} days`;
        
        // Update rates
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