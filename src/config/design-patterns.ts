export type DesignPattern = 'default' | 'aegov'

export interface DesignPatternDefinition {
  id: DesignPattern
  labelKey: string
  dataAttribute: string
}

export const DESIGN_PATTERNS: DesignPatternDefinition[] = [
  { id: 'default', labelKey: 'default', dataAttribute: 'default' },
  { id: 'aegov', labelKey: 'aegov', dataAttribute: 'aegov' },
]

export const DEFAULT_DESIGN_PATTERN: DesignPattern = 'default'

export function isDesignPattern(value: string): value is DesignPattern {
  return DESIGN_PATTERNS.some((pattern) => pattern.id === value)
}
