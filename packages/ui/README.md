# @mypokies/ui

Shared React UI component library for MyPokies platform. Built with Radix UI primitives, Tailwind CSS, and TypeScript for consistent design across applications.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/ui": "workspace:*"
  }
}
```

## Usage

### Import Components

```typescript
import {
  Button,
  Card,
  Input,
  Dialog,
  Badge,
  Checkbox,
  Label,
  DropdownMenu
} from '@mypokies/ui'
```

### Import Styles

In your app's root layout or main CSS file:

```typescript
import '@mypokies/ui/styles.css'
```

### Button Component

```typescript
import { Button } from '@mypokies/ui'

function MyComponent() {
  return (
    <div>
      <Button>Default Button</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>

      <Button disabled>Disabled</Button>
    </div>
  )
}
```

### Card Component

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@mypokies/ui'

function ProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Manage your account settings</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
      <CardFooter>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  )
}
```

### Input Component

```typescript
import { Input, Label } from '@mypokies/ui'

function LoginForm() {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="Enter your email"
      />

      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        placeholder="Enter your password"
      />
    </div>
  )
}
```

### Dialog Component

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@mypokies/ui'

function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to proceed?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Badge Component

```typescript
import { Badge } from '@mypokies/ui'

function StatusBadge({ status }) {
  return (
    <div>
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Error</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  )
}
```

### Checkbox Component

```typescript
import { Checkbox, Label } from '@mypokies/ui'

function TermsCheckbox() {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">
        I agree to the terms and conditions
      </Label>
    </div>
  )
}
```

### Dropdown Menu

```typescript
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@mypokies/ui'

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Error Boundary

```typescript
import { ErrorBoundary, AsyncErrorBoundary } from '@mypokies/ui'

function App() {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={(error, errorInfo) => {
        console.error('Error:', error, errorInfo)
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  )
}

// For async components
function AsyncApp() {
  return (
    <AsyncErrorBoundary
      fallback={<div>Loading failed</div>}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
    </AsyncErrorBoundary>
  )
}
```

### Utility Function

```typescript
import { cn } from '@mypokies/ui'

// Merge Tailwind classes with proper precedence
function MyComponent({ className }) {
  return (
    <div className={cn('text-base font-medium', className)}>
      Content
    </div>
  )
}
```

## Available Components

### Form Components
- `Button` - Clickable button with variants
- `Input` - Text input field
- `Label` - Form label
- `Checkbox` - Checkbox input

### Layout Components
- `Card` - Content card with header, content, and footer
- `CardHeader` - Card header section
- `CardTitle` - Card title
- `CardDescription` - Card description
- `CardContent` - Card main content
- `CardFooter` - Card footer section

### Overlay Components
- `Dialog` - Modal dialog
- `DialogTrigger` - Dialog trigger button
- `DialogContent` - Dialog content wrapper
- `DialogHeader` - Dialog header
- `DialogTitle` - Dialog title
- `DialogDescription` - Dialog description
- `DialogFooter` - Dialog footer

### Navigation Components
- `DropdownMenu` - Dropdown menu
- `DropdownMenuTrigger` - Menu trigger
- `DropdownMenuContent` - Menu content
- `DropdownMenuItem` - Menu item
- `DropdownMenuLabel` - Menu label
- `DropdownMenuSeparator` - Menu separator

### Feedback Components
- `Badge` - Status badge with variants

### Error Handling
- `ErrorBoundary` - Error boundary component
- `AsyncErrorBoundary` - Async error boundary

### Utilities
- `cn` - Class name utility for merging Tailwind classes

## Component Variants

### Button Variants
- `default` - Primary button
- `destructive` - Danger/delete actions
- `outline` - Outlined button
- `secondary` - Secondary actions
- `ghost` - Minimal button
- `link` - Link-styled button

### Button Sizes
- `sm` - Small button
- `default` - Standard size
- `lg` - Large button
- `icon` - Icon-only button

### Badge Variants
- `default` - Primary badge
- `secondary` - Secondary badge
- `destructive` - Error/warning badge
- `outline` - Outlined badge

## Styling

This package uses:
- **Tailwind CSS** for utility-first styling
- **Class Variance Authority (CVA)** for component variants
- **Tailwind Merge** for class name conflict resolution
- **CSS Variables** for theming

### Custom Styling

All components accept a `className` prop for custom styling:

```typescript
<Button className="custom-class">
  Custom Styled Button
</Button>
```

Use the `cn` utility to merge classes properly:

```typescript
import { cn } from '@mypokies/ui'

<Button className={cn('custom-base', isActive && 'custom-active')}>
  Button
</Button>
```

## Theming

Components use CSS variables for theming. Define these in your app:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* Add more theme variables */
}
```

## Accessibility

All components are built with accessibility in mind:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Based on Radix UI primitives

## Configuration

No additional configuration required. The package exports pre-configured components.

## Development

### Build the package

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Type checking

```bash
npm run type-check
```

## Best Practices

1. Always import styles in your root layout
2. Use the `cn` utility for merging class names
3. Prefer composition over prop drilling
4. Use appropriate component variants
5. Maintain consistent spacing with Tailwind utilities
6. Test components for accessibility
7. Keep components simple and composable

## Peer Dependencies

This package requires:
- `react` >= 18.0.0
- `react-dom` >= 18.0.0

## Dependencies

- `@radix-ui/react-*` - Accessible UI primitives
- `class-variance-authority` - Variant management
- `clsx` - Class name utility
- `tailwind-merge` - Tailwind class merging
- `lucide-react` - Icon library
