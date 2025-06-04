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
                percentage: 0, // Will be calculated below
                displayText: '' // Will be set below
            }))
            .sort((a, b) => b.size - a.size)
            .slice(0, 50); // Limit to top 50 words

        // Calculate percentage of total and set display text
        const totalWords = wordData.reduce((sum, word) => sum + word.frequency, 0);
        wordData.forEach(word => {
            word.percentage = ((word.frequency / totalWords) * 100).toFixed(1);
            word.displayText = `${word.text} (${word.frequency})`; // Add frequency to display text
        });

        console.log('Final word data length:', wordData.length);

        // Clear previous word cloud
        const container = d3.select("#wordCloudChart");
        container.selectAll("*").remove();

        // Get container dimensions
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = container.node().getBoundingClientRect().height;

        console.log('Container dimensions:', containerWidth, 'x', containerHeight);

        // Set up the word cloud layout with optimized settings
        const layout = d3.layout.cloud()
            .size([containerWidth, containerHeight])
            .words(wordData)
            .padding(3)
            .rotate(() => {
                // Fixed rotation angles for stability
                const angles = [0, 90, -90];
                return angles[Math.floor(Math.random() * angles.length)];
            })
            .font("Inter")
            .fontSize(d => Math.sqrt(d.size) * 5)
            .on("end", draw);

        // Start the layout calculation
        layout.start();

        function draw(words) {
            console.log('Drawing word cloud with', words.length, 'words');
            
            const svg = container
                .append("svg")
                .attr("width", containerWidth)
                .attr("height", containerHeight);

            const g = svg.append("g")
                .attr("transform", `translate(${containerWidth / 2},${containerHeight / 2})`);

            // Create tooltip with enhanced styling
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "word-cloud-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", "rgba(255, 255, 255, 0.95)")
                .style("border", "1px solid #ddd")
                .style("border-radius", "8px")
                .style("padding", "12px")
                .style("font-size", "13px")
                .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)")
                .style("z-index", "1000")
                .style("transition", "all 0.2s ease-in-out")
                .style("backdrop-filter", "blur(4px)");

            // Create a group for each word to handle both text and background
            const wordGroups = g.selectAll("g")
                .data(words)
                .enter()
                .append("g")
                .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`);

            // Add background rectangle for hover effect
            wordGroups.append("rect")
                .attr("x", d => -d.size * 0.6)
                .attr("y", d => -d.size * 0.4)
                .attr("width", d => d.size * 1.2)
                .attr("height", d => d.size * 0.8)
                .style("fill", "transparent")
                .style("rx", "6")
                .style("ry", "6")
                .style("transition", "all 0.2s ease-in-out");

            // Enhanced color palette
            const colorPalette = {
                high: ['#1f77b4', '#2ca02c', '#ff7f0e', '#d62728', '#9467bd'],
                medium: ['#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
                low: ['#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5']
            };

            // Add text with enhanced styling
            wordGroups.append("text")
                .style("font-size", d => `${d.size}px`)
                .style("font-family", "Inter")
                .style("fill", d => {
                    const frequency = d.frequency;
                    if (frequency > 10) {
                        return colorPalette.high[Math.floor(Math.random() * colorPalette.high.length)];
                    }
                    if (frequency > 5) {
                        return colorPalette.medium[Math.floor(Math.random() * colorPalette.medium.length)];
                    }
                    return colorPalette.low[Math.floor(Math.random() * colorPalette.low.length)];
                })
                .style("font-weight", d => d.frequency > 10 ? "600" : "400")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(d => d.displayText)
                .style("transition", "all 0.2s ease-in-out")
                .style("text-shadow", "0 1px 2px rgba(0,0,0,0.1)");

            // Enhanced hover effects
            wordGroups
                .on("mouseover", function(event, d) {
                    const group = d3.select(this);
                    
                    // Animate the group with a more pronounced effect
                    group.transition()
                        .duration(200)
                        .attr("transform", `translate(${d.x},${d.y}) rotate(${d.rotate}) scale(1.15)`);

                    // Show background with enhanced styling
                    group.select("rect")
                        .transition()
                        .duration(200)
                        .style("fill", "rgba(255, 255, 255, 0.95)")
                        .style("stroke", "#ddd")
                        .style("stroke-width", "1px")
                        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

                    // Enhance text
                    group.select("text")
                        .transition()
                        .duration(200)
                        .style("font-weight", "700")
                        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");

                    // Show tooltip with enhanced content
                    tooltip
                        .style("visibility", "visible")
                        .style("opacity", 0)
                        .html(`
                            <div style="text-align: center; margin-bottom: 8px;">
                                <strong style="font-size: 16px; color: ${d3.select(this).select("text").style("fill")};">${d.text}</strong>
                            </div>
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 12px;">
                                <span style="color: #666;">Frequency:</span>
                                <span style="font-weight: 500;">${d.frequency} occurrences</span>
                                <span style="color: #666;">Percentage:</span>
                                <span style="font-weight: 500;">${d.percentage}%</span>
                                <span style="color: #666;">Size:</span>
                                <span style="font-weight: 500;">${d.size}px</span>
                            </div>
                        `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px")
                        .transition()
                        .duration(200)
                        .style("opacity", 1)
                        .style("transform", "translateY(0)");
                })
                .on("mouseout", function() {
                    const group = d3.select(this);
                    
                    // Reset group transform
                    group.transition()
                        .duration(200)
                        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`);

                    // Hide background
                    group.select("rect")
                        .transition()
                        .duration(200)
                        .style("fill", "transparent")
                        .style("stroke", "none")
                        .style("filter", "none");

                    // Reset text
                    group.select("text")
                        .transition()
                        .duration(200)
                        .style("font-weight", d => d.frequency > 10 ? "600" : "400")
                        .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

                    // Hide tooltip with fade effect
                    tooltip
                        .transition()
                        .duration(200)
                        .style("opacity", 0)
                        .style("transform", "translateY(10px)")
                        .end()
                        .then(() => tooltip.style("visibility", "hidden"));
                });

            // Add legend with enhanced styling
            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(10, ${containerHeight - 80})`);

            const legendItems = [
                { color: colorPalette.high[0], label: "High Frequency (>10)" },
                { color: colorPalette.medium[0], label: "Medium Frequency (5-10)" },
                { color: colorPalette.low[0], label: "Low Frequency (<5)" }
            ];

            legendItems.forEach((item, i) => {
                const legendItem = legend.append("g")
                    .attr("transform", `translate(0, ${i * 25})`)
                    .style("cursor", "pointer")
                    .on("mouseover", function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("transform", `translate(5, ${i * 25})`);
                    })
                    .on("mouseout", function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("transform", `translate(0, ${i * 25})`);
                    });

                legendItem.append("rect")
                    .attr("width", 14)
                    .attr("height", 14)
                    .style("fill", item.color)
                    .style("rx", "3")
                    .style("ry", "3")
                    .style("transition", "all 0.2s ease-in-out");

                legendItem.append("text")
                    .attr("x", 20)
                    .attr("y", 12)
                    .style("font-size", "11px")
                    .style("fill", "#666")
                    .text(item.label)
                    .style("transition", "all 0.2s ease-in-out");
            });

            console.log('Word cloud drawing completed');
        }

        // Add resize handler with debouncing and size threshold
        let resizeTimeout;
        let lastWidth = containerWidth;
        const resizeObserver = new ResizeObserver(entries => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                for (let entry of entries) {
                    const newWidth = entry.contentRect.width;
                    // Only regenerate if width change is significant (more than 50px)
                    if (Math.abs(newWidth - lastWidth) > 50) {
                        console.log('Container resized significantly, regenerating word cloud');
                        lastWidth = newWidth;
                        generateWordCloud(data);
                    }
                }
            }, 500); // Increased debounce time
        });

        resizeObserver.observe(container.node());

    } catch (error) {
        console.error('Error generating word cloud:', error);
        const container = d3.select("#wordCloudChart");
        container.selectAll("*").remove();
        container.append("div")
            .style("text-align", "center")
            .style("padding", "20px")
            .style("color", "#666")
            .html(`
                <p>Error generating word cloud</p>
                <small>${error.message}</small>
            `);
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
    document.getElementById('totalCredits').textContent = `$${totalCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

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
    document.getElementById('approvedCredits').textContent = `$${approvedCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${approvedCreditsPercentage}%)`;
    document.getElementById('disallowedCredits').textContent = `$${disallowedCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${disallowedCreditsPercentage}%)`;

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
                        'Approved': 0,
                        'Disallowed': 0,
                        'Pending': 0
                    };
                }
                
                // Increment the count for the claim's status
                const status = claim['Claim Status'] || 'Pending';
                claimsByMonth[monthKey][status]++;
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
            const hasPendingClaims = sortedClaimMonths.some(month => claimsByMonth[month]['Pending'] > 0);
            
            // Prepare datasets
            const datasets = [
                {
                    label: 'Approved',
                    data: sortedClaimMonths.map(month => claimsByMonth[month]['Approved']),
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1,
                    stack: 'Claims',
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(40, 167, 69, 1)',
                    hoverBorderColor: 'rgba(40, 167, 69, 1)',
                    hoverBorderWidth: 2
                },
                {
                    label: 'Disallowed',
                    data: sortedClaimMonths.map(month => claimsByMonth[month]['Disallowed']),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    stack: 'Claims',
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(220, 53, 69, 1)',
                    hoverBorderColor: 'rgba(220, 53, 69, 1)',
                    hoverBorderWidth: 2
                }
            ];

            // Only add Pending dataset if there are pending claims
            if (hasPendingClaims) {
                datasets.push({
                    label: 'Pending',
                    data: sortedClaimMonths.map(month => claimsByMonth[month]['Pending']),
                    backgroundColor: 'rgba(255, 193, 7, 0.8)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    borderWidth: 1,
                    stack: 'Claims',
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(255, 193, 7, 1)',
                    hoverBorderColor: 'rgba(255, 193, 7, 1)',
                    hoverBorderWidth: 2
                });
            }

            // Add Total Claims line
            datasets.push({
                label: 'Total Claims',
                data: sortedClaimMonths.map(month => 
                    claimsByMonth[month]['Approved'] + 
                    claimsByMonth[month]['Disallowed'] + 
                    (hasPendingClaims ? claimsByMonth[month]['Pending'] : 0)
                ),
                type: 'line',
                borderColor: 'rgba(13, 110, 253, 1)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(13, 110, 253, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: 'rgba(13, 110, 253, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3,
                tension: 0.4,
                fill: true,
                yAxisID: 'y',
                order: 0
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
                            display: true,
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
                                    if (context.dataset.type === 'line') {
                                        return `${label}: ${value}`;
                                    }
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
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
                            stacked: true,
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
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
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