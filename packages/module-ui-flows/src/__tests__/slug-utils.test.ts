import { describe, it, expect } from 'vitest';
import {
  HOME_PAGE_SENTINEL,
  normalizePageSlug,
  normalizeFlowSlug,
  pageSlugToUrlSegment,
  urlSegmentToPageSlug,
} from '../slug-utils';

describe('slug-utils', () => {
  describe('HOME_PAGE_SENTINEL', () => {
    it('equals "_home"', () => {
      expect(HOME_PAGE_SENTINEL).toBe('_home');
    });
  });

  describe('normalizePageSlug', () => {
    it('returns empty string for null', () => {
      expect(normalizePageSlug(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizePageSlug(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(normalizePageSlug('')).toBe('');
    });

    it('strips leading slashes', () => {
      expect(normalizePageSlug('/about')).toBe('about');
    });

    it('strips trailing slashes', () => {
      expect(normalizePageSlug('about/')).toBe('about');
    });

    it('strips both leading and trailing slashes', () => {
      expect(normalizePageSlug('/about/')).toBe('about');
    });

    it('collapses double slashes', () => {
      expect(normalizePageSlug('section//page')).toBe('section/page');
    });

    it('collapses triple slashes', () => {
      expect(normalizePageSlug('a///b')).toBe('a/b');
    });

    it('converts HOME_PAGE_SENTINEL to empty string', () => {
      expect(normalizePageSlug('_home')).toBe('');
    });

    it('preserves normal slugs', () => {
      expect(normalizePageSlug('about')).toBe('about');
      expect(normalizePageSlug('section/page')).toBe('section/page');
    });

    it('handles deeply nested paths', () => {
      expect(normalizePageSlug('/a/b/c/d/')).toBe('a/b/c/d');
    });

    it('handles multiple leading slashes', () => {
      expect(normalizePageSlug('///page')).toBe('page');
    });
  });

  describe('pageSlugToUrlSegment', () => {
    it('converts empty string to HOME_PAGE_SENTINEL', () => {
      expect(pageSlugToUrlSegment('')).toBe('_home');
    });

    it('converts null-like home slug to sentinel', () => {
      expect(pageSlugToUrlSegment('_home')).toBe('_home');
    });

    it('passes through non-empty slugs', () => {
      expect(pageSlugToUrlSegment('about')).toBe('about');
      expect(pageSlugToUrlSegment('section/page')).toBe('section/page');
    });

    it('normalizes before converting', () => {
      expect(pageSlugToUrlSegment('/about/')).toBe('about');
    });
  });

  describe('urlSegmentToPageSlug', () => {
    it('converts HOME_PAGE_SENTINEL to empty string', () => {
      expect(urlSegmentToPageSlug('_home')).toBe('');
    });

    it('passes through non-sentinel segments', () => {
      expect(urlSegmentToPageSlug('about')).toBe('about');
    });

    it('normalizes the segment', () => {
      expect(urlSegmentToPageSlug('/about/')).toBe('about');
    });

    it('roundtrips with pageSlugToUrlSegment for home', () => {
      const segment = pageSlugToUrlSegment('');
      expect(urlSegmentToPageSlug(segment)).toBe('');
    });

    it('roundtrips with pageSlugToUrlSegment for regular slug', () => {
      const segment = pageSlugToUrlSegment('contact');
      expect(urlSegmentToPageSlug(segment)).toBe('contact');
    });
  });

  describe('normalizeFlowSlug', () => {
    it('strips leading slashes', () => {
      expect(normalizeFlowSlug('/my-flow')).toBe('my-flow');
    });

    it('strips trailing slashes', () => {
      expect(normalizeFlowSlug('my-flow/')).toBe('my-flow');
    });

    it('collapses double slashes', () => {
      expect(normalizeFlowSlug('my//flow')).toBe('my/flow');
    });

    it('preserves normal flow slugs', () => {
      expect(normalizeFlowSlug('landing-page')).toBe('landing-page');
    });

    it('does not convert _home sentinel (flow slugs are not page slugs)', () => {
      expect(normalizeFlowSlug('_home')).toBe('_home');
    });
  });
});
