import { contextBridge, ipcRenderer } from "electron";

type PickImageResult =
  | {
      ok: true;
      canceled: false;
      filePath: string;
      name: string;
      mime: string;
      base64: string;
      dataUrl: string;
    }
  | {
      ok: true;
      canceled: true;
    }
  | {
      ok: false;
      error: string;
    };

contextBridge.exposeInMainWorld("electron", {
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },

  fs: {
    readFileBase64: (filePath: string): Promise<string> =>
      ipcRenderer.invoke("fs:readFileBase64", filePath),

    readImageBase64: (
      filePath: string
    ): Promise<{ base64: string; mime: string; name: string; path: string }> =>
      ipcRenderer.invoke("fs:readImageBase64", filePath),
  },

  dialog: {
    showOpenDialog: (
      options: Electron.OpenDialogOptions
    ): Promise<Electron.OpenDialogReturnValue> =>
      ipcRenderer.invoke("dialog:showOpenDialog", options),

    pickImage: async (): Promise<PickImageResult> => {
      try {
        const res: Electron.OpenDialogReturnValue = await ipcRenderer.invoke(
          "dialog:showOpenDialog",
          {
            title: "Choose an image",
            properties: ["openFile"],
            filters: [
              {
                name: "Images",
                extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
              },
            ],
          } satisfies Electron.OpenDialogOptions
        );

        if (res.canceled) return { ok: true, canceled: true };

        const filePath = res.filePaths?.[0];
        if (!filePath) return { ok: true, canceled: true };

        const img: { base64: string; mime: string; name: string; path: string } =
          await ipcRenderer.invoke("fs:readImageBase64", filePath);

        return {
          ok: true,
          canceled: false,
          filePath,
          name: img.name,
          mime: img.mime,
          base64: img.base64,
          dataUrl: `data:${img.mime};base64,${img.base64}`,
        };
      } catch (e: any) {
        return {
          ok: false,
          error: e?.message ? String(e.message) : "pickImage failed",
        };
      }
    },
  },
});

export {};
