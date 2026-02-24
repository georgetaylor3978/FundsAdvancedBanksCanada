const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        title: {
            display: true,
            color: '#fff',
            font: { size: 18, family: 'Inter', weight: '600' },
            padding: { top: 10, bottom: 20 }
        },
        legend: {
            labels: {
                color: '#c9d1d9',
                boxWidth: 28,
                boxHeight: 10,
                useBorderRadius: true,
                borderRadius: 2,
                padding: 20
            },
            position: 'top'
        },
        tooltip: {
            backgroundColor: 'rgba(22, 27, 34, 0.9)',
            titleColor: '#fff',
            bodyColor: '#c9d1d9',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
                label: function (context) {
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    if (context.dataset.yAxisID === 'y1') {
                        label += context.parsed.y.toFixed(2) + '%';
                    } else {
                        label += '$' + context.parsed.y.toFixed(1) + 'B';
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: { color: '#8b949e', maxTicksLimit: 12 }
        },
        y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#8b949e' },
            beginAtZero: false
        },
        y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#8b949e' },
            beginAtZero: false
        }
    }
};

const colors = [
    '#00f2fe', '#4facfe', '#9b51e0', '#ffb199', '#00e676',
    '#f6d365', '#fda085', '#84fab0', '#8fd3f4', '#a18cd1', '#fbc2eb'
];
const rateColor = '#ff0844'; // Red for interest rates

let globalData = null;
let chartInstance = null;

async function initDashboard() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error('Could not load data.json');
        globalData = await response.json();

        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';

        initDateSelectors();
        initToggleButtons('.metric-btn', 'metricType');
        initSlicerButtons();

        const selectors = document.querySelectorAll('select, input[type="checkbox"]');
        selectors.forEach(s => s.addEventListener('change', updateDashboard));

        updateDashboard();

    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        document.getElementById('loading').innerHTML = `
            <span style="color: var(--accent-pink);">
                Error loading data. Make sure data.json exists in this directory.
            </span>
        `;
    }
}

function initDateSelectors() {
    const months = globalData.months;
    const startM = "2018-01";
    const endM = months[months.length - 1];

    const uniqueYears = [...new Set(months.map(m => m.split('-')[0]))];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const populate = (yearId, monthId, defaultVal) => {
        const ySel = document.getElementById(yearId);
        const mSel = document.getElementById(monthId);

        ySel.innerHTML = '';
        mSel.innerHTML = '';

        uniqueYears.forEach(y => ySel.add(new Option(y, y)));
        monthNames.forEach((m, i) => {
            const val = (i + 1).toString().padStart(2, '0');
            mSel.add(new Option(m, val));
        });

        const [dy, dm] = defaultVal.split('-');
        ySel.value = dy;
        mSel.value = dm;
    };

    populate('startYearSel', 'startMonthSel', startM);
    populate('endYearSel', 'endMonthSel', endM);

    document.querySelectorAll('.date-selectors select').forEach(sel => {
        sel.addEventListener('change', updateDashboard);
    });
}

function initToggleButtons(btnClass, targetInputId) {
    const btns = document.querySelectorAll(btnClass);
    if (!btns || btns.length === 0) return;
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            btns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const targetEl = document.getElementById(targetInputId);
            if (targetEl) targetEl.value = e.target.getAttribute('data-val');
            updateDashboard();
        });
    });
}

function initSlicerButtons() {
    // Individual toggle buttons
    document.querySelectorAll('.slicer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            updateDashboard();
        });
    });

    // Control buttons (Select All / Clear)
    document.querySelectorAll('.slicer-control-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const action = e.target.getAttribute('data-action');
            const container = document.getElementById(targetId);
            if (!container) return;

            const btns = container.querySelectorAll('.slicer-btn');
            if (action === 'all') {
                btns.forEach(b => b.classList.add('active'));
            } else if (action === 'clear') {
                btns.forEach(b => b.classList.remove('active'));
            }
            updateDashboard();
        });
    });
}

