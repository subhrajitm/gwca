// Global variables
let selectedShop = null;
let selectedBusinessPlan = null;

// DOM Elements
const table1Container = document.getElementById('table1-container');
const table2Container = document.getElementById('table2-container');
const table3Container = document.getElementById('table3-container');
const table4Container = document.getElementById('table4-container');
const table5Container = document.getElementById('table5-container');

const table1Body = document.getElementById('table1-body');
const table2Body = document.getElementById('table2-body');
const table3Body = document.getElementById('table3-body');
const table4Body = document.getElementById('table4-body');
const table5Body = document.getElementById('table5-body');

const proceedBtn1 = document.getElementById('proceed-btn-1');
const proceedBtn2 = document.getElementById('proceed-btn-2');
const proceedBtn4 = document.getElementById('proceed-btn-4');

const backBtn2 = document.getElementById('back-btn-2');
const backBtn3 = document.getElementById('back-btn-3');
const backBtn4 = document.getElementById('back-btn-4');
const backBtn5 = document.getElementById('back-btn-5');

const analyzeBtn = document.getElementById('analyze-btn');
const finishBtn = document.getElementById('finish-btn');

// Sample data
const warrantyClaimData = {
    'Shop1': { toBeAssessed: 3, noOpportunity: 1, inProgress: 2 },
    'Shop2': { toBeAssessed: 2, noOpportunity: 0, inProgress: 1 },
    'Shop3': { toBeAssessed: 2, noOpportunity: 1, inProgress: 0 }
};

const opportunityData = {
    'Shop1': [
        { customer: 'Customer A', model: 'Model X', esn: 'ESN001', partKeyword: 'Bearing', partNumber: 'BRG-123' },
        { customer: 'Customer B', model: 'Model Y', esn: 'ESN002', partKeyword: 'Gasket', partNumber: 'GSK-456' }
    ],
    'Shop2': [
        { customer: 'Customer C', model: 'Model Z', esn: 'ESN003', partKeyword: 'Valve', partNumber: 'VLV-789' }
    ],
    'Shop3': [
        { customer: 'Customer D', model: 'Model X', esn: 'ESN004', partKeyword: 'Piston', partNumber: 'PST-101' },
        { customer: 'Customer E', model: 'Model Y', esn: 'ESN005', partKeyword: 'Seal', partNumber: 'SEL-202' }
    ]
};

const recommendationsData = {
    'Shop1': [
        { customer: 'Customer A', model: 'Model X', esn: 'ESN001', businessPlan: 'Plan Alpha' },
        { customer: 'Customer B', model: 'Model Y', esn: 'ESN002', businessPlan: 'Plan Beta' }
    ],
    'Shop2': [
        { customer: 'Customer C', model: 'Model Z', esn: 'ESN003', businessPlan: 'Plan Gamma' }
    ],
    'Shop3': [
        { customer: 'Customer D', model: 'Model X', esn: 'ESN004', businessPlan: 'Plan Delta' },
        { customer: 'Customer E', model: 'Model Y', esn: 'ESN005', businessPlan: 'Plan Epsilon' }
    ]
};

const priorityData = {
    'Plan Alpha': [
        { priority: 1, esn: 'ESN001', businessPlan: 'Plan Alpha', partKeyword: 'Bearing', partNumber: 'BRG-123', sb: 'Yes', ecsn: 'ECSN-A1', sv: 'High', scrap: 'No', disc: '10%', estAmount: '$5,000' }
    ],
    'Plan Beta': [
        { priority: 1, esn: 'ESN002', businessPlan: 'Plan Beta', partKeyword: 'Gasket', partNumber: 'GSK-456', sb: 'No', ecsn: 'ECSN-B1', sv: 'Medium', scrap: 'Yes', disc: '15%', estAmount: '$3,500' }
    ],
    'Plan Gamma': [
        { priority: 1, esn: 'ESN003', businessPlan: 'Plan Gamma', partKeyword: 'Valve', partNumber: 'VLV-789', sb: 'Yes', ecsn: 'ECSN-G1', sv: 'Low', scrap: 'No', disc: '5%', estAmount: '$2,800' }
    ],
    'Plan Delta': [
        { priority: 1, esn: 'ESN004', businessPlan: 'Plan Delta', partKeyword: 'Piston', partNumber: 'PST-101', sb: 'No', ecsn: 'ECSN-D1', sv: 'High', scrap: 'Yes', disc: '20%', estAmount: '$6,200' }
    ],
    'Plan Epsilon': [
        { priority: 1, esn: 'ESN005', businessPlan: 'Plan Epsilon', partKeyword: 'Seal', partNumber: 'SEL-202', sb: 'Yes', ecsn: 'ECSN-E1', sv: 'Medium', scrap: 'No', disc: '8%', estAmount: '$4,100' }
    ]
};

