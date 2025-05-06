import React from "react";

const LayoutFlow = React.lazy(() =>
  import.meta.env.SSR
    ? new Promise<typeof import("~/components/flowcharts/layout-flow.client")>(
        () => {}
      )
    : import("~/components/flowcharts/layout-flow.client")
);

export default LayoutFlow;
