import {
  ShapeShadingFixedConfigSchema,
  parseWidgetConfig,
} from './widget-config.schema';

describe('ShapeShadingFixedConfigSchema', () => {
  const valid = {
    configVersion: 2 as const,
    mode: 'fixed' as const,
    shape: { kind: 'bar' as const, regions: 4 },
    targetNumerator: 2,
    requireContiguous: false,
  };

  it("accepts a target within the shape's region count", () => {
    expect(() => ShapeShadingFixedConfigSchema.parse(valid)).not.toThrow();
  });

  it('accepts a target equal to the region count (shade everything)', () => {
    expect(() =>
      ShapeShadingFixedConfigSchema.parse({ ...valid, targetNumerator: 4 }),
    ).not.toThrow();
  });

  it('accepts a target of zero (shade nothing)', () => {
    expect(() =>
      ShapeShadingFixedConfigSchema.parse({ ...valid, targetNumerator: 0 }),
    ).not.toThrow();
  });

  it('rejects a target greater than the region count — this was the unbounded gap', () => {
    expect(() =>
      ShapeShadingFixedConfigSchema.parse({ ...valid, targetNumerator: 8 }),
    ).toThrow(/targetNumerator/);
  });

  it('rejects the same over-target on a polygon shape', () => {
    expect(() =>
      ShapeShadingFixedConfigSchema.parse({
        ...valid,
        shape: { kind: 'polygon', regions: 6 },
        targetNumerator: 7,
      }),
    ).toThrow(/targetNumerator/);
  });

  it('rejects a region count below the per-kind minimum (bar < 2, polygon < 3)', () => {
    expect(() =>
      ShapeShadingFixedConfigSchema.parse({
        ...valid,
        shape: { kind: 'polygon', regions: 2 },
      }),
    ).toThrow();
  });
});

describe('parseWidgetConfig — SHAPE_SHADING', () => {
  it('routes a valid v2 fixed config to the SHAPE_SHADING branch', () => {
    const result = parseWidgetConfig('SHAPE_SHADING', {
      configVersion: 2,
      mode: 'fixed',
      shape: { kind: 'bar', regions: 4 },
      targetNumerator: 2,
      requireContiguous: false,
    });
    expect(result.version).toBe(2);
    if (
      result.version === 2 &&
      'config' in result &&
      result.widgetType === 'SHAPE_SHADING'
    ) {
      expect(result.config.targetNumerator).toBe(2);
    } else {
      throw new Error('expected a parsed v2 SHAPE_SHADING config');
    }
  });

  it('throws when the out-of-range config reaches the parser (authoring-time validation gate)', () => {
    expect(() =>
      parseWidgetConfig('SHAPE_SHADING', {
        configVersion: 2,
        mode: 'fixed',
        shape: { kind: 'bar', regions: 4 },
        targetNumerator: 9,
        requireContiguous: false,
      }),
    ).toThrow();
  });

  it('treats an unversioned config as v1 passthrough, unvalidated', () => {
    const result = parseWidgetConfig('SHAPE_SHADING', {
      shape: { kind: 'bar', regions: 4 },
    });
    expect(result.version).toBe(1);
  });
});
