const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const inputFilePath = path.join(__dirname, '..', 'infrared-plasma', '-temp', 'Funds Balances Rates BoC.csv');
const outputFilePath = path.join(__dirname, 'data.json');

const rawData = [];

fs.createReadStream(inputFilePath)
    .pipe(csv())
    .on('data', (row) => {
        if (!row.Components) return;
        const monthKey = Object.keys(row).find(k => k.includes('REF_DATE'));
        const month = row[monthKey];
        const component = row.Components;
        const value = parseFloat(row.VALUE);
        const uom = row.UOM;

        if (month && component && !isNaN(value)) {
            rawData.push({ month, component, value, uom });
        }
    })
    .on('end', () => {
        console.log(`Parsed ${rawData.length} valid rows. Extrapolating structure...`);

        const allMonths = [...new Set(rawData.map(r => r.month))].sort();

        const structuredData = {
            months: allMonths,
            series: {}
        };

        rawData.forEach(r => {
            const key = `${r.component}___${r.uom}`;
            if (!structuredData.series[key]) {
                structuredData.series[key] = {
                    component: r.component,
                    uom: r.uom,
                    valuesMap: {}
                };
            }
            structuredData.series[key].valuesMap[r.month] = r.value;
        });

        for (const comp in structuredData.series) {
            const s = structuredData.series[comp];
            s.data = allMonths.map(m => s.valuesMap[m] !== undefined ? s.valuesMap[m] : null);
            delete s.valuesMap;
        }

        fs.writeFileSync(outputFilePath, JSON.stringify(structuredData));
        console.log(`Successfully wrote extracted data to ${outputFilePath}`);
    });
