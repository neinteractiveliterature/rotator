import {
  useStandardCodeMirror,
  liquid,
  CodeInput,
  FormGroupWithLabel,
} from "@neinteractiveliterature/litform";
import { useSyncExternalStore, type ReactNode } from "react";

// copied from remix-utils
function subscribe() {
  return () => {};
}

// copied from remix-utils
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

export type LiquidInputProps = {
  name: string;
  value: string;
  onChange: (newValue: string) => void;
  label: ReactNode;
  helpText?: ReactNode;
};

function LiquidInputControl({
  value,
  onChange,
}: Pick<LiquidInputProps, "value" | "onChange">) {
  const [editorRef] = useStandardCodeMirror({
    value,
    onChange,
    extensions: [liquid()],
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
