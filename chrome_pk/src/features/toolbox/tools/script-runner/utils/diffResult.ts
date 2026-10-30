import { DiffNode, DiffNodeType } from '../types';

/**
 * G-07: 比較兩個 JSON 值，產生差異樹狀結構
 */
export function diffJsonResult(prev: any, curr: any, key = 'root'): DiffNode[] {
  return diffValues(prev, curr, key);
}

function diffValues(prev: any, curr: any, key: string): DiffNode[] {
  const nodes: DiffNode[] = [];

  if (prev === undefined && curr !== undefined) {
    nodes.push({ key, type: 'added', curr });
    return nodes;
  }
  if (prev !== undefined && curr === undefined) {
    nodes.push({ key, type: 'removed', prev });
    return nodes;
  }

  const prevType = getType(prev);
  const currType = getType(curr);

  if (prevType !== currType) {
    nodes.push({ key, type: 'changed', prev, curr });
    return nodes;
  }

  if (prevType === 'object' && currType === 'object') {
    const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
    const children: DiffNode[] = [];
    let hasChange = false;

    for (const k of allKeys) {
      const childDiff = diffValues(prev?.[k], curr?.[k], k);
      children.push(...childDiff);
      if (childDiff.some((n) => n.type !== 'unchanged')) hasChange = true;
    }

    nodes.push({ key, type: hasChange ? 'changed' : 'unchanged', prev, curr, children });
    return nodes;
  }

  if (prevType === 'array' && currType === 'array') {
    const len = Math.max(prev.length, curr.length);
    const children: DiffNode[] = [];
    let hasChange = false;

    for (let i = 0; i < len; i++) {
      const childDiff = diffValues(prev[i], curr[i], `[${i}]`);
      children.push(...childDiff);
      if (childDiff.some((n) => n.type !== 'unchanged')) hasChange = true;
    }

    nodes.push({ key, type: hasChange ? 'changed' : 'unchanged', prev, curr, children });
    return nodes;
  }

  // 純量比較
  const type: DiffNodeType = prev === curr ? 'unchanged' : 'changed';
  nodes.push({ key, type, prev, curr });
  return nodes;
}

function getType(val: any): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

/**
 * 將差異樹攤平為可渲染的列表（含層級深度）
 */
export interface FlatDiffRow {
  depth: number;
  key: string;
  type: DiffNodeType;
  prev?: any;
  curr?: any;
  hasChildren: boolean;
}

export function flattenDiff(nodes: DiffNode[], depth = 0): FlatDiffRow[] {
  const rows: FlatDiffRow[] = [];
  for (const node of nodes) {
    rows.push({
      depth,
      key: node.key,
      type: node.type,
      prev: node.prev,
      curr: node.curr,
      hasChildren: !!(node.children && node.children.length > 0),
    });
    if (node.children) {
      rows.push(...flattenDiff(node.children, depth + 1));
    }
  }
  return rows;
}

