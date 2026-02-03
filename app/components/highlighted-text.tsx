import { highlightCode } from "@lezer/highlight";
import {
  liquidLanguage,
  bootstrapLightHighlightStyle,
} from "@neinteractiveliterature/litform";
import { useEffect, useMemo } from "react";
import { StyleModule } from "style-mod";

export type HighlightedTextProps = {
  text: string;
};

function HighlightedText({ text }: HighlightedTextProps) {
  const tree = useMemo(() => liquidLanguage.parser.parse(text), [text]);

  const highlightedText = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    highlightCode(
      text,
      tree,
      bootstrapLightHighlightStyle,
      (code, classes) =>
        nodes.push(
          <span className={classes} key={nodes.length}>
            {code}
          </span>
        ),
      () => nodes.push(<br key={nodes.length} />)
    );
    return nodes;
  }, [text, tree]);

  useEffect(() => {
    if (bootstrapLightHighlightStyle.module) {
      StyleModule.mount(document, bootstrapLightHighlightStyle.module);
    }
  }, []);

  return <div className="font-monospace">{highlightedText}</div>;
}

export default HighlightedText;
