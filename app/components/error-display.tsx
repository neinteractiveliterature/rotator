import { DrizzleQueryError } from "drizzle-orm";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

export function serializeError(error: unknown, t: TFunction): Error {
  if (error instanceof DrizzleQueryError) {
    return new Error(
      `${error.message}\n${t("errors.cause", { cause: serializeError(error.cause, t) })}`,
    );
  } else if (error instanceof Error) {
    return error;
  } else {
    return new Error("Unknown error");
  }
}

export function ErrorDisplay({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (error == null) {
    return null;
  }

  if (error instanceof Error) {
    const lines = error.message.split(/[\r\n]+/);

    return (
      <div className="alert alert-danger my-3">
        {lines.map((line, index) => (
          <p
            key={index}
            className={index < lines.length - 1 ? undefined : "mb-0"}
          >
            {line}
          </p>
        ))}
      </div>
    );
  } else {
    return <div className="alert alert-danger">{t("errors.unknown")}</div>;
  }
}
