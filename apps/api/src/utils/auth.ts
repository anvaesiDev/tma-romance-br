import { Context, Next } from 'hono';

// Custom environment for Hono with auth variables
export interface AuthVariables {
    userId: string;
    tgUserId: string;
}

// Type-safe function to get userId from context
export function getUserId(c: Context): string {
    return (c as any).get('userId') as string;
}

export function getTgUserId(c: Context): string {
    return (c as any).get('tgUserId') as string;
}
