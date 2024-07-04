import { ReactNode } from "react";

interface MDXWrapperProps {
  children: ReactNode;
}

function MDXWrapper({ children }) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl prose prose-lg">{children}</div>
    </div>
  );
}

export default MDXWrapper;
