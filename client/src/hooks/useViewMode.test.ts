import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useViewMode } from './useViewMode';

const STORAGE_KEY = 'webshop.productViewMode.v1';

describe('useViewMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to cards when nothing is stored', () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current[0]).toBe('cards');
  });

  it('reads a previously stored mode on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'list');
    const { result } = renderHook(() => useViewMode());
    expect(result.current[0]).toBe('list');
  });

  it('falls back to cards for a garbage stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'grid-of-doom');
    const { result } = renderHook(() => useViewMode());
    expect(result.current[0]).toBe('cards');
  });

  it('updates state and persists the new mode', () => {
    const { result } = renderHook(() => useViewMode());

    act(() => {
      result.current[1]('list');
    });

    expect(result.current[0]).toBe('list');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('list');
  });

  it('persists across remounts', () => {
    const first = renderHook(() => useViewMode());
    act(() => {
      first.result.current[1]('list');
    });

    const second = renderHook(() => useViewMode());
    expect(second.result.current[0]).toBe('list');
  });
});
