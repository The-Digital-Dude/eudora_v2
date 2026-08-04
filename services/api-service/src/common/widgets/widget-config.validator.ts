import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { parseWidgetConfig } from './widget-config.schema';

function tryParse(widgetType: unknown, value: unknown): string | null {
  try {
    parseWidgetConfig(typeof widgetType === 'string' ? widgetType : null, value);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'invalid widgetConfig';
  }
}

// No-op for anything that isn't a `configVersion: 2` envelope — today's
// unversioned/legacy widgetConfig shapes are never validated, so existing
// authored questions can never fail this check. Only new v2 configs get
// Zod-checked against the schema for their widgetType.
export function IsValidWidgetConfig(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidWidgetConfig',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) {
            return true;
          }
          if (
            typeof value !== 'object' ||
            (value as Record<string, unknown>).configVersion !== 2
          ) {
            return true;
          }
          const widgetType = (args.object as Record<string, unknown>).widgetType;
          return tryParse(widgetType, value) === null;
        },
        defaultMessage(args: ValidationArguments) {
          const widgetType = (args.object as Record<string, unknown>).widgetType;
          const message = tryParse(widgetType, args.value);
          return `widgetConfig is invalid for widgetType "${String(widgetType)}": ${message}`;
        },
      },
    });
  };
}
