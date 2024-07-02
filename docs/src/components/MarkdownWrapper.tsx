import React from "react";

interface MDXWrapperProps {
  children: React.ReactNode;
}

const MDXWrapper: React.FC<MDXWrapperProps> = ({ children }) => {
  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-4xl prose prose-lg">{children}</div>
    </div>
  );
};

export default MDXWrapper;