function formatMonth(yyyyStr) {
    const [y, m] = yyyyStr.split('-');
    const mName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1];
    return `${mName}-${y.slice(2)}`;
}

// Ensure the UI cleans itself up when defaults aren't applicable, and wires checkboxes
function enforceSlicerLogic(uiFilters) {
    const isResidential = uiFilters.type === 'residential';
    const isLoc = uiFilters.type === 'loc';
    const isBus = uiFilters.type === 'business';

    document.getElementById('groupInsured').style.display = isResidential ? 'flex' : 'none';
    document.getElementById('groupRate').style.display = isResidential ? 'flex' : 'none';
    document.getElementById('groupLoc').style.display = isLoc ? 'flex' : 'none';
    document.getElementById('groupBusiness').style.display = isBus ? 'flex' : 'none';
}

function matchesInitialCoreFilter(compName, uiFilters) {
    const compLower = compName.toLowerCase();

    if (!compLower.includes(uiFilters.metric)) return false;

    let matchesType = false;
    switch (uiFilters.type) {
        case 'residential': matchesType = compLower.includes('residential mortgages'); break;
        case 'auto_loans': matchesType = compLower.includes('auto loans'); break;
        case 'credit_cards': matchesType = compLower.includes('credit card'); break;
        case 'loc': matchesType = compLower.includes('lines of credit'); break;
        case 'personal_other': matchesType = compLower.includes('other personal'); break;
        case 'business': matchesType = compLower.includes('business loans'); break;
    }
    if (!matchesType) return false;

    // Strict dropping of non-matching rate types (forces leaf nodes)
    if (uiFilters.type === 'residential') {
        if (uiFilters.rate.length === 0) return false;
        let matchRate = false;
        if (uiFilters.rate.includes('variable') && compLower.includes('variable rate')) matchRate = true;
        if (uiFilters.rate.includes('fixed_1') && (compLower.includes('fixed rate') && compLower.includes('less than 1'))) matchRate = true;
        if (uiFilters.rate.includes('fixed_1to3') && (compLower.includes('fixed rate') && compLower.includes('1 ') && compLower.includes('3'))) matchRate = true;
        if (uiFilters.rate.includes('fixed_3to5') && (compLower.includes('fixed rate') && compLower.includes('3 ') && compLower.includes('5'))) matchRate = true;
        if (uiFilters.rate.includes('fixed_5plus') && (compLower.includes('fixed rate') && compLower.includes('5 years and'))) matchRate = true;
        if (!matchRate) return false;

        if (uiFilters.insurance.length === 0) return false;
        let matchIns = false;
        if (uiFilters.insurance.includes('insured') && compLower.includes(' insured')) matchIns = true;
        if (uiFilters.insurance.includes('uninsured') && compLower.includes('uninsured')) matchIns = true;
        if (!matchIns) return false;
    }

    // Strict dropping of LOC subcategories
    if (uiFilters.type === 'loc') {
        if (uiFilters.loc.length === 0) return false;
        let matchLoc = false;
        if (uiFilters.loc.includes('secured') && compLower.includes('secured')) matchLoc = true;
        if (uiFilters.loc.includes('unsecured') && compLower.includes('unsecured')) matchLoc = true;
        if (!matchLoc) return false;
    }

    // Strict dropping of Business subcategories
    if (uiFilters.type === 'business') {
        if (uiFilters.business.length === 0) return false;
        let matchBus = false;
        if (uiFilters.business.includes('regulated') && compLower.includes('regulated')) matchBus = true;
        if (uiFilters.business.includes('lease') && compLower.includes('lease receivables')) matchBus = true;
        if (uiFilters.business.includes('loans_indiv') && compLower.includes('individuals and others')) matchBus = true;
        if (uiFilters.business.includes('non_residential') && compLower.includes('non-residential')) matchBus = true;
        if (!matchBus) return false;
    }

    return true;
}

