import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocEntry, resolveRelativeLink } from "./docsContent";

const DocLink = ({
  currentSlug,
  href,
  children,
}: {
  currentSlug: string;
  href?: string;
  children?: React.ReactNode;
}) => {
  if (!href) return <>{children}</>;

  if (/^(https?:|mailto:)/i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  const resolved = resolveRelativeLink(currentSlug, href);
  if (resolved) {
    return <Link to={resolved}>{children}</Link>;
  }

  return <a href={href}>{children}</a>;
};

const HelpArticle = ({ doc }: { doc: DocEntry }) => {
  const components: Components = {
    a: ({ href, children }) => (
      <DocLink currentSlug={doc.slug} href={href}>
        {children}
      </DocLink>
    ),
    table: ({ children }) => (
      <table className="table table-striped">{children}</table>
    ),
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {doc.content}
    </ReactMarkdown>
  );
};

export default HelpArticle;
