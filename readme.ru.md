![image](https://github.com/user-attachments/assets/54f40a5f-4f89-4b42-bfe3-bc504935fe33)

# Rectron

## Описание
Rectron — шаблон Electron + React с упором на типобезопасность и удобную архитектуру preload.

## Основные возможности
- Electron Forge + Webpack
- React + TypeScript
- Context Isolation
- **Автоматическая генерация window.d.ts из preload.ts**
- Типизированный window.electron без ручной поддержки

## Новая фишка: автогенерация window.d.ts
preload.ts является единственным источником правды для API.

### Пример
```ts
contextBridge.exposeInMainWorld("electron", {
  dialog: {
    pickImage: async (): Promise<PickImageResult> => {}
  }
});
```

Сгенерированный window.d.ts:
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

## Установка
```bash
yarn install
```

## Разработка
```bash
yarn dev
```

## Сборка
```bash
yarn package
yarn make
```
