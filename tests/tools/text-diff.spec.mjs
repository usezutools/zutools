import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => { window.__copiedText = value; } },
    });
  });
  await page.route('**/*', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && request.method() === 'GET') return route.continue();
    if (['data:', 'blob:'].includes(url.protocol)) return route.continue();
    throw new Error(`Unexpected network request: ${request.method()} ${request.url()}`);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Complete catalogue', exact: true }).click();
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await page.getByLabel('Buscar una herramienta…').fill('comparador de textos');
  await page.getByRole('button', { name: 'Ver ficha: Comparador de textos' }).click();
});

test('compares, swaps, clears and respects native options', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Comparador de textos' })).toBeVisible();
  const original = page.getByLabel('Texto original');
  const revised = page.getByLabel('Texto nuevo');
  await expect(page.getByLabel('Comparar por')).toHaveValue('smart');
  await original.fill('Cabecera\nEl zorro rápido salta.\nCierre');
  await revised.fill('Cabecera\nEl zorro tranquilo salta.\nNuevo\nCierre');
  await expect(page.locator('.text-diff-input-stats').nth(0)).toHaveText('3 líneas · 36 caracteres');
  await expect(page.locator('.text-diff-input-stats').nth(1)).toHaveText('4 líneas · 44 caracteres');
  await page.getByRole('button', { name: 'Comparar textos' }).click();
  await expect(page.locator('.text-diff-code .delete').first()).toHaveText('rápido');
  await expect(page.locator('.text-diff-code .insert').first()).toHaveText('tranquilo');
  await expect(page.getByRole('button', { name: '2 adiciones' })).toBeVisible();
  const removalsBadge = page.getByRole('button', { name: '1 eliminaciones' });
  const removalsPopover = removalsBadge.locator('..').locator('.text-diff-stat-popover');
  await expect(removalsBadge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(removalsPopover).not.toBeVisible();
  await removalsBadge.hover();
  await expect(removalsBadge).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(removalsPopover).toBeVisible();
  await expect(removalsPopover).toContainText('36');
  await expect(removalsPopover).toContainText('−16.7% 6');
  await page.getByRole('checkbox', { name: 'Ajustar líneas' }).hover();
  await expect(removalsPopover).not.toBeVisible();
  const additionsBadge = page.getByRole('button', { name: '2 adiciones' });
  const additionsPopover = additionsBadge.locator('..').locator('.text-diff-stat-popover');
  await additionsBadge.hover();
  await expect(additionsPopover).toBeVisible();
  await expect(removalsPopover).not.toBeVisible();
  await expect(additionsPopover).toContainText('44');
  await expect(additionsPopover).toContainText('+31.8% 14');
  await page.getByRole('checkbox', { name: 'Ajustar líneas' }).hover();
  await expect(additionsPopover).not.toBeVisible();
  await expect(page.locator('.text-diff-line-number').filter({ hasText: /^4$/ })).toBeVisible();
  await expect(page.getByText('Cambio 1 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Cambio siguiente' }).click();
  await expect(page.getByText('Cambio 2 de 2')).toBeVisible();
  await expect(page.locator('[data-change-index="1"]')).toHaveClass(/active-change/);

  await page.getByRole('button', { name: 'Unificada' }).click();
  await expect(page.locator('.text-diff-code.unified')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Ocultar líneas sin cambios' }).check();
  await expect(page.locator('.text-diff-unified-row')).toHaveCount(2);
  await page.getByRole('checkbox', { name: 'Ajustar líneas' }).uncheck();
  await expect(page.locator('.text-diff-result')).toHaveClass(/no-wrap/);

  await expect(page.locator('.text-diff-editor').first().evaluate((element) => getComputedStyle(element).transitionProperty)).resolves.toContain('transform');
  await page.getByRole('button', { name: 'Intercambiar' }).click();
  await expect(original).toHaveValue('Cabecera\nEl zorro tranquilo salta.\nNuevo\nCierre');
  await expect(revised).toHaveValue('Cabecera\nEl zorro rápido salta.\nCierre');

  await original.fill('Hola');
  await revised.fill('hola');
  await page.getByRole('checkbox', { name: 'Ignorar mayúsculas' }).check();
  await page.getByRole('button', { name: 'Comparar textos' }).click();
  await expect(page.getByText('Los textos son iguales con estas opciones.')).toBeVisible();

  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await expect(original).toHaveValue('');
  await expect(revised).toHaveValue('');
  await expect(page.locator('.text-diff-editor').first().evaluate((element) => element.getBoundingClientRect().height <= 260)).resolves.toBe(true);
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
});

test('navigates changes and applies either side to the opposite text', async ({ page }) => {
  const original = page.getByLabel('Texto original');
  const revised = page.getByLabel('Texto nuevo');
  await original.fill('uno\noriginal\ntres');
  await revised.fill('uno\nnuevo\ntres\nextra');
  await page.getByRole('button', { name: 'Comparar textos' }).click();

  await expect(page.getByText('Cambio 1 de 2')).toBeVisible();
  await expect(page.locator('[data-change-index="0"]')).toHaveClass(/active-change/);
  await page.getByRole('button', { name: 'Cambio siguiente' }).click();
  await expect(page.getByText('Cambio 2 de 2')).toBeVisible();
  await expect(page.locator('[data-change-index="1"]')).toHaveClass(/active-change/);

  await page.getByRole('button', { name: 'Usar original' }).click();
  await expect(revised).toHaveValue('uno\nnuevo\ntres');
  await expect(page.getByText('Cambio 1 de 1')).toBeVisible();

  await page.getByRole('button', { name: 'Usar nuevo' }).click();
  await expect(original).toHaveValue('uno\nnuevo\ntres');
  await expect(page.getByText('Los textos son iguales con estas opciones.')).toBeVisible();
  await expect(page.getByText('Diferencias', { exact: true })).toHaveCount(0);
  await expect(page.locator('.text-diff-summary')).toHaveCount(0);
  await expect(page.locator('.text-diff-change-nav')).toHaveCount(0);
});

test('centres the exact active row when navigating a long diff', async ({ page }) => {
  const originalLines = Array.from({ length: 45 }, (_, index) => `línea ${index + 1}`);
  const revisedLines = [...originalLines];
  revisedLines[2] = 'cambio tres';
  revisedLines[14] = 'cambio quince';
  revisedLines[26] = 'cambio veintisiete';
  revisedLines[38] = 'cambio treinta y nueve';
  await page.getByLabel('Texto original').fill(originalLines.join('\n'));
  await page.getByLabel('Texto nuevo').fill(revisedLines.join('\n'));
  await page.getByRole('button', { name: 'Comparar textos' }).click();

  await expect(page.getByText('Cambio 1 de 4')).toBeVisible();
  for (const expectedIndex of [1, 2]) {
    const target = page.locator(`[data-change-index="${expectedIndex}"]`);
    const geometryBeforeSelection = await target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width, height: rect.height };
    });
    await page.getByRole('button', { name: 'Cambio siguiente' }).click();
    await expect(page.getByText(`Cambio ${expectedIndex + 1} de 4`)).toBeVisible();
    await expect(page.locator('.text-diff-code .active-change')).toHaveCount(1);
    await expect(target).toHaveClass(/active-change/);
    await expect(target).toHaveAttribute('data-change-index', String(expectedIndex));
    await expect.poll(async () => target.evaluate((element) => {
      const container = element.closest('.text-diff-code');
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return Math.abs((elementRect.top + elementRect.height / 2) - (containerRect.top + containerRect.height / 2));
    })).toBeLessThan(30);
    const geometryAfterSelection = await target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width, height: rect.height };
    });
    expect(geometryAfterSelection.x).toBeCloseTo(geometryBeforeSelection.x, 2);
    expect(geometryAfterSelection.width).toBeCloseTo(geometryBeforeSelection.width, 2);
    expect(geometryAfterSelection.height).toBeCloseTo(geometryBeforeSelection.height, 2);
  }

  await page.getByRole('button', { name: 'Cambio anterior' }).click();
  await expect(page.getByText('Cambio 2 de 4')).toBeVisible();
  await expect(page.locator('[data-change-index="1"]')).toHaveClass(/active-change/);
  await expect(page.locator('.text-diff-code .active-change')).toHaveCount(1);
  await expect.poll(async () => page.locator('[data-change-index="1"]').evaluate((element) => {
    const container = element.closest('.text-diff-code');
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return Math.abs((elementRect.top + elementRect.height / 2) - (containerRect.top + containerRect.height / 2));
  })).toBeLessThan(30);
});

