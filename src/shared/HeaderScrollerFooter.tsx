import { ReactNode } from 'react';
import { Container } from 'react-bootstrap';

/**
 * Implements a three-container flex column with optional header and footer
 * sections. The scrolling area will grow to fill space and scroll when
 * overflowing.
 *
 * This must be used in div/containers that have proper height and
 * overflow classes applied.
 */
const HeaderScrollerFooter = ({
  scrollingElements,
  headerElements,
  footerElements,
  className = '',
  scrollContainerClassName = '',
}: HeaderScrollerFooterProps) => {
  return (
    <div className={`h-100 d-flex flex-column ${className}`}>
      {headerElements && <Container fluid>{headerElements}</Container>}

      <Container
        fluid
        className={`flex-grow-1 overflow-auto ${scrollContainerClassName}`}
      >
        {scrollingElements}
      </Container>

      {footerElements && <Container fluid>{footerElements}</Container>}
    </div>
  );
};

export default HeaderScrollerFooter;

interface HeaderScrollerFooterProps {
  headerElements?: ReactNode;
  scrollingElements: ReactNode;
  footerElements?: ReactNode;
  className?: string;
  /**
   * Add classes to the scrolling container. Currently implemented classes:
   * flex-grow-1 overflow-auto container-fluid
   */
  scrollContainerClassName?: string;
}
