declare module "*.mdx" {
  import type { ComponentProps, ComponentType } from "react";
  const MDXComponent: ComponentType<ComponentProps<"div">>;
  export default MDXComponent;
}
