import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link, useLocation, useParams } from 'react-router-dom';
import HelpArticle from './HelpArticle';
import HelpSidebar from './HelpSidebar';
import { getDocBySlug } from './docsContent';

const Help = () => {
  const params = useParams();
  const slug = params['*'] ?? '';
  const doc = getDocBySlug(slug);
  const { pathname } = useLocation();

  // Below md the sidebar folds behind a Contents button. Remember the page it was opened on, so it
  // reads as closed once another page is picked.
  const [contentsOpenedOn, setContentsOpenedOn] = useState<string | null>(null);
  const showContents = contentsOpenedOn === pathname;

  return (
    <div className="d-flex flex-column overflow-hidden h-100 p-2">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h2 className="mb-0 me-auto">Help</h2>
        <Button
          size="sm"
          variant="outline-secondary"
          className="d-md-none"
          aria-expanded={showContents}
          aria-controls="help-contents"
          onClick={() => setContentsOpenedOn(showContents ? null : pathname)}
        >
          {showContents ? 'Close contents' : 'Contents'}
        </Button>
      </div>
      <div className="d-flex flex-column flex-md-row flex-grow-1 overflow-hidden gap-3">
        <HelpSidebar open={showContents} />
        <div
          className={`flex-grow-1 overflow-auto ${showContents ? 'd-none d-md-block' : ''}`}
        >
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
