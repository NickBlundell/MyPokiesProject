import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('btn', 'btn-primary')
    expect(result).toBe('btn btn-primary')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('btn', isActive && 'active')
    expect(result).toBe('btn active')
  })

  it('should handle falsy values', () => {
    const result = cn('btn', false, null, undefined, 'btn-primary')
    expect(result).toBe('btn btn-primary')
  })

  it('should merge tailwind classes correctly', () => {
    // twMerge should remove conflicting classes
    const result = cn('p-4', 'p-8')
    expect(result).toBe('p-8')
  })

  it('should handle array inputs', () => {
    const result = cn(['btn', 'btn-primary'], 'active')
    expect(result).toBe('btn btn-primary active')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle object inputs with conditional values', () => {
    const result = cn({
      btn: true,
      'btn-primary': true,
      disabled: false,
    })
    expect(result).toBe('btn btn-primary')
  })
})
