/**
 * Excel 数据极速转换与批处理核心算法
 * 纯函数式编程 (Pure FP) 设计：不可变数据、无副作用、高内聚便于单元测试
 */
import * as XLSX from "xlsx";

/**
 * 严格判断字符串是否为纯数值 (避免 parseFloat 将 "2026-09-24" 或 "123Street" 误当作数字计算)
 * @param {any} val
 * @returns {boolean}
 */
export function isStrictNumeric(val) {
  if (typeof val === "number") return !isNaN(val) && isFinite(val);
  if (typeof val !== "string") return false;
  const clean = val.replace(/,/g, "").trim();
  if (clean === "") return false;
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(clean);
}

/**
 * 消除 JS 浮点运算精度问题 (如 0.1 + 0.2 = 0.30000000000000004)
 * @param {number} num
 * @param {number} maxDecimals
 * @returns {number}
 */
export function fixFloatPrecision(num, maxDecimals = 10) {
  if (typeof num !== "number" || isNaN(num) || !isFinite(num)) return num;
  return Number(Math.round(Number(num + "e" + maxDecimals)) + "e-" + maxDecimals);
}

/**
 * 列索引转 Excel 列名 (0 -> A, 1 -> B, 25 -> Z, 26 -> AA)
 * @param {number} colIndex
 * @returns {string}
 */
