// Modern, advanced table logic for table.html
let claimsData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentSort = { key: '', asc: true };

document.addEventListener('DOMContentLoaded', function() {
    function renderTable(data) {
        const tbody = document.querySelector('#claimsTable tbody');
        tbody.innerHTML = '';
        // Pagination
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = data.slice(start, end);
        pageData.forEach(row => {
            tbody.innerHTML += `<tr>
                <td>${row["Claim Number"]}</td>
                <td>${row["Customer Name"]}</td>
                <td>${row["Credit to Customer"]}</td>
                <td>${row["Claim Submission Date"]}</td>
                <td>${row["Incident Date"]}</td>
                <td>${row["Claim Close Date"]}</td>
                <td>${row["TAT"]}</td>
                <td>${row["ESN"]}</td>
                <td>${row["Product Line"]}</td>
                <td>${row["Claim Eng Tsn"]}</td>
                <td>${row["Warranty Cost Type"]}</td>
                <td>${row["Part Number"]}</td>
                <td>${row["Part Keyword"]}</td>
                <td>${row["Part Serial Num"]}</td>
                <td>${row["Claim Part CSN"]}</td>
                <td>${row["Claim Part TSN"]}</td>
                <td>${row["Req Labor Rate"]}</td>
                <td>${row["Req Percent"]}</td>
                <td>${row["Req Quantity"]}</td>
                <td>${row["Req Unit Price"]}</td>
                <td>${row["Requested Credits"]}</td>
                <td>${row["Credited Amount"]}</td>
                <td>${row["S/B Concession Number"]}</td>
                <td>${row["Disallowed Item Comment"]}</td>
                <td><span class="badge ${row["Claim Status"] === 'Approved' ? 'approved' : 'disallowed'}">${row["Claim Status"]}</span></td>
                <td>${row["Warranty Category"]}</td>
                <td>${row["Warranty Type"]}</td>
                <td>${row["Final Concession Number"]}</td>
            </tr>`;
        });
        renderPagination(data.length);
    }

    function renderPagination(totalRows) {
        const pagination = document.getElementById('tablePagination');
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        let html = '';
        if (totalPages > 1) {
            html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="gotoPage(1)">&laquo;</button>`;
            html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="gotoPage(${currentPage - 1})">&lsaquo;</button>`;
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
                    html += `<button class="pagination-btn${i === currentPage ? ' active' : ''}" onclick="gotoPage(${i})">${i}</button>`;
                } else if (i === currentPage - 3 || i === currentPage + 3) {
                    html += '<span style="padding:0 0.3em;">...</span>';
                }
            }
            html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="gotoPage(${currentPage + 1})">&rsaquo;</button>`;
            html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="gotoPage(${totalPages})">&raquo;</button>`;
        }
        pagination.innerHTML = html;
    }

    window.gotoPage = function(page) {
        currentPage = page;
        renderTable(filteredData);
    }

    function filterTable() {
        const search = document.getElementById('globalSearch').value.toLowerCase();
        const status = document.getElementById('statusFilter').value;
        const warrantyType = document.getElementById('warrantyTypeFilter').value;
        const customer = document.getElementById('customerFilter').value;
        filteredData = claimsData.filter(row => {
            let match = true;
            if (search) {
                match = Object.values(row).some(val => String(val).toLowerCase().includes(search));
            }
            if (status && row["Claim Status"] !== status) match = false;
            if (warrantyType && row["Warranty Type"] !== warrantyType) match = false;
            if (customer && row["Customer Name"] !== customer) match = false;
            return match;
        });
        currentPage = 1;
        if (currentSort.key) sortTable(currentSort.key, currentSort.asc);
        else renderTable(filteredData);
    }

    function sortTable(key, asc) {
        filteredData.sort((a, b) => {
            let valA = a[key] || '';
            let valB = b[key] || '';
            // Try to parse as number if possible
            let numA = parseFloat(valA.toString().replace(/[^\d.-]/g, ''));
            let numB = parseFloat(valB.toString().replace(/[^\d.-]/g, ''));
            if (!isNaN(numA) && !isNaN(numB)) {
                return asc ? numA - numB : numB - numA;
            }
            // Otherwise, compare as string
            return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
        renderTable(filteredData);
    }

    document.getElementById('globalSearch').addEventListener('input', filterTable);
    document.getElementById('statusFilter').addEventListener('change', filterTable);
    document.getElementById('warrantyTypeFilter').addEventListener('change', filterTable);
    document.getElementById('customerFilter').addEventListener('change', filterTable);

    document.getElementById('claimsTableHeader').addEventListener('click', function(e) {
        if (e.target.tagName === 'TH' && e.target.dataset.sort) {
            const key = e.target.dataset.sort;
            if (currentSort.key === key) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.key = key;
                currentSort.asc = true;
            }
            sortTable(key, currentSort.asc);
        }
    });

    document.getElementById('exportCsvBtn').addEventListener('click', function() {
        let csv = '';
        const headers = Array.from(document.querySelectorAll('#claimsTable thead th')).map(th => th.textContent.trim());
        csv += headers.join(',') + '\n';
        filteredData.forEach(row => {
            let rowArr = headers.map(h => {
                let val = row[h] !== undefined ? row[h] : '';
                return '"' + String(val).replace(/"/g, '""') + '"';
            });
            csv += rowArr.join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'claims_table.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Fetch data and initialize table and filters
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            claimsData = data;
            filteredData = data;
            renderTable(filteredData);
        })
        .catch(error => {
            document.querySelector('#claimsTable tbody').innerHTML = `<tr><td colspan="29">Failed to load data.json</td></tr>`;
            console.error('Error loading data.json:', error);
        });
}); 