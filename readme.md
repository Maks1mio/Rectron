![image](https://github.com/user-attachments/assets/54f40a5f-4f89-4b42-bfe3-bc504935fe33)

# Rectron

[Русская документация](https://github.com/Maks1mio/Rectron/blob/main/readme.ru.md)

## Description
Rectron is a customized Electron + React template focused on type safety, clean preload APIs, and fast development workflow.

## Key Features
- Electron Forge + Webpack
- React + TypeScript renderer
- Secure preload bridge (contextIsolation: true)
- **Automatic window.d.ts generation from preload.ts**
- Typed window.electron API without manual sync

## New Feature: Automatic window.d.ts Generation
Rectron automatically generates window.d.ts based on src/main/preload.ts.

Write APIs once in preload.ts — typings stay in sync automatically.

### Example
```ts
contextBridge.exposeInMainWorld("electron", {
  dialog: {
    pickImage: async (): Promise<PickImageResult> => {}
  }
});
```

Auto-generated:
```ts
declare global {
  interface Window {
    electron: {
      dialog: {
        pickImage: () => Promise<PickImageResult>;
      };
    };
  }
}
```

## Installation
```bash
yarn install
```

## Development
```bash
yarn dev
```

## Packaging
```bash
yarn package
yarn make
```