// Generate the generalized grouping name mathematically based on what checkboxes the user toggled
function generateGroupKey(compName, uiFilters) {
    const compLower = compName.toLowerCase();

    if (uiFilters.type === 'residential') {
        let parts = ['Residential'];
        if (!uiFilters.combineIns) {
            if (compLower.includes(' uninsured')) parts.push('Uninsured');
            else if (compLower.includes(' insured')) parts.push('Insured');
        }
        if (!uiFilters.combineRate) {
            if (compLower.includes('variable')) parts.push('Variable');
            else if (compLower.includes('less than 1')) parts.push('Fixed <1yr');
            else if (compLower.includes('1 ') && compLower.includes('3')) parts.push('Fixed 1-3yr');
            else if (compLower.includes('3 ') && compLower.includes('5')) parts.push('Fixed 3-5yr');
            else if (compLower.includes('5 years and')) parts.push('Fixed 5yr+');
            else if (compLower.includes('fixed')) parts.push('Fixed');
        }
        if (parts.length === 1) return "Combined Selected";
        return parts.slice(1).join(' ');
    }

    if (uiFilters.type === 'loc') {
        if (!uiFilters.combineLoc) {
            if (compLower.includes('unsecured')) return "Unsecured";
            if (compLower.includes('secured')) return "Secured";
        }
        return "Combined Selected";
    }

    if (uiFilters.type === 'business') {
        if (!uiFilters.combineBusiness) {
            if (compLower.includes('regulated')) return "Regulated Non-Bank";
            if (compLower.includes('lease receivables')) return "Lease Receivables";
            if (compLower.includes('individuals and others')) return "Loans to Individuals";
            if (compLower.includes('non-residential')) return "Non-Residential Mortgages";
        }
        return "Combined Selected";
    }

    return shortenLabel(compName);
}

