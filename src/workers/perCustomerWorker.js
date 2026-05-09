/**
 * Web Worker for CSV/TSV parsing and data preparation
 * Handles heavy filtering, deduplicated merging, and accurate aggregation
 * Optimizes memory using dictionary encoding for strings (supports 1M+ rows)
 */

let baseRows = [];
let rowKeys = new Map(); // Hash -> Count
let duplicatesBuffer = [];
const MAX_DUPLICATES = 20000;
let globalMapping = null;
let globalDelimiter = null;

// Inverted Indexes for ultra-fast filtering
let indexes = {
  p: new Map(),  // Product ID -> [rowIndices]
  d: new Map(),  // Distributor ID -> [rowIndices]
  eb: new Map(), // Eva Brick ID -> [rowIndices]
  db: new Map(), // Dis Brick ID -> [rowIndices]
  cn: new Map()  // Client Name ID -> [rowIndices]
};

function addToIndex(type, id, rowIndex) {
  if (!indexes[type].has(id)) indexes[type].set(id, []);
  indexes[type].get(id).push(rowIndex);
}

// Dictionaries to save memory
let dicts = {
  products: [],
  distributors: [],
  evaBricks: [],
  disBricks: [],
  clientNames: [],
  clientCodes: [],
  months: []
};
let revDicts = {
  products: new Map(),
  distributors: new Map(),
  evaBricks: new Map(),
  disBricks: new Map(),
  clientNames: new Map(),
  clientCodes: new Map(),
  months: new Map()
};

function getOrAdd(type, val) {
  if (val === undefined || val === null) val = 'Unknown';
  val = String(val).trim();
  if (!val) val = 'Unknown';
  
  const map = revDicts[type];
  if (map.has(val)) return map.get(val);
  
  const id = dicts[type].length;
  dicts[type].push(val);
  map.set(val, id);
  return id;
}

function getValById(type, id) {
  return dicts[type][id] || 'Unknown';
}

function normalizeMonthKey(m) {
  if (!m || m === 'Unknown Month') return '0000-00';
  const nameKeywords = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const lower = m.toLowerCase();
  const index = nameKeywords.findIndex(name => lower.includes(name.toLowerCase()));
  const month = index === -1 ? '00' : String(index + 1).padStart(2, '0');
  const yearMatch = m.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : '0000';
  return `${year}-${month}`;
}

function decodeMonthKey(key) {
  if (!key || key === '0000-00') return 'Unknown Period';
  const [year, monthNum] = key.split('-');
  const nameKeywords = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const mIndex = parseInt(monthNum) - 1;
  const monthName = nameKeywords[mIndex] || 'Unknown';
  return `${monthName} ${year}`;
}

// FNV-1a 32-bit hash implementation for faster dedupe
function hashString(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function detectPeriodFromText(lines) {
  const monthRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)/i;
  const yearRegex = /(20\d{2})/;
  
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const mMatch = line.match(monthRegex);
    const yMatch = line.match(yearRegex);
    
    if (mMatch && yMatch) {
      return `${mMatch[0]} ${yMatch[0]}`;
    }
  }
  return null;
}