test('loads local files and compares in real time without network', async ({ page }) => {
  const original = page.getByLabel('Texto original');
  const revised = page.getByLabel('Texto nuevo');
  const fileInputs = page.locator('.file-action input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: 'original.txt', mimeType: 'text/plain', buffer: Buffer.from('uno\ndos') });
  await fileInputs.nth(1).setInputFiles({ name: 'nuevo.txt', mimeType: 'text/plain', buffer: Buffer.from('uno\ntres') });
  await expect(original).toHaveValue('uno\ndos');
  await expect(revised).toHaveValue('uno\ntres');
  await page.locator('.text-diff-editor-actions button').first().click();
  await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible();
  await expect(page.evaluate(() => window.__copiedText)).resolves.toBe('uno\ndos');

  await page.getByRole('checkbox', { name: 'Comparar en tiempo real' }).check();
  await expect(page.locator('.text-diff-code .delete')).toHaveText('dos');
  await expect(page.locator('.text-diff-code .insert')).toHaveText('tres');
  await revised.fill('uno\ndos');
  await expect(page.getByText('Los textos son iguales con estas opciones.')).toBeVisible();
});

test('rejects text files larger than 5 MB before reading them', async ({ page }) => {
  const original = page.getByLabel('Texto original');
  await original.fill('contenido anterior');

  await page.locator('.file-action input[type="file"]').first().setInputFiles({
    name: 'demasiado-grande.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc((5 * 1024 * 1024) + 1, 97),
  });

  await expect(page.getByRole('alert')).toHaveText('El archivo supera el límite de 5 MB.');
  await expect(original).toHaveValue('contenido anterior');
  await expect(page.getByText('Cargando…')).toHaveCount(0);
});

test('keeps textarea lines aligned with their gutter numbers while scrolling', async ({ page }) => {
  const original = page.getByLabel('Texto original');
  await original.fill(Array.from({ length: 231 }, (_, index) => `línea ${index + 1}`).join('\n'));

  const alignment = await original.evaluate((textarea) => {
    const container = textarea.closest('.text-diff-input-code');
    const gutter = container.querySelector('.text-diff-input-gutter');
    const numbers = [...gutter.querySelectorAll('i')];
    const textareaStyle = getComputedStyle(textarea);
    const numberStyle = getComputedStyle(numbers[0]);
    textarea.scrollTop = 73.5;
    textarea.dispatchEvent(new Event('scroll'));
    const number100 = numbers[99].getBoundingClientRect();
    const expectedTop = textarea.getBoundingClientRect().top
      + parseFloat(textareaStyle.paddingTop)
      - textarea.scrollTop
      + (99 * parseFloat(textareaStyle.lineHeight));
    return {
      textareaLineHeight: parseFloat(textareaStyle.lineHeight),
      numberLineHeight: parseFloat(numberStyle.lineHeight),
      numberHeight: number100.height,
      positionDifference: Math.abs(number100.top - expectedTop),
    };
  });

  expect(alignment.numberLineHeight).toBeCloseTo(alignment.textareaLineHeight, 4);
  expect(alignment.numberHeight).toBeCloseTo(alignment.textareaLineHeight, 2);
  expect(alignment.positionDifference).toBeLessThan(0.6);
});

test('keeps both line-number gutters and line backgrounds visible during horizontal scrolling', async ({ page }) => {
  const longValue = 'x'.repeat(600);
  await page.getByLabel('Texto original').fill(`antes ${longValue}`);
  await page.getByLabel('Texto nuevo').fill(`después ${longValue}`);
  await page.getByRole('button', { name: 'Comparar textos' }).click();
  const wrapLines = page.getByRole('checkbox', { name: 'Ajustar líneas' });
  await wrapLines.click();
  await expect(wrapLines).not.toBeChecked();

  const code = page.locator('.text-diff-code.split-panes');
  const firstPane = code.locator('.text-diff-pane').first();
  await firstPane.evaluate((element) => { element.scrollLeft = 300; });
  const geometry = await code.evaluate((element) => {
    const panes = [...element.querySelectorAll('.text-diff-pane')];
    const numbers = panes.map((pane) => pane.querySelector('.text-diff-line-number').getBoundingClientRect());
    const paneRects = panes.map((pane) => pane.getBoundingClientRect());
    const lineCanvases = panes.map((pane) => pane.querySelector('.text-diff-pane-lines').getBoundingClientRect());
    return {
      numberOffsets: numbers.map((number, index) => number.left - paneRects[index].left),
      backgroundsCoverContent: lineCanvases.every((canvas, index) => canvas.width >= panes[index].scrollWidth - 1),
      scrollPositions: panes.map((pane) => pane.scrollLeft),
    };
  });

  expect(geometry.numberOffsets[0]).toBeCloseTo(0, 1);
  expect(geometry.numberOffsets[1]).toBeLessThanOrEqual(1.1);
  expect(geometry.backgroundsCoverContent).toBe(true);
  expect(geometry.scrollPositions[1]).toBeCloseTo(geometry.scrollPositions[0], 1);

  await page.getByRole('button', { name: 'Unificada' }).click();
  const unified = page.locator('.text-diff-code.unified');
  await unified.evaluate((element) => { element.scrollLeft = 300; });
  const unifiedGeometry = await unified.evaluate((element) => ({
    canvasWidth: element.firstElementChild.getBoundingClientRect().width,
    scrollWidth: element.scrollWidth,
    numberOffset: element.querySelector('.text-diff-line-number').getBoundingClientRect().left - element.getBoundingClientRect().left,
  }));
  expect(unifiedGeometry.canvasWidth).toBeGreaterThanOrEqual(unifiedGeometry.scrollWidth - 1);
  expect(unifiedGeometry.numberOffset).toBeCloseTo(0, 1);

  await page.getByRole('checkbox', { name: 'Ajustar líneas' }).check();
  const wrappedUnified = page.locator('.text-diff-code.unified');
  await expect.poll(() => wrappedUnified.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    overflow: element.scrollWidth - element.clientWidth,
  }))).toEqual({ scrollLeft: 0, overflow: 0 });

  await page.getByRole('button', { name: 'Dividida' }).click();
  const wrappedSplit = page.locator('.text-diff-code.split:not(.split-panes)');
  await expect.poll(() => wrappedSplit.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    overflow: element.scrollWidth - element.clientWidth,
  }))).toEqual({ scrollLeft: 0, overflow: 0 });
  const wrappedSplitGutters = await wrappedSplit.evaluate((element) => {
    const container = element.getBoundingClientRect();
    const row = element.querySelector('.text-diff-split-row');
    const numbers = [...row.querySelectorAll('.text-diff-line-number')].map((number) => number.getBoundingClientRect());
    return numbers.map((number) => number.left - container.left);
  });
  expect(wrappedSplitGutters[0]).toBeCloseTo(0, 1);
  const wrappedSplitCentre = await wrappedSplit.evaluate((element) => element.clientWidth / 2);
  expect(Math.abs(wrappedSplitGutters[1] - wrappedSplitCentre)).toBeLessThanOrEqual(1.1);
});
