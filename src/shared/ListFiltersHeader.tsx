import { ReactNode } from 'react';
import { ButtonGroup } from 'react-bootstrap';
import { FilterSearchText } from './FilterSearchText';

const ListFiltersHeader = ({
  filters,
  groupBy,
  listTypeButtons,
  showSearch,
  searchValue,
  onSearchChange,
  rightContent,
}: ListFiltersHeaderProps) => {
  return (
    <div className="ps-2 d-flex justify-content-between mb-2 user-select-none align-items-center flex-nowrap">
      <div className="row row-cols-sm-auto g-3 user-select-none flex-nowrap">
        {showSearch && (
          <div className="col-8">
            {onSearchChange !== undefined
              ? <FilterSearchText value={searchValue ?? ''} onChangeValue={onSearchChange} />
              : <FilterSearchText />}
          </div>
        )}
        <div className="col-16 d-none d-lg-block">{filters}</div>
      </div>

      <div className="d-flex">
        {groupBy ? <div className="ms-2">{groupBy}</div> : null}
        {listTypeButtons ? (
          <ButtonGroup size="sm" className="ms-2 my-auto bg-white border-0">
            {listTypeButtons}
          </ButtonGroup>
        ) : null}
        {rightContent ? <div className="ms-2">{rightContent}</div> : null}
      </div>
    </div>
  );
};

export default ListFiltersHeader;

interface ListFiltersHeaderProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filters: ReactNode;
  groupBy?: ReactNode;
  listTypeButtons?: ReactNode;
  rightContent?: ReactNode;
}
