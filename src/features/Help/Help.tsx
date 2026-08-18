import { Link, useParams } from "react-router-dom";
import HelpArticle from "./HelpArticle";
import HelpSidebar from "./HelpSidebar";
import { getDocBySlug } from "./docsContent";

const Help = () => {
  const params = useParams();
  const slug = params["*"] ?? "";
  const doc = getDocBySlug(slug);

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className="mb-2">Help</h2>
      <div className="d-flex flex-grow-1 overflow-hidden gap-3">
        <HelpSidebar />
        <div className="flex-grow-1 overflow-auto">
          {doc ? (
            <HelpArticle doc={doc} />
          ) : (
            <div>
              <p>Page not found.</p>
              <Link to="/help">Back to Help</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Help;
