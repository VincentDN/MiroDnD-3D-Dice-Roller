// Minimal ambient types for the subset of the File System Access API this
// app uses (lib/music-library.ts). Not yet part of the TypeScript DOM lib
// this repo targets; only Chromium-based browsers implement it at all -
// callers must feature-detect via music-library.ts's supported() first.
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}
interface FileSystemHandle {
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<'granted' | 'denied' | 'prompt'>;
}
interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>;
}
interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }): Promise<FileSystemDirectoryHandle>;
}
