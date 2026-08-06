import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useHashProductId } from './useHashProductId';

function setHash(hash: string) {
  window.history.replaceState(null, '', hash === '' ? '/' : `/${hash}`);
}

describe('useHashProductId', () => {
  afterEach(() => {
    setHash('');
  });

  it('reads the selected id from the initial hash, so a reload reopens the dialog', () => {
    setHash('#product=5');

    const { result } = renderHook(() => useHashProductId());

    expect(result.current[0]).toBe('5');
  });

  it('reports no selection when there is no hash', () => {
    const { result } = renderHook(() => useHashProductId());

    expect(result.current[0]).toBeNull();
  });

  it.each(['#product=', '#other=1'])('treats %s as no selection', (hash) => {
    setHash(hash);

    const { result } = renderHook(() => useHashProductId());

    expect(result.current[0]).toBeNull();
  });

  it('treats an id past the catalog max length as no selection', () => {
    setHash(`#product=${'a'.repeat(51)}`);

    const { result } = renderHook(() => useHashProductId());

    expect(result.current[0]).toBeNull();
  });

  it('accepts an id at exactly the catalog max length', () => {
    const id = 'a'.repeat(50);
    setHash(`#product=${id}`);

    const { result } = renderHook(() => useHashProductId());

    expect(result.current[0]).toBe(id);
  });

  it('writes the selection into the hash', () => {
    const { result } = renderHook(() => useHashProductId());

    act(() => result.current[1]('7'));

    expect(window.location.hash).toBe('#product=7');
    expect(result.current[0]).toBe('7');
  });

  it('clears the hash without leaving a bare marker behind', () => {
    setHash('#product=7');
    const { result } = renderHook(() => useHashProductId());

    act(() => result.current[1](null));

    expect(window.location.hash).toBe('');
    expect(result.current[0]).toBeNull();
  });

  it('follows a hash change from browser navigation', () => {
    const { result } = renderHook(() => useHashProductId());

    act(() => {
      setHash('#product=9');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(result.current[0]).toBe('9');
  });
});
