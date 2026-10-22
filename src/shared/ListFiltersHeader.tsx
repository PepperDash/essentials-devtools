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
    <div className="ps-md-2 d-flex flex-wrap flex-md-nowrap justify-content-between mb-2 gap-2 user-select-none align-items-center">
      <div className="row row-cols-sm-auto g-2 g-md-3 user-select-none flex-wrap flex-md-nowrap flex-grow-1 flex-md-grow-0">
        {showSearch && (
          <div className="col-24">
            {onSearchChange !== undefined ? (
              <FilterSearchText
                value={searchValue ?? ''}
                onChangeValue={onSearchChange}
              />
            ) : (
              <FilterSearchText />
            )}
          </div>
        )}
        <div className="col-24">{filters}</div>
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