self.onmessage = async (e) => {
  const { type, csvText, filters, fileMonthKey, scope, key, snapshot, page, pageSize, query, sourceFileName, requestId } = e.data;

  try {
    if (type === 'prepare' || type === 'merge') {
      if (!csvText) throw new Error('No CSV content provided');
      
      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) throw new Error('File is empty');

      // Detect period from content if not provided or as fallback
      const detectedPeriod = detectPeriodFromText(lines);
      const effectiveFileMonth = fileMonthKey || detectedPeriod || 'Unknown Month';

      if (!globalDelimiter || type === 'prepare') {
        globalDelimiter = detectDelimiter(lines.slice(0, 30));
      }
      
      const { headerIndex, mapping } = findHeaderAndMapping(lines.slice(0, 50), globalDelimiter);
      if (headerIndex === -1 && !globalMapping) {
        throw new Error('Could not find required columns. Please check file format.');
      }
      
      const activeMapping = mapping || globalMapping;
      if (type === 'prepare') {
        baseRows = [];
        rowKeys = new Map();
        duplicatesBuffer = [];
        globalMapping = activeMapping;
        Object.keys(dicts).forEach(k => {
          dicts[k] = [];
          revDicts[k].clear();
        });
        Object.keys(indexes).forEach(k => indexes[k].clear());
      }

      let added = 0;
      let duplicatesDetected = 0;
      const normalizedFileMonth = normalizeMonthKey(effectiveFileMonth);

      for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = splitLine(lines[i], globalDelimiter);
        
        const product = getValue(row, activeMapping.product);
        const clientCodeRaw = getValue(row, activeMapping.clientCode);
        const clientCode = String(clientCodeRaw || 'N/A').trim();
        const clientName = getValue(row, activeMapping.clientName);
        const qty = toNumber(getValue(row, activeMapping.qty));
        const value = toNumber(getValue(row, activeMapping.value));
        
        if (!product || !clientName) continue;
        const lp = product.toLowerCase();
        const ln = clientName.toLowerCase();
        if (lp === 'total' || ln === 'total' || lp.includes('grand total')) continue;

        const distributor = getValue(row, activeMapping.distributor) || 'Unknown';
        const evaBrick = getValue(row, activeMapping.evaBrick) || 'Unknown';
        const disBrick = getValue(row, activeMapping.disBrick) || 'Unknown';

        // Dedupe logic (non-destructive)
        const rawKey = `${lp}|${clientCode}|${ln}|${qty}|${value}|${distributor.toLowerCase()}|${normalizedFileMonth}`;
        const keyHash = hashString(rawKey);
        
        const currentCount = rowKeys.get(keyHash) || 0;
        if (currentCount > 0) {
          duplicatesDetected++;
          if (duplicatesBuffer.length < MAX_DUPLICATES) {
             if (currentCount === 1) {
                duplicatesBuffer.push({
                   product, clientCode, clientName, qty, value, distributor, 
                   monthKey: decodeMonthKey(normalizedFileMonth), fileName: sourceFileName || 'Current File'
                });
             }
          }
        }
        rowKeys.set(keyHash, currentCount + 1);

        // Add to rows
        const rowIndex = baseRows.length;
        const pId = getOrAdd('products', product);
        const ccId = getOrAdd('clientCodes', clientCode);
        const cnId = getOrAdd('clientNames', clientName);
        const dId = getOrAdd('distributors', distributor);
        const ebId = getOrAdd('evaBricks', evaBrick);
        const dbId = getOrAdd('disBricks', disBrick);
        const mId = getOrAdd('months', normalizedFileMonth);

        baseRows.push({
          p: pId,
          cc: ccId,
          cn: cnId,
          d: dId,
          eb: ebId,
          db: dbId,
          m: mId,
          q: qty,
          v: value
        });

        // Update Indexes
        addToIndex('p', pId, rowIndex);
        addToIndex('d', dId, rowIndex);
        addToIndex('eb', ebId, rowIndex);
        addToIndex('db', dbId, rowIndex);
        addToIndex('cn', cnId, rowIndex);

        added++;

        if (i % 15000 === 0) {
          self.postMessage({ type: 'progress', requestId, stage: type === 'merge' ? 'Merging rows...' : 'Parsing rows...', processed: i, total: lines.length });
        }
      }

      const { payload, period } = aggregateData(baseRows);
      self.postMessage({ 
        type: 'done', 
        requestId,
        payload, 
        period,
        mergeStats: { added, duplicatesDetected, total: baseRows.length }
      });

    } else if (type === 'getDuplicates') {
      let filtered = duplicatesBuffer;
      const q = (query || '').toLowerCase();
      if (q) {
        filtered = duplicatesBuffer.filter(d => 
          d.product.toLowerCase().includes(q) ||
          d.clientName.toLowerCase().includes(q) ||
          d.clientCode.toLowerCase().includes(q) ||
          d.distributor.toLowerCase().includes(q)
        );
      }
      
      const start = (page - 1) * pageSize;
      self.postMessage({ 
        type: 'duplicates', 
        requestId,
        payload: { 
          rows: filtered.slice(start, start + pageSize), 
          total: filtered.length,
          stored: duplicatesBuffer.length
        } 
      });
    } else if (type === 'applyFilters') {
      self.postMessage({ type: 'progress', requestId, stage: 'Applying filters...', processed: 0, total: baseRows.length });
      const filtered = filterRows(baseRows, filters);
      const { payload, period } = aggregateData(filtered);
      self.postMessage({ type: 'filtered', requestId, payload, period });
    } else if (type === 'getStatement') {

      const filtered = filterRows(baseRows, filters);
      const statement = getScopedStatement(filtered, scope, key);
      self.postMessage({ type: 'statement', requestId, payload: statement });
    } else if (type === 'getSnapshot') {
       const snapshot = {
         dicts,
         baseRows,
         rowKeys: Array.from(rowKeys),
         globalMapping,
         globalDelimiter,
         duplicatesBuffer
       };
       self.postMessage({ type: 'snapshot', requestId, snapshot });
    } else if (type === 'restoreSnapshot') {
       if (!snapshot) throw new Error('No snapshot provided');
       dicts = snapshot.dicts;
       baseRows = snapshot.baseRows;
       rowKeys = new Map(snapshot.rowKeys);
       globalMapping = snapshot.globalMapping;
       globalDelimiter = snapshot.globalDelimiter;
       duplicatesBuffer = snapshot.duplicatesBuffer || [];
       
       // Rebuild revDicts Maps
       Object.keys(revDicts).forEach(key => {
         revDicts[key].clear();
         if (dicts[key]) {
           dicts[key].forEach((val, id) => {
             revDicts[key].set(val, id);
           });
         }
       });

       // Rebuild Indexes
       Object.keys(indexes).forEach(k => indexes[k].clear());
       baseRows.forEach((r, i) => {
          addToIndex('p', r.p, i);
          addToIndex('d', r.d, i);
          addToIndex('eb', r.eb, i);
          addToIndex('db', r.db, i);
          addToIndex('cn', r.cn, i);
       });

       const { payload, period } = aggregateData(baseRows);
       self.postMessage({ type: 'done', requestId, payload, period });
    }

  } catch (error) {
    self.postMessage({ type: 'error', requestId, message: error.message });
  }
};

