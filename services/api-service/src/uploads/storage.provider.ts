export interface StorageProvider {
  uploadFile(file: any): Promise<{ key: string; url: string; bucket?: string }>;
  deleteFile(key: string, bucket?: string): Promise<void>;
}
