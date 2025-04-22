document.addEventListener('DOMContentLoaded', function() {
    // Table containers
    const containers = {
        invoice: document.getElementById('final-invoice-container'),
        warranty: document.getElementById('warranty-claim-container'),
        opportunity: document.getElementById('opportunity-container'),
        recommendations: document.getElementById('recommendations-container'),
        prioritize: document.getElementById('prioritize-container')
    };

    // Tables
    const tables = {
        invoice: document.getElementById('final-invoice-table'),
        warranty: document.getElementById('warranty-claim-table'),
        opportunity: document.getElementById('opportunity-table'),
        recommendations: document.getElementById('recommendations-table'),
        prioritize: document.getElementById('prioritize-table')
    };

    // Buttons
    const buttons = {
        proceed1: document.getElementById('proceed-btn-1'),
        proceed2: document.getElementById('proceed-btn-2'),
        backToInvoice: document.getElementById('back-to-invoice'),
        backToWarranty: document.getElementById('back-to-warranty'),
        backToOpportunity: document.getElementById('back-to-opportunity'),
        backToRecommendations: document.getElementById('back-to-recommendations')
    };

    // Initialize selection tracking
    let selectedRows = {
        invoice: [],
        warranty: [],
        opportunity: [],
        recommendations: [],
        prioritize: []
    };

    // Function to show a specific container and hide others
    function showContainer(containerId) {
        Object.values(containers).forEach(container => {
            container.style.display = 'none';
        });
        containers[containerId].style.display = 'block';
    }

    // Function to update selected rows and button state
    function updateSelectedRows(tableId) {
        selectedRows[tableId] = Array.from(tables[tableId].querySelectorAll('tbody tr.selected-row'));
        
        // Update proceed button state
        const proceedButton = document.getElementById(`proceed-btn-${tableId === 'invoice' ? '1' : '2'}`);
        if (proceedButton) {
            proceedButton.disabled = selectedRows[tableId].length === 0;
        }
    }

    // Add click event to each row for selection
    function setupTableSelection(tableId) {
        const rows = tables[tableId].querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.addEventListener('click', function(e) {
                // Don't toggle if clicking on a button
                if (e.target.tagName === 'BUTTON') {
                    return;
                }
                
                // Toggle selection
                this.classList.toggle('selected-row');
                
                // Update selected rows array
                updateSelectedRows(tableId);
            });
        });
    }

    // Setup all tables
    Object.keys(tables).forEach(tableId => {
        setupTableSelection(tableId);
    });

    // Initialize button states
    Object.keys(tables).forEach(tableId => {
        updateSelectedRows(tableId);
    });

    // Back button functionality
    buttons.backToInvoice.addEventListener('click', () => showContainer('invoice'));
    buttons.backToWarranty.addEventListener('click', () => showContainer('warranty'));
    buttons.backToOpportunity.addEventListener('click', () => showContainer('opportunity'));
    buttons.backToRecommendations.addEventListener('click', () => showContainer('recommendations'));

    // Proceed button functionality
    buttons.proceed1.addEventListener('click', function() {
        if (selectedRows.invoice.length === 0) {
            alert('Please select at least one shop to proceed');
            return;
        }
        showContainer('warranty');
    });

    buttons.proceed2.addEventListener('click', function() {
        if (selectedRows.warranty.length === 0) {
            alert('Please select at least one warranty claim to proceed');
            return;
        }
        showContainer('opportunity');
    });

    // Analyze button functionality
    document.querySelectorAll('.analyze-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent row selection
            showContainer('recommendations');
        });
    });

    // Recommendations proceed button functionality
    document.querySelectorAll('.proceed-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent row selection
            showContainer('prioritize');
        });
    });

    // Initialize with first table visible
    showContainer('invoice');
});