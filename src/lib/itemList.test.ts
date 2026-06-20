import { describe, expect, it } from 'vitest';
import { itemListJsonLd } from './itemList';

describe('itemListJsonLd', () => {
  const sample = [
    { name: '探究者', url: 'https://example.com/type/investigator/' },
    { name: '革新者', url: 'https://example.com/type/pioneer/' },
    { name: '表現者', url: 'https://example.com/type/creator/' },
  ];

  it('@context と @type が schema.org の ItemList になる', () => {
    const ld = itemListJsonLd(sample);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('ItemList');
  });

  it('numberOfItems は要素数と必ず一致する', () => {
    expect(itemListJsonLd(sample).numberOfItems).toBe(3);
    expect(itemListJsonLd([]).numberOfItems).toBe(0);
  });

  it('各項目が position(1始まり)+name+url を持つ ListItem になり順序を保つ', () => {
    const ld = itemListJsonLd(sample);
    expect(ld.itemListElement).toHaveLength(3);
    ld.itemListElement.forEach((el, i) => {
      expect(el['@type']).toBe('ListItem');
      expect(el.position).toBe(i + 1);
      expect(el.name).toBe(sample[i].name);
      expect(el.url).toBe(sample[i].url);
    });
  });

  it('空配列なら itemListElement も空', () => {
    const ld = itemListJsonLd([]);
    expect(ld.itemListElement).toEqual([]);
    expect(ld.numberOfItems).toBe(0);
  });

  it('position は重複せず連番になる', () => {
    const ld = itemListJsonLd(sample);
    const positions = ld.itemListElement.map((el) => el.position);
    expect(positions).toEqual([1, 2, 3]);
    expect(new Set(positions).size).toBe(positions.length);
  });
});