// Function to transition between tables
function transitionTables(fromTable, toTable) {
    if (!fromTable || !toTable) return;
    
    fromTable.classList.add('fade-out');
    setTimeout(() => {
        fromTable.style.display = 'none';
        fromTable.classList.remove('fade-out');
        toTable.style.display = 'block';
        toTable.classList.add('fade-in');
        setTimeout(() => {
            toTable.classList.remove('fade-in');
        }, 500);
    }, 500);
}

// Initialize table 1 if it exists
if (table1Body) {
    // Table 1 row click event
    table1Body.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const rows = table1Body.querySelectorAll('tr');
            rows.forEach(r => r.classList.remove('selected-row'));
            row.classList.add('selected-row');
            if (proceedBtn1) proceedBtn1.disabled = false;
            selectedShop = row.getAttribute('data-shop');
        });
    });
}

// Initialize proceed button 1 if it exists
if (proceedBtn1) {
    proceedBtn1.addEventListener('click', () => {
        if (selectedShop && table1Container && table2Container) {
            populateTable2(selectedShop);
            transitionTables(table1Container, table2Container);
        }
    });
}

// Function to populate table 2
function populateTable2(shop) {
    if (!table2Body) return;
    
    table2Body.innerHTML = '';
    const data = warrantyClaimData[shop];
    
    const row = document.createElement('tr');
    row.setAttribute('data-shop', shop);
    row.innerHTML = `
        <td>${shop}</td>
        <td>${data.toBeAssessed}</td>
        <td>${data.noOpportunity}</td>
        <td>${data.inProgress}</td>
    `;
    
    row.addEventListener('click', () => {
        const rows = table2Body.querySelectorAll('tr');
        rows.forEach(r => r.classList.remove('selected-row'));
        row.classList.add('selected-row');
        if (proceedBtn2) proceedBtn2.disabled = false;
        selectedShop = shop;
    });
    
    table2Body.appendChild(row);
}

// Initialize back button 2 if it exists
if (backBtn2) {
    backBtn2.addEventListener('click', () => {
        if (table2Container && table1Container) {
            transitionTables(table2Container, table1Container);
        }
    });
}

// Initialize proceed button 2 if it exists
if (proceedBtn2) {
    proceedBtn2.addEventListener('click', () => {
        if (selectedShop && table2Container && table3Container) {
            populateTable3(selectedShop);
            transitionTables(table2Container, table3Container);
        }
    });
}

// Function to populate table 3
function populateTable3(shop) {
    if (!table3Body) return;
    
    table3Body.innerHTML = '';
    const data = opportunityData[shop];
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${shop}</td>
            <td>${item.customer}</td>
            <td>${item.model}</td>
            <td>${item.esn}</td>
            <td>${item.partKeyword}</td>
            <td>${item.partNumber}</td>
        `;
        table3Body.appendChild(row);
    });
}

// Initialize back button 3 if it exists
if (backBtn3) {
    backBtn3.addEventListener('click', () => {
        if (table3Container && table2Container) {
            transitionTables(table3Container, table2Container);
        }
    });
}

// Initialize analyze button if it exists
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
        if (table3Container && table4Container) {
            populateTable4(selectedShop);
            transitionTables(table3Container, table4Container);
        }
    });
}

// Function to populate table 4
function populateTable4(shop) {
    if (!table4Body) return;
    
    table4Body.innerHTML = '';
    const data = recommendationsData[shop];
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${shop}</td>
            <td>${item.customer}</td>
            <td>${item.model}</td>
            <td>${item.esn}</td>
            <td>${item.businessPlan}</td>
        `;
        
        row.addEventListener('click', () => {
            const rows = table4Body.querySelectorAll('tr');
            rows.forEach(r => r.classList.remove('selected-row'));
            row.classList.add('selected-row');
            if (proceedBtn4) proceedBtn4.disabled = false;
            selectedBusinessPlan = item.businessPlan;
        });
        
        table4Body.appendChild(row);
    });
}

// Initialize back button 4 if it exists
if (backBtn4) {
    backBtn4.addEventListener('click', () => {
        if (table4Container && table3Container) {
            transitionTables(table4Container, table3Container);
        }
    });
}

// Initialize proceed button 4 if it exists
if (proceedBtn4) {
    proceedBtn4.addEventListener('click', () => {
        if (selectedBusinessPlan && table4Container && table5Container) {
            populateTable5(selectedBusinessPlan);
            transitionTables(table4Container, table5Container);
        }
    });
}

