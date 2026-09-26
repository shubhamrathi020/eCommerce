import { TestBed } from '@angular/core/testing';
import { CompareStore, RecentlyViewedStore, WishlistStore } from './shopper-stores';

describe('shopper stores', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('recently viewed keeps newest first, de-duplicates and caps at 12', () => {
    const store = TestBed.inject(RecentlyViewedStore);
    for (let i = 1; i <= 14; i++) store.add(`p${i}`);
    store.add('p5');
    expect(store.ids()[0]).toBe('p5');
    expect(store.ids()).toHaveLength(12);
    expect(new Set(store.ids()).size).toBe(12);
  });

  it('compare caps at four and reports when full', () => {
    const store = TestBed.inject(CompareStore);
    expect(['a', 'b', 'c', 'd'].every((id) => store.add(id))).toBe(true);
    expect(store.add('e')).toBe(false);
    expect(store.add('a')).toBe(true);
    store.remove('a');
    expect(store.count()).toBe(3);
    expect(store.add('e')).toBe(true);
  });

  it('wishlist toggles and persists across instances', () => {
    const first = TestBed.inject(WishlistStore);
    expect(first.toggle('p1')).toBe(true);
    expect(first.has('p1')).toBe(true);
    TestBed.resetTestingModule();
    expect(TestBed.inject(WishlistStore).has('p1')).toBe(true);
    expect(TestBed.inject(WishlistStore).toggle('p1')).toBe(false);
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem('ecom.wishlist.v1', '{not json');
    expect(TestBed.inject(WishlistStore).ids()).toEqual([]);
  });
});
