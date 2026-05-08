/**
 * Web Worker for CSV/TSV parsing and data preparation
 * Handles large datasets (100k+ rows) with robust delimiter and header detection
 */

self.onmessage = async (e) => {
  const { csvText } = e.data;
  if (!csvText) {
    self.postMessage({ type: 'error', message: 'No CSV content provided' });
    return;
  }

  try {
    self.postMessage({ type: 'progress', stage: 'Preparing data...', processed: 0, total: 0 });

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const totalLines = lines.length;
    if (totalLines === 0) {
      throw new Error('File is empty');
    }

    // 1. Detect Delimiter (TSV vs CSV vs Semicolon)
    const delimiter = detectDelimiter(lines.slice(0, 20));
    
    // 2. Find Header Row (Skip title lines like "Apr-26")
    const { headerIndex, mapping } = findHeaderAndMapping(lines.slice(0, 30), delimiter);
    if (headerIndex === -1) {
      // List the columns we tried to find to help debug
      const required = ['Product', 'Client Code', 'Client Name', 'Qty/Net Sales', 'Value'];
      throw new Error(`Could not find required columns (${required.join(', ')}). Found headers might be in the wrong row or use different names.`);
    }

    const customersMap = {}; 
    const customerDetails = {}; 
    const productsMap = {};
    const distributorsMap = {};
    const evaBricksMap = {};
    const disBricksMap = {};
    
    let totalValue = 0;
    let totalQty = 0;

    // Start parsing after header
    for (let i = headerIndex + 1; i < totalLines; i++) {
      const line = lines[i];
      const row = splitLine(line, delimiter);
      
      const product = getValue(row, mapping.product);
      const clientCode = getValue(row, mapping.clientCode);
      const clientName = getValue(row, mapping.clientName);
      const distributor = getValue(row, mapping.distributor) || 'Unknown';
      const evaBrick = getValue(row, mapping.evaBrick) || 'Unknown';
      const disBrick = getValue(row, mapping.disBrick) || 'Unknown';
      const qty = toNumber(getValue(row, mapping.qty));
      const value = toNumber(getValue(row, mapping.value));

      // Skip invalid rows or total rows
      if (!product || !clientName) continue;
      const lowerProd = product.toLowerCase();
      const lowerName = clientName.toLowerCase();
      
      // Filter out total rows or empty placeholders
      if (lowerProd === 'total' || 
          lowerName === 'total' || 
          lowerProd.includes('grand total') || 
          lowerProd === 'null' ||
          lowerName === 'null') continue;

      // Update global totals
      totalValue += value;
      totalQty += qty;

      // 1. Aggregates
      // Products
      if (!productsMap[product]) productsMap[product] = { product, totalQty: 0, totalValue: 0, customerCount: new Set() };
      productsMap[product].totalQty += qty;
      productsMap[product].totalValue += value;
      productsMap[product].customerCount.add(clientCode || clientName);

      // Dist
      if (!distributorsMap[distributor]) distributorsMap[distributor] = { distributor, totalQty: 0, totalValue: 0, customerCount: new Set(), productCount: new Set() };
      distributorsMap[distributor].totalQty += qty;
      distributorsMap[distributor].totalValue += value;
      distributorsMap[distributor].customerCount.add(clientCode || clientName);
      distributorsMap[distributor].productCount.add(product);

      // Eva
      if (!evaBricksMap[evaBrick]) evaBricksMap[evaBrick] = { evaBrick, totalQty: 0, totalValue: 0, customerCount: new Set(), productCount: new Set() };
      evaBricksMap[evaBrick].totalQty += qty;
      evaBricksMap[evaBrick].totalValue += value;
      evaBricksMap[evaBrick].customerCount.add(clientCode || clientName);
      evaBricksMap[evaBrick].productCount.add(product);

      // DIS Brick
      if (!disBricksMap[disBrick]) disBricksMap[disBrick] = { disBrick, totalQty: 0, totalValue: 0, customerCount: new Set(), productCount: new Set() };
      disBricksMap[disBrick].totalQty += qty;
      disBricksMap[disBrick].totalValue += value;
      disBricksMap[disBrick].customerCount.add(clientCode || clientName);
      disBricksMap[disBrick].productCount.add(product);

      // 2. Customers Aggregate
      const cKey = clientCode || clientName;
      if (!customersMap[cKey]) {
        customersMap[cKey] = {
          clientCode: clientCode || 'N/A',
          clientName: clientName,
          distributor: distributor,
          evaBrick: evaBrick,
          disBrick: disBrick,
          totalQty: 0,
          totalValue: 0,
          products: new Set()
        };
        
        customerDetails[cKey] = {
          totals: { qty: 0, value: 0 },
          byProduct: {},
          byDistributor: {}
        };
      }

      const c = customersMap[cKey];
      c.totalQty += qty;
      c.totalValue += value;
      c.products.add(product);

      // Details
      const det = customerDetails[cKey];
      det.totals.qty += qty;
      det.totals.value += value;

      if (!det.byProduct[product]) det.byProduct[product] = { product, qty: 0, value: 0 };
      det.byProduct[product].qty += qty;
      det.byProduct[product].value += value;

      if (!det.byDistributor[distributor]) det.byDistributor[distributor] = { distributor, qty: 0, value: 0 };
      det.byDistributor[distributor].qty += qty;
      det.byDistributor[distributor].value += value;

      // Progress reporting
      if (i % 2000 === 0) {
        self.postMessage({ type: 'progress', stage: 'Parsing rows...', processed: i, total: totalLines });
      }
    }

    self.postMessage({ type: 'progress', stage: 'Finalizing aggregates...', processed: totalLines, total: totalLines });

    // Finalize Arrays
    const customersArray = Object.values(customersMap).map(c => ({
      ...c,
      productCount: c.products.size,
      productIds: Array.from(c.products),
      products: undefined // Clear the set
    })).sort((a, b) => b.totalValue - a.totalValue);

    const productsArray = Object.values(productsMap).map(p => ({
      ...p,
      customerCount: p.customerCount.size,
      avgValue: p.customerCount.size > 0 ? p.totalValue / p.customerCount.size : 0
    })).sort((a, b) => b.totalValue - a.totalValue);

    const distributorsArray = Object.values(distributorsMap).map(d => ({
      ...d,
      customerCount: d.customerCount.size,
      productCount: d.productCount.size
    })).sort((a, b) => b.totalValue - a.totalValue);

    const evaBricksArray = Object.values(evaBricksMap).map(e => ({
      ...e,
      customerCount: e.customerCount.size,
      productCount: e.productCount.size
    })).sort((a, b) => b.totalValue - a.totalValue);

    const disBricksArray = Object.values(disBricksMap).map(b => ({
      ...b,
      customerCount: b.customerCount.size,
      productCount: b.productCount.size
    })).sort((a, b) => b.totalValue - a.totalValue);

    Object.keys(customerDetails).forEach(code => {
      const d = customerDetails[code];
      d.byProduct = Object.values(d.byProduct).sort((a, b) => b.value - a.value);
      d.byDistributor = Object.values(d.byDistributor).sort((a, b) => b.value - a.value);
    });

    self.postMessage({ 
      type: 'done', 
      payload: {
        customers: customersArray,
        products: productsArray,
        distributors: distributorsArray,
        evaBricks: evaBricksArray,
        disBricks: disBricksArray,
        filterOptions: {
          products: Object.keys(productsMap).filter(Boolean).sort(),
          distributors: Object.keys(distributorsMap).filter(Boolean).sort(),
          evaBricks: Object.keys(evaBricksMap).filter(Boolean).sort(),
          disBricks: Object.keys(disBricksMap).filter(Boolean).sort(),
          customers: Array.from(new Set(Object.values(customersMap).map(c => c.clientName).filter(Boolean))).sort()
        },
        customerDetails,
        globalTotals: { totalValue, totalQty, customerCount: customersArray.length, productCount: productsArray.length }
      }
    });

  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};

function detectDelimiter(sampleLines) {
  const possibleValues = [',', '\t', ';', '|'];
  const counts = possibleValues.map(delim => {
    let count = 0;
    sampleLines.forEach(line => { count += (line.split(delim).length - 1); });
    return { delim, count };
  });
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delim : ',';
}

function findHeaderAndMapping(sampleLines, delimiter) {
  const ALIAses = {
    product: ['product', 'product name', 'item', 'desc'],
    evaBrick: ['eva brick', 'evabrick', 'brick'],
    disBrick: ['dis brick', 'disbrick', 'district'],
    clientCode: ['client code', 'clientcode', 'customer code', 'code', 'acc'],
    clientName: ['client name', 'clientname', 'customer name', 'name', 'account'],
    distributor: ['dis', 'distributor', 'dist', 'vendor'],
    qty: ['net sales', 'qty', 'quantity', 'units', 'net sales qty', 'count'],
    value: ['value', 'net sales value', 'sales value', 'amount', 'total val']
  };

  for (let i = 0; i < sampleLines.length; i++) {
    const rawCols = splitLine(sampleLines[i], delimiter);
    const cols = rawCols.map(c => c.trim().toLowerCase().replace(/\s+/g, ' '));
    
    // Check if this row looks like a header (must find at least 4 key columns)
    const mapping = {};
    let foundCount = 0;

    Object.entries(ALIAses).forEach(([key, variations]) => {
      // First try exact matches among normalized variations
      let idx = cols.findIndex(c => variations.includes(c));
      
      // If not found, try partial matches (e.g. "Net Sales" in "Net Sales Qty")
      if (idx === -1) {
        // Sort variations by length descending to match most specific first
        const sortedVars = [...variations].sort((a,b) => b.length - a.length);
        idx = cols.findIndex(c => sortedVars.some(v => c.includes(v)));
      }
      
      if (idx !== -1) {
        mapping[key] = idx;
        foundCount++;
      }
    });

    if (foundCount >= 4) {
      return { headerIndex: i, mapping };
    }
  }
  return { headerIndex: -1, mapping: {} };
}

function splitLine(line, delimiter) {
  // If delimiter is TAB, simple split is usually enough as tabs are rarely embedded in quotes in these reports
  if (delimiter === '\t') return line.split('\t');
  
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function getValue(row, index) {
  if (index === undefined || index === -1) return '';
  return (row[index] || '').trim();
}

function toNumber(val) {
  if (!val) return 0;
  // Handle things like "1,234.56" or "$ 12.00" or "-"
  const cleaned = val.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  return parseFloat(cleaned) || 0;
}
