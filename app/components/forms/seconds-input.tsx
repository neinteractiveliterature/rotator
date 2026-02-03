import { useTranslation } from "react-i18next";

export function SecondsInput(
  props: Omit<React.ComponentProps<"input">, "type" | "className">,
) {
  const { t } = useTranslation();

  return (
    <div className="input-group">
      <input type="number" className="form-control" {...props} />
      <span className="input-group-text">{t("units.seconds")}</span>
    </div>
  );
}
