import fontJson from "bootstrap-icons/font/bootstrap-icons.json";

export type BootstrapIconProps = {
  name: keyof typeof fontJson;
};

export default function BootstrapIcon({ name }: BootstrapIconProps) {
  return <i className={`bi-${name}`} />;
}