function updateDashboard() {
    if (!globalData) return;

    const getMultiSelect = (id) => {
        const container = document.getElementById(id);
        if (!container) return [];
        const activeBtns = container.querySelectorAll('.slicer-btn.active');
        return Array.from(activeBtns).map(btn => btn.getAttribute('data-val'));
    };

    const uiFilters = {
        type: document.getElementById('loanType').value,
        metric: document.getElementById('metricType').value,
        insurance: getMultiSelect('insuranceType'),
        rate: getMultiSelect('rateType'),
        loc: getMultiSelect('locType'),
        business: getMultiSelect('businessType'),
        combineRate: document.getElementById('combineRate') ? document.getElementById('combineRate').checked : false,
        combineIns: document.getElementById('combineInsurance') ? document.getElementById('combineInsurance').checked : false,
        combineLoc: document.getElementById('combineLoc') ? document.getElementById('combineLoc').checked : false,
        combineBusiness: document.getElementById('combineBusiness') ? document.getElementById('combineBusiness').checked : false
    };

    enforceSlicerLogic(uiFilters);

    const startM = `${document.getElementById('startYearSel').value}-${document.getElementById('startMonthSel').value}`;
    const endM = `${document.getElementById('endYearSel').value}-${document.getElementById('endMonthSel').value}`;

    let startIndex = globalData.months.findIndex(m => m >= startM);
    let endIndex = globalData.months.findIndex(m => m >= endM);
    if (startIndex === -1) startIndex = 0;
    if (endIndex === -1 || endIndex < startIndex) endIndex = globalData.months.length - 1;

    const filteredMonths = globalData.months.slice(startIndex, endIndex + 1);
    const numMonths = filteredMonths.length;
    const labels = filteredMonths.map(formatMonth);

    // Aggregation mapping
    const groupedData = {};

    for (const [key, series] of Object.entries(globalData.series)) {
        if (!matchesInitialCoreFilter(series.component, uiFilters)) continue;

        // We naturally merge into one group if the generated key evaluates mathematically equal based on 'Combine' checks.
        const groupKey = generateGroupKey(series.component, uiFilters);

        if (!groupedData[groupKey]) {
            groupedData[groupKey] = {
                fDataSum: new Array(numMonths).fill(null),
                rDataNum: new Array(numMonths).fill(null), // numerator for weighted average
                rDataDenom: new Array(numMonths).fill(null), // denominator
                hasFunds: false,
                hasRates: false
            };
        }

        const slice = series.data.slice(startIndex, endIndex + 1);
        const group = groupedData[groupKey];

        if (series.uom === 'Dollars') {
            for (let i = 0; i < numMonths; i++) {
                if (slice[i] !== null && slice[i] !== undefined) {
                    if (group.fDataSum[i] === null) group.fDataSum[i] = 0;
                    group.fDataSum[i] += parseFloat(slice[i]) / 1000; // Convert to Billions
                    group.hasFunds = true;
                }
            }
        } else if (series.uom === 'Percent') {
            // Need to retrieve corresponding funds to perform weighted average. 
            // The corresponding funds are in identical component string but uom='Dollars'.
            const fSeriesKey = `${series.component}___Dollars`;
            const fSeries = globalData.series[fSeriesKey];
            const fSlice = fSeries ? fSeries.data.slice(startIndex, endIndex + 1) : null;

            for (let i = 0; i < numMonths; i++) {
                const rVal = slice[i] !== null && slice[i] !== undefined ? parseFloat(slice[i]) : null;
                const fVal = fSlice && fSlice[i] !== null && fSlice[i] !== undefined ? parseFloat(fSlice[i]) : null;

                if (rVal !== null) {
                    if (group.rDataNum[i] === null) {
                        group.rDataNum[i] = 0;
                        group.rDataDenom[i] = 0;
                    }
                    if (fVal !== null) {
                        // Weighted average logic. Naturally aggregates via groupKey collision when Combined.
                        group.rDataNum[i] += (rVal * fVal);
                        group.rDataDenom[i] += fVal;
                    } else {
                        // Fallback unweighted average if funds are completely missing
                        group.rDataNum[i] += rVal;
                        group.rDataDenom[i] += 1;
                    }
                    group.hasRates = true;
                }
            }
        }
    }

    const datasets = [];
    let hasOverallFunds = false;
    let hasOverallRates = false;
    let latestRates = [];
    let cIdx = 0;

    let fundsMin = Infinity;
    let ratesMin = Infinity;

    for (const [groupName, group] of Object.entries(groupedData)) {
        const color = colors[cIdx % colors.length];

        if (group.hasFunds) {
            hasOverallFunds = true;
            const ds = {
                label: groupName + ' ($B)',
                data: group.fDataSum,
                type: 'bar',
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                fill: true,
                yAxisID: 'y',
                stack: 'Stack 0'
            };
            datasets.push(ds);

            group.fDataSum.forEach(v => {
                if (v !== null && v < fundsMin) fundsMin = v;
            });
        }

        if (group.hasRates) {
            hasOverallRates = true;

            const compiledRates = new Array(numMonths).fill(null);
            for (let i = 0; i < numMonths; i++) {
                if (group.rDataDenom[i]) {
                    compiledRates[i] = group.rDataNum[i] / group.rDataDenom[i];
                    if (compiledRates[i] < ratesMin) ratesMin = compiledRates[i];
                }
            }

            const targetColor = color; // Match line color to bar color for consistency

            const lastVal = [...compiledRates].reverse().find(v => v !== null && v !== undefined);

            // Only populate the stats boxes for the most recent rate data point 
            if (lastVal) {
                latestRates.push({ label: groupName, val: lastVal, color: targetColor });
            }

            datasets.push({
                label: groupName + ' (%)',
                data: compiledRates,
                type: 'line',
                borderColor: targetColor,
                backgroundColor: targetColor,
                borderWidth: 4,
                borderDash: [], // Solid lines to match 'Combined' aesthetic scheme
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.2, // Reduced tension
                yAxisID: 'y1'
            });
        }
        cIdx++;
    }

    // Capitalize Title logic
    const titleMetric = document.querySelector(`.metric-toggle button[data-val="${uiFilters.metric}"]`).textContent;
    const titleLoan = document.querySelector(`#loanType option[value="${uiFilters.type}"]`).textContent;
    const fullGraphTitle = `${titleMetric} — ${titleLoan}`;

    renderChart(labels, datasets, hasOverallFunds, hasOverallRates, uiFilters.metric, fullGraphTitle, fundsMin, ratesMin);
    populateStats(latestRates);
}