function filterRows(rows, f) {
  if (!f) return rows;
  
  const filterSets = [];
  const dims = [
     { key: 'products', idx: 'p', rev: revDicts.products },
     { key: 'distributors', idx: 'd', rev: revDicts.distributors },
     { key: 'evaBricks', idx: 'eb', rev: revDicts.evaBricks },
     { key: 'disBricks', idx: 'db', rev: revDicts.disBricks },
     { key: 'customers', idx: 'cn', rev: revDicts.clientNames }
  ];

  dims.forEach(dim => {
     if (f[dim.key] && f[dim.key].length > 0) {
        const idSet = new Set();
        f[dim.key].forEach(val => {
           const id = dim.rev.get(val);
           if (id !== undefined) {
              const rowIds = indexes[dim.idx].get(id);
              if (rowIds) rowIds.forEach(rid => idSet.add(rid));
           }
        });
        filterSets.push(idSet);
     }
  });

  let targetIndices = null;
  if (filterSets.length > 0) {
     filterSets.sort((a, b) => a.size - b.size);
     targetIndices = filterSets[0];
     for (let i = 1; i < filterSets.length; i++) {
        const nextSet = filterSets[i];
        const newIntersect = new Set();
        targetIndices.forEach(id => {
           if (nextSet.has(id)) newIntersect.add(id);
        });
        targetIndices = newIntersect;
        if (targetIndices.size === 0) break;
     }
  }

  const arabicPattern = /[\u0600-\u06FF]/;
  const hasOtherFilters = f.customerCode || f.minValue || f.maxValue || f.arabicOnly;

  if (targetIndices) {
     const result = [];
     targetIndices.forEach(idx => {
        const r = rows[idx];
        if (hasOtherFilters && !manualFilterCheck(r, f, arabicPattern)) return;
        result.push(r);
     });
     return result;
  } else {
     if (!hasOtherFilters) return rows;
     return rows.filter(r => manualFilterCheck(r, f, arabicPattern));
  }
}

function manualFilterCheck(r, f, arabicPattern) {
   if (f.customerCode && !getValById('clientCodes', r.cc).toLowerCase().includes(f.customerCode.toLowerCase())) return false;
   if (f.minValue && r.v < parseFloat(f.minValue)) return false;
   if (f.maxValue && r.v > parseFloat(f.maxValue)) return false;
   if (f.arabicOnly && !arabicPattern.test(getValById('clientNames', r.cn))) return false;
   return true;
}

