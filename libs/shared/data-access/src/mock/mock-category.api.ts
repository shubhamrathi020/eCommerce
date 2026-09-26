import { Injectable } from '@angular/core';
import type { Category, CategoryNode } from '@ecom/shared/models';
import { CategoryApi } from '../lib/category.api';
import { createMockResponder } from './mock-latency';
import categories from './data/categories.json';

function buildTree(flat: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: CategoryNode[]): CategoryNode[] => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((n) => sort(n.children));
    return list;
  };
  return sort(roots);
}

@Injectable()
export class MockCategoryApi extends CategoryApi {
  private readonly respond = createMockResponder();

  tree() {
    return this.respond.ok(() => buildTree(categories as Category[]));
  }
}
