document.addEventListener('DOMContentLoaded', async function() {
    // Utility functions
    function parseAmount(str) {
        if (!str) return 0;
        return Number(str.replace(/[^\d.-]+/g, '')) || 0;
    }
    function formatAmount(num) {
        return '$' + num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    function average(arr) {
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    function unique(arr) {
        return Array.from(new Set(arr));
    }
    function getMonthYear(dateStr) {
        if (!dateStr || dateStr === '-') return null;
        const d = new Date(dateStr);
        if (isNaN(d)) return null;
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    function getMonthIndex(dateStr) {
        if (!dateStr || dateStr === '-') return null;
        const d = new Date(dateStr);
        if (isNaN(d)) return null;
        return d.getMonth();
    }

    // Fetch data.json
    let data = [];
    try {
        const res = await fetch('data.json');
        data = await res.json();
    } catch (e) {
        console.error('Failed to load data.json', e);
        return;
    }

    // --- Dashboard Stats ---
    const totalClaims = data.length;
    const approvedClaims = data.filter(d => d['Claim Status'] === 'Approved').length;
    const disallowedClaims = data.filter(d => d['Claim Status'] === 'Disallowed').length;
    const tatArr = data.map(d => Number(d['TAT'])).filter(n => !isNaN(n) && n > 0);
    const avgTAT = average(tatArr);
    const minTAT = Math.min(...tatArr);
    const maxTAT = Math.max(...tatArr);
    const totalCredits = data.reduce((sum, d) => sum + parseAmount(d['Credited Amount']), 0);
    const customers = unique(data.map(d => d['Customer Name']));

    // Update stat cards
    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = totalClaims;
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = approvedClaims;
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = disallowedClaims;
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = avgTAT ? avgTAT.toFixed(1) + ' days' : '-';
    document.querySelector('.stat-card:nth-child(4) .stat-label').textContent = `Range: ${minTAT}-${maxTAT} days`;
    document.querySelector('.stat-card:nth-child(5) .stat-value').textContent = formatAmount(totalCredits);
    document.querySelector('.stat-card:nth-child(6) .stat-value').textContent = customers.length;
    document.querySelector('.stat-card:nth-child(6) .stat-label').textContent = customers.join(', ');

    // --- Claims Overview Table ---
    const overviewTable = document.querySelector('.dashboard-widget .table-responsive table');
    if (overviewTable) {
        const tbody = overviewTable.querySelector('tbody');
        tbody.innerHTML = '';
        customers.forEach(cust => {
            const custData = data.filter(d => d['Customer Name'] === cust);
            const total = custData.length;
            const approved = custData.filter(d => d['Claim Status'] === 'Approved').length;
            const totalAmt = custData.reduce((sum, d) => sum + parseAmount(d['Credited Amount']), 0);
            const tatList = custData.map(d => Number(d['TAT'])).filter(n => !isNaN(n) && n > 0);
            const avgTat = average(tatList);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${cust}</td><td>${total}</td><td>${approved}</td><td>${formatAmount(totalAmt)}</td><td>${avgTat ? Math.round(avgTat) + ' days' : '-'}</td>`;
            tbody.appendChild(tr);
        });
    }

    // --- Financial Metrics Table ---
    const finTable = document.querySelectorAll('.dashboard-widget .table-responsive table')[1];
    if (finTable) {
        const tbody = finTable.querySelector('tbody');
        tbody.innerHTML = '';
        // Group by Part Number
        const partMap = {};
        data.forEach(d => {
            const pn = d['Part Number'];
            if (!pn || pn === '-') return;
            if (!partMap[pn]) partMap[pn] = [];
            partMap[pn].push(d);
        });
        // Sort by frequency desc, then total amount desc
        const partStats = Object.entries(partMap).map(([pn, arr]) => {
            const freq = arr.length;
            const totalAmt = arr.reduce((sum, d) => sum + parseAmount(d['Credited Amount']), 0);
            const avgAmt = freq ? totalAmt / freq : 0;
            return { pn, freq, totalAmt, avgAmt };
        }).sort((a, b) => b.freq - a.freq || b.totalAmt - a.totalAmt);
        partStats.slice(0, 5).forEach(stat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${stat.pn}</td><td>${stat.freq}</td><td>${formatAmount(stat.totalAmt)}</td><td>${formatAmount(stat.avgAmt)}</td>`;
            tbody.appendChild(tr);
        });
    }

    // --- Performance Metrics Table ---
    const perfTable = document.querySelectorAll('.dashboard-widget .table-responsive table')[2];
    if (perfTable) {
        const tbody = perfTable.querySelector('tbody');
        tbody.innerHTML = '';
        // Group by month-year
        const monthMap = {};
        data.forEach(d => {
            const subDate = d['Claim Submission Date'];
            const month = getMonthYear(subDate);
            if (!month) return;
            if (!monthMap[month]) monthMap[month] = [];
            monthMap[month].push(d);
        });
        // Sort months chronologically
        const months = Object.keys(monthMap).sort((a, b) => new Date(a) - new Date(b));
        months.forEach(month => {
            const arr = monthMap[month];
            const submitted = arr.length;
            const closed = arr.filter(d => d['Claim Close Date'] && d['Claim Close Date'] !== '-').length;
            const tatList = arr.map(d => Number(d['TAT'])).filter(n => !isNaN(n) && n > 0);
            const avgTat = average(tatList);
            const totalAmt = arr.reduce((sum, d) => sum + parseAmount(d['Credited Amount']), 0);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${month}</td><td>${submitted}</td><td>${closed}</td><td>${avgTat ? Math.round(avgTat) + ' days' : '-'}</td><td>${formatAmount(totalAmt)}</td>`;
            tbody.appendChild(tr);
        });
    }

    // --- Chart.js Charts ---
    // Claim Status Distribution
    const claimStatusChart = document.getElementById('claimStatusChart');
    if (claimStatusChart) {
        const ctx = claimStatusChart.getContext('2d');
        const approved = data.filter(d => d['Claim Status'] === 'Approved').length;
        const disallowed = data.filter(d => d['Claim Status'] === 'Disallowed').length;
        const missing = data.length - approved - disallowed;
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Disallowed', 'Missing'],
                datasets: [{
                    data: [approved, disallowed, missing],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(156, 163, 175, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
    // Claims by Product Line
    const productLineChart = document.getElementById('productLineChart');
    if (productLineChart) {
        const ctx = productLineChart.getContext('2d');
        const lineMap = {};
        data.forEach(d => {
            const pl = d['Product Line'];
            if (!pl) return;
            if (!lineMap[pl]) lineMap[pl] = 0;
            lineMap[pl]++;
        });
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(lineMap),
                datasets: [{
                    label: 'Number of Claims',
                    data: Object.values(lineMap),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
    // Credits by Warranty Type
    const warrantyTypeChart = document.getElementById('warrantyTypeChart');
    if (warrantyTypeChart) {
        const ctx = warrantyTypeChart.getContext('2d');
        const typeMap = {};
        data.forEach(d => {
            const wt = d['Warranty Cost Type'];
            if (!wt) return;
            if (!typeMap[wt]) typeMap[wt] = 0;
            typeMap[wt] += parseAmount(d['Credited Amount']);
        });
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(typeMap),
                datasets: [{
                    data: Object.values(typeMap),
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
    // Monthly Credits Trend
    const monthlyTrendChart = document.getElementById('monthlyTrendChart');
    if (monthlyTrendChart) {
        const ctx = monthlyTrendChart.getContext('2d');
        // Group by month
        const months = Array.from({length: 12}, (_, i) => new Date(2000, i, 1).toLocaleString('default', { month: 'short' }));
        const creditsByMonth = Array(12).fill(0);
        data.forEach(d => {
            const subDate = d['Claim Submission Date'];
            const idx = getMonthIndex(subDate);
            if (idx !== null) creditsByMonth[idx] += parseAmount(d['Credited Amount']);
        });
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Credits Amount',
                    data: creditsByMonth,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } } }
        });
    }
    // TAT Distribution
    const tatDistributionChart = document.getElementById('tatDistributionChart');
    if (tatDistributionChart) {
        const ctx = tatDistributionChart.getContext('2d');
        // Buckets: 0-10, 11-20, 21-30, 31-40, 41+
        const buckets = [0, 0, 0, 0, 0];
        tatArr.forEach(tat => {
            if (tat <= 10) buckets[0]++;
            else if (tat <= 20) buckets[1]++;
            else if (tat <= 30) buckets[2]++;
            else if (tat <= 40) buckets[3]++;
            else buckets[4]++;
        });
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-10 days', '11-20 days', '21-30 days', '31-40 days', '41+ days'],
                datasets: [{
                    label: 'Number of Claims',
                    data: buckets,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
    // Claims by Month
    const claimsByMonthChart = document.getElementById('claimsByMonthChart');
    if (claimsByMonthChart) {
        const ctx = claimsByMonthChart.getContext('2d');
        const months = Array.from({length: 12}, (_, i) => new Date(2000, i, 1).toLocaleString('default', { month: 'short' }));
        const claimsByMonth = Array(12).fill(0);
        data.forEach(d => {
            const subDate = d['Claim Submission Date'];
            const idx = getMonthIndex(subDate);
            if (idx !== null) claimsByMonth[idx]++;
        });
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Claims Submitted',
                    data: claimsByMonth,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }
}); 