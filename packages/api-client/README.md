# @mypokies/api-client

Type-safe API client library for MyPokies platform applications. Provides typed API client functions for consistent communication between apps and backend services.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/api-client": "workspace:*"
  }
}
```

## Usage

This package provides a foundation for building type-safe API clients:

```typescript
import { API_CLIENT_VERSION } from '@mypokies/api-client'

console.log(`Using API Client version: ${API_CLIENT_VERSION}`)
```

## API Documentation

### Exports

- `API_CLIENT_VERSION` - Current version of the API client package

## Configuration

No configuration required. API client functions will be added as needed.

## Development

### Build the package

```bash
npm run build
```

### Watch mode (for development)

```bash
npm run dev
```

### Type checking

```bash
npm run type-check
```

## Architecture

This package serves as a centralized location for:
- Typed API client functions
- Request/response type definitions
- API error handling utilities
- Shared HTTP client configuration

## Dependencies

- `@mypokies/types` - Shared TypeScript types