function renderChart(labels, datasets, hasFunds, hasRates, metricName, fullGraphTitle, fundsMin, ratesMin) {
    if (chartInstance) chartInstance.destroy();

    const grid = document.querySelector('.dashboard-grid');
    grid.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'chart-container';
    card.style.gridColumn = '1 / -1';
    card.style.minHeight = '600px';
    card.innerHTML = `
        <div class="chart-wrapper">
            <canvas id="mainChart"></canvas>
        </div>
    `;
    grid.appendChild(card);

    const ctx = document.getElementById('mainChart').getContext('2d');

    const options = JSON.parse(JSON.stringify(chartOptions));
    const titleStr = metricName === 'outstanding balances' ? 'Outstanding Balances (Billions $)' : 'Funds Advanced (Billions $)';

    options.plugins.title.text = fullGraphTitle;

    options.scales.y.display = hasFunds;
    options.scales.y.title = { display: hasFunds, text: titleStr, color: '#8b949e' };

    if (hasFunds && fundsMin !== Infinity) {
        options.scales.y.min = Math.max(0, fundsMin * 0.9); // 10% buffer below minimum amount
    }

    options.scales.y1.display = hasRates;
    options.scales.y1.title = { display: hasRates, text: 'Interest Rate (%)', color: '#8b949e' };

    if (hasRates) {
        options.scales.y1.beginAtZero = true;
        options.scales.y1.min = 0; // Forced 0% start per user request
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: options
    });
}

function populateStats(ratesInfo) {
    const container = document.querySelector('.stats-container');
    container.innerHTML = '';

    if (ratesInfo.length === 0) {
        container.innerHTML = '<div style="color:#8b949e; grid-column: 1 / -1;">No active rate stats available for the selected filters.</div>';
        return;
    }

    ratesInfo.forEach(r => {
        const div = document.createElement('div');
        div.className = 'stat-card';
        div.style.borderTop = `4px solid ${r.color}`;
        div.innerHTML = `
            <div class="stat-label">${r.label} (Current)</div>
            <div class="stat-value">${parseFloat(r.val).toFixed(2)}%</div>
        `;
        container.appendChild(div);
    });
}

function shortenLabel(str) {
    const activeMetric = document.getElementById('metricType').value;
    const uiType = document.getElementById('loanType').value;
    let activeLoan = '';

    switch (uiType) {
        case 'residential': activeLoan = 'residential mortgages'; break;
        case 'auto_loans': activeLoan = 'auto loans'; break;
        case 'credit_cards': activeLoan = 'credit card'; break;
        case 'loc': activeLoan = 'lines of credit'; break;
        case 'personal_other': activeLoan = 'other personal'; break;
        case 'business': activeLoan = 'business loans'; break;
    }

    let res = str;
    if (activeMetric) {
        res = res.replace(new RegExp(activeMetric, 'gi'), '');
    }
    if (activeLoan) {
        res = res.replace(new RegExp(activeLoan, 'gi'), '');
    }

    res = res.replace(/Funds advanced|Outstanding balances/gi, '')
        .replace(/for non-mortgage loans|consumer credit|personal loan plans/gi, '')
        .replace(/fixed rate|variable rate/gi, '')
        .replace(/insured|uninsured|less than|more|years/gi, '')
        .replace(/,/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Overall Combined Amount';

    return res;
}

document.addEventListener('DOMContentLoaded', initDashboard);
