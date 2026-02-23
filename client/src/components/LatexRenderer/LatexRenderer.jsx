import { MathJax } from "better-react-mathjax";

export default function LatexRenderer({ content }) {
  if (!content) return null;

  // Split content by LaTeX delimiters and render appropriately
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]+?\$)/g);

  return (
    <div className="latex-content">
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return (
            <MathJax key={index} dynamic>
              {part}
            </MathJax>
          );
        } else if (part.startsWith("$") && part.endsWith("$")) {
          return (
            <MathJax key={index} inline dynamic>
              {part}
            </MathJax>
          );
        } else {
          // Handle markdown-like formatting
          const formatted = part.split("\n").map((line, i) => {
            if (line.startsWith("**") && line.endsWith("**")) {
              return (
                <strong key={i}>
                  {line.slice(2, -2)}
                  <br />
                </strong>
              );
            }
            return (
              <span key={i}>
                {line}
                <br />
              </span>
            );
          });
          return <span key={index}>{formatted}</span>;
        }
      })}
    </div>
  );
}
