/** Provider-neutral subset of JSON Schema used by the game's existing prompts. */
export interface JsonSchema {
    type: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
    description?: string;
    nullable?: boolean;
}
export const SchemaType = { OBJECT: 'object', ARRAY: 'array', STRING: 'string', INTEGER: 'integer', NUMBER: 'number', BOOLEAN: 'boolean' } as const;
export interface TextRequest {
    prompt: string;
    systemPrompt?: string;
    schema?: JsonSchema;
    image?: { mimeType: string; data: string };
    temperature?: number;
}
export interface TextOptions {
    apiKey?: string;
    model?: string;
    signal?: AbortSignal;
}
export interface TextProvider {
    readonly name: string;
    generateText(request: TextRequest, options: TextOptions, signal: AbortSignal): Promise<string>;
}
