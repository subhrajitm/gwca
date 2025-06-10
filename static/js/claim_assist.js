function sortTable(table, col, asc = true) {
    const tbody = table.tBodies[0];
    Array.from(tbody.querySelectorAll('tr'))
        .sort((a, b) => {
            const aText = a.children[col].textContent.trim();
            const bText = b.children[col].textContent.trim();
            return (aText.localeCompare(bText, undefined, {numeric: true})) * (asc ? 1 : -1);
        })
        .forEach(tr => tbody.appendChild(tr));
}

function setupSorting(table) {
    table.querySelectorAll('th.sortable').forEach((th, idx) => {
        let asc = true;
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            sortTable(table, idx, asc);
            asc = !asc;
        });
    });
}

function setupSearch(table, searchBox) {
    searchBox.addEventListener('input', function() {
        const val = this.value.toLowerCase();
        table.querySelectorAll('tbody tr').forEach(row => {
            const shop = row.children[0].textContent.toLowerCase();
            row.style.display = shop.includes(val) ? '' : 'none';
        });
    });
}

function exportTableToCSV(table, filename) {
    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (let row of rows) {
        let cols = Array.from(row.querySelectorAll('th,td')).map(td => '"' + td.innerText.replace(/"/g, '""') + '"');
        csv.push(cols.join(','));
    }
    const csvFile = new Blob([csv.join('\n')], {type: 'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvFile);
    link.download = filename;
    link.click();
}

function setupExport(table, btn, filename) {
    btn.addEventListener('click', () => exportTableToCSV(table, filename));
}

function setupTooltips() {
    document.body.addEventListener('mouseover', function(e) {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            let tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.innerText = target.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);
            const rect = target.getBoundingClientRect();
            tooltip.style.left = rect.left + window.scrollX + 'px';
            tooltip.style.top = rect.bottom + window.scrollY + 4 + 'px';
            target._tooltip = tooltip;
        }
    });
    document.body.addEventListener('mouseout', function(e) {
        const target = e.target.closest('[data-tooltip]');
        if (target && target._tooltip) {
            document.body.removeChild(target._tooltip);
            target._tooltip = null;
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const issuedBtn = document.querySelector('.issued-arrow-btn');
    const finalInvoiceCard = document.querySelector('.modern-table-card');
    const warrantyTableCard = document.getElementById('warranty-claim-table');
    const warrantyTable = document.getElementById('warranty-table');
    const warrantySearch = document.querySelector('.warranty-search-box');
    const warrantyExport = document.querySelector('.warranty-export-btn');
    const invoiceTable = document.querySelector('.invoice-table');
    const invoiceSearch = document.querySelector('.search-box:not(.warranty-search-box)');
    const invoiceExport = document.querySelector('.export-btn:not(.warranty-export-btn)');
    const steps = document.querySelectorAll('.step');
    const backBtn = document.querySelector('.back-to-invoice');

    function setStep(stepNum) {
        steps.forEach((step, idx) => {
            if (idx === stepNum - 1) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    if (issuedBtn && finalInvoiceCard && warrantyTableCard) {
        issuedBtn.addEventListener('click', function() {
            finalInvoiceCard.classList.add('hide-table');
            warrantyTableCard.classList.remove('hide-table');
            setStep(2);
        });
    }
    if (backBtn && finalInvoiceCard && warrantyTableCard) {
        backBtn.addEventListener('click', function() {
            warrantyTableCard.classList.add('hide-table');
            finalInvoiceCard.classList.remove('hide-table');
            setStep(1);
        });
    }
    if (warrantyTable) setupSorting(warrantyTable);
    if (warrantyTable && warrantySearch) setupSearch(warrantyTable, warrantySearch);
    if (warrantyTable && warrantyExport) setupExport(warrantyTable, warrantyExport, 'warranty_claim_status.csv');
    if (invoiceTable) setupSorting(invoiceTable);
    if (invoiceTable && invoiceSearch) setupSearch(invoiceTable, invoiceSearch);
    if (invoiceTable && invoiceExport) setupExport(invoiceTable, invoiceExport, 'final_invoice_status.csv');
    setupTooltips();
});

// Tooltip styles
const style = document.createElement('style');
style.innerHTML = `.custom-tooltip { position: absolute; background: #222; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 0.95em; z-index: 9999; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }`;
document.head.appendChild(style); 