function aggregateData(rows) {
  const customersMap = {}; 
  const customerDetails = {}; 
  const productsMap = {};
  const productDistributorsMap = {};
  const distributorsMap = {};
  const evaBricksMap = {};
  const disBricksMap = {};
  
  let totalValue = 0;
  let totalQty = 0;
  let minMonth = null;
  let maxMonth = null;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const { p, cc, cn, d, eb, db, m, q, v } = r;

    totalValue += v;
    totalQty += q;

    const monthKey = getValById('months', m);
    if (monthKey !== '0000-00') {
      if (!minMonth || monthKey < minMonth) minMonth = monthKey;
      if (!maxMonth || monthKey > maxMonth) maxMonth = monthKey;
    }

    const clientCodeStr = getValById('clientCodes', cc);
    const clientNameStr = getValById('clientNames', cn);
    const cKey = clientCodeStr !== 'N/A' ? clientCodeStr : clientNameStr;

    // Aggregates
    if (!productsMap[p]) productsMap[p] = { totalQty: 0, totalValue: 0, customerCount: new Set() };
    productsMap[p].totalQty += q;
    productsMap[p].totalValue += v;
    productsMap[p].customerCount.add(cKey);

    const pdKey = `${p}|${d}`;
    if (!productDistributorsMap[pdKey]) productDistributorsMap[pdKey] = { p, d, totalQty: 0, totalValue: 0, customerCount: new Set() };
    productDistributorsMap[pdKey].totalQty += q;
    productDistributorsMap[pdKey].totalValue += v;
    productDistributorsMap[pdKey].customerCount.add(cKey);

    if (!distributorsMap[d]) distributorsMap[d] = { totalQty: 0, totalValue: 0, customerCount: new Set(), productCount: new Set() };
    distributorsMap[d].totalQty += q;
    distributorsMap[d].totalValue += v;
    distributorsMap[d].customerCount.add(cKey);
    distributorsMap[d].productCount.add(p);

    if (!evaBricksMap[eb]) evaBricksMap[eb] = { totalQty: 0, totalValue: 0, customerCount: new Set(), productCount: new Set() };
    evaBricksMap[eb].totalQty += q;
    evaBricksMap[eb].totalValue += v;
    evaBricksMap[eb].customerCount.add(cKey);
    evaBricksMap[eb].productCount.add(p);

    if (!disBricksMap[db]) disBricksMap[db] = { totalQty: 0, totalValue: 0, customerCount: new Set(), productCount: new Set() };
    disBricksMap[db].totalQty += q;
    disBricksMap[db].totalValue += v;
    disBricksMap[db].customerCount.add(cKey);
    disBricksMap[db].productCount.add(p);

    if (!customersMap[cKey]) {
      customersMap[cKey] = {
        cc: cc,
        cn: cn,
        d: d,
        eb: eb,
        db: db,
        qty: 0,
        val: 0,
        products: new Set()
      };
      customerDetails[cKey] = { statement: {} };
    }

    const c = customersMap[cKey];
    c.qty += q;
    c.val += v;
    c.products.add(p);

    const sKey = `${p}|${d}|${m}`;
    const det = customerDetails[cKey].statement;
    if (!det[sKey]) det[sKey] = { p, d, m, q: 0, v: 0 };
    det[sKey].q += q;
    det[sKey].v += v;
  }

  const customersArray = Object.values(customersMap).map(c => ({
    clientCode: getValById('clientCodes', c.cc),
    clientName: getValById('clientNames', c.cn),
    distributor: getValById('distributors', c.d),
    evaBrick: getValById('evaBricks', c.eb),
    disBrick: getValById('disBricks', c.db),
    totalQty: c.qty,
    totalValue: c.val,
    productCount: c.products.size,
    productIds: Array.from(c.products).map(pid => getValById('products', pid))
  })).sort((a, b) => b.totalValue - a.totalValue);

  const finalizedDetails = {};
  Object.keys(customerDetails).forEach(k => {
    finalizedDetails[k] = Object.values(customerDetails[k].statement).map(row => ({
      product: getValById('products', row.p),
      distributor: getValById('distributors', row.d),
      monthKey: getValById('months', row.m),
      qty: row.q,
      value: row.v
    })).sort((a,b) => (b.value - a.value));
  });

  const periodLabel = (minMonth === maxMonth) ? decodeMonthKey(minMonth) : `${decodeMonthKey(minMonth)} - ${decodeMonthKey(maxMonth)}`;

  return {
    payload: {
      customers: customersArray,
      products: Object.entries(productsMap).map(([id, p]) => ({ product: getValById('products', id), totalQty: p.totalQty, totalValue: p.totalValue, customerCount: p.customerCount.size, avgValue: p.customerCount.size > 0 ? p.totalValue / p.customerCount.size : 0 })).sort((a,b)=>b.totalValue-a.totalValue),
      productDistributors: Object.values(productDistributorsMap).map(pd => ({
        product: getValById('products', pd.p),
        distributor: getValById('distributors', pd.d),
        totalQty: pd.totalQty,
        totalValue: pd.totalValue,
        customerCount: pd.customerCount.size,
        avgValue: pd.customerCount.size > 0 ? pd.totalValue / pd.customerCount.size : 0
      })).sort((a, b) => b.totalValue - a.totalValue),
      distributors: Object.entries(distributorsMap).map(([id, d]) => ({ distributor: getValById('distributors', id), totalQty: d.totalQty, totalValue: d.totalValue, customerCount: d.customerCount.size, productCount: d.productCount.size })).sort((a,b)=>b.totalValue-a.totalValue),
      evaBricks: Object.entries(evaBricksMap).map(([id, e]) => ({ evaBrick: getValById('evaBricks', id), totalQty: e.totalQty, totalValue: e.totalValue, customerCount: e.customerCount.size, productCount: e.productCount.size })).sort((a,b)=>b.totalValue-a.totalValue),
      disBricks: Object.entries(disBricksMap).map(([id, b]) => ({ disBrick: getValById('disBricks', id), totalQty: b.totalQty, totalValue: b.totalValue, customerCount: b.customerCount.size, productCount: b.productCount.size })).sort((a,b)=>b.totalValue-a.totalValue),
      filterOptions: {
        products: dicts.products.filter(Boolean).sort(),
        distributors: dicts.distributors.filter(Boolean).sort(),
        evaBricks: dicts.evaBricks.filter(Boolean).sort(),
        disBricks: dicts.disBricks.filter(Boolean).sort(),
        customers: dicts.clientNames.filter(Boolean).sort()
      },
      customerDetails: finalizedDetails,
      globalTotals: { totalValue, totalQty, customerCount: customersArray.length, productCount: dicts.products.length }
    },
    period: { minMonth, maxMonth, label: periodLabel }
  };
}