export function getExcelColName(colIndex) {
  let name = "";
  let n = colIndex;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/**
 * Excel 列名转列索引 ('A' -> 0, 'B' -> 1, 'AA' -> 26)
 * @param {string} colName
 * @returns {number}
 */
export function getColIndexFromName(colName) {
  const clean = colName.trim().toUpperCase();
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    index = index * 26 + (clean.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * 规整化二维数组 (填充参差不齐的行，保证矩阵完整性)
 * @param {Array<Array<any>>} rows
 * @param {number} targetCols
 * @returns {Array<Array<any>>}
 */
export function normalizeRows(rows, targetCols = 0) {
  if (!rows || rows.length === 0) return [];
  let maxCols = targetCols;
  for (const row of rows) {
    if (row && row.length > maxCols) maxCols = row.length;
  }
  return rows.map((row) => {
    const r = row ? [...row] : [];
    while (r.length < maxCols) {
      r.push("");
    }
    return r;
  });
}

/* =========================================================================
   纯单元格映射器 (Cell-level Pure Mappers)
   ========================================================================= */

/**
 * 纯函数：强制转换为纯文本字符串
 */
export function cellToText(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * 纯函数：文本转纯数值 (智能去除货币符号、千分位逗号、百分号)
 */
export function cellToNumber(val, options = {}) {
  const { stripSymbols = true } = options;
  if (val === null || val === undefined || val === "") return val;
  let str = String(val).trim();
  if (stripSymbols) {
    str = str.replace(/[¥￥$€£, ]/g, "");
    if (str.endsWith("%")) {
      const p = parseFloat(str);
      if (!isNaN(p)) return fixFloatPrecision(p / 100);
    }
  }
  if (isStrictNumeric(str)) {
    return fixFloatPrecision(parseFloat(str));
  }
  return val;
}

/**
 * 纯函数：全角字符、全角数字与中文标点转半角
 */
export function cellToHalfWidth(str) {
  if (str === null || str === undefined) return "";
  const s = String(str);
  let res = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 12288) {
      // 全角空格 -> 半角空格
      res += " ";
    } else if (code >= 65281 && code <= 65374) {
      // 全角字符 (！到～) -> 半角
      res += String.fromCharCode(code - 65248);
    } else {
      // 中文常用全角标点特殊映射
      switch (s[i]) {
        case "，": res += ","; break;
        case "。": res += "."; break;
        case "！": res += "!"; break;
        case "？": res += "?"; break;
        case "：": res += ":"; break;
        case "；": res += ";"; break;
        case "“":
        case "”": res += '"'; break;
        case "‘":
        case "’": res += "'"; break;
        case "（": res += "("; break;
        case "）": res += ")"; break;
        case "【": res += "["; break;
        case "】": res += "]"; break;
        case "《": res += "<"; break;
        case "》": res += ">"; break;
        case "、": res += ","; break;
        case "～": res += "~"; break;
        default: res += s[i];
      }
    }
  }
  return res;
}

/**
 * 纯函数：金额数字转中文大写 (财务记账与合同规范)
 * 例: 12500.50 => 壹万贰仟伍佰元伍角整
 */
export function cellToRmbUppercase(money) {
  if (money === null || money === undefined || money === "") return "";
  const str = String(money).replace(/[¥￥$€£, ]/g, "").trim();
  const n = parseFloat(str);
  if (isNaN(n) || !isStrictNumeric(str)) return String(money);
  if (n === 0) return "零元整";

  const prefix = n < 0 ? "负" : "";
  const absN = Math.abs(n);

  const digit = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const unit = [
    ["元", "万", "亿"],
    ["", "拾", "佰", "仟"],
  ];

  const num = Math.round(absN * 100) / 100;
  const integerPart = Math.floor(num);
  const decStr = Math.round((num - integerPart) * 100).toString().padStart(2, "0");
  const jiao = parseInt(decStr[0], 10);
  const fen = parseInt(decStr[1], 10);

  let decResult = "";
  if (jiao === 0 && fen === 0) {
    decResult = "整";
  } else {
    if (jiao > 0) decResult += digit[jiao] + "角";
    if (fen > 0) {
      if (jiao === 0 && integerPart > 0) decResult += "零";
      decResult += digit[fen] + "分";
    } else {
      decResult += "整";
    }
  }

  let intResult = "";
  if (integerPart > 0) {
    let zeroCount = 0;
    const strInt = String(integerPart);
    const len = strInt.length;
    for (let i = 0; i < len; i++) {
      const d = parseInt(strInt[i], 10);
      const pos = len - i - 1;
      const u1 = pos % 4; // 0->元/万/亿, 1->拾, 2->佰, 3->仟
      const u2 = Math.floor(pos / 4); // 0->元, 1->万, 2->亿

      if (d === 0) {
        zeroCount++;
      } else {
        if (zeroCount > 0) {
          intResult += "零";
        }
        zeroCount = 0;
        intResult += digit[d] + unit[1][u1];
      }

      if (u1 === 0 && zeroCount < 4) {
        intResult += unit[0][u2];
      }
    }

    if (!intResult.includes("元")) {
      intResult += "元";
    }
    intResult = intResult
      .replace(/亿万/g, "亿")
      .replace(/零+元/g, "元")
      .replace(/零+/g, "零");
  }

  if (!intResult) {
    return prefix + (decResult === "整" ? "零元整" : decResult);
  }
  return prefix + intResult + decResult;
}

/**
 * 纯函数：日期格式解析并标准化
 */
export function cellFormatDate(val, targetFormat = "YYYY-MM-DD") {
  if (val === null || val === undefined || val === "") return "";
  let dateObj = null;

  if (val instanceof Date && !isNaN(val)) {
    dateObj = val;
  } else if (typeof val === "number") {
    if (val > 10000 && val < 60000) {
      dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    } else {
      dateObj = new Date(val);
    }
  } else if (typeof val === "string") {
    const s = val.trim();
    if (/^\d{8}$/.test(s)) {
      const y = s.substring(0, 4);
      const m = s.substring(4, 6);
      const d = s.substring(6, 8);
      dateObj = new Date(`${y}-${m}-${d}`);
    } else {
      const normalized = s.replace(/[\.\/]/g, "-");
      const parsed = Date.parse(normalized);
      if (!isNaN(parsed)) {
        dateObj = new Date(parsed);
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return val;
  }

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const hh = String(dateObj.getHours()).padStart(2, "0");
  const min = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");

  if (targetFormat === "YYYY-MM-DD") {
    return `${yyyy}-${mm}-${dd}`;
  } else if (targetFormat === "YYYY/MM/DD") {
    return `${yyyy}/${mm}/${dd}`;
  } else if (targetFormat === "YYYY年MM月DD日") {
    return `${yyyy}年${mm}月${dd}日`;
  } else if (targetFormat === "YYYY-MM-DD HH:mm:ss") {
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  } else if (targetFormat === "YYYYMMDD") {
    return `${yyyy}${mm}${dd}`;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 纯函数：数值四则运算 (加、减、乘、除、取整)
 */
export function cellMath(val, operator = "+", operand = 1, options = {}) {
  const { skipNonNumeric = true } = options;
  if (val === null || val === undefined || val === "") return val;
  const str = String(val).replace(/,/g, "").trim();
  if (!isStrictNumeric(str)) {
    return skipNonNumeric ? val : 0;
  }
  const num = parseFloat(str);
  const op = Number(operand) || 0;
  let res = num;
  switch (operator) {
    case "+":
      res = num + op;
      break;
    case "-":
      res = num - op;
      break;
    case "*":
      res = num * op;
      break;
    case "/":
      if (op !== 0) res = num / op;
      break;
    case "round":
      res = Math.round(num);
      break;
    case "floor":
      res = Math.floor(num);
      break;
    case "ceil":
      res = Math.ceil(num);
      break;
  }
  return fixFloatPrecision(res);
}

/**
 * 纯函数：前后缀拼接
 */
export function cellConcat(val, prefix = "", suffix = "", options = {}) {
  const { skipEmpty = true } = options;
  const isEmpty = val === null || val === undefined || val === "";
  if (isEmpty && skipEmpty) return val;
  const base = isEmpty ? "" : String(val);
  return `${prefix}${base}${suffix}`;
}

/**
 * 纯函数：字典映射
 */
export function cellDictMap(val, dictMap, unmatchedMode = "keep", defaultVal = "") {
  const isEmpty = val === null || val === undefined || val === "";
  const key = isEmpty ? "" : String(val).trim();
  if (dictMap && dictMap.has(key)) {
    return dictMap.get(key);
  }
  if (unmatchedMode === "empty") return "";
  if (unmatchedMode === "custom") return defaultVal;
  return val;
}

/**
 * 纯函数：正则抽取
 */
export function cellRegexExtract(val, regex, groupIndex = 1) {
  if (val === null || val === undefined || !regex) return "";
  const match = String(val).match(regex);
  if (!match) return "";
  return match[groupIndex] || match[0] || "";
}

/* =========================================================================
   高阶函数：表格单元格纯映射 (Higher-Order Table Mapper)
   ========================================================================= */

/**
 * 高阶纯函数：遍历矩阵映射单元格，返回新的不可变矩阵与统计元数据
 * @param {Array<Array<any>>} rows 原始二维数组
 * @param {Function} predicate (rIdx, cIdx, val, row) => boolean 是否处理该单元格
 * @param {Function} mapper (val, rIdx, cIdx, row) => nextVal 映射逻辑
 * @returns {{ newRows: Array<Array<any>>, count: number, modifiedCells: Set<string> }}
 */
export function mapTableCells(rows, predicate, mapper) {
  let count = 0;
  const modifiedCells = new Set();
  const normalized = normalizeRows(rows);

  const newRows = normalized.map((row, rIdx) => {
    return row.map((cell, cIdx) => {
      if (!predicate(rIdx, cIdx, cell, row)) {
        return cell;
      }
      const nextVal = mapper(cell, rIdx, cIdx, row);
      if (nextVal !== cell) {
        count++;
        modifiedCells.add(`${rIdx}_${cIdx}`);
        return nextVal;
      }
      return cell;
    });
  });

  return { newRows, count, modifiedCells };
}

/* =========================================================================
   核心高阶业务功能 (Table-level Pure FP Transformers)
   ========================================================================= */

/**
 * 1. 纯函数：搜索与替换
 */
export function executeSearchAndReplace(rows, options) {
  const {
    scopeType = "all", // 'all' | 'column' | 'row'
    targetIndex = 0,
    searchVal = "",
    replaceVal = "",
    matchMode = "contains", // 'contains' | 'exact' | 'regex'
    caseSensitive = false,
  } = options;

  const predicate = (rIdx, cIdx) => {
    if (scopeType === "column" && cIdx !== targetIndex) return false;
    if (scopeType === "row" && rIdx !== targetIndex) return false;
    return true;
  };

  const mapper = (cell) => {
    if (cell === null || cell === undefined) {
      if (matchMode === "exact" && searchVal === "") return replaceVal;
      return cell;
    }
    const strVal = String(cell);
    if (matchMode === "exact") {
      const match = caseSensitive ? strVal === searchVal : strVal.toLowerCase() === searchVal.toLowerCase();
      return match ? replaceVal : cell;
    } else if (matchMode === "regex") {
      try {
        const flags = caseSensitive ? "g" : "gi";
        const regex = new RegExp(searchVal, flags);
        return strVal.replace(regex, replaceVal);
      } catch (e) {
        return cell;
      }
    } else {
      if (searchVal === "") return cell;
      if (caseSensitive) {
        return strVal.includes(searchVal) ? strVal.split(searchVal).join(replaceVal) : cell;
      } else {
        const lowerVal = strVal.toLowerCase();
        const lowerSearch = searchVal.toLowerCase();
        if (lowerVal.includes(lowerSearch)) {
          const escaped = searchVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escaped, "gi");
          return strVal.replace(regex, replaceVal);
        }
        return cell;
      }
    }
  };

  return mapTableCells(rows, predicate, mapper);
}

/**
 * 2. 纯函数：数据类型与格式转换
 */
export function executeTypeConversion(rows, options) {
  const {
    scopeType = "column",
    targetIndex = 0,
    convertType = "toText",
    dateFormat = "YYYY-MM-DD",
    decimals = 2,
    stripSymbols = true,
  } = options;

  const predicate = (rIdx, cIdx) => {
    if (scopeType === "column" && cIdx !== targetIndex) return false;
    if (scopeType === "row" && rIdx !== targetIndex) return false;
    return true;
  };

  const mapper = (cell) => {
    switch (convertType) {
      case "toText":
        return cellToText(cell);
      case "toNumber":
        return cellToNumber(cell, { stripSymbols });
      case "toHalfWidth":
        return cellToHalfWidth(cell);
      case "toRmb":
        return cellToRmbUppercase(cell);
      case "trim":
        return typeof cell === "string" ? cell.trim() : cell;
      case "trimAll":
        return typeof cell === "string" || typeof cell === "number" ? String(cell).replace(/\s+/g, "") : cell;
      case "upper":
        return String(cell ?? "").toUpperCase();
      case "lower":
        return String(cell ?? "").toLowerCase();
      case "titleCase":
        return String(cell ?? "").replace(/\b\w/g, (c) => c.toUpperCase());
      case "dateFormat":
        return cellFormatDate(cell, dateFormat);
      case "decimals": {
        const clean = String(cell ?? "").replace(/,/g, "").trim();
        if (isStrictNumeric(clean)) {
          return parseFloat(clean).toFixed(decimals);
        }
        return cell;
      }
      case "thousands": {
        const clean = String(cell ?? "").replace(/,/g, "").trim();
        if (isStrictNumeric(clean)) {
          const num = parseFloat(clean);
          const parts = String(num).split(".");
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          return parts.join(".");
        }
        return cell;
      }
      default:
        return cell;
    }
  };

  return mapTableCells(rows, predicate, mapper);
}

/**
 * 3. 纯函数：数据 Map 与计算
 */
export function executeDataMapping(rows, options) {
  const {
    scopeType = "column",
    targetIndex = 0,
    mapType = "concat",
    prefix = "",
    suffix = "",
    skipEmpty = true,
    mathOperator = "+",
    mathOperand = 1,
    skipNonNumeric = true,
    dictRules = [],
    dictUnmatched = "keep",
    dictDefaultVal = "",
    customExpression = "val",
  } = options;

  const dictMap = new Map();
  if (mapType === "dict" && Array.isArray(dictRules)) {
    dictRules.forEach((rule) => {
      if (rule.from !== undefined && rule.from !== null) {
        dictMap.set(String(rule.from).trim(), rule.to ?? "");
      }
    });
  }

  let compiledCustomFn = null;
  if (mapType === "custom") {
    try {
      compiledCustomFn = new Function("val", "row", "rIdx", "cIdx", `"use strict"; return (${customExpression});`);
    } catch (e) {
      compiledCustomFn = null;
    }
  }

  const predicate = (rIdx, cIdx) => {
    if (scopeType === "column" && cIdx !== targetIndex) return false;
    if (scopeType === "row" && rIdx !== targetIndex) return false;
    return true;
  };

  const mapper = (cell, rIdx, cIdx, row) => {
    if (mapType === "concat") {
      return cellConcat(cell, prefix, suffix, { skipEmpty });
    } else if (mapType === "math") {
      return cellMath(cell, mathOperator, mathOperand, { skipNonNumeric });
    } else if (mapType === "dict") {
      return cellDictMap(cell, dictMap, dictUnmatched, dictDefaultVal);
    } else if (mapType === "custom" && compiledCustomFn) {
      try {
        const res = compiledCustomFn(cell, row, rIdx, cIdx);
        return res !== undefined ? res : cell;
      } catch (e) {
        return cell;
      }
    }
    return cell;
  };

  return mapTableCells(rows, predicate, mapper);
}

/**
 * 4. 纯函数：从文本中一键提取信息 (正则匹配)
 */
export function extractInfoFromColumn(rows, options) {
  const {
    colIndex = 0,
    extractType = "phone",
    customRegex = "",
    outputMode = "newCol",
    newColName = "提取结果",
    hasHeaderRow = true,
  } = options;

  let regex = null;
  switch (extractType) {
    case "phone":
      regex = /(?:(?:\+|00)86)?(1[3-9]\d{9})/;
      break;
    case "idcard":
      regex = /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/;
      break;
    case "email":
      regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      break;
    case "number":
      regex = /-?\d+(?:\.\d+)?/;
      break;
    case "money":
      regex = /(?:[¥￥$€£]\s*)?-?\d+(?:,\d{3})*(?:\.\d+)?/;
      break;
    case "url":
      regex = /https?:\/\/[^\s，,、"'<>()\[\]]+/;
      break;
    case "custom":
      if (customRegex) {
        try {
          regex = new RegExp(customRegex);
        } catch (e) {
          regex = null;
        }
      }
      break;
  }

  let count = 0;
  const normalized = normalizeRows(rows, colIndex + 1);

  const newRows = normalized.map((row, rIdx) => {
    const newRow = [...row];
    if (hasHeaderRow && rIdx === 0) {
      if (outputMode === "newCol") {
        newRow.splice(colIndex + 1, 0, newColName);
      } else {
        newRow[colIndex] = newColName;
      }
      return newRow;
    }

    const cellVal = row[colIndex];
    const extractedVal = cellRegexExtract(cellVal, regex);
    if (extractedVal) count++;

    if (outputMode === "newCol") {
      newRow.splice(colIndex + 1, 0, extractedVal);
    } else {
      newRow[colIndex] = extractedVal;
    }
    return newRow;
  });

  return { newRows, count, newColIndex: outputMode === "newCol" ? colIndex + 1 : colIndex };
}

/**
 * 5. 纯函数：批量合并多列
 */
export function mergeMultipleColumns(rows, options) {
  const {
    colIndices = [],
    delimiter = "-",
    newColName = "合并列",
    keepOriginalCols = true,
    hasHeaderRow = true,
  } = options;

  if (!colIndices || colIndices.length < 2) {
    return { newRows: rows, count: 0, newColIndex: -1 };
  }

  const sortedIndices = [...colIndices].sort((a, b) => a - b);
  const maxIdx = Math.max(...sortedIndices);
  const normalized = normalizeRows(rows, maxIdx + 1);
  const insertIndex = maxIdx + 1;

  const newRows = normalized.map((row, rIdx) => {
    let mergedVal = "";
    if (hasHeaderRow && rIdx === 0) {
      mergedVal = newColName;
    } else {
      const values = sortedIndices.map((cIdx) => (row[cIdx] !== null && row[cIdx] !== undefined ? String(row[cIdx]) : ""));
      mergedVal = values.join(delimiter);
    }

    const newRow = [...row];
    newRow.splice(insertIndex, 0, mergedVal);

    if (!keepOriginalCols) {
      for (let i = sortedIndices.length - 1; i >= 0; i--) {
        const idxToRemove = sortedIndices[i] >= insertIndex ? sortedIndices[i] + 1 : sortedIndices[i];
        newRow.splice(idxToRemove, 1);
      }
    }
    return newRow;
  });

  return {
    newRows,
    count: hasHeaderRow ? Math.max(0, rows.length - 1) : rows.length,
    newColIndex: keepOriginalCols ? insertIndex : sortedIndices[0],
  };
}

/**
 * 6. 纯函数：按分隔符拆分单列为多列
 */
export function splitSingleColumn(rows, options) {
  const {
    colIndex = 0,
    delimiter = "-",
    hasHeaderRow = true,
    keepOriginalCol = false,
  } = options;

  const normalized = normalizeRows(rows, colIndex + 1);

  let maxParts = 1;
  const startRowIdx = hasHeaderRow ? 1 : 0;
  for (let i = startRowIdx; i < normalized.length; i++) {
    const val = normalized[i][colIndex];
    if (val !== null && val !== undefined) {
      const parts = String(val).split(delimiter);
      if (parts.length > maxParts) maxParts = parts.length;
    }
  }

  if (maxParts <= 1) {
    return { newRows: rows, maxParts: 1, count: 0 };
  }

  const origHeaderName =
    hasHeaderRow && normalized[0] && normalized[0][colIndex]
      ? String(normalized[0][colIndex])
      : `列${getExcelColName(colIndex)}`;

  const newRows = normalized.map((row, rIdx) => {
    const newRow = [...row];
    if (hasHeaderRow && rIdx === 0) {
      const headerParts = [];
      for (let p = 1; p <= maxParts; p++) {
        headerParts.push(`${origHeaderName}_${p}`);
      }
      if (keepOriginalCol) {
        newRow.splice(colIndex + 1, 0, ...headerParts);
      } else {
        newRow.splice(colIndex, 1, ...headerParts);
      }
      return newRow;
    }

    const val = row[colIndex];
    const parts = val !== null && val !== undefined ? String(val).split(delimiter) : [];
    while (parts.length < maxParts) {
      parts.push("");
    }

    if (keepOriginalCol) {
      newRow.splice(colIndex + 1, 0, ...parts);
    } else {
      newRow.splice(colIndex, 1, ...parts);
    }
    return newRow;
  });

  return { newRows, maxParts, count: hasHeaderRow ? Math.max(0, rows.length - 1) : rows.length };
}

/**
 * 7. 纯函数：剔除纯空白行与纯空白列
 */
export function cleanEmptyRowsAndCols(rows, options = {}) {
  const { removeRows = true, removeCols = true, hasHeaderRow = true } = options;
  if (!rows || rows.length === 0) return { newRows: [], removedRowsCount: 0, removedColsCount: 0 };

  const isCellEmpty = (c) => c === null || c === undefined || String(c).trim() === "";
  let currentRows = [...rows];
  let removedRowsCount = 0;
  let removedColsCount = 0;

  if (removeRows) {
    const filtered = [];
    currentRows.forEach((row, rIdx) => {
      if (hasHeaderRow && rIdx === 0) {
        filtered.push(row);
        return;
      }
      const allEmpty = !row || row.every(isCellEmpty);
      if (allEmpty) {
        removedRowsCount++;
      } else {
        filtered.push(row);
      }
    });
    currentRows = filtered;
  }

  if (removeCols && currentRows.length > 0) {
    const colCount = Math.max(...currentRows.map((r) => (r ? r.length : 0)));
    const startRowIdx = hasHeaderRow ? 1 : 0;
    const emptyColIndices = new Set();

    for (let c = 0; c < colCount; c++) {
      let isColEmpty = true;
      for (let r = startRowIdx; r < currentRows.length; r++) {
        const cell = currentRows[r] ? currentRows[r][c] : undefined;
        if (!isCellEmpty(cell)) {
          isColEmpty = false;
          break;
        }
      }
      if (isColEmpty) {
        emptyColIndices.add(c);
      }
    }

    if (emptyColIndices.size > 0 && emptyColIndices.size < colCount) {
      removedColsCount = emptyColIndices.size;
      currentRows = currentRows.map((row) => (row ? row.filter((_, cIdx) => !emptyColIndices.has(cIdx)) : []));
    }
  }

  return { newRows: currentRows, removedRowsCount, removedColsCount };
}

/**
 * 8. 纯函数：智能去重 (依据指定列或全行完全相同，支持空值安全保护)
 */
export function deduplicateDataRows(rows, options = {}) {
  const {
    scope = "column",
    colIndex = 0,
    hasHeaderRow = true,
    ignoreEmpty = true, // 核心安全点：默认不对空值行盲目去重，保护缺失值数据！
  } = options;

  if (!rows || rows.length <= 1) return { newRows: rows, duplicateCount: 0 };

  const headerRow = hasHeaderRow ? rows[0] : null;
  const dataRows = hasHeaderRow ? rows.slice(1) : [...rows];

  const seen = new Set();
  const retainedRows = [];
  let duplicateCount = 0;

  dataRows.forEach((row) => {
    let key = "";
    if (scope === "column") {
      key = String(row[colIndex] ?? "").trim();
      // 如果依据列为空值且开启安全保护，不参与去重
      if (ignoreEmpty && key === "") {
        retainedRows.push(row);
        return;
      }
    } else {
      key = row.map((c) => String(c ?? "").trim()).join("|||__SEP__|||");
      if (ignoreEmpty && key === "") {
        retainedRows.push(row);
        return;
      }
    }

    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
      retainedRows.push(row);
    }
  });

  const newRows = headerRow ? [headerRow, ...retainedRows] : retainedRows;
  return { newRows, duplicateCount };
}

/* =========================================================================
   工作表与导出辅助 (Pure Sheet Generators)
   ========================================================================= */

/**
 * 生成带有文本格式保护的 SheetJS Worksheet
 */
export function createSafeWorksheet(data, textColIndices = new Set()) {
  const ws = {};
  const range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };

  for (let R = 0; R < data.length; ++R) {
    const row = data[R];
    if (!row) continue;
    for (let C = 0; C < row.length; ++C) {
      if (range.s.r > R) range.s.r = R;
      if (range.s.c > C) range.s.c = C;
      if (range.e.r < R) range.e.r = R;
      if (range.e.c < C) range.e.c = C;

      const cellVal = row[C];
      if (cellVal === null || cellVal === undefined) continue;

      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const isForceText = textColIndices.has(C);

      if (isForceText || typeof cellVal === "string") {
        const str = String(cellVal);
        ws[cellRef] = { t: "s", v: str, w: str };
      } else if (typeof cellVal === "number") {
        ws[cellRef] = { t: "n", v: cellVal };
      } else if (typeof cellVal === "boolean") {
        ws[cellRef] = { t: "b", v: cellVal };
      } else {
        const str = String(cellVal);
        ws[cellRef] = { t: "s", v: str, w: str };
      }
    }
  }

  if (range.s.c > range.e.c || range.s.r > range.e.r) {
    ws["!ref"] = "A1:A1";
  } else {
    ws["!ref"] = XLSX.utils.encode_range(range);
  }

  return ws;
}

/**
 * 导出 Excel 文件
 */
export function exportToXlsxFile(sheetDataMap, filename = "转换后数据.xlsx", textColIndicesMap = {}) {
  const wb = XLSX.utils.book_new();

  Object.keys(sheetDataMap).forEach((sheetName) => {
    const data = sheetDataMap[sheetName];
    const textCols = textColIndicesMap[sheetName] || new Set();
    const ws = createSafeWorksheet(data, textCols);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, filename);
}

/**
 * 导出 CSV 文件
 */
export function exportToCsvFile(data, filename = "数据导出.csv") {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 演示测试数据
 */
export function getSampleExcelData() {
  return [
    ["订单编号", "客户信息 (混杂文本)", "金额", "省份", "城市", "区县", "全角混入测试", "重复手机号标识"],
    ["202609240001", "收件人：张三，电话：13812345678，地址：北京市海淀区中关村南大街1号", 12500.5, "北京", "北京市", "海淀区", "电话：１３８１２３４５６７８，订单（加急）！", "13812345678"],
    ["202609240002", "李四 13987654321 邮箱: lisi@qq.com 身份证: 110101199003072345", 300.0, "广东", "深圳市", "南山区", "金额：３００。００元；状态：【已付款】", "13987654321"],
    ["202609240003", "王五 电话: 13700001111 地址: 杭州市西湖区", 88.0, "浙江", "杭州市", "西湖区", "客户留言：“请尽快发货”", "13812345678"],
    ["", "", "", "", "", "", "", ""],
    ["202609240005", "赵六 15899998888 身份证: 440301199511029876 金额: 100000001.02", 100000001.02, "四川", "成都市", "武侯区", "备注（全角括号）：【重要客户】", "15899998888"],
    ["202609240006", "孙七 18612345678 sunqi@example.com", 0.5, "上海", "上海市", "浦东新区", "全角数字：８８８８，标点：，。？！", "18612345678"],
  ];
}