// Function to populate table 5
function populateTable5(businessPlan) {
    if (!table5Body) return;
    
    table5Body.innerHTML = '';
    const data = priorityData[businessPlan];
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.priority}</td>
            <td>${item.esn}</td>
            <td>${item.businessPlan}</td>
            <td>${item.partKeyword}</td>
            <td>${item.partNumber}</td>
            <td>${item.sb}</td>
            <td>${item.ecsn}</td>
            <td>${item.sv}</td>
            <td>${item.scrap}</td>
            <td>${item.disc}</td>
            <td>${item.estAmount}</td>
        `;
        table5Body.appendChild(row);
    });
}

// Initialize back button 5 if it exists
if (backBtn5) {
    backBtn5.addEventListener('click', () => {
        if (table5Container && table4Container) {
            transitionTables(table5Container, table4Container);
        }
    });
}

// Finish button click event
if (finishBtn) {
    finishBtn.addEventListener('click', () => {
        alert('Process completed successfully!');
        if (table5Container && table1Container) {
            transitionTables(table5Container, table1Container);
        }
        // Reset selections
        selectedShop = null;
        selectedBusinessPlan = null;
        if (proceedBtn1) {
            proceedBtn1.disabled = true;
        }
        if (table1Body) {
            table1Body.querySelectorAll('tr').forEach(row => {
                row.classList.remove('selected-row');
            });
        }
    });
}

// Enhanced sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Apply smooth transitions to all tables
    const applyTableStyles = () => {
        document.querySelectorAll('.table tbody tr').forEach(row => {
            // Add transition effect
            row.style.transition = 'all 0.2s ease';
            
            // Add hover effect
            row.addEventListener('mouseenter', () => {
                if (!row.classList.contains('selected-row')) {
                    row.style.backgroundColor = 'rgba(0, 102, 255, 0.05)';
                }
            });
            
            row.addEventListener('mouseleave', () => {
                if (!row.classList.contains('selected-row')) {
                    row.style.backgroundColor = '';
                }
            });
        });
    };
    
    // Sidebar dropdown toggle
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = toggle.parentElement;
            parent.classList.toggle('open');
        });
    });
    
    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
    
    // Sidebar close button for mobile
    const sidebarCloseBtn = document.getElementById('sidebar-close');
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }
    
    // Apply styles initially
    applyTableStyles();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Add chart functionality for dashboard
    if (document.getElementById('warrantyMetricsChart')) {
        const ctx = document.getElementById('warrantyMetricsChart').getContext('2d');
        
        // Sample data for the chart
        const models = ['Model1', 'Model2', 'Model3', 'Model4', 'Model5'];
        const creditsPaid = [152, 22, 139, 474, 116];
        const disallowedAmount = [81, 65, 65, 371, 238];
        
        // Create the chart
        const warrantyMetricsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: models,
                datasets: [
                    {
                        label: 'Credits Paid',
                        data: creditsPaid,
                        backgroundColor: 'rgba(26, 58, 143, 0.8)',
                        borderColor: 'rgba(26, 58, 143, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barThickness: 20
                    },
                    {
                        label: 'Disallowed Amount',
                        data: disallowedAmount,
                        backgroundColor: 'rgba(0, 179, 227, 0.8)',
                        borderColor: 'rgba(0, 179, 227, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barThickness: 20
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 12,
                            padding: 20,
                            font: {
                                size: 12,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 12,
                            family: "'Inter', sans-serif",
                            weight: '600'
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Inter', sans-serif"
                        },
                        cornerRadius: 4,
                        displayColors: true,
                        boxPadding: 4
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12,
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
                                size: 12,
                                family: "'Inter', sans-serif",
                                weight: '500'
                            },
                            color: '#6B7280',
                            padding: 10
                        },
                        border: {
                            display: false
                        }
                    }
                },
                barPercentage: 0.8,
                categoryPercentage: 0.8,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // Add chart resize handler
        window.addEventListener('resize', function() {
            warrantyMetricsChart.resize();
        });
    }
    
    // Final Invoice Status - Proceed functionality
    const invoiceProceedBtn = document.getElementById('invoice-proceed-btn');
    if (invoiceProceedBtn) {
        invoiceProceedBtn.addEventListener('click', function() {
            // Get all selected shops
            const selectedShops = [];
            const tableRows = document.querySelectorAll('.status-table tbody tr');
            
            tableRows.forEach(row => {
                if (row.classList.contains('selected-row')) {
                    selectedShops.push(row.getAttribute('data-shop'));
                }
            });
            
            if (selectedShops.length === 0) {
                // If no shops are selected, show alert
                alert('Please select at least one shop to proceed');
            } else {
                // Redirect to invoice-status.html with selected shops as query parameters
                const queryParams = selectedShops.map(shop => `shop=${encodeURIComponent(shop)}`).join('&');
                window.location.href = `invoice-status.html?${queryParams}`;
            }
        });
        
        // Make table rows selectable
        const tableRows = document.querySelectorAll('.status-table tbody tr');
        tableRows.forEach(row => {
            row.addEventListener('click', function() {
                this.classList.toggle('selected-row');
            });
        });
    }
    
    // Handle query parameters on invoice-status.html page
    if (window.location.pathname.includes('invoice-status.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedShops = urlParams.getAll('shop');
        
        if (selectedShops.length > 0) {
            // Highlight the selected shops in the invoice status page
            const tableRows = document.querySelectorAll('#table1-body tr');
            tableRows.forEach(row => {
                const shopName = row.getAttribute('data-shop');
                if (selectedShops.includes(shopName)) {
                    row.classList.add('selected-row');
                }
            });
            
            // Update the page title to show selected shops
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                pageTitle.textContent = `Final Invoice Status - ${selectedShops.join(', ')}`;
            }
        }
    }
});