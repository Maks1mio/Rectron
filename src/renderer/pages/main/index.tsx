import { useCallback, useMemo, useState } from "react";
import Header from "../../components/layout/header";
import * as styles from "./main.module.scss";

import ImportIcon from "../../../../static/assets/mainIcon/rectron.png";

function MainPage() {
  const [imageSrc, setImageSrc] = useState<string>(ImportIcon);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canUseElectron = useMemo(() => {
    return (
      typeof window !== "undefined" && !!window.electron?.dialog?.pickImage
    );
  }, []);

  const onChooseImage = useCallback(async () => {
    if (!canUseElectron) return;

    setBusy(true);
    setErrorText(null);

    try {
      const res = await window.electron.dialog.pickImage();

      if (!res.ok) {
        setErrorText(res.error);
        return;
      }

      if (res.canceled) return;

      setImageSrc(res.dataUrl);
    } finally {
      setBusy(false);
    }
  }, [canUseElectron]);

  return (
    <div className={styles.container}>
      <Header title="Rectron" />

      <div className={styles.content}>
        <div className={styles.center}>
          <img
            src={imageSrc}
            alt="Rectron"
            className={styles.image}
            draggable={false}
          />

          <button
            type="button"
            className={styles.chooseBtn}
            onClick={onChooseImage}
            disabled={!canUseElectron || busy}
            aria-busy={busy}
            title={
              !canUseElectron
                ? "Preload API is not available"
                : "Choose another image"
            }
          >
            {busy ? "Opening..." : "Choose another image"}
          </button>

          {!canUseElectron && (
            <div className={styles.hint}>Preload API is not available</div>
          )}

          {errorText && <div className={styles.error}>{errorText}</div>}
        </div>
      </div>
    </div>
  );
}

export default MainPage;