function getScopedStatement(rows, scope, key) {
  const statement = {};
  
  rows.forEach(r => {
    let match = false;
    if (scope === 'distributor' && getValById('distributors', r.d) === key) match = true;
    else if (scope === 'evaBrick' && getValById('evaBricks', r.eb) === key) match = true;
    else if (scope === 'disBrick' && getValById('disBricks', r.db) === key) match = true;
    else if (scope === 'product' && getValById('products', r.p) === key) match = true;
    else if (scope === 'customer') {
       const clientCodeStr = getValById('clientCodes', r.cc);
       const clientNameStr = getValById('clientNames', r.cn);
       const cKey = clientCodeStr !== 'N/A' ? clientCodeStr : clientNameStr;
       if (cKey === key) match = true;
    }

    if (match) {
      const sKey = `${r.p}|${r.d}|${r.cn}|${r.m}`;
      if (!statement[sKey]) {
        statement[sKey] = {
          product: getValById('products', r.p),
          distributor: getValById('distributors', r.d),
          clientName: getValById('clientNames', r.cn),
          clientCode: getValById('clientCodes', r.cc),
          monthKey: getValById('months', r.m),
          qty: 0,
          value: 0
        };
      }
      statement[sKey].qty += r.q;
      statement[sKey].value += r.v;
    }
  });

  return {
    title: `${scope.toUpperCase()}: ${key}`,
    rows: Object.values(statement).sort((a,b) => b.value - a.value)
  };
}

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
  const ALIASES = {
    product: ['product', 'product name', 'item', 'desc'],
    evaBrick: ['eva brick', 'evabrick', 'brick'],
    disBrick: ['dis brick', 'disbrick', 'district'],
    clientCode: ['client code', 'clientcode', 'customer code', 'code', 'acc'],
    clientName: ['client name', 'clientname', 'customer name', 'name', 'account'],
    distributor: ['dis', 'distributor', 'dist', 'vendor'],
    qty: ['net sales', 'qty', 'quantity', 'units', 'net sales qty', 'count'],
    value: ['value', 'net sales value', 'sales value', 'amount', 'total val'],
    date: ['date', 'month', 'period', 'reporting period']
  };

  for (let i = 0; i < sampleLines.length; i++) {
    const rawCols = splitLine(sampleLines[i], delimiter);
    const cols = rawCols.map(c => c.trim().toLowerCase().replace(/\s+/g, ' '));
    const mapping = {};
    let foundCount = 0;
    Object.entries(ALIASES).forEach(([key, variations]) => {
      let idx = cols.findIndex(c => variations.includes(c));
      if (idx === -1) {
        const sortedVars = [...variations].sort((a,b) => b.length - a.length);
        idx = cols.findIndex(c => sortedVars.some(v => c.includes(v)));
      }
      if (idx !== -1) {
        mapping[key] = idx;
        foundCount++;
      }
    });
    if (foundCount >= 4) return { headerIndex: i, mapping };
  }
  return { headerIndex: -1, mapping: {} };
}

function splitLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t');
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === delimiter && !inQuotes) { result.push(current); current = ""; }
    else current += char;
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
  const cleaned = val.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  return parseFloat(cleaned) || 0;
}
