import { useTranslation } from "react-i18next";

export function meta() {
  return [
    { title: "Rotator" },
    {
      name: "description",
      content: "On-call rotation phone forwarding system",
    },
  ];
}

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      <title>{t("appName")}</title>
      <h1>{t("appName")}</h1>
    </>
  );
}
