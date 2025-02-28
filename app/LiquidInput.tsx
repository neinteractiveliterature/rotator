import {
  useStandardCodeMirror,
  liquid,
  CodeInput,
  FormGroupWithLabel,
} from "@neinteractiveliterature/litform";
import { type ReactNode } from "react";
import { useHydrated } from "./useHydrated";

export type LiquidInputProps = {
  name: string;
  value: string;
  onChange: (newValue: string) => void;
  label: ReactNode;
  helpText?: ReactNode;
};

const extensions = [liquid()];

function LiquidInputControl({
  value,
  onChange,
}: Pick<LiquidInputProps, "value" | "onChange">) {
  const [editorRef] = useStandardCodeMirror({
    value,
    onChange,
    extensions,
  });

  return <CodeInput editorRef={editorRef} value={value} />;
}

export function LiquidInput(props: LiquidInputProps) {
  const hydrated = useHydrated();

  return (
    <FormGroupWithLabel label={props.label} helpText={props.helpText}>
      {() => (
        <>
          {hydrated ? <LiquidInputControl {...props} /> : null}
          <input type="hidden" name={props.name} value={props.value} />
        </>
      )}
    </FormGroupWithLabel>
  );
}
