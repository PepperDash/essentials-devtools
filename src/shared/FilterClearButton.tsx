import { Button } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

export const FilterClearButton = ({ allParams }: FilterClearButtonProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  /** Handles clear click */
  function clickClear() {
    allParams.forEach((p) => searchParams.delete(p));
    setSearchParams(searchParams);
  }

  return (
    <Button variant="outline" className="ms-1 p-1" onClick={clickClear}>
      Clear
    </Button>
  );
};

interface FilterClearButtonProps {
  /** List of params to clean when clicked */
  allParams: string[];
}
