# 🚀 Future-Proof TypeScript Type Generation

## Why This Matters
Your TypeScript types will **automatically sync** with your Supabase database schema.
Never get "column not found" errors again!

## One-Time Setup

### 1. Login to Supabase
```bash
npx supabase login
```

### 2. Get Your Project Reference ID
- Go to your Supabase Dashboard
- Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Copy `YOUR_PROJECT_REF`

### 3. Link Your Project
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Generate Types (First Time)
```bash
npm run generate-types
```

## Usage

### Whenever You Change Database Schema
```bash
npm run generate-types
```

### In Your Code
```typescript
import { Database } from '@/types/database.generated'

// Types are automatically correct!
type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']
```

## Benefits
✅ Types always match database schema
✅ No manual type definitions
✅ Catch schema mismatches at compile time
✅ Auto-complete for all columns
✅ No more "column not found" runtime errors

## Before Deploying
Always run `npm run generate-types` after schema changes!
