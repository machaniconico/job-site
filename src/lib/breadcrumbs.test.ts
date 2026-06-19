import { describe, expect, it } from 'vitest';
import { breadcrumbListJsonLd } from './breadcrumbs';

describe('breadcrumbListJsonLd', () => {
  it('@context と @type が schema.org の BreadcrumbList になる', () => {
    const ld = breadcrumbListJsonLd([
      { name: 'ホーム', url: 'https://example.com/' },
    ]);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('BreadcrumbList');
  });

  it('position は 1 始まりで配列順を保つ', () => {
    const ld = breadcrumbListJsonLd([
      { name: 'ホーム', url: 'https://example.com/' },
      { name: 'タイプ一覧', url: 'https://example.com/types/' },
      { name: '探究家', url: 'https://example.com/type/explorer/' },
    ]);
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement.map((e) => e.name)).toEqual([
      'ホーム',
      'タイプ一覧',
      '探究家',
    ]);
  });

  it('各要素が ListItem 型で name と item(URL) を持つ', () => {
    const ld = breadcrumbListJsonLd([
      { name: 'ホーム', url: 'https://example.com/' },
      { name: '仕事一覧', url: 'https://example.com/jobs/' },
    ]);
    for (const entry of ld.itemListElement) {
      expect(entry['@type']).toBe('ListItem');
      expect(typeof entry.name).toBe('string');
      expect(entry.item).toMatch(/^https:\/\//);
    }
    expect(ld.itemListElement[1].item).toBe('https://example.com/jobs/');
  });

  it('空配列なら itemListElement も空', () => {
    const ld = breadcrumbListJsonLd([]);
    expect(ld.itemListElement).toEqual([]);
  });
});
