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
    () => false,
  );
}

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

export function LiquidInputControlIfHydrated(
  props: Parameters<typeof LiquidInputControl>[0],
) {
  const hydrated = useHydrated();

  if (hydrated) {
    return <LiquidInputControl {...props} />;
  } else {
    return null;
  }
}

export function LiquidInput(props: LiquidInputProps) {
  return (
    <FormGroupWithLabel label={props.label} helpText={props.helpText}>
      {() => (
        <>
          <LiquidInputControlIfHydrated {...props} />
          <input type="hidden" name={props.name} value={props.value} />
        </>
      )}
    </FormGroupWithLabel>
  );
}
