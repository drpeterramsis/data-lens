/**
 * CSV Analysis utility functions
 */

export const analyzeCSVData = (data) => {
  if (!data || data.length === 0) return {};

  const headers = Object.keys(data[0]);
  const analysis = {};

  headers.forEach((header) => {
    const values = data.map((row) => row[header]).filter((v) => v !== null && v !== undefined && v !== "");
    const numericValues = values
      .map((v) => parseFloat(String(v).replace(/[^0-9.-]+/g, "")))
      .filter((v) => !isNaN(v));

    analysis[header] = {
      count: data.length,
      uniqueCount: new Set(values).size,
      emptyCount: data.length - values.length,
      isNumeric: numericValues.length > 0 && numericValues.length >= values.length * 0.8, // 80% threshold for numeric
    };

    if (analysis[header].isNumeric) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const sum = numericValues.reduce((acc, val) => acc + val, 0);
      const avg = sum / numericValues.length;

      analysis[header].min = min;
      analysis[header].max = max;
      analysis[header].avg = parseFloat(avg.toFixed(2));
      analysis[header].sum = parseFloat(sum.toFixed(2));
    }
  });

  return analysis;
};

export const getTableStats = (data) => {
  if (!data || data.length === 0) return { rows: 0, cols: 0, emptyCells: 0 };

  const rows = data.length;
  const colNames = Object.keys(data[0]);
  const cols = colNames.length;
  
  let emptyCells = 0;
  data.forEach(row => {
    colNames.forEach(col => {
      if (row[col] === null || row[col] === undefined || String(row[col]).trim() === "") {
        emptyCells++;
      }
    });
  });

  return { rows, cols, emptyCells };
};
