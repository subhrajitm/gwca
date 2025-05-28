document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarClose = document.getElementById('sidebar-close');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Get DOM elements
    const searchInput = document.getElementById('searchInput');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const finalInvoiceTable = document.getElementById('final-invoice-table');
    const warrantyClaimTable = document.getElementById('warranty-claim-table');
    const finalInvoiceContainer = document.getElementById('final-invoice-container');
    const warrantyClaimContainer = document.getElementById('warranty-claim-container');
    const warrantySearchInput = document.getElementById('warrantySearchInput');
    const clearWarrantyFiltersBtn = document.getElementById('clearWarrantyFilters');

    // Add click event listeners to action links
    const actionLinks = document.querySelectorAll('.action-link');
    actionLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const shopName = this.closest('tr').querySelector('td:first-child').textContent;
            showWarrantyClaimTable(shopName);
        });
    });

    // Function to show warranty claim table
    function showWarrantyClaimTable(shopName) {
        finalInvoiceContainer.style.display = 'none';
        warrantyClaimContainer.style.display = 'block';
        
        // Update the table header to show which shop's claims are being displayed
        const warrantyTableHeader = warrantyClaimContainer.querySelector('.table-header h2');
        warrantyTableHeader.textContent = `Warranty Claim Status - ${shopName}`;
    }

    // Function to show final invoice table
    function showFinalInvoiceTable() {
        warrantyClaimContainer.style.display = 'none';
        finalInvoiceContainer.style.display = 'block';
    }

    // Add back button to warranty claim table header
    const warrantyTableHeader = warrantyClaimContainer.querySelector('.table-header');
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-link text-decoration-none me-2';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
    backButton.addEventListener('click', showFinalInvoiceTable);
    warrantyTableHeader.insertBefore(backButton, warrantyTableHeader.firstChild);

    // Search functionality for final invoice table
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = finalInvoiceTable.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
            
            updateTableInfo(finalInvoiceTable, 'showingCount', 'totalCount');
        });
    }

    // Search functionality for warranty claim table
    if (warrantySearchInput) {
        warrantySearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = warrantyClaimTable.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
            
            updateTableInfo(warrantyClaimTable, 'warrantyShowingCount', 'warrantyTotalCount');
        });
    }

    // Clear filters for final invoice table
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                const rows = finalInvoiceTable.querySelectorAll('tbody tr');
                rows.forEach(row => row.style.display = '');
                updateTableInfo(finalInvoiceTable, 'showingCount', 'totalCount');
            }
        });
    }

    // Clear filters for warranty claim table
    if (clearWarrantyFiltersBtn) {
        clearWarrantyFiltersBtn.addEventListener('click', function() {
            if (warrantySearchInput) {
                warrantySearchInput.value = '';
                const rows = warrantyClaimTable.querySelectorAll('tbody tr');
                rows.forEach(row => row.style.display = '');
                updateTableInfo(warrantyClaimTable, 'warrantyShowingCount', 'warrantyTotalCount');
            }
        });
    }

    // Function to update table info
    function updateTableInfo(table, showingId, totalId) {
        const showingCount = table.querySelectorAll('tbody tr:not([style*="display: none"])').length;
        const totalCount = table.querySelectorAll('tbody tr').length;
        
        document.getElementById(showingId).textContent = showingCount;
        document.getElementById(totalId).textContent = totalCount;
    }

    // Initialize table info
    if (finalInvoiceTable) {
        updateTableInfo(finalInvoiceTable, 'showingCount', 'totalCount');
    }
    if (warrantyClaimTable) {
        updateTableInfo(warrantyClaimTable, 'warrantyShowingCount', 'warrantyTotalCount');
    }
});