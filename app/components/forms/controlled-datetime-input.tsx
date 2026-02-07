import { BootstrapFormInput } from "@neinteractiveliterature/litform";
import { useState, type ComponentProps } from "react";
import { Temporal } from "temporal-polyfill";

export function ControlledDatetimeInput({
  value,
  onChange,
  ...otherProps
}: Omit<
  ComponentProps<typeof BootstrapFormInput>,
  "onTextChange" | "value" | "type"
> & {
  value: Temporal.ZonedDateTime;
  onChange: React.Dispatch<Temporal.ZonedDateTime>;
}) {
  const [textInput, setTextInput] = useState(() =>
    value.toPlainDateTime().toString({ calendarName: "never" }),
  );

  const textChanged = (newText: string) => {
    setTextInput(newText);

    try {
      const newDateTime = Temporal.PlainDateTime.from(newText).toZonedDateTime(
        value.timeZoneId,
      );
      onChange(newDateTime);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <BootstrapFormInput
      {...otherProps}
      type="datetime-local"
      value={textInput}
      onTextChange={textChanged}
    />
  );
}
