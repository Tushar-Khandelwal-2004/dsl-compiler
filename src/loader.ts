import { ComponentSchema, RawSchema } from './types';

export function loadSchema(schema: RawSchema): Map<string, ComponentSchema> {
  const componentMap = new Map<string, ComponentSchema>();

  if (!schema || !Array.isArray(schema.components)) {
    return componentMap;
  }

  // Loop through each component in the JSON and add it to our dictionary
  for (const comp of schema.components) {
    if (comp.component) {
      componentMap.set(comp.component, comp);
    }
  }

  return componentMap;
}