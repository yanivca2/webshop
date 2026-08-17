import { onlineManager } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductDetailDialog from './ProductDetailDialog';
import {
  jsonResponse,
  renderWithProviders,
  testProduct,
  type ProvidersRenderResult,
} from '../test/renderWithProviders';

function stubProduct(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(jsonResponse(testProduct))),
  );
}

function stubProductThatNeverAnswers(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
}

function renderDialog(): ProvidersRenderResult {
  return renderWithProviders(<ProductDetailDialog productId={testProduct.id} onClose={vi.fn()} />);
}

describe('ProductDetailDialog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Hand the connection back: onlineManager is a module-level singleton, so
    // an override set here would outlive this file.
    onlineManager.setOnline(true);
  });

  it('names the dialog before the product arrives', async () => {
    // Arrange
    stubProductThatNeverAnswers();

    // Act
    renderDialog();

    // Assert - the title it is normally named by has not rendered yet, so
    // without a fallback the dialog would be announced with no name at all.
    expect(await screen.findByRole('dialog', { name: 'Product details' })).toBeInTheDocument();
  });

  it('takes its name from the product once it arrives', async () => {
    // Arrange
    stubProduct();

    // Act
    renderDialog();

    // Assert
    expect(await screen.findByRole('dialog', { name: testProduct.name })).toBeInTheDocument();
  });

  it('says the connection is gone rather than loading forever', async () => {
    // Arrange - offline, where TanStack Query parks the request instead of
    // failing it, so the dialog is neither pending-with-an-answer nor errored.
    onlineManager.setOnline(false);
    stubProductThatNeverAnswers();

    // Act
    renderDialog();

    // Assert
    expect(await screen.findByText('You are offline')).toBeInTheDocument();
    expect(screen.queryByText('Loading product...')).not.toBeInTheDocument();
  });
});
