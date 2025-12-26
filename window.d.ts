// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
// Generated from: src/main/preload.ts

declare global {
  interface Window {
    electron: {
        window: {
          minimize: () => void;
          maximize: () => void;
          close: () => void;
        };
        fs: {
          readFileBase64: (filePath: string) => Promise<string>;
          readImageBase64: (filePath: string) => Promise<{ base64: string; mime: string; name: string; path: string }>;
        };
        dialog: {
          showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
          pickImage: () => Promise<PickImageResult>;
        };
      };
  }
}

export {};
