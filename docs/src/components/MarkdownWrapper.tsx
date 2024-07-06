import { ReactNode } from "react";

interface MDXWrapperProps {
  children: ReactNode;
}

function MDXWrapper({ children }) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl prose prose-lg px-3">{children}</div>
    </div>
  );
}

export default MDXWrapper;
