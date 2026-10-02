export interface ImageRequest {
    prompt: string;
    width: number;
    height: number;
    seed?: number;
}
export interface ImageProvider {
    readonly name: string;
    generateImage(request: ImageRequest, signal: AbortSignal): Promise<Blob>;
}
